'use client'

interface InterventionHeaderProps {
  intervention: {
    id_inter: string | null
    context: string | null
    status: {
      code: string | null
      label: string | null
    } | null
  }
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

export function InterventionHeader({ intervention }: InterventionHeaderProps) {
  const statusColor = getStatusColor(intervention.status?.code ?? null)

  return (
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
  )
}
