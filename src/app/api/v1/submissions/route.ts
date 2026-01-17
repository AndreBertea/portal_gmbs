import { NextRequest, NextResponse } from 'next/server'
import { validateTenantRequest, authErrorResponse } from '@/lib/auth/tenant-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/v1/submissions
 * Retrieve submissions to sync (pull model)
 */
export async function GET(request: NextRequest) {
  const auth = await validateTenantRequest(request, 'submissions:read')
  if (!auth.success) {
    return authErrorResponse(auth)
  }

  const { tenant } = auth
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')
  const onlyUnsynced = searchParams.get('unsynced') !== 'false'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('portal_submissions')
      .select(`
        id,
        type,
        crm_artisan_id,
        crm_intervention_id,
        data,
        storage_paths,
        synced_to_crm,
        created_at
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (onlyUnsynced) {
      query = query.eq('synced_to_crm', false)
    }

    if (since) {
      query = query.gt('created_at', since)
    }

    const { data: submissions, error } = await query

    if (error) {
      console.error('Submissions fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch submissions' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      submissions: submissions || [],
      count: submissions?.length || 0,
      has_more: submissions?.length === limit
    })

  } catch (error) {
    console.error('Submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/submissions
 * Create a new submission (used internally by portal UI)
 * Note: This endpoint is also called by the portal UI with token auth
 */
export async function POST(_request: NextRequest) {
  // For internal portal submissions, we use a different auth mechanism
  // This will be implemented when we build the portal UI
  return NextResponse.json(
    { error: 'Not implemented - use portal UI' }, 
    { status: 501 }
  )
}
