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
  Camera,
  User,
  Phone,
  Building2,
  Receipt,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Euro
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
  client_name: string | null
  owner_name: string | null
  owner_phone: string | null
  status: {
    code: string | null
    label: string | null
    color: string | null
  } | null
  metier: string | null
  photos_count: number
  has_devis: boolean
  has_facture_artisan: boolean
  cout_sst: number | null
}

// =============================================================================
// HELPERS
// =============================================================================

const getStatusConfig = (statusCode: string | null | undefined) => {
  switch (statusCode?.toUpperCase()) {
    case 'ACCEPTE':
    case 'INTER_EN_COURS':
      return { 
        label: 'En cours', 
        bgColor: 'bg-blue-500',
        lightBg: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: Clock 
      }
    case 'INTER_TERMINEE':
      return { 
        label: 'Terminée', 
        bgColor: 'bg-green-500',
        lightBg: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: CheckCircle2 
      }
    case 'DEMANDE':
    case 'DEVIS_ENVOYE':
    case 'VISITE_TECHNIQUE':
      return { 
        label: 'À planifier', 
        bgColor: 'bg-amber-500',
        lightBg: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        icon: Calendar 
      }
    default:
      return { 
        label: 'En attente', 
        bgColor: 'bg-slate-400',
        lightBg: 'bg-slate-50',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-200',
        icon: AlertCircle 
      }
  }
}

// =============================================================================
// INTERVENTION CARD COMPONENT
// =============================================================================

