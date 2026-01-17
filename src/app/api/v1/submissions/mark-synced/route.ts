import { NextRequest, NextResponse } from 'next/server'
import { validateTenantRequest, authErrorResponse } from '@/lib/auth/tenant-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/v1/submissions/mark-synced
 * Mark submissions as synced to CRM
 */
export async function POST(request: NextRequest) {
  const auth = await validateTenantRequest(request, 'submissions:read')
  if (!auth.success) {
    return authErrorResponse(auth)
  }

  const { tenant } = auth
  
  let body: { ids: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }

  // Limit batch size
  if (body.ids.length > 100) {
    return NextResponse.json(
      { error: 'Maximum 100 IDs per request' }, 
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabaseAdmin()

    // Verify that all submissions belong to this tenant
    const { data: submissions } = await supabase
      .from('portal_submissions')
      .select('id')
      .eq('tenant_id', tenant.id)
      .in('id', body.ids)

    const validIds = submissions?.map(s => s.id) || []
    const invalidIds = body.ids.filter(id => !validIds.includes(id))

    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: 'Some submission IDs do not belong to this tenant',
        invalid_ids: invalidIds
      }, { status: 403 })
    }

    // Mark as synced
    const { error } = await supabase
      .from('portal_submissions')
      .update({ 
        synced_to_crm: true, 
        synced_at: new Date().toISOString() 
      })
      .eq('tenant_id', tenant.id)
      .in('id', body.ids)

    if (error) {
      console.error('Mark synced error:', error)
      return NextResponse.json(
        { error: 'Failed to update submissions' }, 
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      tenant_id: tenant.id,
      action: 'submissions.marked_synced',
      resource_type: 'submission',
      details: { count: validIds.length, ids: validIds }
    })

    return NextResponse.json({
      success: true,
      marked_count: validIds.length
    })

  } catch (error) {
    console.error('Mark synced error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
