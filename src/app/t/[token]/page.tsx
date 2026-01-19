'use client'

import React, { useState, useEffect } from 'react'
import { usePortalContext } from './layout'
import { cn } from '@/lib/utils'
import {
  User,
  Phone,
  Mail,
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Shield,
  CreditCard,
  Eye,
  Pencil,
  X,
  Download
} from '@/components/ui/icons'

// =============================================================================
// TYPES
// =============================================================================

interface PreviewDocument {
  url: string
  filename: string
  mimeType?: string
  kind: string
}

const REQUIRED_DOCUMENTS = [
  { kind: 'kbis', label: 'Extrait Kbis', description: 'Extrait K-bis de moins de 3 mois', icon: Building2 },
  { kind: 'assurance', label: 'Attestation d\'assurance', description: 'Attestation RC Pro en cours de validité', icon: Shield },
  { kind: 'cni_recto_verso', label: 'CNI recto/verso', description: 'Carte d\'identité du gérant', icon: User },
  { kind: 'iban', label: 'RIB / IBAN', description: 'Relevé d\'identité bancaire', icon: CreditCard },
  { kind: 'decharge_partenariat', label: 'Décharge partenariat', description: 'Document de partenariat signé', icon: FileText },
]

interface DocumentStatus {
  kind: string
  uploaded: boolean
  filename?: string
  uploadedAt?: string
  url?: string
}

// =============================================================================
// PAGE
// =============================================================================

