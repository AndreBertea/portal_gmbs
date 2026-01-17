import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/crypto/tokens'

interface RouteParams {
  params: Promise<{ photoId: string }>
}

/**
 * DELETE /api/portal/photos/:photoId
 * Delete a photo
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { photoId } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  if (!photoId) {
    return NextResponse.json({ error: 'Photo ID required' }, { status: 400 })
  }

  const tokenHash = hashToken(token)
  const supabase = getSupabaseAdmin()

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('portal_tokens')
    .select('id, tenant_id, crm_artisan_id, is_active')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !tokenData || !tokenData.is_active) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { tenant_id: tenantId, crm_artisan_id: artisanId } = tokenData

  // Get photo to verify ownership and get storage path
  const { data: photo, error: photoError } = await supabase
    .from('intervention_photos')
    .select('id, storage_path, synced_to_crm')
    .eq('id', photoId)
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .single()

  if (photoError || !photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  // Don't allow deletion if already synced to CRM
  if (photo.synced_to_crm) {
    return NextResponse.json({ 
      error: 'Cannot delete photo that has been synced to CRM' 
    }, { status: 400 })
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('artisan-uploads')
    .remove([photo.storage_path])

  if (storageError) {
    console.error('Storage delete error:', storageError)
    // Continue anyway - file might already be deleted
  }

  // Delete record
  const { error: deleteError } = await supabase
    .from('intervention_photos')
    .delete()
    .eq('id', photoId)

  if (deleteError) {
    console.error('Photo delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }

  // Delete related submission if not synced
  await supabase
    .from('portal_submissions')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('type', 'photo')
    .eq('synced_to_crm', false)
    .contains('data', { photo_id: photoId })

  return NextResponse.json({ success: true })
}

/**
 * PATCH /api/portal/photos/:photoId
 * Update photo comment
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { photoId } = await params
  
  let body: { token: string; comment: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token, comment } = body

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const tokenHash = hashToken(token)
  const supabase = getSupabaseAdmin()

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('portal_tokens')
    .select('id, tenant_id, crm_artisan_id, is_active')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !tokenData || !tokenData.is_active) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { tenant_id: tenantId, crm_artisan_id: artisanId } = tokenData

  // Update photo
  const { data: photo, error: updateError } = await supabase
    .from('intervention_photos')
    .update({ comment })
    .eq('id', photoId)
    .eq('tenant_id', tenantId)
    .eq('crm_artisan_id', artisanId)
    .select('id, comment')
    .single()

  if (updateError || !photo) {
    return NextResponse.json({ error: 'Photo not found or update failed' }, { status: 404 })
  }

  return NextResponse.json({ success: true, photo })
}
