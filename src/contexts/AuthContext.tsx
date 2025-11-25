//src/contexts/AuthContext.tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => {} });

// Safe lazy import to handle Supabase client initialization errors
let supabaseClient: any = null;

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  try {
    const { supabase } = await import('@/lib/supabase/client');
    supabaseClient = supabase;
    return supabase;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const supabase = await getSupabaseClient();
        
        if (!supabase) {
          console.warn('Supabase client not available');
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error fetching session:', sessionError);
          if (isMounted) {
            setInitError(sessionError.message);
          }
        } else {
          if (isMounted) {
            setUser(session?.user ?? null);
          }
        }

        const { data: { subscription }, error: listenerError } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
          if (isMounted) {
            setUser(session?.user ?? null);
          }
        });

        if (isMounted) {
          setLoading(false);
        }

        return () => {
          subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    try {
      // Call server logout to clear any server-side cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(e => console.log('Logout fetch error (non-blocking):', e));
    } catch (e) {
      // ignore
    }

    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Supabase sign out error:', e);
    }

    try {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('auth-permissions');
    } catch (e) {
      // ignore
    }
    setUser(null);

    try {
      router.replace('/login');
    } catch (e) {
      console.error('Router error:', e);
    }
  };

  // If there's an init error but app still needs to load, render children
  // User will see app but auth won't work until they reload or Supabase is available
  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
      {initError && process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fef08a', padding: '1rem', fontSize: '0.875rem', zIndex: 9999 }}>
          <strong>Auth Init Error (dev only):</strong> {initError}
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
