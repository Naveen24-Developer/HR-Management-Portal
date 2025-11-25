// app/admin/layout.tsx
'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
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
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Employee Management', href: '/admin/employees', icon: UserGroupIcon },
  { name: 'Attendance', href: '/admin/attendance', icon: ClockIcon },
  { name: 'Leave Management', href: '/admin/leave', icon: CalendarIcon },
  { name: 'Payroll', href: '/admin/payroll', icon: CurrencyDollarIcon },
  { name: 'Projects', href: '/admin/projects', icon: FolderIcon },
  { name: 'Reports & Analytics', href: '/admin/reports', icon: ChartBarIcon },
  { name: 'System Settings', href: '/admin/settings', icon: CogIcon },
  { name: 'Roles & Access', href: '/admin/roles', icon: ShieldCheckIcon },
  { name: 'Communication', href: '/admin/communication', icon: BellIcon },
  { name: 'Security', href: '/admin/security', icon: LockClosedIcon },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    router.push('/unauthorized');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
            <div className="flex items-center justify-between h-16 px-4 bg-indigo-600">
              <span className="text-xl font-bold text-white">HRMS Admin</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 bg-indigo-600">
            <span className="text-xl font-bold text-white">HRMS Admin</span>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 lg:hidden"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <div className="flex items-center ml-auto space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdown(!profileDropdown)}
                className="flex items-center space-x-2 text-sm"
              >
                <UserCircleIcon className="w-8 h-8 text-gray-500" />
                <span className="hidden md:block font-medium text-gray-700">
                  {user?.firstName || 'Admin'}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              </button>

              {profileDropdown && (
                <div className="absolute right-0 w-48 mt-2 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <a
                      href="/admin/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </a>
                    <a
                      href="/admin/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </a>
                    <button
                      onClick={logout}
                      className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}