import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, getTokenFromRequest } from '@/lib/auth/portal-token'
import { getCRMClient } from '@/lib/crm/client'

/**
 * GET /api/portal/crm/interventions/[interventionId]/report
 * 
 * Returns the existing artisan report for an intervention from the CRM.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interventionId: string }> }
) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }

  const validation = await validatePortalToken(request)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  const { artisanId } = validation.data
  const { interventionId } = await params

  try {
    const crmClient = getCRMClient()
    const result = await crmClient.getInterventionReport(interventionId, artisanId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[portal/crm/report] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'CRM error'
    }, { status: 500 })
  }
}

/**
 * POST /api/portal/crm/interventions/[interventionId]/report
 * 
 * Submit a report for an intervention to the CRM.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ interventionId: string }> }
) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }

  const validation = await validatePortalToken(request)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  const { artisanId } = validation.data
  const { interventionId } = await params

  let body: {
    content: string
    photos?: Array<{
      filename: string
      mimeType: string
      comment?: string
      base64Data: string
    }>
    status?: 'draft' | 'submitted'
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.content) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  try {
    const crmClient = getCRMClient()
    const result = await crmClient.submitInterventionReport(interventionId, {
      artisanId,
      content: body.content,
      photos: body.photos,
      status: body.status || 'submitted'
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[portal/crm/report] Submit error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'CRM error'
    }, { status: 500 })
  }
}
