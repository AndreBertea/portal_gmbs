/**
 * Script to create a test tenant with API credentials
 * Run with: npx tsx scripts/seed-test-tenant.ts
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://byltwcqoljjopiausycj.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log('🚀 Creating test tenant...\n')

  // Generate API credentials
  const keyId = `pk_test_${crypto.randomBytes(16).toString('hex')}`
  const secret = `sk_test_${crypto.randomBytes(32).toString('hex')}`
  const secretHash = await bcrypt.hash(secret, 12)

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: 'GMBS CRM (Test)',
      subscription_status: 'trial',
      subscription_plan: 'pro',
      allowed_artisans: 100
    })
    .select()
    .single()

  if (tenantError) {
    console.error('❌ Failed to create tenant:', tenantError.message)
    process.exit(1)
  }

  console.log('✅ Tenant created:', tenant.id)

  // Create API key
  const { data: apiKey, error: keyError } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: tenant.id,
      key_id: keyId,
      key_secret_hash: secretHash,
      label: 'Development',
      scopes: ['tokens:write', 'submissions:read']
    })
    .select()
    .single()

  if (keyError) {
    console.error('❌ Failed to create API key:', keyError.message)
    process.exit(1)
  }

  console.log('✅ API key created:', apiKey.id)

  // Output credentials
  console.log('\n' + '='.repeat(60))
  console.log('📋 TEST CREDENTIALS (save these!)'.padStart(40))
  console.log('='.repeat(60))
  console.log('')
  console.log('Tenant ID:', tenant.id)
  console.log('Tenant Name:', tenant.name)
  console.log('Plan:', tenant.subscription_plan)
  console.log('')
  console.log('API Key ID:', keyId)
  console.log('API Secret:', secret)
  console.log('')
  console.log('='.repeat(60))
  console.log('')
  console.log('📝 Add these to your CRM .env.local:')
  console.log('')
  console.log(`GMBS_PORTAL_KEY_ID=${keyId}`)
  console.log(`GMBS_PORTAL_SECRET=${secret}`)
  console.log(`GMBS_PORTAL_BASE_URL=http://localhost:3000/api/v1`)
  console.log('')
  console.log('='.repeat(60))
  console.log('')
  console.log('🧪 Test with curl:')
  console.log('')
  console.log(`curl -X GET http://localhost:3000/api/v1/subscription/status \\`)
  console.log(`  -H "X-GMBS-Key-Id: ${keyId}" \\`)
  console.log(`  -H "X-GMBS-Secret: ${secret}"`)
  console.log('')
}

main().catch(console.error)
