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
  Eye,
  User,
  Phone,
  Building2,
  Download,
  Receipt
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
  client_name: string | null
  owner_name: string | null
  owner_phone: string | null
  metier: string | null
  status: {
    code: string | null
    label: string | null
  } | null
}

interface CRMPhoto {
  id: string
  url: string
  filename: string | null
  mime_type: string | null
  created_at: string
  created_by_display: string | null
}

interface CRMDocument {
  id: string
  url: string
  filename: string | null
  mime_type: string | null
  file_size: number | null
  created_at: string
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
// HELPERS
// =============================================================================

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getStatusColor = (code: string | null): string => {
  switch (code?.toUpperCase()) {
    case 'ACCEPTE':
    case 'INTER_EN_COURS':
      return '#3b82f6' // blue
    case 'INTER_TERMINEE':
      return '#22c55e' // green
    case 'DEMANDE':
    case 'DEVIS_ENVOYE':
    case 'VISITE_TECHNIQUE':
      return '#f59e0b' // amber
    default:
      return '#6b7280' // gray
  }
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
  const [crmPhotos, setCrmPhotos] = useState<CRMPhoto[]>([])
  const [crmDevis, setCrmDevis] = useState<CRMDocument[]>([])
  const [crmFactures, setCrmFactures] = useState<CRMDocument[]>([])
  const [artisanPhotos, setArtisanPhotos] = useState<Photo[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [newPhotoComment, setNewPhotoComment] = useState('')
  const [showConsigne, setShowConsigne] = useState(true)
  const [showCrmPhotos, setShowCrmPhotos] = useState(true)
  const [showCrmDocs, setShowCrmDocs] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  // Load intervention details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch intervention details from CRM
        const interventionRes = await fetch(`/api/portal/crm/interventions/${interventionId}?token=${token}`)
        if (interventionRes.ok) {
          const data = await interventionRes.json()
          
          // Map intervention data
          const int = data.intervention
          setIntervention({
            id: int.id,
            id_inter: int.id_inter,
            context: int.context || int.name,
            consigne: int.consigne,
            address: int.address,
            city: int.city,
            postal_code: int.postal_code,
            date: int.date || int.createdAt,
            due_date: int.dueAt,
            client_name: int.client_name,
            owner_name: int.owner_name,
            owner_phone: int.owner_phone,
            metier: int.metier,
            status: {
              code: int.statusCode || int.status,
              label: int.statusLabel
            }
          })

          // Set CRM documents
          if (data.documents) {
            setCrmPhotos(data.documents.photos || [])
            setCrmDevis(data.documents.devis || [])
            setCrmFactures(data.documents.facturesArtisans || [])
          }
        }

        // Fetch artisan's uploaded photos (separate from CRM photos)
        const photosRes = await fetch(`/api/portal/photos?token=${token}&interventionId=${interventionId}`)
        if (photosRes.ok) {
          const photosData = await photosRes.json()
          setArtisanPhotos(photosData.photos || [])
        }

        // Fetch report
        const reportRes = await fetch(`/api/portal/report?token=${token}&interventionId=${interventionId}`)
        if (reportRes.ok) {
          const reportData = await reportRes.json()
          setReport(reportData.report || null)
        }
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
      setArtisanPhotos(prev => [...prev, data.photo])
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
        setArtisanPhotos(prev => prev.filter(p => p.id !== photoId))
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
    if (artisanPhotos.length === 0) {
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

  const statusColor = getStatusColor(intervention.status?.code ?? null)

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
                  backgroundColor: `${statusColor}20`,
                  color: statusColor
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
          {/* Address */}
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

          {/* Owner */}
          {intervention.owner_name && (
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Propriétaire</p>
                <p className="text-sm text-slate-900">{intervention.owner_name}</p>
              </div>
            </div>
          )}

          {/* Owner Phone */}
          {intervention.owner_phone && (
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Téléphone</p>
                <a 
                  href={`tel:${intervention.owner_phone}`}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  {intervention.owner_phone}
                </a>
              </div>
            </div>
          )}

          {/* Client */}
          {intervention.client_name && (
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Client / Agence</p>
                <p className="text-sm text-slate-900">{intervention.client_name}</p>
              </div>
            </div>
          )}

          {/* Date */}
          {intervention.date && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Date prévue</p>
                <p className="text-sm text-slate-900">{formatDate(intervention.date)}</p>
              </div>
            </div>
          )}

          {/* Metier */}
          {intervention.metier && (
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Métier</p>
                <p className="text-sm text-slate-900">{intervention.metier}</p>
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
      </div>

      {/* CRM Photos Section (from gestionnaire) */}
      {crmPhotos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowCrmPhotos(!showCrmPhotos)}
            className="w-full p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between"
          >
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-600" />
              Photos du gestionnaire
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {crmPhotos.length}
              </span>
            </h2>
            {showCrmPhotos ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showCrmPhotos && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {crmPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedPhoto(photo.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.filename || 'Photo'}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {photo.created_by_display && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg">
                        {photo.created_by_display}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CRM Documents Section (devis, factures) */}
      {(crmDevis.length > 0 || crmFactures.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowCrmDocs(!showCrmDocs)}
            className="w-full p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between"
          >
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Documents
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {crmDevis.length + crmFactures.length}
              </span>
            </h2>
            {showCrmDocs ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showCrmDocs && (
            <div className="p-4 space-y-4">
              {/* Devis */}
              {crmDevis.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Devis
                  </h3>
                  <div className="space-y-2">
                    <TooltipProvider>
                      {crmDevis.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {doc.filename || 'Devis'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(doc.created_at, { short: true })}
                              {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                </PopoverTrigger>
                                <TooltipContent>Aperçu</TooltipContent>
                                <PopoverContent className="w-auto p-1.5" side="left">
                                  <div className="flex flex-col overflow-hidden rounded border border-slate-200 bg-white" style={{ width: '350px', height: '400px' }}>
                                    <div className="flex-1 overflow-hidden p-2">
                                      <DocumentPreview
                                        url={doc.url}
                                        filename={doc.filename || 'Devis'}
                                        className="flex h-full w-full items-stretch justify-center overflow-hidden rounded border border-slate-200 bg-slate-50"
                                      />
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a 
                                  href={doc.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors"
                                >
                                  <Download className="h-4 w-4 text-slate-600" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Télécharger</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              )}

              {/* Factures */}
              {crmFactures.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Factures Artisan
                  </h3>
                  <div className="space-y-2">
                    <TooltipProvider>
                      {crmFactures.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Receipt className="h-5 w-5 text-green-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {doc.filename || 'Facture'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(doc.created_at, { short: true })}
                              {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                </PopoverTrigger>
                                <TooltipContent>Aperçu</TooltipContent>
                                <PopoverContent className="w-auto p-1.5" side="left">
                                  <div className="flex flex-col overflow-hidden rounded border border-slate-200 bg-white" style={{ width: '350px', height: '400px' }}>
                                    <div className="flex-1 overflow-hidden p-2">
                                      <DocumentPreview
                                        url={doc.url}
                                        filename={doc.filename || 'Facture'}
                                        className="flex h-full w-full items-stretch justify-center overflow-hidden rounded border border-slate-200 bg-slate-50"
                                      />
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a 
                                  href={doc.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors"
                                >
                                  <Download className="h-4 w-4 text-slate-600" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Télécharger</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Artisan Photos Section (uploaded by artisan) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-600" />
            Mes photos
            {artisanPhotos.length > 0 && (
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {artisanPhotos.length}
              </span>
            )}
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Photo grid */}
          {artisanPhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {artisanPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-32 object-cover rounded-lg cursor-pointer"
                    onClick={() => setSelectedPhoto(photo.url)}
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
                {artisanPhotos.length === 0 
                  ? 'Ajoutez des photos pour générer un rapport'
                  : 'Générez un rapport basé sur vos photos'}
              </p>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport || artisanPhotos.length === 0}
                className={cn(
                  "py-2 px-6 rounded-lg text-sm font-medium transition-colors",
                  artisanPhotos.length > 0
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

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setSelectedPhoto(null)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhoto}
            alt="Photo agrandie"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
