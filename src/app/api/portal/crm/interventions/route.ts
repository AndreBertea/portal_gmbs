import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, getTokenFromRequest } from '@/lib/auth/portal-token'
import { getCRMClient } from '@/lib/crm/client'

/**
 * GET /api/portal/crm/interventions
 * 
 * Returns interventions for the authenticated artisan from the CRM.
 * Requires portal token in header or query param.
 */
export async function GET(request: NextRequest) {
  // Validate portal token
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }

  const validation = await validatePortalToken(request)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  const { artisanId } = validation.data

  try {
    const crmClient = getCRMClient()
    const result = await crmClient.getArtisanInterventions(artisanId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[portal/crm/interventions] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'CRM error'
    }, { status: 500 })
  }
}
