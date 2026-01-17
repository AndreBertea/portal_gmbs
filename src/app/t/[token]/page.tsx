'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface ArtisanData {
  crm_id: string
  name?: string
  email?: string
  phone?: string
  company?: string
}

interface TokenValidation {
  valid: boolean
  artisan?: ArtisanData
  intervention_id?: string
  error?: string
}

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [validation, setValidation] = useState<TokenValidation | null>(null)

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/v1/tokens/${token}/validate`)
        const data = await res.json()
        setValidation(data)
      } catch {
        setValidation({ valid: false, error: 'Erreur de connexion' })
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      validateToken()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!validation?.valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
          <p className="text-slate-600 mb-4">
            {validation?.error === 'Token expired' 
              ? 'Ce lien a expiré. Veuillez contacter votre gestionnaire pour obtenir un nouveau lien.'
              : validation?.error === 'Token revoked'
              ? 'Ce lien a été révoqué.'
              : 'Ce lien n\'est pas valide ou a expiré.'}
          </p>
          <p className="text-sm text-slate-500">
            Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez votre gestionnaire GMBS.
          </p>
        </div>
      </div>
    )
  }

  const artisan = validation.artisan

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-slate-900">Portail Artisan</h1>
            <p className="text-sm text-slate-500">{artisan?.name || 'Bienvenue'}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">
              {artisan?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-2">
            Bienvenue, {artisan?.name || 'Artisan'}
          </h2>
          <p className="text-slate-600 text-sm">
            Depuis ce portail, vous pouvez consulter vos interventions, 
            déposer vos documents et soumettre vos rapports photos.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <ActionCard
            title="Mes interventions"
            description="Voir les interventions assignées"
            href={`/t/${token}/interventions`}
            icon="📋"
          />
          <ActionCard
            title="Mes documents"
            description="Déposer Kbis, assurance, RIB..."
            href={`/t/${token}/documents`}
            icon="📄"
          />
          <ActionCard
            title="Rapport photo"
            description="Soumettre des photos d'intervention"
            href={`/t/${token}/photos`}
            icon="📷"
          />
        </div>

        {/* Info */}
        {artisan?.company && (
          <div className="mt-6 bg-slate-100 rounded-xl p-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Entreprise :</span> {artisan.company}
            </p>
            {artisan.email && (
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-medium">Email :</span> {artisan.email}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ActionCard({ 
  title, 
  description, 
  href, 
  icon 
}: { 
  title: string
  description: string
  href: string
  icon: string 
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  )
}
