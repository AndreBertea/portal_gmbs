import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/crypto/tokens'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/v1/tokens/:token/validate
 * Validate a portal token and return artisan info
 * This endpoint is public (used by the portal UI)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { token } = await params
  
  if (!token) {
    return NextResponse.json(
      { valid: false, error: 'Token required' }, 
      { status: 400 }
    )
  }

  try {
    const tokenHash = hashToken(token)
    const supabase = getSupabaseAdmin()

    const { data: tokenData, error } = await supabase
      .from('portal_tokens')
      .select(`
        id,
        tenant_id,
        crm_artisan_id,
        crm_intervention_id,
        metadata,
        expires_at,
        is_active
      `)
      .eq('token_hash', tokenHash)
      .single()

    if (error || !tokenData) {
      return NextResponse.json(
        { valid: false, error: 'Token not found' }, 
        { status: 404 }
      )
    }

    // Check if active
    if (!tokenData.is_active) {
      return NextResponse.json(
        { valid: false, error: 'Token revoked' }, 
        { status: 401 }
      )
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Token expired' }, 
        { status: 401 }
      )
    }

    // Update last_accessed_at
    await supabase
      .from('portal_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    return NextResponse.json({
      valid: true,
      artisan: {
        crm_id: tokenData.crm_artisan_id,
        ...(tokenData.metadata as Record<string, unknown>)
      },
      intervention_id: tokenData.crm_intervention_id
    })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Validation failed' }, 
      { status: 500 }
    )
  }
}
