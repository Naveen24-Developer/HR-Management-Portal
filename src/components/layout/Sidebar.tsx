'use client';

import React from 'react';
import Link from 'next/link';
import {
  HomeIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  FolderIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  LockClosedIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { hasModuleAccess } from '@/lib/auth/permissions';

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string;
  description: string;
  badge?: string;
}

export const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    module: 'dashboard',
    description: 'Overview and statistics',
  },
  {
    name: 'Employee Management',
    href: '/dashboard/employees',
    icon: UserGroupIcon,
    module: 'employees',
    description: 'Manage employees',
  },
  {
    name: 'Departments',
    href: '/dashboard/departments',
    icon: BuildingOfficeIcon,
    module: 'departments',
    description: 'Manage departments',
    badge: 'New',
  },
  {
    name: 'Attendance',
    href: '/dashboard/attendance',
    icon: ClockIcon,
    module: 'attendance',
    description: 'Track attendance',
  },
  {
    name: 'Leave Management',
    href: '/dashboard/leave',
    icon: CalendarIcon,
    module: 'leave',
    description: 'Approve leave requests',
  },
  {
    name: 'Payroll',
    href: '/dashboard/payroll',
    icon: CurrencyDollarIcon,
    module: 'payroll',
    description: 'Process payroll',
  },
  {
    name: 'Projects',
    href: '/dashboard/projects',
    icon: FolderIcon,
    module: 'projects',
    description: 'Manage projects',
  },
  {
    name: 'Reports & Analytics',
    href: '/dashboard/reports',
    icon: ChartBarIcon,
    module: 'reports',
    description: 'View reports',
  },
  {
    name: 'Roles & Access',
    href: '/dashboard/roles',
    icon: ShieldCheckIcon,
    module: 'roles',
    description: 'Manage permissions',
  },
  {
    name: 'Communication',
    href: '/dashboard/communication',
    icon: BellIcon,
    module: 'communication',
    description: 'Announcements',
  },
  {
    name: 'Security',
    href: '/dashboard/security',
    icon: LockClosedIcon,
    module: 'security',
    description: 'Security settings',
  },
  {
    name: 'System Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
    module: 'settings',
    description: 'Configure system',
  },
];

interface SidebarProps {
  user: any;
  pathname: string;
  onClose?: () => void;
  isMobile?: boolean;
}

/**
 * Reusable Sidebar component that renders navigation based on user permissions
 * Works for both admin and non-admin layouts
 */
export function Sidebar({ user, pathname, onClose, isMobile = false }: SidebarProps) {
  const isAdmin = user?.role === 'admin';

  // Filter navigation items based on sidebar permissions from role
  const allowedItems = navigationItems.filter((item) => {
    // Always show dashboard to everyone
    if (item.module === 'dashboard') return true;
    
    // If user not loaded yet, don't show other items (loading state)
    if (!user) return false;
    
    // Admins see ALL menus regardless of sidebarPermissions
    if (isAdmin) return true;
    
    // For non-admin users (employees), check if menu is in their role's sidebarPermissions
    const sidebarPermissions = user?.sidebarPermissions || [];
    return sidebarPermissions.includes(item.module);
  });

  const baseClasses = `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`;
  const activeClasses = `bg-indigo-100 text-indigo-600`;
  const inactiveClasses = `text-gray-700 hover:bg-gray-50 hover:text-gray-900`;

  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {allowedItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            title={item.description}
            onClick={onClose}
          >
            <Icon
              className={`w-5 h-5 mr-3 flex-shrink-0 ${
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-400 group-hover:text-gray-500'
              }`}
            />
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
