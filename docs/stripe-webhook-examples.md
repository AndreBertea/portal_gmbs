# Exemples de requêtes webhook Stripe

Ce document contient des exemples de payloads webhook Stripe pour comprendre la structure des données.

## ⚠️ Note importante

Ces exemples sont à **titre informatif seulement**. Ne PAS envoyer ces payloads directement avec curl car ils ne passeront pas la vérification de signature Stripe.

Pour tester réellement, utilisez:
- `stripe trigger <event>` avec Stripe CLI
- Le script `scripts/test-webhook.sh`
- "Send test webhook" depuis le dashboard Stripe

---

## 1. checkout.session.completed

Événement déclenché quand un client complète un paiement.

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "object": "checkout.session",
      "customer": "cus_123456",
      "customer_email": "client@example.com",
      "subscription": "sub_abc123",
      "metadata": {
        "tenant_name": "SARL Dupont Artisan",
        "email": "client@example.com"
      },
      "mode": "subscription",
      "status": "complete",
      "success_url": "https://portal.gmbs.fr/success?session_id={CHECKOUT_SESSION_ID}",
      "cancel_url": "https://portal.gmbs.fr/cancel"
    }
  }
}
```

**Ce que fait le webhook**:
1. Extrait `customer_email` et `metadata.tenant_name`
2. Récupère la subscription `sub_abc123`
3. Obtient le `price_id` depuis la subscription
4. Crée le tenant avec les bonnes limites
5. Génère une API key
6. Envoie email de bienvenue (MVP: console.log)

**Metadata recommandées** pour le checkout:
```typescript
metadata: {
  tenant_name: "Nom de l'entreprise",
  email: "contact@entreprise.com",
  phone: "+33612345678" // optionnel
}
```

---

## 2. customer.subscription.updated

Événement déclenché quand une subscription est modifiée.

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_abc123",
      "object": "subscription",
      "customer": "cus_123456",
      "status": "active",
      "cancel_at_period_end": false,
      "items": {
        "data": [
          {
            "id": "si_abc123",
            "price": {
              "id": "price_1Sqj2gAKwn1nulANXTwwXUfr",
              "product": "prod_basic",
              "unit_amount": 4900,
              "currency": "eur"
            }
          }
        ]
      }
    }
  }
}
```

**Statuts possibles** et leur mapping:

| Stripe status | Portal status | Description |
|--------------|---------------|-------------|
| `active` | `active` | Subscription active et payée |
| `trialing` | `active` | En période d'essai |
| `past_due` | `expired` | Paiement en retard |
| `unpaid` | `expired` | Non payé après retries |
| `canceled` | `cancelled` | Annulée |
| `incomplete` | `trial` | Non complétée |

**Cas d'usage**:
- Changement de plan (basic → pro)
- Annulation programmée (`cancel_at_period_end = true`)
- Renouvellement échoué (`past_due`)

---

## 3. customer.subscription.deleted

Événement déclenché quand une subscription est définitivement annulée.

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "customer.subscription.deleted",
  "data": {
    "object": {
      "id": "sub_abc123",
      "object": "subscription",
      "customer": "cus_123456",
      "status": "canceled",
      "canceled_at": 1737321600,
      "ended_at": 1737321600
    }
  }
}
```

**Ce que fait le webhook**:
1. Trouve le tenant par `stripe_customer_id`
2. Update `subscription_status = 'cancelled'`
3. Le tenant reste en DB (soft delete)
4. Les API keys restent actives mais pourraient être révoquées

**Note**: Considérer révoquer automatiquement les API keys du tenant annulé.

---

## 4. invoice.payment_failed

Événement déclenché quand un paiement échoue.

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "id": "in_abc123",
      "object": "invoice",
      "customer": "cus_123456",
      "subscription": "sub_abc123",
      "amount_due": 4900,
      "amount_paid": 0,
      "attempt_count": 2,
      "currency": "eur",
      "status": "open",
      "next_payment_attempt": 1737408000
    }
  }
}
```

**Ce que fait le webhook**:
1. Log l'échec dans `audit_logs`
2. Console.warn pour monitoring
3. (TODO) Envoie email après 2-3 tentatives
4. (TODO) Suspendre après 4 tentatives

