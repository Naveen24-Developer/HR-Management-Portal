/**
 * Permission checking utilities for both server and client side
 */

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export interface UserPermissions {
  [module: string]: {
    [action in PermissionAction]?: boolean;
  };
}

/**
 * Check if a user has a specific permission action for a module
 * @param permissions - The permissions object from the user/token
 * @param module - The module name (e.g., 'attendance', 'leave', 'payroll')
 * @param action - The action (e.g., 'view', 'create', 'edit')
 * @returns boolean indicating if the permission is granted
 */
export function hasPermission(
  permissions: UserPermissions | undefined,
  module: string,
  action: PermissionAction
): boolean {
  if (!permissions) return false;
  return Boolean(permissions[module]?.[action]);
}

/**
 * Check if a user has any permission in a module (for visibility purposes)
 */
export function hasModuleAccess(
  permissions: UserPermissions | undefined,
  module: string
): boolean {
  if (!permissions || !permissions[module]) return false;
  // Module is accessible if user has at least one permission in it
  return Object.values(permissions[module]).some(v => v === true);
}

/**
 * Verify server-side: user is admin OR has specific permission
 * @param userRole - User's role from token
 * @param userPermissions - Permissions from token
 * @param module - Module being accessed
 * @param action - Action being performed
 * @returns boolean
 */
export function canPerformAction(
  userRole: string | undefined,
  userPermissions: UserPermissions | undefined,
  module: string,
  action: PermissionAction
): boolean {
  // Admins always have access
  if (userRole === 'admin') return true;
  // Otherwise check specific permission
  return hasPermission(userPermissions, module, action);
}
