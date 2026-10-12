import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  createMemoryKeyValueStorage,
  resolveAsyncStorage,
} from '@/services/asyncStorage';
import { hasSupabaseConfig } from '@/services/supabaseConfig';

let shared: SupabaseClient | null = null;

/**
 * Single Supabase client with persisted auth session (anonymous login).
 * All Realtime / table code should prefer this when available.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!hasSupabaseConfig()) {
    return null;
  }
  if (shared) {
    return shared;
  }

  const asyncStorage = resolveAsyncStorage();
  if (__DEV__) {
    console.log(
      '[encore] auth storage:',
      asyncStorage ? 'persistent' : 'memory-fallback',
    );
  }
  const storage = asyncStorage ?? createMemoryKeyValueStorage();

  shared = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  );
  return shared;
}
