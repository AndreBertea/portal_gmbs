# GMBS Portal

Service de portail artisan pour GMBS CRM - Architecture plugin SaaS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GMBS CLOUD (portal_gmbs)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   API v1     │  │  Portal UI   │  │   Stripe     │          │
│  │  /api/v1/*   │  │    /t/*      │  │  Webhooks    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                          │                                       │
│              ┌───────────┴───────────┐                          │
│              │   Supabase (DB+Storage)│                          │
│              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTPS / API Calls
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                     CLIENT CRM (gmbs-crm)                        │
│  ┌──────────────────────────────────────────────────┐           │
│  │              SDK (@gmbs/portal-sdk)               │           │
│  │  • checkSubscription()                           │           │
│  │  • generatePortalLink()                          │           │
│  │  • getSubmissions()                              │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- **Token-based portal access** pour les artisans
- **Multi-tenant** avec isolation complète
- **Sécurisé** : tokens hashés, secrets bcrypt
- **Pull-based sync** : le CRM récupère les soumissions
- **Quotas** : limite d'artisans par plan

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Copier les credentials dans `.env.local`
3. Appliquer la migration :

```bash
# Via Supabase CLI
supabase db push

# Ou manuellement via le SQL Editor
```

### 3. Développement

```bash
npm run dev
```

## API Endpoints

### Authentication

Tous les endpoints (sauf `/tokens/:token/validate`) requièrent :

```
X-GMBS-Key-Id: pk_live_xxx
X-GMBS-Secret: sk_live_xxx
X-GMBS-Timestamp: 1234567890
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscription/status` | Statut souscription |
| POST | `/api/v1/tokens` | Générer token portail |
| GET | `/api/v1/tokens/:token/validate` | Valider token (public) |
| GET | `/api/v1/submissions` | Lister soumissions |
| POST | `/api/v1/submissions/mark-synced` | Marquer comme sync |

## SDK Usage

```typescript
import { GMBSPortalSDK } from '@gmbs/portal-sdk'

const sdk = new GMBSPortalSDK({
  keyId: 'pk_live_xxx',
  secret: 'sk_live_xxx'
})

// Générer un lien portail
const { portal_url } = await sdk.generatePortalLink({
  artisanId: 'uuid',
  metadata: { name: 'Jean Dupont' }
})

// Récupérer soumissions non sync
const { submissions } = await sdk.getSubmissions({ unsynced: true })

// Marquer comme synchronisées
await sdk.markSubmissionsSynced(submissions.map(s => s.id))
```

## Database Schema

- `tenants` - Clients CRM
- `api_keys` - Clés API (multi par tenant)
- `portal_tokens` - Tokens d'accès (hashés)
- `portal_submissions` - Soumissions artisans
- `audit_logs` - Traçabilité
- `tenant_usage` - Compteurs quotas

## Security

- **Tokens** : SHA256 hashés en DB, jamais stockés en clair
- **API Secrets** : bcrypt hashés
- **RLS** : Row Level Security activé
- **Anti-replay** : Validation timestamp (5 min drift)

## License

Propriétaire - GMBS
