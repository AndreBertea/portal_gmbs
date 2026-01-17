'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, Briefcase, Loader2 } from '@/components/ui/icons'

// =============================================================================
// TYPES
// =============================================================================

export interface ArtisanData {
  crm_id: string
  name?: string
  email?: string
  phone?: string
  company?: string
}

export interface PortalContextData {
  token: string
  artisan: ArtisanData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// =============================================================================
// CONTEXT
// =============================================================================

const PortalContext = createContext<PortalContextData | null>(null)

export function usePortalContext() {
  const context = useContext(PortalContext)
  if (!context) {
    throw new Error('usePortalContext must be used within PortalLayout')
  }
  return context
}

// =============================================================================
// LAYOUT
// =============================================================================

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const token = params.token as string
  const pathname = usePathname()
  const router = useRouter()

  const [portalData, setPortalData] = useState<PortalContextData>({
    token: token || '',
    artisan: null,
    isLoading: true,
    error: null,
    refetch: async () => {},
  })

  // Validate token and load artisan data
  const fetchArtisanData = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/v1/tokens/${tokenValue}/validate`)
      const data = await response.json()

      if (!data.valid) {
        throw new Error(data.error || 'Token invalide ou expiré')
      }

      setPortalData({
        token: tokenValue,
        artisan: data.artisan,
        isLoading: false,
        error: null,
        refetch: () => fetchArtisanData(tokenValue),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur de validation'
      setPortalData({
        token: tokenValue,
        artisan: null,
        isLoading: false,
        error: message,
        refetch: () => fetchArtisanData(tokenValue),
      })
    }
  }

  useEffect(() => {
    if (token) {
      fetchArtisanData(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Determine active tab
  const getActiveTab = (): 'documents' | 'interventions' => {
    if (pathname?.includes('/interventions')) return 'interventions'
    return 'documents'
  }

  const activeTab = getActiveTab()

  // Navigation
  const navigateTo = (tab: 'documents' | 'interventions') => {
    if (!token) return
    if (tab === 'documents') {
      router.push(`/t/${token}`)
    } else {
      router.push(`/t/${token}/interventions`)
    }
  }

  // Loading screen
  if (portalData.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-500">Chargement du portail...</p>
        </div>
      </div>
    )
  }

  // Error screen
  if (portalData.error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Accès non autorisé
          </h1>
          <p className="text-slate-500">
            {portalData.error}
          </p>
          <p className="text-sm text-slate-400">
            Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter votre gestionnaire.
          </p>
        </div>
      </div>
    )
  }

  const displayName = portalData.artisan?.company || 
    portalData.artisan?.name ||
    'Mon Portail'

  return (
    <PortalContext.Provider value={portalData}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {displayName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="font-semibold text-slate-900 text-sm leading-tight">
                  {displayName}
                </h1>
                <p className="text-xs text-slate-500">Portail Artisan</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              GMBS
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20">
          <div className="max-w-2xl mx-auto p-4">
            {children}
          </div>
        </main>

        {/* Bottom Navigation (mobile app style) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-20">
          <div className="max-w-2xl mx-auto flex">
            <button
              onClick={() => navigateTo('documents')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
                activeTab === 'documents'
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <FileText className={cn(
                "h-6 w-6",
                activeTab === 'documents' && "fill-blue-100"
              )} />
              <span className="text-xs font-medium">Mes Documents</span>
            </button>
            <button
              onClick={() => navigateTo('interventions')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
                activeTab === 'interventions'
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Briefcase className={cn(
                "h-6 w-6",
                activeTab === 'interventions' && "fill-blue-100"
              )} />
              <span className="text-xs font-medium">Interventions</span>
            </button>
          </div>
        </nav>
      </div>
    </PortalContext.Provider>
  )
}
