import { NextRequest, NextResponse } from 'next/server'
import { validateTenantRequest, authErrorResponse } from '@/lib/auth/tenant-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/v1/subscription/status
 * Returns the current subscription status and usage for the tenant
 */
export async function GET(request: NextRequest) {
  const auth = await validateTenantRequest(request)
  if (!auth.success) {
    return authErrorResponse(auth)
  }

  const { tenant } = auth

  try {
    const supabase = getSupabaseAdmin()

    // Get current usage (active artisans count)
    const { data: usage } = await supabase
      .from('tenant_usage')
      .select('active_artisans_count')
      .eq('tenant_id', tenant.id)
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      active: ['active', 'trial'].includes(tenant.subscription_status),
      status: tenant.subscription_status,
      plan: tenant.subscription_plan,
      limits: {
        artisans: tenant.allowed_artisans
      },
      usage: {
        artisans: usage?.active_artisans_count || 0
      },
      features: getFeaturesByPlan(tenant.subscription_plan)
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}

function getFeaturesByPlan(plan: string): string[] {
  const features: Record<string, string[]> = {
    basic: ['tokens', 'submissions', 'photos'],
    pro: ['tokens', 'submissions', 'photos', 'reports', 'api_extended'],
    enterprise: ['tokens', 'submissions', 'photos', 'reports', 'api_extended', 'webhooks', 'priority_support']
  }
  return features[plan] || features.basic
}
