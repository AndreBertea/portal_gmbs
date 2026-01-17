-- ============================================
-- PORTAL GMBS - Initial Schema
-- ============================================
-- This migration creates the complete database schema for portal_gmbs
-- Version: 1.0.0

-- ============================================
-- TABLE: tenants (clients CRM qui souscrivent)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    
    -- Subscription
    subscription_status TEXT DEFAULT 'trial' 
        CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired')),
    subscription_plan TEXT DEFAULT 'basic'
        CHECK (subscription_plan IN ('basic', 'pro', 'enterprise')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    -- Limites (évolutif)
    allowed_artisans INTEGER DEFAULT 10,
    
    -- Webhook (optionnel, V2)
    webhook_url TEXT,
    webhook_secret TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
    
    -- Soft delete
    is_active BOOLEAN DEFAULT true
);

COMMENT ON TABLE public.tenants IS 'CRM clients who subscribe to the portal service';

-- ============================================
-- TABLE: api_keys (multi-clés par tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Identification
    key_id TEXT NOT NULL UNIQUE,           -- pk_live_xxxx (public, envoyé dans header)
    key_secret_hash TEXT NOT NULL,         -- bcrypt hash du secret
    label TEXT DEFAULT 'default',          -- "Production", "Staging", etc.
    
    -- Permissions (future-proof)
    scopes TEXT[] DEFAULT ARRAY['tokens:write', 'submissions:read'],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ                 -- NULL = actif
);

COMMENT ON TABLE public.api_keys IS 'API keys for tenant authentication';
COMMENT ON COLUMN public.api_keys.key_id IS 'Public key ID sent in X-GMBS-Key-Id header';
COMMENT ON COLUMN public.api_keys.key_secret_hash IS 'Bcrypt hash of the API secret';

-- ============================================
-- TABLE: portal_tokens (tokens artisans - hashés)
-- ============================================
CREATE TABLE IF NOT EXISTS public.portal_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Identifiants CRM
    crm_artisan_id TEXT NOT NULL,
    crm_intervention_id TEXT,              -- Optionnel (si token par intervention)
    
    -- Token sécurisé
    token_hash TEXT NOT NULL UNIQUE,       -- SHA256 du token
    token_prefix TEXT NOT NULL,            -- 8 premiers chars (pour debug/logs)
    
    -- Metadata artisan (cache)
    metadata JSONB DEFAULT '{}',           -- { name, email, phone, company }
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 year'),
    last_accessed_at TIMESTAMPTZ,
    
    -- État
    is_active BOOLEAN DEFAULT true
    
    -- Note: PAS de UNIQUE(tenant_id, crm_artisan_id) 
    -- → permet plusieurs tokens si besoin (par intervention, rotation, etc.)
);

COMMENT ON TABLE public.portal_tokens IS 'Portal access tokens for artisans (hashed)';
COMMENT ON COLUMN public.portal_tokens.token_hash IS 'SHA256 hash of the token - raw token never stored';
COMMENT ON COLUMN public.portal_tokens.token_prefix IS 'First 8 chars for debugging/logging';

-- ============================================
-- TABLE: portal_submissions (photos, rapports)
-- ============================================
CREATE TABLE IF NOT EXISTS public.portal_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    portal_token_id UUID NOT NULL REFERENCES public.portal_tokens(id) ON DELETE CASCADE,
    
    -- Contexte
    crm_artisan_id TEXT NOT NULL,
    crm_intervention_id TEXT,
    
    -- Contenu
    type TEXT NOT NULL CHECK (type IN ('photo', 'report', 'document')),
    data JSONB NOT NULL,                   -- Détails selon le type
    storage_paths TEXT[],                  -- Chemins dans le bucket
    
    -- Sync CRM (MVP = pull)
    synced_to_crm BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.portal_submissions IS 'Submissions from artisans (photos, reports, documents)';

-- ============================================
-- TABLE: audit_logs (traçabilité)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    
    -- Action
    action TEXT NOT NULL,                  -- 'token.created', 'submission.uploaded', etc.
    resource_type TEXT,                    -- 'token', 'submission', etc.
    resource_id UUID,
    
    -- Contexte
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,                       -- Pour corréler les logs
    
    -- Détails
    details JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Audit trail for all important actions';

-- ============================================
-- TABLE: tenant_usage (compteurs quotas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Compteurs (mis à jour transactionnellement)
    active_artisans_count INTEGER DEFAULT 0,
    total_submissions_count INTEGER DEFAULT 0,
    storage_bytes_used BIGINT DEFAULT 0,
    
    -- Période
    period_start DATE DEFAULT CURRENT_DATE,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id, period_start)
);

COMMENT ON TABLE public.tenant_usage IS 'Usage tracking for quota enforcement';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON public.api_keys(key_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON public.api_keys(tenant_id);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_hash ON public.portal_tokens(token_hash) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_portal_tokens_tenant ON public.portal_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_artisan ON public.portal_tokens(tenant_id, crm_artisan_id);

CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON public.portal_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_not_synced ON public.portal_submissions(tenant_id, synced_to_crm) 
    WHERE NOT synced_to_crm;
CREATE INDEX IF NOT EXISTS idx_submissions_token ON public.portal_submissions(portal_token_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id, created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate active distinct artisans
CREATE OR REPLACE FUNCTION get_active_artisans_count(p_tenant_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(DISTINCT crm_artisan_id)::INTEGER
    FROM public.portal_tokens
    WHERE tenant_id = p_tenant_id 
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now());
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_active_artisans_count IS 'Returns count of distinct active artisans for a tenant';

-- Trigger function to update tenant_usage
CREATE OR REPLACE FUNCTION update_tenant_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenant_usage (tenant_id, active_artisans_count, period_start)
    VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        get_active_artisans_count(COALESCE(NEW.tenant_id, OLD.tenant_id)),
        CURRENT_DATE
    )
    ON CONFLICT (tenant_id, period_start) 
    DO UPDATE SET 
        active_artisans_count = get_active_artisans_count(EXCLUDED.tenant_id),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update usage on token changes
DROP TRIGGER IF EXISTS trg_update_usage_on_token_change ON public.portal_tokens;
CREATE TRIGGER trg_update_usage_on_token_change
AFTER INSERT OR UPDATE OR DELETE ON public.portal_tokens
FOR EACH ROW EXECUTE FUNCTION update_tenant_usage();

-- Trigger to update updated_at on tenants
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;

-- Service role has full access (all access goes through API with service role)
-- No anon policies needed - everything goes through authenticated API

-- ============================================
-- SEED DATA (for development/testing)
-- ============================================
-- Uncomment to create a test tenant

-- INSERT INTO public.tenants (name, subscription_status, subscription_plan, allowed_artisans)
-- VALUES ('Test Tenant', 'trial', 'basic', 10);

-- To create API key, run in application:
-- const { keyId, secret } = generateApiCredentials()
-- const secretHash = await hashApiSecret(secret)
-- INSERT INTO api_keys (tenant_id, key_id, key_secret_hash) VALUES (...)
