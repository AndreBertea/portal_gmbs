'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalContext } from '../layout'
import { cn, formatDate } from '@/lib/utils'
import {
  MapPin,
  Calendar,
  ChevronRight,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Camera
} from '@/components/ui/icons'

// =============================================================================
// TYPES
// =============================================================================

interface Intervention {
  id: string
  id_inter: string | null
  context: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  date: string | null
  due_date: string | null
  consigne: string | null
  status: {
    code: string | null
    label: string | null
    color: string | null
  } | null
  metier: {
    label: string | null
  } | null
  hasReport: boolean
  photoCount: number
}

// =============================================================================
// HELPERS
// =============================================================================

// Simplified status mapping for artisan portal
const getStatusDisplay = (statusCode: string | null | undefined) => {
  switch (statusCode?.toUpperCase()) {
    case 'ACCEPTE':
    case 'INTER_EN_COURS':
      return { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: Clock }
    case 'INTER_TERMINEE':
      return { label: 'Terminée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
    case 'DEMANDE':
    case 'DEVIS_ENVOYE':
    case 'VISITE_TECHNIQUE':
      return { label: 'À planifier', color: 'bg-amber-100 text-amber-700', icon: Calendar }
    default:
      return { label: 'En attente', color: 'bg-slate-100 text-slate-600', icon: AlertCircle }
  }
}

// =============================================================================
// PAGE
// =============================================================================

export default function InterventionsPage() {
  const { token } = usePortalContext()
  const router = useRouter()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        // TODO: Implement interventions API - for now mock data
        // In production, this would call the CRM API via portal backend
        setInterventions([
          {
            id: 'mock-1',
            id_inter: 'INT-2024-001',
            context: 'Réparation fuite d\'eau - Salle de bain',
            address: '15 rue de la Paix',
            city: 'Paris',
            postal_code: '75002',
            date: '2026-01-20',
            due_date: '2026-01-25',
            consigne: 'Accès par le gardien',
            status: { code: 'INTER_EN_COURS', label: 'En cours', color: '#3b82f6' },
            metier: { label: 'Plomberie' },
            hasReport: false,
            photoCount: 3
          },
          {
            id: 'mock-2',
            id_inter: 'INT-2024-002',
            context: 'Installation prise électrique - Cuisine',
            address: '42 avenue des Champs-Élysées',
            city: 'Paris',
            postal_code: '75008',
            date: '2026-01-15',
            due_date: '2026-01-18',
            consigne: null,
            status: { code: 'INTER_TERMINEE', label: 'Terminée', color: '#22c55e' },
            metier: { label: 'Électricité' },
            hasReport: true,
            photoCount: 5
          }
        ])
      } catch (error) {
        console.error('Erreur chargement interventions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchInterventions()
    }
  }, [token])

  const handleOpenIntervention = (interventionId: string) => {
    router.push(`/t/${token}/interventions/${interventionId}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (interventions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="font-semibold text-slate-900 mb-2">
          Aucune intervention
        </h2>
        <p className="text-sm text-slate-500">
          Vous n&apos;avez pas encore d&apos;intervention assignée.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">
          Mes interventions
        </h2>
        <span className="text-sm text-slate-500">
          {interventions.length} mission{interventions.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {interventions.map((intervention) => {
          const statusDisplay = getStatusDisplay(intervention.status?.code)
          const StatusIcon = statusDisplay.icon

          return (
            <button
              key={intervention.id}
              onClick={() => handleOpenIntervention(intervention.id)}
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-4 text-left hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                  statusDisplay.color.split(' ')[0]
                )}>
                  <StatusIcon className={cn(
                    "h-5 w-5",
                    statusDisplay.color.split(' ')[1]
                  )} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Reference + Status */}
                  <div className="flex items-center gap-2 mb-1">
                    {intervention.id_inter && (
                      <span className="text-xs font-mono text-slate-400">
                        #{intervention.id_inter}
                      </span>
                    )}
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      statusDisplay.color
                    )}>
                      {statusDisplay.label}
                    </span>
                  </div>

                  {/* Context */}
                  <p className="font-medium text-slate-900 text-sm line-clamp-2 mb-2">
                    {intervention.context || 'Intervention sans description'}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {(intervention.city || intervention.postal_code) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[intervention.postal_code, intervention.city].filter(Boolean).join(' ')}
                      </span>
                    )}
                    {intervention.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(intervention.date, { short: true })}
                      </span>
                    )}
                    {intervention.metier?.label && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {intervention.metier.label}
                      </span>
                    )}
                  </div>

                  {/* Indicators: photos / report */}
                  {(intervention.hasReport || intervention.photoCount > 0) && (
                    <div className="flex items-center gap-2 mt-2">
                      {intervention.photoCount > 0 && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {intervention.photoCount}
                        </span>
                      )}
                      {intervention.hasReport && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Rapport
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
