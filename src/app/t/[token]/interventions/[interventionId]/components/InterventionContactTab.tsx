'use client'

import { User, Mail, Phone, Home } from 'lucide-react'

interface AssignedUser {
  id: string
  firstname: string | null
  lastname: string | null
  email: string | null
  fullname: string | null
}

interface OwnerInfo {
  id: string
  name: string | null
  phone: string | null
}

interface TenantInfo {
  id: string
  name: string | null
  phone: string | null
}

interface InterventionContactTabProps {
  assignedUser: AssignedUser | null
  owner: OwnerInfo | null
  tenant: TenantInfo | null
}

export function InterventionContactTab({
  assignedUser,
  owner,
  tenant
}: InterventionContactTabProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Gestionnaire GMBS */}
      {assignedUser && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Gestionnaire GMBS
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">
              {assignedUser.fullname || 'Non assigné'}
            </p>
            {assignedUser.email && (
              <a
                href={`mailto:${assignedUser.email}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {assignedUser.email}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Propriétaire (facturation) */}
      {owner && owner.name && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            Propriétaire
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">{owner.name}</p>
            {owner.phone && (
              <a
                href={`tel:${owner.phone}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {owner.phone}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Locataire (tenant/client) */}
      {tenant && tenant.name && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="font-medium text-sm text-slate-900 mb-3 flex items-center gap-2">
            <Home className="h-4 w-4 text-purple-600" />
            Locataire
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">{tenant.name}</p>
            {tenant.phone && (
              <a
                href={`tel:${tenant.phone}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {tenant.phone}
              </a>
            )}
          </div>
        </div>
      )}

      {!assignedUser && !owner && !tenant && (
        <div className="text-center py-8 text-slate-500">
          <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune information de contact disponible</p>
        </div>
      )}
    </div>
  )
}
