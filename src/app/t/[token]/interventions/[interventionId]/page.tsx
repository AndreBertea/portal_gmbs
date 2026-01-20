'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { usePortalContext } from '../../layout'
import {
  ChevronLeft,
  Loader2,
  AlertCircle
} from '@/components/ui/icons'
import {
  TabNavigation,
  InterventionHeader,
  InterventionInfosTab,
  InterventionReportTab,
  InterventionContactTab
} from './components'

// =============================================================================
// TYPES
// =============================================================================

interface AssignedUser {
  id: string
  firstname: string | null
  lastname: string | null
  email: string | null
  fullname: string | null
}

interface ClientInfo {
  id: string
  name: string | null
  phone: string | null
}

interface OwnerInfo {
  id: string
  name: string | null
  phone: string | null
}

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
  cout_sst: number | null
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
// PAGE
// =============================================================================

export default function InterventionDetailPage() {
  const { token } = usePortalContext()
  const router = useRouter()
  const params = useParams()
  const interventionId = params.interventionId as string

  // Tab state
  const [activeTab, setActiveTab] = useState<'infos' | 'rapport' | 'contact'>('infos')

  // Data state
  const [intervention, setIntervention] = useState<InterventionDetail | null>(null)
  const [crmPhotos, setCrmPhotos] = useState<CRMPhoto[]>([])
  const [crmDevis, setCrmDevis] = useState<CRMDocument[]>([])
  const [crmFactures, setCrmFactures] = useState<CRMDocument[]>([])
  const [artisanPhotos, setArtisanPhotos] = useState<Photo[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  // Contact data
  const [assignedUser, setAssignedUser] = useState<AssignedUser | null>(null)
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [owner, setOwner] = useState<OwnerInfo | null>(null)

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
            date: int.date_prevue || int.date || int.createdAt,
            due_date: int.dueAt,
            client_name: int.client_name,
            owner_name: int.owner_name,
            owner_phone: int.owner_phone,
            metier: int.metier,
            cout_sst: int.cout_sst ?? null,
            status: {
              code: int.statusCode || int.status,
              label: int.statusLabel
            }
          })

          // Map contact data
          setAssignedUser(int.assigned_user || null)
          setClient(int.client || null)
          setOwner(int.owner || null)

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
          Retour a la liste
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

      {/* Main intervention card with tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <InterventionHeader intervention={intervention} />

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          reportStatus={report?.status}
        />

        {activeTab === 'infos' && (
          <InterventionInfosTab
            intervention={intervention}
            crmPhotos={crmPhotos}
            crmDevis={crmDevis}
            crmFactures={crmFactures}
            onPhotoClick={setSelectedPhoto}
          />
        )}

        {activeTab === 'rapport' && (
          <InterventionReportTab
            token={token}
            interventionId={interventionId}
            initialReport={report}
            initialPhotos={artisanPhotos}
            onReportChange={setReport}
            onPhotosChange={setArtisanPhotos}
            onPhotoClick={setSelectedPhoto}
          />
        )}

        {activeTab === 'contact' && (
          <InterventionContactTab
            assignedUser={assignedUser}
            client={client}
            owner={owner}
          />
        )}
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
