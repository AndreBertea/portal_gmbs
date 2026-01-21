/**
 * Script to create or update the CRM tenant with known credentials
 * Run with: npx tsx scripts/setup-crm-tenant.ts
 * 
 * This will create a tenant with credentials that match the CRM .env configuration
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcrypt'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://byltwcqoljjopiausycj.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  console.error('   Run with: SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/setup-crm-tenant.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// These MUST match what the CRM has in its .env
// Set via environment variables for security
const KNOWN_KEY_ID = process.env.CRM_API_KEY_ID
const KNOWN_SECRET = process.env.CRM_API_SECRET

if (!KNOWN_KEY_ID || !KNOWN_SECRET) {
  console.error('❌ CRM_API_KEY_ID and CRM_API_SECRET are required')
  console.error('   Set these in your .env.local or run with:')
  console.error('   CRM_API_KEY_ID=pk_xxx CRM_API_SECRET=sk_xxx npx tsx scripts/setup-crm-tenant.ts')
  process.exit(1)
}

async function main() {
  console.log('🚀 Setting up CRM tenant in Portal database...\n')
  console.log('Expected credentials:')
  console.log('  Key ID:', KNOWN_KEY_ID)
  console.log('  Secret:', KNOWN_SECRET.substring(0, 20) + '...')
  console.log('')

  // Hash the secret with bcrypt
  const secretHash = await bcrypt.hash(KNOWN_SECRET, 12)
  console.log('✅ Secret hashed with bcrypt')

  // Check if API key already exists
  const { data: existingKey, error: keyCheckError } = await supabase
    .from('api_keys')
    .select('id, tenant_id, key_id')
    .eq('key_id', KNOWN_KEY_ID)
    .maybeSingle()

  if (keyCheckError && keyCheckError.code !== 'PGRST116') {
    console.error('❌ Error checking existing key:', keyCheckError.message)
    process.exit(1)
  }

  if (existingKey) {
    console.log('ℹ️  API key already exists, updating secret hash...')
    
    // Update the secret hash
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ 
        key_secret_hash: secretHash,
        revoked_at: null,  // Ensure not revoked
        last_used_at: new Date().toISOString()
      })
      .eq('id', existingKey.id)

    if (updateError) {
      console.error('❌ Failed to update API key:', updateError.message)
      process.exit(1)
    }

    console.log('✅ API key secret updated')
    console.log('   Tenant ID:', existingKey.tenant_id)
  } else {
    console.log('ℹ️  API key does not exist, creating new tenant...')

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'GMBS CRM Production',
        subscription_status: 'active',
        subscription_plan: 'pro',
        allowed_artisans: 1000
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
        key_id: KNOWN_KEY_ID,
        key_secret_hash: secretHash,
        label: 'GMBS CRM Production',
        scopes: ['tokens:write', 'submissions:read']
      })
      .select()
      .single()

    if (keyError) {
      console.error('❌ Failed to create API key:', keyError.message)
      process.exit(1)
    }

    console.log('✅ API key created:', apiKey.id)
  }

  // Verify the setup
  console.log('\n📋 Verifying setup...')
  
  const { data: verifyKey, error: verifyError } = await supabase
    .from('api_keys')
    .select(`
      id,
      key_id,
      key_secret_hash,
      tenant:tenants (
        id,
        name,
        subscription_status,
        subscription_plan,
        allowed_artisans
      )
    `)
    .eq('key_id', KNOWN_KEY_ID)
    .single()

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message)
    process.exit(1)
  }

  // Verify bcrypt hash matches
  const hashMatch = await bcrypt.compare(KNOWN_SECRET, verifyKey.key_secret_hash)
  
  console.log('')
  console.log('='.repeat(60))
  console.log('✅ SETUP COMPLETE')
  console.log('='.repeat(60))
  console.log('')
  console.log('Tenant:', (verifyKey.tenant as any)?.name)
  console.log('Tenant ID:', (verifyKey.tenant as any)?.id)
  console.log('Plan:', (verifyKey.tenant as any)?.subscription_plan)
  console.log('Status:', (verifyKey.tenant as any)?.subscription_status)
  console.log('Allowed Artisans:', (verifyKey.tenant as any)?.allowed_artisans)
  console.log('')
  console.log('API Key ID:', verifyKey.key_id)
  console.log('Secret Hash Valid:', hashMatch ? '✅ YES' : '❌ NO')
  console.log('')
  console.log('='.repeat(60))
  console.log('')
  
  if (!hashMatch) {
    console.error('❌ CRITICAL: Secret hash does not match!')
    process.exit(1)
  }

  console.log('🎉 The Portal is now ready to accept requests from the CRM!')
  console.log('')
  console.log('Test with:')
  console.log(`curl -X GET YOUR_PORTAL_URL/api/v1/subscription/status \\`)
  console.log(`  -H "X-GMBS-Key-Id: YOUR_KEY_ID" \\`)
  console.log(`  -H "X-GMBS-Secret: YOUR_SECRET"`)
  console.log('')
}

main().catch(console.error)
