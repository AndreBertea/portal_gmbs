import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateApiCredentials, hashApiSecret } from '@/lib/crypto/tokens'
import { sendWelcomeEmail } from '@/lib/email/templates'

// Mapping Stripe Price IDs → allowed_artisans
const PLAN_LIMITS: Record<string, { plan: string; artisans: number }> = {
  'price_1Sqj2gAKwn1nulANXTwwXUfr': { plan: 'basic', artisans: 10 },
  // Ajouter les autres price IDs ici quand disponibles
  'price_pro': { plan: 'pro', artisans: 50 },
  'price_enterprise': { plan: 'enterprise', artisans: 999 }
}

/**
 * Webhook Stripe - Gestion des événements d'abonnement
 *
 * Événements gérés:
 * - checkout.session.completed → Créer tenant + API key
 * - customer.subscription.updated → Mettre à jour subscription_status
 * - customer.subscription.deleted → Marquer subscription comme cancelled
 * - invoice.payment_failed → Optionnel: alerter
 */
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover'
  })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
    // Retourner 200 pour éviter retry loops
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 200 })
  }

  // Récupérer la signature Stripe
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const error = err as Error
    console.error('[Stripe Webhook] Signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Extraire metadata du checkout
        const tenantName = session.metadata?.tenant_name || session.customer_email || 'Unknown Tenant'
        const tenantEmail = session.customer_email || session.metadata?.email
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Récupérer la subscription pour obtenir le price_id
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id

        // Déterminer le plan et les limites
        const planConfig = priceId ? PLAN_LIMITS[priceId] : null
        const plan = planConfig?.plan || 'basic'
        const allowedArtisans = planConfig?.artisans || 10

        // Créer le tenant
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: tenantName,
            subscription_status: 'active',
            subscription_plan: plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            allowed_artisans: allowedArtisans,
            is_active: true
          })
          .select()
          .single()

        if (tenantError) {
          console.error('[Stripe Webhook] Error creating tenant:', tenantError)
          throw tenantError
        }

        console.log(`[Stripe Webhook] Tenant created: ${tenant.id} (${tenantName})`)

        // Générer API credentials
        const { keyId, secret } = generateApiCredentials()
        const secretHash = await hashApiSecret(secret)

        const { data: apiKey, error: apiKeyError } = await supabase
          .from('api_keys')
          .insert({
            tenant_id: tenant.id,
            key_id: keyId,
            key_secret_hash: secretHash,
            label: 'Production',
            scopes: ['tokens:write', 'submissions:read']
          })
          .select()
          .single()

        if (apiKeyError) {
          console.error('[Stripe Webhook] Error creating API key:', apiKeyError)
          throw apiKeyError
        }

        console.log(`[Stripe Webhook] API key created: ${keyId}`)

        // Log audit
        await supabase.from('audit_logs').insert({
          tenant_id: tenant.id,
          action: 'tenant.created_via_stripe',
          resource_type: 'tenant',
          resource_id: tenant.id,
          details: {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
            allowed_artisans: allowedArtisans
          }
        })

        // Envoyer email de bienvenue avec credentials (MVP: console.log seulement)
        if (tenantEmail) {
          await sendWelcomeEmail({
            tenantName,
            tenantEmail,
            apiKeyId: keyId,
            apiSecret: secret,
            plan,
            allowedArtisans
          })
        } else {
          console.warn('[Stripe Webhook] No email found - cannot send credentials!')
          console.log(`[Stripe Webhook] MANUAL DELIVERY REQUIRED: keyId=${keyId}, secret=${secret}`)
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Déterminer le nouveau statut
        let status: 'active' | 'cancelled' | 'expired' = 'active'
        if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
          status = 'cancelled'
        } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          status = 'expired'
        }

        // Récupérer le price_id pour mettre à jour le plan si changé
        const priceId = subscription.items.data[0]?.price.id
        const planConfig = priceId ? PLAN_LIMITS[priceId] : null

        const updateData: any = {
          subscription_status: status,
          updated_at: new Date().toISOString()
        }

        if (planConfig) {
          updateData.subscription_plan = planConfig.plan
          updateData.allowed_artisans = planConfig.artisans
        }

        const { data: tenant, error } = await supabase
          .from('tenants')
          .update(updateData)
          .eq('stripe_customer_id', customerId)
          .select()
          .single()

        if (error) {
          console.error('[Stripe Webhook] Error updating subscription:', error)
          throw error
        }

        console.log(`[Stripe Webhook] Subscription updated: tenant ${tenant.id} → ${status}`)

        // Log audit
        await supabase.from('audit_logs').insert({
          tenant_id: tenant.id,
          action: 'subscription.updated',
          resource_type: 'tenant',
          resource_id: tenant.id,
          details: {
            new_status: status,
            subscription_id: subscription.id,
            plan: planConfig?.plan
          }
        })

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: tenant, error } = await supabase
          .from('tenants')
          .update({
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId)
          .select()
          .single()

        if (error) {
          console.error('[Stripe Webhook] Error deleting subscription:', error)
          throw error
        }

        console.log(`[Stripe Webhook] Subscription deleted: tenant ${tenant.id}`)

        // Log audit
        await supabase.from('audit_logs').insert({
          tenant_id: tenant.id,
          action: 'subscription.deleted',
          resource_type: 'tenant',
          resource_id: tenant.id,
          details: {
            subscription_id: subscription.id
          }
        })

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Récupérer le tenant
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('stripe_customer_id', customerId)
          .single()

        if (tenant) {
          console.warn(`[Stripe Webhook] Payment failed for tenant ${tenant.id} (${tenant.name})`)

          // Log audit
          await supabase.from('audit_logs').insert({
            tenant_id: tenant.id,
            action: 'payment.failed',
            resource_type: 'tenant',
            resource_id: tenant.id,
            details: {
              invoice_id: invoice.id,
              amount_due: invoice.amount_due,
              attempt_count: invoice.attempt_count
            }
          })

          // TODO: Envoyer email d'alerte ou suspendre après X tentatives
          console.log('[Stripe Webhook] TODO: Implement payment failure handling (email/suspension)')
        }

        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const err = error as Error
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err.message)

    // Retourner 200 pour éviter retry loops infinis
    // Stripe va retry automatiquement si on retourne 5xx
    return NextResponse.json(
      { error: 'Internal error', received: true },
      { status: 200 }
    )
  }
}
