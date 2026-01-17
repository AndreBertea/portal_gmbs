import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/crypto/tokens'

/**
 * GET /api/portal/report
 * Get existing report for an intervention
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const interventionId = searchParams.get('interventionId')

  if (!token || !interventionId) {
    return NextResponse.json({ error: 'Token and interventionId required' }, { status: 400 })
  }

  const tokenHash = hashToken(token)
  const supabase = getSupabaseAdmin()

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('portal_tokens')
    .select('id, tenant_id, crm_artisan_id, is_active, expires_at')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !tokenData || !tokenData.is_active) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { tenant_id: tenantId, crm_artisan_id: artisanId } = tokenData

  // Get latest report
  const { data: report, error } = await supabase
    .from('intervention_reports')
    .select('id, content, status, created_at, submitted_at')
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .eq('crm_intervention_id', interventionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Report fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }

  if (!report) {
    return NextResponse.json({ report: null })
  }

  return NextResponse.json({
    report: {
      id: report.id,
      content: report.content,
      status: report.status,
      generatedAt: report.created_at,
      submittedAt: report.submitted_at
    }
  })
}

/**
 * POST /api/portal/report
 * Generate a new report for an intervention
 */
export async function POST(request: NextRequest) {
  let body: { token: string; interventionId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token, interventionId } = body

  if (!token || !interventionId) {
    return NextResponse.json({ error: 'Token and interventionId required' }, { status: 400 })
  }

  const tokenHash = hashToken(token)
  const supabase = getSupabaseAdmin()

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('portal_tokens')
    .select('id, tenant_id, crm_artisan_id, metadata, is_active')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !tokenData || !tokenData.is_active) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { tenant_id: tenantId, crm_artisan_id: artisanId, id: tokenId, metadata } = tokenData
  const artisanName = (metadata as Record<string, unknown>)?.name || 'Artisan'

  // Get photos for this intervention
  const { data: photos, error: photosError } = await supabase
    .from('intervention_photos')
    .select('id, original_filename, comment, created_at')
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .eq('crm_intervention_id', interventionId)
    .order('created_at', { ascending: true })

  if (photosError) {
    console.error('Photos fetch error:', photosError)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }

  if (!photos || photos.length === 0) {
    return NextResponse.json({ 
      error: 'Ajoutez au moins une photo avant de générer le rapport' 
    }, { status: 400 })
  }

  // Generate report content
  // TODO: Replace with actual AI generation (OpenAI) when API key is provided
  const reportContent = generateMockReport(interventionId, artisanName as string, photos)

  // Check if existing draft report - update instead of create
  const { data: existingReport } = await supabase
    .from('intervention_reports')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .eq('crm_intervention_id', interventionId)
    .eq('status', 'draft')
    .single()

  let report
  if (existingReport) {
    // Update existing draft
    const { data, error } = await supabase
      .from('intervention_reports')
      .update({
        content: reportContent,
        photo_ids: photos.map(p => p.id),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingReport.id)
      .select('id, content, status, created_at')
      .single()

    if (error) {
      console.error('Report update error:', error)
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    }
    report = data
  } else {
    // Create new report
    const { data, error } = await supabase
      .from('intervention_reports')
      .insert({
        tenant_id: tenantId,
        portal_token_id: tokenId,
        crm_artisan_id: artisanId,
        crm_intervention_id: interventionId,
        content: reportContent,
        photo_ids: photos.map(p => p.id),
        status: 'draft'
      })
      .select('id, content, status, created_at')
      .single()

    if (error) {
      console.error('Report insert error:', error)
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
    }
    report = data
  }

  return NextResponse.json({
    report: {
      id: report.id,
      content: report.content,
      status: report.status,
      generatedAt: report.created_at
    }
  })
}

/**
 * Generate a mock report (to be replaced with AI)
 */
function generateMockReport(
  interventionId: string, 
  artisanName: string, 
  photos: { id: string; original_filename: string; comment: string | null; created_at: string }[]
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })

  const photoDescriptions = photos.map((photo, index) => {
    const photoDate = new Date(photo.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `  ${index + 1}. ${photo.original_filename} (${photoDate})${photo.comment ? ` - ${photo.comment}` : ''}`
  }).join('\n')

  return `RAPPORT D'INTERVENTION
=====================

Référence: ${interventionId}
Date: ${dateStr}
Artisan: ${artisanName}

DESCRIPTION DES TRAVAUX RÉALISÉS
--------------------------------
L'intervention a été réalisée conformément aux consignes reçues.

Les travaux suivants ont été effectués :
- Diagnostic initial de la situation
- Réalisation des travaux nécessaires
- Vérification du bon fonctionnement
- Nettoyage de la zone d'intervention

PHOTOS JOINTES (${photos.length})
--------------------------------
${photoDescriptions}

OBSERVATIONS
------------
L'intervention s'est déroulée dans de bonnes conditions.
Le client a été informé des travaux réalisés.

CONCLUSION
----------
Intervention réalisée avec succès.

---
Rapport généré automatiquement le ${dateStr}
Ce rapport sera transmis au gestionnaire pour validation.`
}
