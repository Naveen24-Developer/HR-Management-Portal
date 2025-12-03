//src/contexts/AuthContext.tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  roleName?: string;
  permissions?: Record<string, Record<string, boolean>>;
  sidebarPermissions?: string[];
  pagePermissions?: string[];
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
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
          // keep supabase user info available, but we will augment with our server-side /api/auth/me
          if (isMounted && session?.user) {
            setUser((prev) => ({ ...(prev ?? {}), ...(session.user as any) }));
          }
        }

        const { data: { subscription }, error: listenerError } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
          if (isMounted) {
            setUser((prev) => ({ ...(prev ?? {}), ...(session?.user ?? {}) }));
          }
        });

        // After supabase init, try to get application-level user info (role, permissions)
        // Prefer server cookie `auth-token`, otherwise use token from localStorage.
        try {
          const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
          const headers: any = {};
          if (tokenFromStorage) headers['Authorization'] = `Bearer ${tokenFromStorage}`;

          const meRes = await fetch('/api/auth/me', {
            method: 'GET',
            headers,
            credentials: 'include',
          });

          if (meRes.ok) {
            const json = await meRes.json();
            if (json?.user && isMounted) {
              // merge permissions if also stored in localStorage
              let perms = json.user.permissions ?? null;
              try {
                const storedPerms = typeof window !== 'undefined' ? localStorage.getItem('auth-permissions') : null;
                if (storedPerms && !perms) {
                  perms = JSON.parse(storedPerms);
                }
              } catch (e) {
                // ignore
              }
              const mergedUser = { ...json.user, permissions: perms };
              setUser(mergedUser);
            }
          }
        } catch (e) {
          // ignore me fetch errors; app can still function using supabase session info
          console.warn('Failed to fetch /api/auth/me:', e);
        } finally {
          if (isMounted) setLoading(false);
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
