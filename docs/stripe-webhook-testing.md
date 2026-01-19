# Stripe Webhook - Guide de Test

## Configuration initiale

### 1. Variables d'environnement requises

Ajouter dans `.env.local` :

```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 2. Obtenir le webhook secret

#### Option A - Stripe CLI (Développement local)

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Se connecter
stripe login

# Démarrer l'écoute et obtenir le secret
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

Le CLI va afficher quelque chose comme :
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Copier ce secret dans `.env.local` comme `STRIPE_WEBHOOK_SECRET`

#### Option B - Dashboard Stripe (Production)

1. Aller sur https://dashboard.stripe.com/webhooks
2. Cliquer "Add endpoint"
3. URL : `https://your-domain.com/api/v1/webhooks/stripe`
4. Sélectionner les événements :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copier le "Signing secret" (whsec_xxx)

## Tests manuels

### Test 1 - Création de tenant (checkout.session.completed)

```bash
# Démarrer le forwarding
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Dans un autre terminal, créer un événement test
stripe trigger checkout.session.completed
```

**Vérifications :**
- [ ] Un nouveau tenant est créé dans la table `tenants`
- [ ] Une API key est créée dans `api_keys`
- [ ] Un log est créé dans `audit_logs` avec action `tenant.created_via_stripe`
- [ ] Les credentials sont loggés dans la console (MVP uniquement)

**Vérifier en DB :**
```sql
-- Derniers tenants créés
SELECT id, name, subscription_status, subscription_plan, stripe_customer_id
FROM tenants
ORDER BY created_at DESC
LIMIT 5;

-- API key associée
SELECT key_id, label, scopes, created_at
FROM api_keys
WHERE tenant_id = 'xxx'
ORDER BY created_at DESC;

-- Audit logs
SELECT action, resource_type, details, created_at
FROM audit_logs
WHERE tenant_id = 'xxx'
ORDER BY created_at DESC;
```

### Test 2 - Mise à jour d'abonnement

```bash
stripe trigger customer.subscription.updated
```

**Vérifications :**
- [ ] Le `subscription_status` du tenant est mis à jour
- [ ] Le `subscription_plan` peut changer si le price_id change
- [ ] Un audit log est créé

### Test 3 - Annulation d'abonnement

```bash
stripe trigger customer.subscription.deleted
```

**Vérifications :**
- [ ] Le `subscription_status` passe à `cancelled`
- [ ] Le tenant reste actif (soft delete)
- [ ] Un audit log est créé

### Test 4 - Échec de paiement

```bash
stripe trigger invoice.payment_failed
```

**Vérifications :**
- [ ] Un audit log est créé avec `action: 'payment.failed'`
- [ ] Un warning apparaît dans les logs

## Tests avec un vrai checkout

### 1. Créer une session de checkout

Créer un endpoint de test ou utiliser le dashboard Stripe pour générer un lien de paiement.

**Exemple de checkout avec metadata :**

```typescript
// Exemple pour référence (ne pas inclure dans ce fichier)
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: 'price_1Sqj2gAKwn1nulANXTwwXUfr', // Basic plan
    quantity: 1
  }],
  customer_email: 'client@example.com',
  metadata: {
    tenant_name: 'SARL Dupont Artisan',
    email: 'client@example.com'
  },
  success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'http://localhost:3000/cancel'
})
```

### 2. Tester le flow complet

1. Ouvrir le lien de checkout
2. Utiliser une carte de test : `4242 4242 4242 4242` (date future, tout CVC)
3. Compléter le paiement
4. Vérifier que le webhook `checkout.session.completed` est reçu
5. Vérifier la création du tenant en DB

## Mapping des plans

Configuration actuelle dans `route.ts` :

| Price ID | Plan | Artisans autorisés |
|----------|------|-------------------|
| `price_1Sqj2gAKwn1nulANXTwwXUfr` | basic | 10 |
| `price_pro` | pro | 50 |
| `price_enterprise` | enterprise | 999 |

