import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/crypto/tokens'
import crypto from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * GET /api/portal/photos
 * List photos for an intervention
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const interventionId = searchParams.get('interventionId')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  if (!interventionId) {
    return NextResponse.json({ error: 'interventionId required' }, { status: 400 })
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

  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 })
  }

  const { tenant_id: tenantId, crm_artisan_id: artisanId } = tokenData

  // Get photos
  const { data: photos, error } = await supabase
    .from('intervention_photos')
    .select('id, original_filename, mime_type, comment, storage_path, created_at')
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .eq('crm_intervention_id', interventionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Photos fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }

  // Generate signed URLs for photos
  const photosWithUrls = await Promise.all(
    (photos || []).map(async (photo) => {
      const { data: signedUrl } = await supabase.storage
        .from('artisan-uploads')
        .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry

      return {
        id: photo.id,
        filename: photo.original_filename,
        url: signedUrl?.signedUrl || null,
        comment: photo.comment,
        createdAt: photo.created_at
      }
    })
  )

  return NextResponse.json({ photos: photosWithUrls })
}

/**
 * POST /api/portal/photos
 * Upload a new photo
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const token = formData.get('token') as string | null
    const interventionId = formData.get('interventionId') as string | null
    const comment = formData.get('comment') as string | null
    const file = formData.get('file') as File | null

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    if (!interventionId) {
      return NextResponse.json({ error: 'interventionId required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 })
    }

    // Validate token
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

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed: JPEG, PNG, WebP, HEIC` 
      }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const uniqueId = crypto.randomBytes(8).toString('hex')
    const timestamp = Date.now()
    const filename = `photo_${timestamp}_${uniqueId}.${ext}`
    const storagePath = `${tenantId}/${artisanId}/interventions/${interventionId}/${filename}`

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

    // Insert photo record
    const { data: newPhoto, error: insertError } = await supabase
      .from('intervention_photos')
      .insert({
        tenant_id: tenantId,
        portal_token_id: tokenId,
        crm_artisan_id: artisanId,
        crm_intervention_id: interventionId,
        filename,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        comment: comment || null
      })
      .select('id, original_filename, comment, created_at')
      .single()

    if (insertError) {
      console.error('Photo insert error:', insertError)
      await supabase.storage.from('artisan-uploads').remove([storagePath])
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    // Create submission for CRM sync
    await supabase.from('portal_submissions').insert({
      tenant_id: tenantId,
      portal_token_id: tokenId,
      crm_artisan_id: artisanId,
      crm_intervention_id: interventionId,
      type: 'photo',
      data: {
        photo_id: newPhoto.id,
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        comment: comment || null
      },
      storage_paths: [storagePath]
    })

    // Get signed URL
    const { data: signedUrl } = await supabase.storage
      .from('artisan-uploads')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({
      success: true,
      photo: {
        id: newPhoto.id,
        filename: newPhoto.original_filename,
        url: signedUrl?.signedUrl || null,
        comment: newPhoto.comment,
        createdAt: newPhoto.created_at
      }
    })

  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
