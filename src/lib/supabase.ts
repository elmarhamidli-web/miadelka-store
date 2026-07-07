import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// The publishable key is safe to ship in the browser bundle — all data access
// is guarded by Row Level Security policies in the database.
const DEFAULT_URL = 'https://evqdraogfekhtdkkrmuq.supabase.co'
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_Uco7Zh8nx_pMXpJMHOeKOA_dNgaCxjO'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? DEFAULT_URL
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? DEFAULT_PUBLISHABLE_KEY

/** Null when the backend is not configured — the site then uses bundled data. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const STORAGE_BUCKET = 'product-images'
