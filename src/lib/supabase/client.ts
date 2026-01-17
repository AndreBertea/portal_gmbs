import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

/**
 * Returns a singleton Supabase client (anon key)
 * Used for client-side operations with RLS
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!url || !key) {
      throw new Error('Missing Supabase URL or anon key environment variables')
    }

    supabaseClient = createClient(url, key)
  }
  return supabaseClient
}
