// src/components/auth/PermissionGuard.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { hasModuleAccess, hasPermission, PermissionAction } from '@/lib/auth/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  module: string;
  action?: PermissionAction;
  requireAdmin?: boolean;
  fallbackUrl?: string;
  checkPageAccess?: boolean; // NEW: Check page-level permissions
}

/**
 * Permission Guard Component
 * Wraps page content and checks if user has required permissions
 * Redirects to unauthorized page if user lacks permission
 * 
 * NEW: Now supports checking page-level access permissions
 */
export function PermissionGuard({
  children,
  module,
  action = 'view',
  requireAdmin = false,
  fallbackUrl = '/unauthorized',
  checkPageAccess = true, // Default to checking page access
}: PermissionGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      // Not logged in - redirect to login
      router.replace('/login');
      return;
    }

    // Check if admin access is required
    if (requireAdmin && user.role !== 'admin') {
      router.replace(fallbackUrl);
      return;
    }

    // For non-admin users, check permissions
    if (user.role !== 'admin') {
      // Check page-level access first (if enabled)
      if (checkPageAccess) {
        const pagePermissions = user.pagePermissions || [];
        const hasPageAccess = pagePermissions.includes(module);
        
        if (!hasPageAccess) {
          console.warn(`Page access denied for module: ${module}`);
          router.replace(fallbackUrl);
          return;
        }
      }

      // Then check action-level permissions
      const hasAccess = action
        ? hasPermission(user.permissions, module, action)
        : hasModuleAccess(user.permissions, module);

      if (!hasAccess) {
        console.warn(`Permission denied for module: ${module}, action: ${action}`);
        router.replace(fallbackUrl);
        return;
      }
    }
  }, [user, loading, module, action, requireAdmin, fallbackUrl, checkPageAccess, router]);

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content until auth is verified
  if (!user) {
    return null;
  }

  // Check permissions before rendering
  if (requireAdmin && user.role !== 'admin') {
    return null;
  }

  if (user.role !== 'admin') {
    // Check page-level access
    if (checkPageAccess) {
      const pagePermissions = user.pagePermissions || [];
      const hasPageAccess = pagePermissions.includes(module);
      
      if (!hasPageAccess) {
        return null;
      }
    }

    // Check action-level permissions
    const hasAccess = action
      ? hasPermission(user.permissions, module, action)
      : hasModuleAccess(user.permissions, module);

    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}
