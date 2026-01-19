import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, getTokenFromRequest } from '@/lib/auth/portal-token'
import { getCRMClient } from '@/lib/crm/client'

/**
 * GET /api/portal/crm/interventions/[interventionId]/documents
 * 
 * Returns documents (devis, factures, photos) for an intervention from the CRM.
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
    const result = await crmClient.getInterventionDocuments(interventionId, artisanId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[portal/crm/documents] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'CRM error'
    }, { status: 500 })
  }
}
