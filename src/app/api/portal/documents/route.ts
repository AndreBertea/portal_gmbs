import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validatePortalToken, getTokenFromFormData } from '@/lib/auth/portal-token'
import { hashToken } from '@/lib/crypto/tokens'
import crypto from 'crypto'

const ALLOWED_KINDS = ['kbis', 'assurance', 'cni_recto_verso', 'iban', 'decharge_partenariat']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * GET /api/portal/documents
 * List documents for an artisan
 */
export async function GET(request: NextRequest) {
  const auth = await validatePortalToken(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { tenantId, artisanId } = auth.data
  const supabase = getSupabaseAdmin()

  const { data: documents, error } = await supabase
    .from('artisan_documents')
    .select('id, kind, filename, original_filename, mime_type, file_size, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Documents fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }

  // Transform to simple status format for frontend
  const documentStatuses = documents?.map(doc => ({
    kind: doc.kind,
    uploaded: true,
    filename: doc.original_filename,
    uploadedAt: doc.created_at
  })) || []

  return NextResponse.json({ documents: documentStatuses })
}

/**
 * POST /api/portal/documents
 * Upload a new document
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const token = getTokenFromFormData(formData)
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Validate token manually since we have FormData
    const tokenHash = hashToken(token)
    const supabase = getSupabaseAdmin()

    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('id, tenant_id, crm_artisan_id, is_active, expires_at')
      .eq('token_hash', tokenHash)
      .single()

    if (tokenError || !tokenData || !tokenData.is_active) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    const { tenant_id: tenantId, crm_artisan_id: artisanId, id: tokenId } = tokenData

    // Get file and kind
    const file = formData.get('file') as File | null
    const kind = formData.get('kind') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 })
    }

    if (!kind || !ALLOWED_KINDS.includes(kind)) {
      return NextResponse.json({ 
        error: `Invalid document kind. Allowed: ${ALLOWED_KINDS.join(', ')}` 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    // Validate mime type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed: JPEG, PNG, WebP, HEIC, PDF` 
      }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin'
    const uniqueId = crypto.randomBytes(8).toString('hex')
    const filename = `${kind}_${uniqueId}.${ext}`
    const storagePath = `${tenantId}/${artisanId}/documents/${filename}`

    // Upload to storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('artisan-uploads')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Delete old document of same kind if exists
    const { data: existingDoc } = await supabase
      .from('artisan_documents')
      .select('id, storage_path')
      .eq('tenant_id', tenantId)
      .eq('crm_artisan_id', artisanId)
      .eq('kind', kind)
      .single()

    if (existingDoc) {
      // Delete old file from storage
      await supabase.storage
        .from('artisan-uploads')
        .remove([existingDoc.storage_path])

      // Delete old record
      await supabase
        .from('artisan_documents')
        .delete()
        .eq('id', existingDoc.id)
    }

    // Insert new document record
    const { data: newDoc, error: insertError } = await supabase
      .from('artisan_documents')
      .insert({
        tenant_id: tenantId,
        portal_token_id: tokenId,
        crm_artisan_id: artisanId,
        kind,
        filename,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath
      })
      .select('id, kind, original_filename, created_at')
      .single()

    if (insertError) {
      console.error('Document insert error:', insertError)
      // Try to clean up uploaded file
      await supabase.storage.from('artisan-uploads').remove([storagePath])
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
    }

    // Create submission for CRM sync
    await supabase.from('portal_submissions').insert({
      tenant_id: tenantId,
      portal_token_id: tokenId,
      crm_artisan_id: artisanId,
      type: 'document',
      data: {
        document_id: newDoc.id,
        kind,
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath
      },
      storage_paths: [storagePath]
    })

    return NextResponse.json({
      success: true,
      document: {
        id: newDoc.id,
        kind: newDoc.kind,
        filename: newDoc.original_filename,
        uploadedAt: newDoc.created_at
      }
    })

  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