export default function DocumentsPage() {
  const { artisan, token } = usePortalContext()
  const [documents, setDocuments] = useState<DocumentStatus[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<PreviewDocument | null>(null)

  // Load existing documents from CRM
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`/api/portal/crm/documents?token=${token}`)
        if (response.ok) {
          const data = await response.json()
          // Map CRM documents to our format
          const mapped: DocumentStatus[] = (data.documents || []).map((doc: Record<string, unknown>) => ({
            kind: doc.kind as string,
            uploaded: true,
            filename: doc.filename as string,
            uploadedAt: doc.createdAt as string,
            url: doc.url as string
          }))
          setDocuments(mapped)
        }
      } catch (error) {
        console.error('Erreur chargement documents:', error)
      } finally {
        setIsLoadingDocs(false)
      }
    }

    if (token) {
      fetchDocuments()
    }
  }, [token])

  // Upload document to CRM
  const handleFileUpload = async (kind: string, file: File) => {
    setUploadingKind(kind)
    
    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer()
      const base64Data = Buffer.from(arrayBuffer).toString('base64')

      const response = await fetch(`/api/portal/crm/documents?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind,
          filename: file.name,
          mimeType: file.type,
          base64Data
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()
      
      setDocuments(prev => {
        const existing = prev.find(d => d.kind === kind)
        const newDoc: DocumentStatus = {
          kind,
          uploaded: true,
          filename: file.name,
          uploadedAt: new Date().toISOString(),
          url: data.url
        }
        if (existing) {
          return prev.map(d => d.kind === kind ? newDoc : d)
        }
        return [...prev, newDoc]
      })

    } catch (error: unknown) {
      console.error('Erreur upload:', error)
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'upload du document'
      alert(message)
    } finally {
      setUploadingKind(null)
    }
  }

  // Check document status
  const getDocumentStatus = (kind: string): DocumentStatus | undefined => {
    return documents.find(d => d.kind === kind)
  }

  // Count uploaded documents
  const uploadedCount = REQUIRED_DOCUMENTS.filter(doc => 
    getDocumentStatus(doc.kind)?.uploaded
  ).length

  const completionPercentage = Math.round((uploadedCount / REQUIRED_DOCUMENTS.length) * 100)

  return (
    <div className="space-y-6">
      {/* Section: Personal Information */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Mes informations
          </h2>
        </div>
        <div className="p-4 space-y-3">
          {artisan?.company && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Entreprise</p>
                <p className="text-sm font-medium text-slate-900">{artisan.company}</p>
              </div>
            </div>
          )}
          
          {artisan?.name && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Contact</p>
                <p className="text-sm font-medium text-slate-900">{artisan.name}</p>
              </div>
            </div>
          )}

          {artisan?.phone && (
            <a 
              href={`tel:${artisan.phone}`}
              className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Phone className="h-4 w-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Téléphone</p>
                <p className="text-sm font-medium text-blue-600">{artisan.phone}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </a>
          )}

          {artisan?.email && (
            <a 
              href={`mailto:${artisan.email}`}
              className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Mail className="h-4 w-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-blue-600">{artisan.email}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </a>
          )}

          {!artisan?.company && !artisan?.name && !artisan?.phone && !artisan?.email && (
            <p className="text-sm text-slate-500 text-center py-4">
              Aucune information disponible
            </p>
          )}
        </div>
      </section>

      {/* Section: Required Documents */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Documents obligatoires
            </h2>
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              completionPercentage === 100 
                ? "bg-green-100 text-green-700" 
                : "bg-amber-100 text-amber-700"
            )}>
              {uploadedCount}/{REQUIRED_DOCUMENTS.length}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                completionPercentage === 100 ? "bg-green-500" : "bg-blue-600"
              )}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {completionPercentage === 100 
              ? "Dossier complet !" 
              : "Complétez votre dossier pour être opérationnel"}
          </p>
        </div>
        
        <div className="divide-y divide-slate-100">
          {isLoadingDocs ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            REQUIRED_DOCUMENTS.map((doc) => {
              const status = getDocumentStatus(doc.kind)
              const isUploading = uploadingKind === doc.kind
              const DocIcon = doc.icon

              return (
                <div key={doc.kind} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      status?.uploaded 
                        ? "bg-green-100" 
                        : "bg-slate-100"
                    )}>
                      {status?.uploaded ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <DocIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900">{doc.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>
                      {status?.uploaded && status.filename && (
                        <p className="text-xs text-green-600 mt-1 truncate">
                          ✓ {status.filename}
                        </p>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Eye button - Preview document */}
                      {status?.uploaded && status.url && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(
                              previewDoc?.kind === doc.kind 
                                ? null 
                                : {
                                    url: status.url!,
                                    filename: status.filename || 'Document',
                                    mimeType: undefined,
                                    kind: doc.kind
                                  }
                            )}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              previewDoc?.kind === doc.kind
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                            title="Voir le document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {/* Popover Preview */}
                          {previewDoc?.kind === doc.kind && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                              {/* Header */}
                              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
                                <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
                                  {previewDoc.filename}
                                </span>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={previewDoc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                    title="Ouvrir"
                                  >
                                    <Download className="h-3 w-3" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-1.5 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                                    title="Fermer"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {/* Preview */}
                              <div className="p-2">
                                <DocumentPreviewContent url={previewDoc.url} filename={previewDoc.filename} compact />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Upload/Edit button */}
                      <label className={cn(
                        "p-2 rounded-lg cursor-pointer transition-colors",
                        status?.uploaded
                          ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                          : "bg-blue-600 text-white hover:bg-blue-700",
                        isUploading && "opacity-50 cursor-wait"
                      )}
                      title={status?.uploaded ? "Modifier le document" : "Ajouter un document"}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : status?.uploaded ? (
                          <Pencil className="h-4 w-4" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileUpload(doc.kind, file)
                            }
                            e.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Help note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Besoin d&apos;aide ?</strong> Contactez votre gestionnaire si vous avez des questions sur les documents à fournir.
        </p>
      </div>

    </div>
  )
}

// =============================================================================
// DOCUMENT PREVIEW COMPONENT
// =============================================================================

function DocumentPreviewContent({ url, filename, compact = false }: { url: string; filename: string; compact?: boolean }) {
  const extension = filename.split('.').pop()?.toLowerCase()
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')
  const isPdf = extension === 'pdf'

  if (isImage) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden",
        compact ? "h-48" : "min-h-[300px]"
      )}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename}
          className={cn(
            "object-contain rounded-lg",
            compact ? "max-h-48 max-w-full" : "max-w-full max-h-[60vh]"
          )}
        />
      </div>
    )
  }

  if (isPdf) {
    return (
      <div className={cn(
        "bg-slate-100 rounded-lg overflow-hidden",
        compact ? "h-48" : "min-h-[400px]"
      )}>
        <iframe
          src={url}
          title={filename}
          className={cn(
            "w-full border-0",
            compact ? "h-48" : "h-[60vh]"
          )}
        />
      </div>
    )
  }

  // Fallback for other file types
  return (
    <div className={cn(
      "flex flex-col items-center justify-center bg-slate-100 rounded-lg text-center",
      compact ? "h-32 p-3" : "min-h-[200px] p-6"
    )}>
      <FileText className={cn("text-slate-400 mb-2", compact ? "h-8 w-8" : "h-12 w-12")} />
      <p className={cn("font-medium text-slate-700", compact ? "text-xs" : "text-sm mb-1")}>{filename}</p>
      {!compact && (
        <>
          <p className="text-xs text-slate-500 mb-4">Aperçu non disponible</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </a>
        </>
      )}
    </div>
  )
}
