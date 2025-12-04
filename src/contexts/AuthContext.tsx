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
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  logout: async () => {},
  refetchUser: async () => {}
});

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

  // Function to fetch user data from API
  const fetchUserData = async () => {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    
    if (!tokenFromStorage) {
      console.log('AuthContext: No token found');
      setUser(null);
      return;
    }

    try {
      console.log('AuthContext: Fetching user data from /api/auth/me...');
      const headers: any = {
        'Authorization': `Bearer ${tokenFromStorage}`
      };

      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (meRes.ok) {
        const json = await meRes.json();
        if (json?.user) {
          const mergedUser = { 
            ...json.user,
            permissions: json.user.permissions,
            sidebarPermissions: json.user.sidebarPermissions,
            pagePermissions: json.user.pagePermissions
          };
          console.log('✅ AuthContext - User loaded successfully:', {
            role: mergedUser.role,
            email: mergedUser.email,
            sidebarPermissions: mergedUser.sidebarPermissions,
          });
          setUser(mergedUser);
        }
      } else {
        console.warn('⚠️ /api/auth/me returned non-OK status:', meRes.status);
        if (meRes.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
          setUser(null);
        }
      }
    } catch (e) {
      console.error('❌ Failed to fetch /api/auth/me:', e);
    }
  };

  // Expose refetch function
  const refetchUser = async () => {
    console.log('🔄 Refetching user data...');
    await fetchUserData();
  };

  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;

    const initAuth = async () => {
      try {
        // Skip auth initialization on public routes
        const isPublicRoute = typeof window !== 'undefined' && 
          (window.location.pathname === '/login' || 
           window.location.pathname === '/register' ||
           window.location.pathname === '/unauthorized');
        
        if (isPublicRoute) {
          console.log('AuthContext: Public route detected, skipping auth init');
          if (isMounted) setLoading(false);
          return;
        }

        console.log('AuthContext: Initializing auth...');
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

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
          if (isMounted) {
            setUser((prev) => ({ ...(prev ?? {}), ...(session?.user ?? {}) }));
          }
        });
        subscription = sub;

        // Fetch user data using the shared function
        await fetchUserData();
        
        if (isMounted) setLoading(false);
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
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Listen for storage events (when token is added from login)
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'auth-token' && e.newValue) {
        console.log('🔑 Auth token detected in storage, fetching user data...');
        await fetchUserData();
      }
    };

    // Also listen for custom event from same window (same-tab login)
    const handleLoginEvent = async () => {
      console.log('🔑 Login event detected, fetching user data...');
      await fetchUserData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('user-logged-in', handleLoginEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('user-logged-in', handleLoginEvent);
      }
    };
  }, []);

  const logout = async () => {
    console.log('🔴 Logout started...');
    
    // Step 1: Clear user state immediately
    setUser(null);
    console.log('✅ User state cleared');
    
    // Step 2: Clear all storage
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Storage cleared');
      }
    } catch (e) {
      console.error('❌ Storage clear error:', e);
    }

    // Step 3: Call logout API to clear cookies
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('✅ Logout API called');
    } catch (e) {
      console.log('⚠️ Logout API error:', e);
    }

    // Step 4: Sign out from Supabase
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
        console.log('✅ Supabase signed out');
      }
    } catch (e) {
      console.log('⚠️ Supabase error:', e);
    }
    
    // Step 5: Redirect to login - use replace for hard navigation
    console.log('🔄 Redirecting to login...');
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  };

  // If there's an init error but app still needs to load, render children
  // User will see app but auth won't work until they reload or Supabase is available
  return (
    <AuthContext.Provider value={{ user, loading, logout, refetchUser }}>
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
