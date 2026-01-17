import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            GMBS Portal
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Plateforme de gestion pour les artisans partenaires GMBS
          </p>
        </header>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <FeatureCard
            title="Portail Artisan"
            description="Accès sécurisé pour les artisans : dépôt de documents, consultation des interventions, rapports photos."
            icon="🔐"
          />
          <FeatureCard
            title="API REST"
            description="Intégration simple avec votre CRM via notre API RESTful documentée."
            icon="⚡"
          />
          <FeatureCard
            title="Multi-tenant"
            description="Architecture isolée par client avec quotas et plans personnalisables."
            icon="🏢"
          />
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-flex gap-4">
            <Link
              href="/docs"
              className="px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
            >
              Documentation API
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Voir les offres
            </Link>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-20 text-center">
          <p className="text-slate-500 text-sm">
            API Status: <span className="text-green-500">●</span> Opérationnel
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Base URL: <code className="bg-slate-800 px-2 py-1 rounded">https://portal.gmbs.io/api/v1</code>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} GMBS. Tous droits réservés.
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description, icon }: { 
  title: string
  description: string
  icon: string 
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  )
}
