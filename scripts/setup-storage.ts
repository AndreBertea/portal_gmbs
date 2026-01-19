/**
 * Setup Supabase Storage buckets
 * Run with: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://byltwcqoljjopiausycj.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log('🚀 Setting up storage buckets...\n')

  // Create artisan-uploads bucket
  const { data: bucket, error } = await supabase.storage.createBucket('artisan-uploads', {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB max
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ]
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket "artisan-uploads" already exists')
    } else {
      console.error('❌ Failed to create bucket:', error.message)
      process.exit(1)
    }
  } else {
    console.log('✅ Bucket "artisan-uploads" created')
  }

  // List buckets to verify
  const { data: buckets } = await supabase.storage.listBuckets()
  console.log('\n📦 Available buckets:')
  buckets?.forEach(b => {
    console.log(`  - ${b.name} (public: ${b.public})`)
  })

  console.log('\n✅ Storage setup complete!')
}

main().catch(console.error)
