import { createClient } from '@supabase/supabase-js';

// Lazily initialize Supabase client to avoid throwing at module import time
let _supabase: ReturnType<typeof createClient> | null = null;

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Provide helpful error with fallback behavior in development
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    const errorMsg = `Missing Supabase environment variable(s): ${missingVars.join(', ')}. Please ensure these are set in your .env or deployment environment.`;
    console.error(errorMsg);
    
    // In development, throw immediately to make it clear
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
      throw new Error(errorMsg);
    }
    
    // In production on client-side with missing env, create a dummy client to prevent crashes
    // Real auth operations will fail gracefully with proper error messages
    try {
      _supabase = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseKey || 'placeholder-key'
      );
    } catch (e) {
      console.error('Failed to create Supabase client:', e);
      throw new Error(errorMsg);
    }
    return _supabase;
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
