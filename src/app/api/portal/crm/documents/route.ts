import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, getTokenFromRequest } from '@/lib/auth/portal-token'
import { getCRMClient } from '@/lib/crm/client'

/**
 * GET /api/portal/crm/documents
 * 
 * Returns legal documents for the authenticated artisan from the CRM.
 */
export async function GET(request: NextRequest) {
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
    const result = await crmClient.getArtisanDocuments(artisanId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[portal/crm/documents] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'CRM error'
    }, { status: 500 })
  }
}

/**
 * POST /api/portal/crm/documents
 * 
 * Upload a legal document for the artisan to the CRM.
 */
export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }

  const validation = await validatePortalToken(request)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  const { artisanId } = validation.data

  let body: {
    kind: string
    filename: string
    mimeType: string
    base64Data: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.kind || !body.filename || !body.mimeType || !body.base64Data) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const crmClient = getCRMClient()
    const result = await crmClient.uploadArtisanDocument(artisanId, body)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[portal/crm/documents] Upload error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'CRM error',
      details: error instanceof Error ? error.stack : undefined,
      artisanId,
      crmUrl: process.env.CRM_API_URL || 'NOT SET'
    }, { status: 500 })
  }
}
