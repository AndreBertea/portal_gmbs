import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateTenantRequest } from '@/lib/auth/tenant-auth'

/**
 * GET /api/v1/interventions/[interventionId]/report?artisanId={artisanId}
 *
 * Returns the submitted report and photos for a specific intervention.
 * Called by gmbs-crm to display report in CRM modal.
 *
 * Auth: API Key from CRM (validated via tenant-auth)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interventionId: string }> }
) {
  console.log('[portal-report] Request received, headers:', {
    hasKeyId: !!request.headers.get('X-GMBS-Key-Id'),
    hasSecret: !!request.headers.get('X-GMBS-Secret')
  })

  // Valider la requête API depuis le CRM
  const authResult = await validateTenantRequest(request)
  if (!authResult.success) {
    console.error('[portal-report] Auth failed:', authResult.error)
    return NextResponse.json({ error: authResult.error }, { status: 401 })
  }

  console.log('[portal-report] Auth successful, tenant:', authResult.tenant.id)

  const { interventionId } = await params
  const artisanId = request.nextUrl.searchParams.get('artisanId')

  if (!artisanId) {
    return NextResponse.json({ error: 'artisanId required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const tenantId = authResult.tenant.id

  try {
    // Récupérer le rapport soumis le plus récent
    const { data: report, error: reportError } = await supabase
      .from('intervention_reports')
      .select('id, content, status, created_at, submitted_at, photo_ids')
      .eq('tenant_id', tenantId)
      .eq('crm_artisan_id', artisanId)
      .eq('crm_intervention_id', interventionId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (reportError) {
      console.error('[get-report] Error fetching report:', reportError)
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
    }

    if (!report) {
      return NextResponse.json({ report: null, photos: [] }, { status: 200 })
    }

    // Récupérer les photos associées avec URLs signées
    let photos: Array<{
      id: string
      url: string
      filename: string
      comment: string | null
    }> = []

    if (report.photo_ids && Array.isArray(report.photo_ids) && report.photo_ids.length > 0) {
      const { data: photoRecords, error: photoError } = await supabase
        .from('intervention_photos')
        .select('id, storage_path, original_filename, comment')
        .in('id', report.photo_ids)

      if (photoError) {
        console.error('[get-report] Error fetching photos:', photoError)
      } else if (photoRecords) {
        // Générer les URLs signées pour chaque photo
        for (const photo of photoRecords) {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('intervention-photos')
            .createSignedUrl(photo.storage_path, 3600) // Valide 1 heure

          if (signedUrlError) {
            console.error('[get-report] Error creating signed URL:', signedUrlError)
            continue
          }

          if (signedUrlData?.signedUrl) {
            photos.push({
              id: photo.id,
              url: signedUrlData.signedUrl,
              filename: photo.original_filename,
              comment: photo.comment
            })
          }
        }
      }
    }

    return NextResponse.json({
      report: {
        id: report.id,
        content: report.content,
        status: report.status,
        createdAt: report.created_at,
        submittedAt: report.submitted_at
      },
      photos
    })

  } catch (error) {
    console.error('[get-report] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
