/**
 * Script to check data in Portal database
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://byltwcqoljjopiausycj.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log('📊 Checking Portal database contents...\n')

  // Check tenants
  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
  console.log('🏢 Tenants:', tenants?.length || 0)
  tenants?.forEach(t => console.log(`   - ${t.name} (${t.id}) - ${t.subscription_status}`))

  // Check API keys
  const { data: apiKeys, error: apiKeyError } = await supabase
    .from('api_keys')
    .select('id, key_id, tenant_id, label, revoked_at, last_used_at')
  console.log('\n🔑 API Keys:', apiKeys?.length || 0)
  apiKeys?.forEach(k => console.log(`   - ${k.key_id} (${k.label}) - revoked: ${k.revoked_at ? 'YES' : 'NO'}`))

  // Check portal tokens
  const { data: tokens, error: tokenError } = await supabase
    .from('portal_tokens')
    .select('id, crm_artisan_id, crm_intervention_id, is_active, token_prefix, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('\n🎟️  Portal Tokens (last 10):', tokens?.length || 0)
  tokens?.forEach(t => console.log(`   - ${t.token_prefix}... artisan:${t.crm_artisan_id} inter:${t.crm_intervention_id || 'N/A'} active:${t.is_active}`))

  // Check intervention reports
  const { data: reports, error: reportError } = await supabase
    .from('intervention_reports')
    .select('id, crm_artisan_id, crm_intervention_id, status, created_at, submitted_at')
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('\n📋 Intervention Reports (last 10):', reports?.length || 0)
  reports?.forEach(r => console.log(`   - artisan:${r.crm_artisan_id} inter:${r.crm_intervention_id} status:${r.status} submitted:${r.submitted_at || 'NOT YET'}`))

  // Check intervention photos
  const { data: photos, error: photoError } = await supabase
    .from('intervention_photos')
    .select('id, crm_artisan_id, crm_intervention_id, original_filename, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('\n📷 Intervention Photos (last 10):', photos?.length || 0)
  photos?.forEach(p => console.log(`   - ${p.original_filename} artisan:${p.crm_artisan_id} inter:${p.crm_intervention_id}`))

  // Check portal submissions
  const { data: submissions, error: submissionError } = await supabase
    .from('portal_submissions')
    .select('id, type, crm_artisan_id, crm_intervention_id, synced_to_crm, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('\n📤 Portal Submissions (last 10):', submissions?.length || 0)
  submissions?.forEach(s => console.log(`   - ${s.type} artisan:${s.crm_artisan_id} inter:${s.crm_intervention_id} synced:${s.synced_to_crm}`))

  // Check artisan documents
  const { data: docs, error: docError } = await supabase
    .from('artisan_documents')
    .select('id, crm_artisan_id, kind, original_filename, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('\n📄 Artisan Documents (last 10):', docs?.length || 0)
  docs?.forEach(d => console.log(`   - ${d.kind}: ${d.original_filename} artisan:${d.crm_artisan_id}`))

  console.log('\n✅ Check complete!')
}

main().catch(console.error)
