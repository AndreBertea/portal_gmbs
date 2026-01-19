# Stripe Webhook API

Endpoint pour recevoir et traiter les événements Stripe.

## Endpoint

```
POST /api/v1/webhooks/stripe
```

## Événements gérés

| Événement | Action | Description |
|-----------|--------|-------------|
| `checkout.session.completed` | ✅ Création tenant | Crée un nouveau tenant + génère une API key |
| `customer.subscription.updated` | ✅ Mise à jour statut | Met à jour le `subscription_status` et le plan |
| `customer.subscription.deleted` | ✅ Annulation | Marque la subscription comme `cancelled` |
| `invoice.payment_failed` | ⚠️ Alerte | Log l'échec de paiement (TODO: email d'alerte) |

## Sécurité

- ✅ Vérification de la signature Stripe avec `stripe.webhooks.constructEvent()`
- ✅ Variable `STRIPE_WEBHOOK_SECRET` obligatoire
- ✅ Retour 200 même en erreur interne (évite retry loops)
- ✅ Secrets API jamais exposés dans les logs (sauf MVP pour debug)

## Configuration requise

Variables d'environnement :

```bash
STRIPE_SECRET_KEY=sk_test_xxx          # Clé API Stripe
STRIPE_WEBHOOK_SECRET=whsec_xxx        # Secret du webhook (depuis Stripe CLI ou Dashboard)
```

## Flow checkout.session.completed

1. Récupère les métadonnées du checkout (`tenant_name`, `email`)
2. Récupère la subscription Stripe pour obtenir le `price_id`
3. Mappe le `price_id` au plan et aux limites d'artisans
4. Crée le tenant dans Supabase
5. Génère une paire de credentials API (`keyId` + `secret`)
6. Hash le secret avec bcrypt et stocke dans `api_keys`
7. Log l'action dans `audit_logs`
8. (MVP) Log les credentials dans la console
9. (TODO) Envoie un email avec les credentials

## Mapping des plans

Défini dans `PLAN_LIMITS` :

```typescript
const PLAN_LIMITS = {
  'price_1Sqj2gAKwn1nulANXTwwXUfr': { plan: 'basic', artisans: 10 },
  'price_pro': { plan: 'pro', artisans: 50 },
  'price_enterprise': { plan: 'enterprise', artisans: 999 }
}
```

⚠️ **À mettre à jour** avec les vrais price IDs depuis Stripe Dashboard.

## Test local

```bash
# Terminal 1 : Démarrer le serveur Next.js
npm run dev

# Terminal 2 : Écouter les webhooks avec Stripe CLI
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Terminal 3 : Trigger un événement test
stripe trigger checkout.session.completed
```

Voir la [documentation complète de test](../../../../../docs/stripe-webhook-testing.md) pour plus de détails.

## Structure de réponse

### Succès

```json
{
  "received": true
}
```

Status: `200 OK`

### Erreurs

Toutes les erreurs retournent `200 OK` pour éviter les retry loops infinis de Stripe.

```json
{
  "error": "Internal error",
  "received": true
}
```

Les erreurs sont loggées dans la console et dans `audit_logs`.

## Audit logs

Toutes les actions importantes sont tracées dans la table `audit_logs` :

| Action | Description |
|--------|-------------|
| `tenant.created_via_stripe` | Nouveau tenant créé via checkout |
| `subscription.updated` | Statut ou plan mis à jour |
| `subscription.deleted` | Subscription annulée |
| `payment.failed` | Paiement échoué |

## TODO

- [ ] Implémenter l'envoi d'email réel (Resend, SendGrid, AWS SES)
- [ ] Supprimer les `console.log` qui exposent le `secret` en production
- [ ] Ajouter une logique de suspension après X paiements échoués
- [ ] Gérer l'idempotence des événements (Stripe peut retry)
- [ ] Ajouter des metrics/monitoring (Sentry, DataDog)
- [ ] Implémenter `invoice.payment_succeeded` pour tracking

## Notes

- Les credentials API sont générés avec `generateApiCredentials()` de `src/lib/crypto/tokens.ts`
- Le secret est hashé avec bcrypt avant stockage
- Seul le `keyId` (pk_live_xxx) est public, le secret ne doit JAMAIS être exposé
- En MVP, le secret est loggé pour faciliter les tests - **À SUPPRIMER EN PRODUCTION**