**À mettre à jour** : Remplacer `price_pro` et `price_enterprise` par les vrais price IDs depuis le dashboard Stripe.

## Debugging

### Logs à surveiller

Le webhook log toutes les opérations importantes :

```bash
# Démarrer le serveur en mode dev
npm run dev

# Observer les logs
[Stripe Webhook] Tenant created: abc-123 (SARL Dupont)
[Stripe Webhook] API key created: pk_live_xxxxx
[Stripe Webhook] TODO: Send welcome email to client@example.com
[Stripe Webhook] Credentials: keyId=pk_live_xxx, secret=sk_live_xxx
```

### Erreurs courantes

**1. Missing signature**
- Cause : Header `stripe-signature` absent
- Solution : Vérifier que la requête vient bien de Stripe

**2. Invalid signature**
- Cause : `STRIPE_WEBHOOK_SECRET` incorrect ou mal configuré
- Solution : Régénérer le secret avec `stripe listen` ou depuis le dashboard

**3. Webhook not configured**
- Cause : `STRIPE_WEBHOOK_SECRET` non défini dans `.env.local`
- Solution : Ajouter la variable d'environnement

**4. Tenant creation failed**
- Vérifier les logs Supabase
- Vérifier que les tables existent (migration appliquée)
- Vérifier les permissions RLS (le service role doit avoir accès)

## Vérification de sécurité

### Tests à effectuer

1. **Signature invalide** : Envoyer une requête sans signature
   ```bash
   curl -X POST http://localhost:3000/api/v1/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"type":"checkout.session.completed"}'
   ```
   ✅ Attendu : `400 Missing signature`

2. **Secret incorrect** : Modifier temporairement `STRIPE_WEBHOOK_SECRET`
   ✅ Attendu : `400 Invalid signature`

3. **Event non géré** : Trigger un événement non supporté
   ```bash
   stripe trigger payment_intent.succeeded
   ```
   ✅ Attendu : `200 received: true` + log "Unhandled event type"

## Production

### Checklist avant déploiement

- [ ] Remplacer `sk_test_xxx` par `sk_live_xxx` dans les env vars de production
- [ ] Configurer le webhook endpoint dans le dashboard Stripe (mode live)
- [ ] Copier le nouveau `STRIPE_WEBHOOK_SECRET` (commence par `whsec_`)
- [ ] **CRITIQUE** : Supprimer les `console.log` qui loggent le `secret` des API keys
- [ ] Implémenter l'envoi d'email pour les credentials (remplacer les TODO)
- [ ] Configurer les alertes en cas de `payment.failed` répétés
- [ ] Tester le webhook en production avec Stripe Dashboard > Webhooks > Send test webhook

### Monitoring

Créer des alertes pour :
- Webhooks en échec (via dashboard Stripe)
- Tenants créés sans API key
- Paiements échoués > 3 fois

## Notes importantes

1. **Idempotence** : Stripe peut envoyer le même événement plusieurs fois
   - Actuellement géré par les contraintes DB (UNIQUE sur `stripe_customer_id`)
   - Pour éviter les doublons d'API keys, considérer vérifier avant insertion

2. **Secrets dans les logs** : Les credentials sont loggés pour MVP uniquement
   - **À SUPPRIMER EN PRODUCTION**
   - Implémenter l'envoi d'email sécurisé à la place

3. **Retry loops** : Le webhook retourne toujours `200` pour éviter les retry infinis
   - Même en cas d'erreur interne, Stripe reçoit un 200
   - Les erreurs sont loggées mais ne déclenchent pas de retry

4. **Plans manquants** : Si un `price_id` n'est pas dans `PLAN_LIMITS`
   - Le plan par défaut est `basic` avec 10 artisans
   - Mettre à jour la constante `PLAN_LIMITS` quand les price IDs sont créés
