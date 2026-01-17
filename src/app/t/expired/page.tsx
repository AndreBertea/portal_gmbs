export default function ExpiredTokenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Lien expiré</h1>
        <p className="text-slate-600 mb-6">
          Ce lien de portail a expiré. Pour des raisons de sécurité, les liens sont valides pendant une durée limitée.
        </p>
        <p className="text-sm text-slate-500">
          Contactez votre gestionnaire GMBS pour obtenir un nouveau lien d&apos;accès.
        </p>
      </div>
    </div>
  )
}
