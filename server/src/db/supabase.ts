import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config.js'

let client: SupabaseClient | null = null

export function useSupabase(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey)
}

export function getSupabase(): SupabaseClient {
  if (!useSupabase()) {
    throw new Error('Supabase is not configured')
  }
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return client
}
