import { NextRequest, NextResponse } from 'next/server'
import { validateTenantRequest, authErrorResponse } from '@/lib/auth/tenant-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateToken } from '@/lib/crypto/tokens'

/**
 * POST /api/v1/tokens
 * Generate a new portal token for an artisan
 */
export async function POST(request: NextRequest) {
  const auth = await validateTenantRequest(request, 'tokens:write')
  if (!auth.success) {
    return authErrorResponse(auth)
  }

  const { tenant } = auth

  // Parse body
  let body: {
    crm_artisan_id: string
    crm_intervention_id?: string
    metadata?: Record<string, unknown>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { crm_artisan_id, crm_intervention_id, metadata } = body

  if (!crm_artisan_id) {
    return NextResponse.json({ error: 'crm_artisan_id is required' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()

    // Check if this artisan already has an active token
    const { data: existingToken } = await supabase
      .from('portal_tokens')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('crm_artisan_id', crm_artisan_id)
      .eq('is_active', true)
      .single()

    // If new artisan, check quota
    if (!existingToken) {
      // Count distinct active artisans
      const { count } = await supabase
        .from('portal_tokens')
        .select('crm_artisan_id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)

      if (count !== null && count >= tenant.allowed_artisans) {
        return NextResponse.json({
          error: 'Artisan limit reached',
          limit: tenant.allowed_artisans,
          current: count,
          upgrade_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}/pricing`
        }, { status: 403 })
      }
    }

    // Deactivate old tokens for this artisan (rotation)
    if (existingToken) {
      await supabase
        .from('portal_tokens')
        .update({ is_active: false })
        .eq('tenant_id', tenant.id)
        .eq('crm_artisan_id', crm_artisan_id)
        .eq('is_active', true)
    }

    // Generate new token
    const { token, hash, prefix } = generateToken()
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const { data: newToken, error } = await supabase
      .from('portal_tokens')
      .insert({
        tenant_id: tenant.id,
        crm_artisan_id,
        crm_intervention_id: crm_intervention_id || null,
        token_hash: hash,
        token_prefix: prefix,
        metadata: metadata || {},
        expires_at: expiresAt
      })
      .select('id, created_at, expires_at')
      .single()

    if (error) {
      console.error('Token creation error:', error)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      tenant_id: tenant.id,
      action: 'token.created',
      resource_type: 'token',
      resource_id: newToken.id,
      details: { crm_artisan_id, crm_intervention_id }
    })

    // Return the raw token (only once!)
    const portalUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/t/${token}`

    return NextResponse.json({
      token,                    // Raw token - store on CRM side if needed
      portal_url: portalUrl,    // Full URL for the artisan
      expires_at: newToken.expires_at,
      created_at: newToken.created_at
    })

  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
