'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { usePortalContext } from '../../layout'
import { cn, formatDate } from '@/lib/utils'
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Briefcase,
  CheckCircle2,
  FileText,
  Camera,
  Plus,
  Loader2,
  Send,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DocumentPreview } from '@/components/ui/document-preview'

// =============================================================================
// TYPES
// =============================================================================

interface InterventionDetail {
  id: string
  id_inter: string | null
  context: string | null
  consigne: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  date: string | null
  due_date: string | null
  status: {
    code: string | null
    label: string | null
    color: string | null
  } | null
  metier: {
    label: string | null
  } | null
  sharedDocuments: {
    type: string
    label: string
    url: string | null
  }[]
}

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

// =============================================================================
// PAGE
// =============================================================================

export default function InterventionDetailPage() {
  const { token } = usePortalContext()
  const router = useRouter()
  const params = useParams()
  const interventionId = params.interventionId as string

  const [intervention, setIntervention] = useState<InterventionDetail | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [newPhotoComment, setNewPhotoComment] = useState('')
  const [showConsigne, setShowConsigne] = useState(true)
  const [showSharedDocs, setShowSharedDocs] = useState(false)

  // Load intervention details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch photos
        const photosRes = await fetch(`/api/portal/photos?token=${token}&interventionId=${interventionId}`)
        if (photosRes.ok) {
          const photosData = await photosRes.json()
          setPhotos(photosData.photos || [])
        }

        // Fetch report
        const reportRes = await fetch(`/api/portal/report?token=${token}&interventionId=${interventionId}`)
        if (reportRes.ok) {
          const reportData = await reportRes.json()
          setReport(reportData.report || null)
        }

        // TODO: Fetch intervention details from CRM via portal API
        // For now, use mock data for intervention info
        setIntervention({
          id: interventionId,
          id_inter: interventionId.startsWith('mock') ? 'INT-2024-001' : interventionId,
          context: 'Intervention',
          consigne: null,
          address: null,
          city: null,
          postal_code: null,
          date: null,
          due_date: null,
          status: { code: 'INTER_EN_COURS', label: 'En cours', color: '#3b82f6' },
          metier: null,
          sharedDocuments: []
        })
      } catch (error) {
        console.error('Erreur chargement intervention:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (token && interventionId) {
      fetchDetails()
    }
  }, [token, interventionId])

  // Upload photo
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
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()
      setPhotos(prev => [...prev, data.photo])
      setNewPhotoComment('')
    } catch (error: unknown) {
      console.error('Erreur upload photo:', error)
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'upload de la photo'
      alert(message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // Delete photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Supprimer cette photo ?')) return

    try {
      const response = await fetch(`/api/portal/photos/${photoId}?token=${token}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoId))
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur suppression photo:', error)
    }
  }

  // Generate AI report
  const handleGenerateReport = async () => {
    if (photos.length === 0) {
      alert('Ajoutez au moins une photo avant de générer le rapport')
      return
    }

    setIsGeneratingReport(true)

    try {
      const response = await fetch('/api/portal/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, interventionId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      const data = await response.json()
      setReport(data.report)
    } catch (error: unknown) {
      console.error('Erreur génération rapport:', error)
      const message = error instanceof Error ? error.message : 'Erreur lors de la génération du rapport'
      alert(message)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Submit report
  const handleSubmitReport = async () => {
    if (!report) return

    try {
      const response = await fetch('/api/portal/report/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          interventionId, 
          reportId: report.id 
        }),
      })

      if (response.ok) {
        setReport(prev => prev ? { ...prev, status: 'submitted' } : null)
        alert('Rapport transmis avec succès !')
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la soumission')
      }
    } catch (error) {
      console.error('Erreur soumission rapport:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!intervention) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="font-semibold text-slate-900 mb-2">
          Intervention introuvable
        </h2>
        <button
          onClick={() => router.back()}
          className="text-blue-600 text-sm hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Retour</span>
      </button>

      {/* Main intervention card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 mb-1">
            {intervention.id_inter && (
              <span className="text-xs font-mono text-slate-400">
                #{intervention.id_inter}
              </span>
            )}
            {intervention.status?.label && (
              <span 
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ 
                  backgroundColor: intervention.status.color ? `${intervention.status.color}20` : '#e5e7eb',
                  color: intervention.status.color || '#6b7280'
                }}
              >
                {intervention.status.label}
              </span>
            )}
          </div>
          <h1 className="font-semibold text-slate-900">
            {intervention.context || 'Intervention'}
          </h1>
        </div>

        {/* Metadata */}
        <div className="p-4 space-y-3 border-b border-slate-100">
          {(intervention.address || intervention.city) && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Adresse</p>
                <p className="text-sm text-slate-900">
                  {intervention.address}
                  {intervention.city && (
                    <span className="block text-slate-600">
                      {[intervention.postal_code, intervention.city].filter(Boolean).join(' ')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {intervention.date && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Date prévue</p>
                <p className="text-sm text-slate-900">{formatDate(intervention.date)}</p>
              </div>
            </div>
          )}

          {intervention.metier?.label && (
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Métier</p>
                <p className="text-sm text-slate-900">{intervention.metier.label}</p>
              </div>
            </div>
          )}
        </div>

        {/* Consignes (collapsible) */}
        {intervention.consigne && (
          <div className="border-b border-slate-100">
            <button
              onClick={() => setShowConsigne(!showConsigne)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-sm text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Consignes
              </span>
              {showConsigne ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {showConsigne && (
              <div className="px-4 pb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {intervention.consigne}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shared documents from CRM */}
        {intervention.sharedDocuments && intervention.sharedDocuments.length > 0 && (
          <div className="border-b border-slate-100">
            <button
              onClick={() => setShowSharedDocs(!showSharedDocs)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-sm text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Documents CRM
                <span className="text-xs text-slate-400 font-normal">(lecture seule)</span>
              </span>
              {showSharedDocs ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {showSharedDocs && (
              <div className="px-4 pb-4 space-y-2">
                <TooltipProvider>
                  {intervention.sharedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700 flex-1">{doc.label}</span>
                      {doc.url ? (
                        <Tooltip>
                          <Popover>
                            <PopoverTrigger asChild>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 p-0"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                            </PopoverTrigger>
                            <TooltipContent side="top" className="text-[10px]">Aperçu</TooltipContent>
                            <PopoverContent className="w-auto p-1.5" side="left" align="center">
                              <div className="flex flex-col overflow-hidden rounded border border-slate-200 bg-white" style={{ width: '320px', height: '280px' }}>
                                <div className="flex-none px-3 pt-2">
                                  <h4 className="text-xs font-semibold truncate text-slate-900">{doc.label}</h4>
                                  <p className="text-[10px] text-slate-500">{doc.type}</p>
                                </div>
                                <div className="flex-1 overflow-hidden px-3 pb-2 pt-1">
                                  <DocumentPreview
                                    url={doc.url}
                                    filename={doc.label}
                                    className="flex h-full w-full items-stretch justify-center overflow-hidden rounded border border-slate-200 bg-slate-50"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-slate-400">Non disponible</span>
                      )}
                    </div>
                  ))}
                </TooltipProvider>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photos Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-600" />
            Photos de l&apos;intervention
            {photos.length > 0 && (
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {photos.length}
              </span>
            )}
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {photo.comment && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg line-clamp-2">
                      {photo.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Photo upload zone */}
          <div className="space-y-2">
            <textarea
              placeholder="Commentaire pour la photo (optionnel)..."
              value={newPhotoComment}
              onChange={(e) => setNewPhotoComment(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              rows={2}
            />
            <label className={cn(
              "flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors",
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
        </div>
      </div>

      {/* Report Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Rapport d&apos;intervention
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {report ? (
            <>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">
                    Généré le {formatDate(report.generatedAt, { withTime: true })}
                  </span>
                  {report.status === 'submitted' ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Transmis
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Brouillon
                    </span>
                  )}
                </div>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {report.content}
                </div>
              </div>

              {report.status !== 'submitted' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingReport ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      'Régénérer'
                    )}
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Transmettre
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">
                {photos.length === 0 
                  ? 'Ajoutez des photos pour générer un rapport'
                  : 'Générez un rapport basé sur vos photos'}
              </p>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport || photos.length === 0}
                className={cn(
                  "py-2 px-6 rounded-lg text-sm font-medium transition-colors",
                  photos.length > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {isGeneratingReport ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération en cours...
                  </span>
                ) : (
                  'Générer le rapport'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
