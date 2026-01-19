/**
 * CRM Client
 * 
 * Used by portal_gmbs to fetch data from the CRM.
 * Calls the /api/portal-external/* routes on the CRM.
 */

export interface CRMClientConfig {
  baseUrl?: string
  keyId?: string
  secret?: string
}

export interface CRMIntervention {
  id: string
  name: string
  address: string
  context: string
  consigne: string | null
  status: string
  statusCode: string
  statusLabel: string
  statusChangedAt: string
  dueAt: string | null
  createdAt: string
  updatedAt: string
  agency: string | null
}

export interface CRMDocument {
  id: string
  kind: string
  kindLabel: string
  filename: string
  mimeType: string
  url: string | null
  sizeBytes: number | null
  createdAt: string
  metadata: Record<string, unknown>
}

export interface CRMArtisan {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
}

export interface CRMArtisanDocuments {
  artisan: CRMArtisan
  documents: CRMDocument[]
  documentsByKind: Record<string, CRMDocument | null>
  requiredDocuments: string[]
}

export interface CRMReport {
  id: string
  content: string
  status: string
  photoIds: string[]
  submittedAt: string
  photos: Array<{
    id: string
    filename: string
    mimeType: string
    comment: string | null
    url: string | null
    createdAt: string
  }>
}

class CRMClient {
  private baseUrl: string
  private keyId: string
  private secret: string

  constructor(config?: CRMClientConfig) {
    // The CRM base URL should point to the CRM's portal-external API
    this.baseUrl = (config?.baseUrl || process.env.CRM_API_URL || 'http://localhost:3000').replace(/\/$/, '') + '/api/portal-external'
    this.keyId = config?.keyId || process.env.GMBS_PORTAL_KEY_ID || ''
    this.secret = config?.secret || process.env.GMBS_PORTAL_SECRET || ''
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    console.log('[CRM Client] Request:', url)

    const res = await fetch(url, {
      ...options,
      headers: {
        'X-GMBS-Key-Id': this.keyId,
        'X-GMBS-Secret': this.secret,
        'Content-Type': 'application/json',
        ...options.headers
      },
      // Don't cache CRM responses
      cache: 'no-store'
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `CRM Error: ${res.status}`)
    }

    return res.json()
  }

  /**
   * Get interventions for an artisan
   */
  async getArtisanInterventions(artisanId: string): Promise<{
    interventions: CRMIntervention[]
    count: number
  }> {
    return this.request(`/artisan/${artisanId}/interventions`)
  }

  /**
   * Get documents for an intervention (devis, factures, photos from gestionnaire)
   */
  async getInterventionDocuments(interventionId: string, artisanId: string): Promise<{
    documents: CRMDocument[]
    count: number
  }> {
    return this.request(`/intervention/${interventionId}/documents?artisanId=${artisanId}`)
  }

  /**
   * Get artisan's legal documents
   */
  async getArtisanDocuments(artisanId: string): Promise<CRMArtisanDocuments> {
    return this.request(`/artisan/${artisanId}/documents`)
  }

  /**
   * Upload a legal document for an artisan
   */
  async uploadArtisanDocument(
    artisanId: string,
    params: {
      kind: string
      filename: string
      mimeType: string
      base64Data: string
    }
  ): Promise<{
    success: boolean
    documentId: string
    url: string
    message: string
  }> {
    return this.request(`/artisan/${artisanId}/documents`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  /**
   * Get existing report for an intervention
   */
  async getInterventionReport(interventionId: string, artisanId: string): Promise<{
    report: CRMReport | null
  }> {
    return this.request(`/intervention/${interventionId}/report?artisanId=${artisanId}`)
  }

  /**
   * Submit a report for an intervention
   */
  async submitInterventionReport(
    interventionId: string,
    params: {
      artisanId: string
      content: string
      photos?: Array<{
        filename: string
        mimeType: string
        comment?: string
        base64Data: string
      }>
      status?: 'draft' | 'submitted'
    }
  ): Promise<{
    success: boolean
    reportId: string
    message: string
  }> {
    return this.request(`/intervention/${interventionId}/report`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }
}

// Singleton
let crmClient: CRMClient | null = null

export function getCRMClient(): CRMClient {
  if (!crmClient) {
    crmClient = new CRMClient()
  }
  return crmClient
}

export default CRMClient
