import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, getTokenFromRequest } from '@/lib/auth/portal-token'
import { getCRMClient } from '@/lib/crm/client'

/**
 * GET /api/portal/crm/debug
 * 
 * Debug endpoint to test CRM connectivity
 */
export async function GET(request: NextRequest) {
  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    step: 'start'
  }

  try {
    // Step 1: Get token
    const token = getTokenFromRequest(request)
    debug.tokenPresent = !!token
    debug.tokenPrefix = token?.substring(0, 10) + '...'

    if (!token) {
      debug.error = 'No token provided'
      return NextResponse.json(debug)
    }

    // Step 2: Validate token
    debug.step = 'validating_token'
    const validation = await validatePortalToken(request)
    debug.validationSuccess = validation.success
    
    if (!validation.success) {
      debug.validationError = validation.error
      debug.validationStatus = validation.status
      return NextResponse.json(debug)
    }

    debug.artisanId = validation.data.artisanId
    debug.tenantId = validation.data.tenantId
    debug.tokenId = validation.data.tokenId

    // Step 3: Check CRM client config
    debug.step = 'checking_crm_config'
    debug.crmConfig = {
      CRM_API_URL: process.env.CRM_API_URL ? '✓ Set' : '✗ Missing',
      GMBS_PORTAL_KEY_ID: process.env.GMBS_PORTAL_KEY_ID ? '✓ Set' : '✗ Missing',
      GMBS_PORTAL_SECRET: process.env.GMBS_PORTAL_SECRET ? '✓ Set (' + process.env.GMBS_PORTAL_SECRET?.substring(0, 10) + '...)' : '✗ Missing'
    }

    // Step 4: Try to call CRM
    debug.step = 'calling_crm'
    const crmClient = getCRMClient()

    try {
      // Test interventions endpoint
      debug.interventionsCall = 'starting'
      const interventionsResult = await crmClient.getArtisanInterventions(validation.data.artisanId)
      debug.interventionsCall = 'success'
      debug.interventionsCount = interventionsResult.count
    } catch (error) {
      debug.interventionsCall = 'failed'
      debug.interventionsError = error instanceof Error ? error.message : String(error)
    }

    try {
      // Test documents endpoint
      debug.documentsCall = 'starting'
      const documentsResult = await crmClient.getArtisanDocuments(validation.data.artisanId)
      debug.documentsCall = 'success'
      debug.documentsCount = documentsResult.documents?.length || 0
    } catch (error) {
      debug.documentsCall = 'failed'
      debug.documentsError = error instanceof Error ? error.message : String(error)
    }

    debug.step = 'complete'
    return NextResponse.json(debug)

  } catch (error) {
    debug.error = error instanceof Error ? error.message : String(error)
    debug.stack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(debug, { status: 500 })
  }
}