function InterventionCard({ 
  intervention, 
  onOpen 
}: { 
  intervention: Intervention
  onOpen: () => void 
}) {
  const [isConsigneExpanded, setIsConsigneExpanded] = useState(false)
  const statusConfig = getStatusConfig(intervention.status?.code)
  const StatusIcon = statusConfig.icon

  const hasDocuments = intervention.photos_count > 0 || intervention.has_devis || intervention.has_facture_artisan
  const hasOwnerInfo = intervention.owner_name || intervention.owner_phone
  const hasConsigne = intervention.consigne && intervention.consigne.trim().length > 0

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md",
      statusConfig.borderColor
    )}>
      {/* Status Header Bar */}
      <div className={cn("px-4 py-2 flex items-center justify-between", statusConfig.lightBg)}>
        <div className="flex items-center gap-2">
          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", statusConfig.bgColor)}>
            <StatusIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className={cn("text-sm font-semibold", statusConfig.textColor)}>
            {statusConfig.label}
          </span>
        </div>
        {intervention.id_inter && (
          <span className="text-xs font-mono bg-white/80 px-2 py-0.5 rounded text-slate-500">
            #{intervention.id_inter}
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Context / Title */}
        <h3 className="font-semibold text-slate-900 text-base mb-3 line-clamp-2">
          {intervention.context || 'Intervention sans description'}
        </h3>

        {/* Info Grid */}
        <div className="space-y-2.5 mb-4">
          {/* Address */}
          {(intervention.address || intervention.city) && (
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-slate-700 leading-tight">
                  {intervention.address}
                </p>
                {intervention.city && (
                  <p className="text-xs text-slate-500">
                    {[intervention.postal_code, intervention.city].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Owner Info */}
          {hasOwnerInfo && (
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-slate-700">
                  {intervention.owner_name || 'Propriétaire'}
                </p>
                {intervention.owner_phone && (
                  <a 
                    href={`tel:${intervention.owner_phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-0.5"
                  >
                    <Phone className="h-3 w-3" />
                    {intervention.owner_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Client / Agency */}
          {intervention.client_name && (
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs text-slate-500">Client</p>
                <p className="text-sm text-slate-700">{intervention.client_name}</p>
              </div>
            </div>
          )}

          {/* Date & Metier */}
          <div className="flex items-center gap-4">
            {intervention.date && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-sm text-slate-700">
                  {formatDate(intervention.date, { short: true })}
                </span>
              </div>
            )}
            {intervention.metier && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-sm text-slate-700">{intervention.metier}</span>
              </div>
            )}
          </div>

          {/* SST Cost */}
          {intervention.cout_sst !== null && intervention.cout_sst > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Euro className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-700 font-medium">
                {intervention.cout_sst.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )}
        </div>

        {/* Consigne Section */}
        {hasConsigne && (
          <div className="mb-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsConsigneExpanded(!isConsigneExpanded)
              }}
              className="w-full flex items-center justify-between p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <MessageSquare className="h-4 w-4" />
                Consignes
              </span>
              {isConsigneExpanded ? (
                <ChevronUp className="h-4 w-4 text-blue-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-500" />
              )}
            </button>
            {isConsigneExpanded && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                  {intervention.consigne}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Documents Badges */}
        {hasDocuments && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {intervention.photos_count > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                <Camera className="h-3.5 w-3.5" />
                {intervention.photos_count} photo{intervention.photos_count > 1 ? 's' : ''}
              </span>
            )}
            {intervention.has_devis && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                <FileText className="h-3.5 w-3.5" />
                Devis
              </span>
            )}
            {intervention.has_facture_artisan && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                <Receipt className="h-3.5 w-3.5" />
                Facture
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onOpen}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
            "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]"
          )}
        >
          Voir les détails
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
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
        const response = await fetch(`/api/portal/crm/interventions?token=${token}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch interventions')
        }

        const data = await response.json()
        
        const mapped: Intervention[] = (data.interventions || []).map((i: Record<string, unknown>) => ({
          id: i.id as string,
          id_inter: i.id_inter as string || null,
          context: i.context as string || i.name as string || null,
          address: i.address as string || null,
          city: i.city as string || null,
          postal_code: i.postal_code as string || null,
          date: i.date_prevue as string || i.date as string || i.createdAt as string || null,
          due_date: i.dueAt as string || null,
          consigne: i.consigne as string || null,
          client_name: i.client_name as string || null,
          owner_name: i.owner_name as string || null,
          owner_phone: i.owner_phone as string || null,
          status: {
            code: i.statusCode as string || i.status as string || null,
            label: i.statusLabel as string || null,
            color: null
          },
          metier: i.metier as string || null,
          photos_count: (i.photos_count as number) || 0,
          has_devis: Boolean(i.has_devis),
          has_facture_artisan: Boolean(i.has_facture_artisan),
          cout_sst: (i.cout_sst as number) || null
        }))

        setInterventions(mapped)
      } catch (error) {
        console.error('Erreur chargement interventions:', error)
        setInterventions([])
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
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-slate-500">Chargement des interventions...</p>
      </div>
    )
  }

  if (interventions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Aucune intervention
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Vous n&apos;avez pas encore d&apos;intervention assignée. Les nouvelles missions apparaîtront ici.
        </p>
      </div>
    )
  }

  // Group interventions by status
  const inProgress = interventions.filter(i => 
    ['ACCEPTE', 'INTER_EN_COURS'].includes(i.status?.code?.toUpperCase() || '')
  )
  const toSchedule = interventions.filter(i => 
    ['DEMANDE', 'DEVIS_ENVOYE', 'VISITE_TECHNIQUE'].includes(i.status?.code?.toUpperCase() || '')
  )
  const completed = interventions.filter(i => 
    i.status?.code?.toUpperCase() === 'INTER_TERMINEE'
  )
  const other = interventions.filter(i => 
    !['ACCEPTE', 'INTER_EN_COURS', 'DEMANDE', 'DEVIS_ENVOYE', 'VISITE_TECHNIQUE', 'INTER_TERMINEE'].includes(i.status?.code?.toUpperCase() || '')
  )

  const sections = [
    { title: 'En cours', items: inProgress, show: inProgress.length > 0 },
    { title: 'À planifier', items: toSchedule, show: toSchedule.length > 0 },
    { title: 'Autres', items: other, show: other.length > 0 },
    { title: 'Terminées', items: completed, show: completed.length > 0 },
  ].filter(s => s.show)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Mes interventions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {interventions.length} mission{interventions.length > 1 ? 's' : ''} assignée{interventions.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              {section.title}
            </h2>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {section.items.length}
            </span>
          </div>
          <div className="space-y-4">
            {section.items.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onOpen={() => handleOpenIntervention(intervention.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
