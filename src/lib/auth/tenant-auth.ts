import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyApiSecret } from '@/lib/crypto/tokens'

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000 // 5 minutes (anti-replay)

export interface Tenant {
  id: string
  name: string
  subscription_status: string
  subscription_plan: string
  allowed_artisans: number
}

export interface ApiKey {
  id: string
  tenant_id: string
  key_id: string
  scopes: string[]
}

type TenantAuthSuccess = {
  success: true
  tenant: Tenant
  apiKey: ApiKey
}

type TenantAuthError = {
  success: false
  error: string
  status: number
}

export type TenantAuthResult = TenantAuthSuccess | TenantAuthError

/**
 * Validates a tenant API request using X-GMBS-Key-Id and X-GMBS-Secret headers
 * Optionally checks for required scopes
 */
export async function validateTenantRequest(
  request: NextRequest,
  requiredScope?: string
): Promise<TenantAuthResult> {
  // Required headers
  const keyId = request.headers.get('X-GMBS-Key-Id')
  const secret = request.headers.get('X-GMBS-Secret')
  const timestamp = request.headers.get('X-GMBS-Timestamp')

  if (!keyId || !secret) {
    return { 
      success: false, 
      error: 'Missing authentication headers (X-GMBS-Key-Id, X-GMBS-Secret)', 
      status: 401 
    }
  }

  // Optional: Anti-replay check via timestamp
  if (timestamp) {
    const requestTime = parseInt(timestamp, 10)
    const now = Date.now()
    if (isNaN(requestTime) || Math.abs(now - requestTime) > MAX_TIMESTAMP_DRIFT_MS) {
      return { 
        success: false, 
        error: 'Request timestamp too old or invalid', 
        status: 401 
      }
    }
  }

  try {
    const supabase = getSupabaseAdmin()

    // Fetch the API key
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('id, tenant_id, key_id, key_secret_hash, scopes')
      .eq('key_id', keyId)
      .is('revoked_at', null)
      .single()

    if (keyError || !apiKey) {
      return { success: false, error: 'Invalid API key', status: 401 }
    }

    // Verify secret using bcrypt
    const secretValid = await verifyApiSecret(secret, apiKey.key_secret_hash)
    if (!secretValid) {
      return { success: false, error: 'Invalid API secret', status: 401 }
    }

    // Check scope if required
    if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
      return { 
        success: false, 
        error: `Missing required scope: ${requiredScope}`, 
        status: 403 
      }
    }

    // Fetch the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, subscription_status, subscription_plan, allowed_artisans')
      .eq('id', apiKey.tenant_id)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return { success: false, error: 'Tenant not found or inactive', status: 401 }
    }

    // Check subscription status
    if (!['active', 'trial'].includes(tenant.subscription_status)) {
      return { 
        success: false, 
        error: `Subscription ${tenant.subscription_status}. Please renew.`, 
        status: 403 
      }
    }

    // Update last_used_at (fire and forget)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(() => {})

    return { 
      success: true, 
      tenant: tenant as Tenant,
      apiKey: {
        id: apiKey.id,
        tenant_id: apiKey.tenant_id,
        key_id: apiKey.key_id,
        scopes: apiKey.scopes || []
      }
    }
  } catch (error) {
    console.error('Tenant auth error:', error)
    return { 
      success: false, 
      error: 'Authentication failed', 
      status: 500 
    }
  }
}

/**
 * Helper to create error response
 */
export function authErrorResponse(result: TenantAuthError) {
  return Response.json({ error: result.error }, { status: result.status })
}
