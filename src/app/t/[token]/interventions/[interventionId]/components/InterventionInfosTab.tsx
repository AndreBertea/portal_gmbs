'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import {
  MapPin,
  Calendar,
  FileText,
  Camera,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Receipt,
  Eye,
  Euro
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DocumentPreview } from '@/components/ui/document-preview'

interface InterventionDetail {
  id: string
  id_inter: string | null
  context: string | null
  consigne: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  date: string | null
  cout_sst: number | null
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

interface InterventionInfosTabProps {
  intervention: InterventionDetail
  crmPhotos: CRMPhoto[]
  crmDevis: CRMDocument[]
  crmFactures: CRMDocument[]
  onPhotoClick: (url: string) => void
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function InterventionInfosTab({
  intervention,
  crmPhotos,
  crmDevis,
  crmFactures,
  onPhotoClick
}: InterventionInfosTabProps) {
  const [showConsigne, setShowConsigne] = useState(true)
  const [showCrmPhotos, setShowCrmPhotos] = useState(true)
  const [showCrmDocs, setShowCrmDocs] = useState(true)

  return (
    <div className="divide-y divide-slate-100">
      {/* Metadata - Only address, date and cost */}
      <div className="p-4 space-y-3">
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

        {/* Date */}
        {intervention.date && (
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">Date prevue</p>
              <p className="text-sm text-slate-900">{formatDate(intervention.date)}</p>
            </div>
          </div>
        )}

        {/* SST Cost */}
        {intervention.cout_sst !== null && intervention.cout_sst > 0 && (
          <div className="flex items-start gap-3">
            <Euro className="h-4 w-4 text-emerald-500 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">Cout SST</p>
              <p className="text-sm text-emerald-700 font-medium">
                {intervention.cout_sst.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Consignes (collapsible) */}
      {intervention.consigne && (
        <div>
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

      {/* CRM Photos Section (from gestionnaire) */}
      {crmPhotos.length > 0 && (
        <div>
          <button
            onClick={() => setShowCrmPhotos(!showCrmPhotos)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h2 className="font-medium text-sm text-slate-900 flex items-center gap-2">
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
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {crmPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group cursor-pointer"
                    onClick={() => onPhotoClick(photo.url)}
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
        <div>
          <button
            onClick={() => setShowCrmDocs(!showCrmDocs)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h2 className="font-medium text-sm text-slate-900 flex items-center gap-2">
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
            <div className="px-4 pb-4 space-y-4">
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
                              {doc.file_size && ` - ${formatFileSize(doc.file_size)}`}
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
                                <TooltipContent>Apercu</TooltipContent>
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
                              <TooltipContent>Telecharger</TooltipContent>
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
                              {doc.file_size && ` - ${formatFileSize(doc.file_size)}`}
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
                                <TooltipContent>Apercu</TooltipContent>
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
                              <TooltipContent>Telecharger</TooltipContent>
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
    </div>
  )
}