**Logique de retry Stripe**:
- Tentative 1: Immédiat
- Tentative 2: Après 3 jours
- Tentative 3: Après 5 jours
- Tentative 4: Après 7 jours
- Après 4 échecs: Subscription marquée `past_due` puis `unpaid`

---

## Structure complète de la Subscription

Pour référence, voici la structure complète d'une subscription Stripe:

```json
{
  "id": "sub_abc123",
  "object": "subscription",
  "customer": "cus_123456",
  "status": "active",
  "items": {
    "data": [
      {
        "id": "si_abc123",
        "price": {
          "id": "price_1Sqj2gAKwn1nulANXTwwXUfr",
          "product": "prod_basic",
          "unit_amount": 4900,
          "currency": "eur",
          "recurring": {
            "interval": "month",
            "interval_count": 1
          }
        },
        "quantity": 1
      }
    ]
  },
  "current_period_start": 1737321600,
  "current_period_end": 1739913600,
  "cancel_at_period_end": false,
  "canceled_at": null,
  "trial_start": null,
  "trial_end": null,
  "metadata": {}
}
```

---

## Créer une session de checkout

Exemple de code pour créer une session de checkout avec les bonnes metadata:

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [
    {
      price: 'price_1Sqj2gAKwn1nulANXTwwXUfr', // Basic plan
      quantity: 1
    }
  ],
  customer_email: 'client@example.com',
  metadata: {
    tenant_name: 'SARL Dupont Artisan',
    email: 'client@example.com'
  },
  success_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}/cancel`
})

// Rediriger l'utilisateur vers session.url
```

---

## Tester les webhooks localement

### Option 1: Stripe CLI (Recommandé)

```bash
# Terminal 1: Démarrer le serveur
npm run dev

# Terminal 2: Écouter les webhooks
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Terminal 3: Trigger un événement
stripe trigger checkout.session.completed
```

### Option 2: Script automatisé

```bash
./scripts/test-webhook.sh all
```

### Option 3: Dashboard Stripe

1. Aller sur https://dashboard.stripe.com/test/webhooks
2. Sélectionner votre webhook
3. Cliquer "Send test webhook"
4. Choisir l'événement à tester

---

## Vérifier les webhooks reçus

### Dans Stripe Dashboard

1. Aller sur https://dashboard.stripe.com/test/webhooks
2. Sélectionner votre webhook endpoint
3. Voir la liste des événements reçus
4. Inspecter les payloads et réponses

### Dans les logs serveur

```bash
# Logs du webhook
[Stripe Webhook] Tenant created: abc-123 (SARL Dupont)
[Stripe Webhook] API key created: pk_live_xxxxx
[Email] TODO: Send welcome email
```

### Dans Supabase

```sql
-- Derniers audit logs
SELECT
  action,
  details->>'stripe_customer_id' as customer_id,
  details->>'plan' as plan,
  created_at
FROM audit_logs
WHERE action LIKE 'tenant.%' OR action LIKE 'subscription.%'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Webhooks en production

### URL du webhook en production

```
https://portal.gmbs.fr/api/v1/webhooks/stripe
```

### Événements à écouter

Sélectionner dans Stripe Dashboard:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_failed`
- 💡 (Optionnel) `invoice.payment_succeeded`
- 💡 (Optionnel) `customer.subscription.trial_will_end`

### Security headers

Stripe envoie ces headers importants:

```
Stripe-Signature: t=1737321600,v1=abc123...,v0=def456...
Content-Type: application/json
User-Agent: Stripe/1.0
```

Le header `Stripe-Signature` est utilisé pour vérifier l'authenticité du webhook.

---

## Debugging

### Webhook rejeté (400)

**Problème**: Signature invalide

**Vérifier**:
1. `STRIPE_WEBHOOK_SECRET` correct
2. Mode test vs live cohérent
3. Body non modifié (pas de parsing JSON avant vérification)

### Webhook accepté mais tenant non créé

**Vérifier**:
1. Logs serveur pour erreurs Supabase
2. Permissions RLS (service role)
3. Metadata présentes dans le checkout
4. Schema DB à jour (migration appliquée)

### Email non envoyé

**Normal en MVP**: L'envoi email est un stub.

**TODO**: Implémenter avec Resend/SendGrid/AWS SES.

---

## Ressources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Event types reference](https://stripe.com/docs/api/events/types)
- [Testing webhooks](https://stripe.com/docs/webhooks/test)

