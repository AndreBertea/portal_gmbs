import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/crypto/tokens'

/**
 * POST /api/portal/report/submit
 * Submit a report to the CRM
 */
export async function POST(request: NextRequest) {
  let body: { token: string; interventionId: string; reportId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token, interventionId, reportId } = body

  if (!token || !interventionId || !reportId) {
    return NextResponse.json({ 
      error: 'Token, interventionId and reportId required' 
    }, { status: 400 })
  }

  const tokenHash = hashToken(token)
  const supabase = getSupabaseAdmin()

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('portal_tokens')
    .select('id, tenant_id, crm_artisan_id, is_active')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !tokenData || !tokenData.is_active) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { tenant_id: tenantId, crm_artisan_id: artisanId, id: tokenId } = tokenData

  // Get report and verify ownership
  const { data: report, error: reportError } = await supabase
    .from('intervention_reports')
    .select('id, content, status, photo_ids')
    .eq('id', reportId)
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .eq('crm_intervention_id', interventionId)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (report.status === 'submitted') {
    return NextResponse.json({ 
      error: 'Report already submitted' 
    }, { status: 400 })
  }

  // Update report status
  const { error: updateError } = await supabase
    .from('intervention_reports')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId)

  if (updateError) {
    console.error('Report submit error:', updateError)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }

  // Get associated photos storage paths
  const { data: photos } = await supabase
    .from('intervention_photos')
    .select('id, storage_path')
    .in('id', report.photo_ids || [])

  const storagePaths = photos?.map(p => p.storage_path) || []

  // Create submission for CRM sync
  const { error: submissionError } = await supabase
    .from('portal_submissions')
    .insert({
      tenant_id: tenantId,
      portal_token_id: tokenId,
      crm_artisan_id: artisanId,
      crm_intervention_id: interventionId,
      type: 'report',
      data: {
        report_id: reportId,
        content: report.content,
        photo_ids: report.photo_ids,
        photo_count: report.photo_ids?.length || 0
      },
      storage_paths: storagePaths
    })

  if (submissionError) {
    console.error('Submission create error:', submissionError)
    // Don't fail - report is already submitted
  }

  // Mark associated photos as synced (they're part of the report now)
  if (report.photo_ids && report.photo_ids.length > 0) {
    await supabase
      .from('intervention_photos')
      .update({ synced_to_crm: true, synced_at: new Date().toISOString() })
      .in('id', report.photo_ids)
  }

  return NextResponse.json({
    success: true,
    message: 'Rapport transmis avec succès'
  })
}
