export default function InvalidTokenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
        <p className="text-slate-600 mb-6">
          Ce lien de portail n&apos;est pas valide. Il a peut-être été révoqué ou n&apos;existe pas.
        </p>
        <p className="text-sm text-slate-500">
          Contactez votre gestionnaire GMBS pour obtenir un nouveau lien d&apos;accès.
        </p>
      </div>
    </div>
  )
}
