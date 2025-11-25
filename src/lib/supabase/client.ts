import { createClient } from '@supabase/supabase-js';

// Lazily initialize Supabase client to avoid throwing at module import time
let _supabase: ReturnType<typeof createClient> | null = null;

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Anon Key is not set in environment variables.');
  }

  _supabase = createClient(supabaseUrl, supabaseKey);
  return _supabase;
}

function getSupabase() {
  if (_supabase) return _supabase;
  return createSupabaseClient();
}

export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const real = getSupabase();
      // @ts-ignore
      const value = (real as any)[prop];
      if (typeof value === 'function') return value.bind(real);
      return value;
    },
    apply(_, thisArg, args) {
      const real = getSupabase();
      // @ts-ignore
      return (real as any).apply(thisArg, args);
    },
  }
) as unknown as ReturnType<typeof createClient>;

export const _getRawSupabase = () => _supabase;
