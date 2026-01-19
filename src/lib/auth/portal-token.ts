import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/crypto/tokens'

export interface PortalTokenData {
  tokenId: string
  tenantId: string
  artisanId: string
  interventionId: string | null
  metadata: Record<string, unknown>
}

type PortalTokenResult = 
  | { success: true; data: PortalTokenData }
  | { success: false; error: string; status: number }

/**
 * Validate a portal token from request (query param or body)
 * Used for portal internal APIs
 */
export async function validatePortalToken(
  request: NextRequest,
  options?: { requireIntervention?: boolean }
): Promise<PortalTokenResult> {
  // Get token from query param or body
  const { searchParams } = new URL(request.url)
  let token = searchParams.get('token')

  // If POST/PATCH, also try body
  if (!token && ['POST', 'PATCH', 'PUT'].includes(request.method)) {
    try {
      const body = await request.clone().json()
      token = body.token
    } catch {
      // Body is not JSON or no token field
    }
  }

  if (!token) {
    return { success: false, error: 'Token required', status: 400 }
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
      return { success: false, error: 'Invalid token', status: 401 }
    }

    if (!tokenData.is_active) {
      return { success: false, error: 'Token revoked', status: 401 }
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'Token expired', status: 401 }
    }

    if (options?.requireIntervention && !tokenData.crm_intervention_id) {
      return { success: false, error: 'Token not linked to intervention', status: 400 }
    }

    // Update last_accessed_at
    await supabase
      .from('portal_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    return {
      success: true,
      data: {
        tokenId: tokenData.id,
        tenantId: tokenData.tenant_id,
        artisanId: tokenData.crm_artisan_id,
        interventionId: tokenData.crm_intervention_id,
        metadata: tokenData.metadata as Record<string, unknown>
      }
    }
  } catch (error) {
    console.error('Portal token validation error:', error)
    return { success: false, error: 'Validation failed', status: 500 }
  }
}

/**
 * Extract token from FormData
 */
export function getTokenFromFormData(formData: FormData): string | null {
  return formData.get('token') as string | null
}

/**
 * Extract token from request (query param, header, or body)
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Try query param first
  const { searchParams } = new URL(request.url)
  const queryToken = searchParams.get('token')
  if (queryToken) return queryToken

  // Try X-Portal-Token header
  const headerToken = request.headers.get('X-Portal-Token')
  if (headerToken) return headerToken

  return null
}
