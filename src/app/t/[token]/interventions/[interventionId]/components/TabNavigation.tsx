'use client'

import { cn } from '@/lib/utils'

interface TabNavigationProps {
  activeTab: 'infos' | 'rapport' | 'contact'
  onTabChange: (tab: 'infos' | 'rapport' | 'contact') => void
  reportStatus?: 'draft' | 'submitted' | null
}

export function TabNavigation({ activeTab, onTabChange, reportStatus }: TabNavigationProps) {
  return (
    <div className="flex border-b border-slate-200">
      <button
        onClick={() => onTabChange('infos')}
        className={cn(
          "flex-1 py-3 px-4 text-sm font-medium transition-colors",
          activeTab === 'infos'
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-slate-500 hover:text-slate-700"
        )}
      >
        Infos
      </button>
      <button
        onClick={() => onTabChange('rapport')}
        className={cn(
          "flex-1 py-3 px-4 text-sm font-medium transition-colors relative",
          activeTab === 'rapport'
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-slate-500 hover:text-slate-700"
        )}
      >
        Rapport
        {reportStatus && (
          <span className={cn(
            "absolute top-2 right-4 h-2 w-2 rounded-full",
            reportStatus === 'submitted' ? "bg-green-500" : "bg-amber-500"
          )} />
        )}
      </button>
      <button
        onClick={() => onTabChange('contact')}
        className={cn(
          "flex-1 py-3 px-4 text-sm font-medium transition-colors",
          activeTab === 'contact'
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-slate-500 hover:text-slate-700"
        )}
      >
        Contact
      </button>
    </div>
  )
}
