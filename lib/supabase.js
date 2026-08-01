import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let cachedClient = null

export function createClient(url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const resolvedUrl = url || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const resolvedKey = key || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ''

  if (!resolvedUrl || !resolvedKey) {
    throw new Error('Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createSupabaseClient(resolvedUrl, resolvedKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export const supabase = cachedClient || (cachedClient = createClient())
