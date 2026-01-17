/**
 * Setup Stripe Products for GMBS Portal
 * Run with: STRIPE_SECRET_KEY=sk_xxx npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)

async function main() {
  console.log('🚀 Setting up Stripe products for GMBS Portal...\n')

  // Check if product already exists
  const existingProducts = await stripe.products.list({
    limit: 100
  })
  
  let product = existingProducts.data.find(p => p.metadata?.gmbs_plugin === 'portal_artisans')

  if (product) {
    console.log(`✅ Product already exists: ${product.name} (${product.id})`)
  } else {
    // Create Product
    product = await stripe.products.create({
      name: 'Portal Artisans',
      description: 'Plugin GMBS permettant aux artisans d\'accéder à leur portail dédié pour gérer documents, interventions et rapports photos.',
      metadata: {
        gmbs_plugin: 'portal_artisans',
        version: '1.0.0',
        features: 'Portail dédié,Documents légaux,Interventions,Rapport photo IA,Sync CRM'
      }
    })
    console.log(`✅ Product created: ${product.name} (${product.id})`)
  }

  // Check if price already exists
  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10
  })

  let price = existingPrices.data.find(p => p.metadata?.plan === 'starter')

  if (price) {
    console.log(`✅ Price already exists: ${price.nickname || 'Starter'} (${price.id})`)
  } else {
    // Create Price (0€ for now, recurring monthly)
    price = await stripe.prices.create({
      product: product.id,
      nickname: 'Starter (Gratuit)',
      unit_amount: 0, // 0€ - will be updated later
      currency: 'eur',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      metadata: {
        plan: 'starter',
        artisan_limit: '10'
      }
    })
    console.log(`✅ Price created: ${price.nickname} (${price.id})`)
  }

  console.log('\n📋 Configuration à ajouter dans .env:')
  console.log('─'.repeat(50))
  console.log(`STRIPE_PRODUCT_PORTAL_ARTISANS=${product.id}`)
  console.log(`STRIPE_PRICE_PORTAL_ARTISANS_STARTER=${price.id}`)
  console.log('─'.repeat(50))

  console.log('\n✅ Setup complete!')
}

main().catch(console.error)
