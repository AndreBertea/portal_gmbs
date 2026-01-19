'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Camera,
  Plus,
  Loader2,
  Send,
  Trash2,
  Save,
  CheckCircle2
} from '@/components/ui/icons'

interface Photo {
  id: string
  url: string
  filename: string
  comment: string | null
  createdAt: string
}

interface Report {
  id: string
  content: string
  generatedAt: string
  status: 'draft' | 'submitted'
}

interface InterventionReportTabProps {
  token: string
  interventionId: string
  initialReport: Report | null
  initialPhotos: Photo[]
  onReportChange: (report: Report | null) => void
  onPhotosChange: (photos: Photo[]) => void
  onPhotoClick: (url: string) => void
}

export function InterventionReportTab({
  token,
  interventionId,
  initialReport,
  initialPhotos,
  onReportChange,
  onPhotosChange,
  onPhotoClick
}: InterventionReportTabProps) {
  const [content, setContent] = useState(initialReport?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [newPhotoComment, setNewPhotoComment] = useState('')
  const debounceRef = useRef<NodeJS.Timeout>(undefined)

  const isSubmitted = initialReport?.status === 'submitted'
  const photos = initialPhotos

  // Sync content when initialReport changes
  useEffect(() => {
    if (initialReport?.content) {
      setContent(initialReport.content)
    }
  }, [initialReport?.content])

  // Auto-save effect with 2s debounce
  useEffect(() => {
    if (isSubmitted) return
    if (content === initialReport?.content) return
    if (!content.trim()) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      saveDraft(content)
    }, 2000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [content, isSubmitted, initialReport?.content])

  const saveDraft = async (text: string) => {
    if (isSubmitted || !text.trim()) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/portal/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, interventionId, content: text })
      })
      if (res.ok) {
        const data = await res.json()
        onReportChange(data.report)
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitted) return

    // First save the current content
    await saveDraft(content)

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/portal/report/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          interventionId,
          reportId: initialReport?.id
        })
      })

      if (res.ok) {
        onReportChange(initialReport ? { ...initialReport, status: 'submitted' } : null)
        alert('Rapport transmis avec succes !')
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur lors de la soumission')
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Erreur lors de la soumission')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('token', token)
      formData.append('interventionId', interventionId)
      formData.append('comment', newPhotoComment)

      const response = await fetch('/api/portal/photos', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors de l'upload")
      }

      const data = await response.json()
      onPhotosChange([...photos, data.photo])
      setNewPhotoComment('')
    } catch (error: unknown) {
      console.error('Erreur upload photo:', error)
      const message = error instanceof Error ? error.message : "Erreur lors de l'upload de la photo"
      alert(message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Supprimer cette photo ?')) return

    try {
      const response = await fetch(`/api/portal/photos/${photoId}?token=${token}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onPhotosChange(photos.filter(p => p.id !== photoId))
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur suppression photo:', error)
    }
  }

  const formatLastSaved = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status badge + last saved */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5",
          isSubmitted
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        )}>
          {isSubmitted ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Transmis
            </>
          ) : (
            'Brouillon'
          )}
        </span>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {isSaving && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Enregistrement...
            </span>
          )}
          {!isSaving && lastSaved && (
            <span>Sauvegarde auto a {formatLastSaved(lastSaved)}</span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitted}
          placeholder="Decrivez les travaux realises..."
          className={cn(
            "w-full min-h-[250px] p-4 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors",
            isSubmitted
              ? "bg-slate-50 text-slate-600 cursor-not-allowed"
              : "bg-white text-slate-900"
          )}
        />
        <div className="text-xs text-slate-400 text-right mt-1">
          {content.length} caracteres
        </div>
      </div>

      {/* Artisan Photos Section */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h3 className="font-medium text-sm text-slate-900 flex items-center gap-2 mb-3">
          <Camera className="h-4 w-4 text-blue-600" />
          Mes photos
          {photos.length > 0 && (
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {photos.length}
            </span>
          )}
        </h3>

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer"
                  onClick={() => onPhotoClick(photo.url)}
                />
                {!isSubmitted && (
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {photo.comment && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg line-clamp-2">
                    {photo.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Photo upload zone - only if not submitted */}
        {!isSubmitted && (
          <div className="space-y-2">
            <textarea
              placeholder="Commentaire pour la photo (optionnel)..."
              value={newPhotoComment}
              onChange={(e) => setNewPhotoComment(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
              rows={2}
            />
            <label className={cn(
              "flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-white",
              isUploadingPhoto && "opacity-50 cursor-wait"
            )}>
              {isUploadingPhoto ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <>
                  <Plus className="h-5 w-5 text-slate-400" />
                  <span className="text-sm text-slate-600">Ajouter une photo</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                disabled={isUploadingPhoto}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handlePhotoUpload(file)
                  }
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Actions - only if not submitted */}
      {!isSubmitted && (
        <div className="flex gap-3">
          <button
            onClick={() => saveDraft(content)}
            disabled={isSaving || !content.trim()}
            className={cn(
              "flex-1 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
              isSaving || !content.trim()
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer brouillon
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
              isSubmitting || !content.trim()
                ? "bg-blue-300 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Transmettre
          </button>
        </div>
      )}
    </div>
  )
}
