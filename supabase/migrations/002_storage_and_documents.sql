-- ============================================
-- PORTAL GMBS - Storage & Documents
-- ============================================

-- ============================================
-- TABLE: artisan_documents (documents légaux)
-- ============================================
CREATE TABLE IF NOT EXISTS public.artisan_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    portal_token_id UUID NOT NULL REFERENCES public.portal_tokens(id) ON DELETE CASCADE,
    
    -- Artisan reference
    crm_artisan_id TEXT NOT NULL,
    
    -- Document info
    kind TEXT NOT NULL,  -- 'kbis', 'assurance', 'cni_recto_verso', 'iban', 'decharge_partenariat'
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,  -- Path in Supabase storage
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Sync status
    synced_to_crm BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Only one active document per kind per artisan
    UNIQUE(tenant_id, crm_artisan_id, kind)
);

COMMENT ON TABLE public.artisan_documents IS 'Legal documents uploaded by artisans';

-- ============================================
-- TABLE: intervention_photos (photos par intervention)
-- ============================================
CREATE TABLE IF NOT EXISTS public.intervention_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    portal_token_id UUID NOT NULL REFERENCES public.portal_tokens(id) ON DELETE CASCADE,
    
    -- References
    crm_artisan_id TEXT NOT NULL,
    crm_intervention_id TEXT NOT NULL,
    
    -- Photo info
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    
    -- User input
    comment TEXT,
    
    -- Processing
    thumbnail_path TEXT,  -- Generated thumbnail for mobile
    
    -- Sync status
    synced_to_crm BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.intervention_photos IS 'Photos uploaded by artisans for interventions';

-- ============================================
-- TABLE: intervention_reports (rapports générés)
-- ============================================
CREATE TABLE IF NOT EXISTS public.intervention_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    portal_token_id UUID NOT NULL REFERENCES public.portal_tokens(id) ON DELETE CASCADE,
    
    -- References
    crm_artisan_id TEXT NOT NULL,
    crm_intervention_id TEXT NOT NULL,
    
    -- Report content
    content TEXT NOT NULL,
    photo_ids UUID[] DEFAULT '{}',  -- Photos used to generate this report
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    submitted_at TIMESTAMPTZ,
    
    -- AI metadata
    ai_model TEXT,  -- Model used for generation
    ai_prompt_tokens INTEGER,
    ai_completion_tokens INTEGER,
    
    -- Sync status
    synced_to_crm BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.intervention_reports IS 'AI-generated reports for interventions';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artisan_documents_tenant ON public.artisan_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_artisan_documents_artisan ON public.artisan_documents(tenant_id, crm_artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_documents_not_synced ON public.artisan_documents(tenant_id) WHERE NOT synced_to_crm;

CREATE INDEX IF NOT EXISTS idx_intervention_photos_tenant ON public.intervention_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intervention_photos_intervention ON public.intervention_photos(tenant_id, crm_intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_photos_not_synced ON public.intervention_photos(tenant_id) WHERE NOT synced_to_crm;

CREATE INDEX IF NOT EXISTS idx_intervention_reports_tenant ON public.intervention_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intervention_reports_intervention ON public.intervention_reports(tenant_id, crm_intervention_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.artisan_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================
DROP TRIGGER IF EXISTS trg_artisan_documents_updated_at ON public.artisan_documents;
CREATE TRIGGER trg_artisan_documents_updated_at
BEFORE UPDATE ON public.artisan_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_intervention_reports_updated_at ON public.intervention_reports;
CREATE TRIGGER trg_intervention_reports_updated_at
BEFORE UPDATE ON public.intervention_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
