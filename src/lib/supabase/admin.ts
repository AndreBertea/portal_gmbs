import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseAdmin: SupabaseClient | null = null

/**
 * Returns a singleton Supabase admin client (service role)
 * Used for server-side operations that need full access
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    }

    supabaseAdmin = createClient(url, key, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }
  return supabaseAdmin
}

/**
 * Creates a new Supabase client (for cases where singleton is not appropriate)
 */
export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  return createClient(url, key, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
