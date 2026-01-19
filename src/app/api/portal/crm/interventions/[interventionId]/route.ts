import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, getTokenFromRequest } from '@/lib/auth/portal-token'
import { getCRMClient } from '@/lib/crm/client'

/**
 * GET /api/portal/crm/interventions/[interventionId]
 * 
 * Returns detailed intervention data with documents from the CRM.
 * Includes: intervention info + photos, devis, factures artisans
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
    const result = await crmClient.getInterventionDetail(interventionId, artisanId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[portal/crm/intervention] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'CRM error'
    }, { status: 500 })
  }
}
