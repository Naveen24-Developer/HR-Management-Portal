// src/app/dashboard/roles/page.tsx
'use client';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, Record<string, boolean>>;
  sidebarPermissions: string[]; // Array of allowed sidebar items
  pagePermissions: string[]; // Array of allowed pages/routes
  isDefault: boolean;
  isSystem: boolean;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PermissionMatrix {
  [module: string]: {
    [action: string]: boolean;
  };
}

const defaultPermissions: PermissionMatrix = {
  dashboard: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  employees: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  departments: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  attendance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  leave: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  payroll: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  projects: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  reports: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  roles: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  settings: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  communication: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
};

const permissionLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employee Management',
  departments: 'Department Management',
  attendance: 'Attendance',
  leave: 'Leave Management',
  payroll: 'Payroll',
  projects: 'Projects',
  reports: 'Reports & Analytics',
  roles: 'Roles & Access',
  settings: 'System Settings',
  security: 'Security',
  communication: 'Communication',
};

const actionLabels: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
};

export default function RolesAndAccess() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [assigningRole, setAssigningRole] = useState<Role | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: { ...defaultPermissions },
    sidebarPermissions: [] as string[],
    pagePermissions: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const url = editingRole 
        ? `/api/admin/roles/${editingRole.id}`
        : '/api/admin/roles';
      
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(`Role ${editingRole ? 'updated' : 'created'} successfully`);
        setShowModal(false);
        setEditingRole(null);
        setFormData({
          name: '',
          description: '',
          permissions: { ...defaultPermissions },
          sidebarPermissions: [],
          pagePermissions: [],
        });
        fetchRoles();
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || 'Operation failed' });
      }
    } catch (error) {
      console.error('Failed to save role:', error);
      setErrors({ submit: 'Failed to save role' });
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: { ...defaultPermissions, ...role.permissions },
      sidebarPermissions: role.sidebarPermissions || [],
      pagePermissions: role.pagePermissions || [],
    });
    setShowModal(true);
  };

  const handleView = (role: Role) => {
    setViewingRole(role);
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete) return;

    // Check if role has assigned users BEFORE showing confirmation
    if (roleToDelete.usersCount > 0) {
      alert(
        `Cannot delete role "${roleName}".\\n\\n` +
        `This role has ${roleToDelete.usersCount} employee(s) assigned.\\n\\n` +
        `Please remove all employees from this role before deleting it.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Role deleted successfully');
        fetchRoles();
      } else {
        const error = await response.json();
        // Show detailed error message from server
        alert(error.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. Please try again.');
    }
  };

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: checked,
        },
      },
    }));
  };

  const handleSelectAll = (module: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: Object.keys(prev.permissions[module]).reduce(
          (acc, action) => ({ ...acc, [action]: selected }),
          {}
        ),
      },
    }));
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Access Control</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage user roles and permissions across the system
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRole(null);
            setFormData({
              name: '',
              description: '',
              permissions: { ...defaultPermissions },
              sidebarPermissions: [],
              pagePermissions: [],
            });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Role
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Roles</p>
              <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Roles</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.filter(r => r.isSystem).length}
              </p>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Custom Roles</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.filter(r => !r.isSystem).length}
              </p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.reduce((sum, role) => sum + role.usersCount, 0)}
              </p>
            </div>
            <UsersIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${
                    role.isSystem ? 'bg-green-100' : 
                    role.isDefault ? 'bg-blue-100' : 'bg-indigo-100'
                  }`}>
                    <ShieldCheckIcon className={`w-6 h-6 ${
                      role.isSystem ? 'text-green-600' : 
                      role.isDefault ? 'text-blue-600' : 'text-indigo-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.usersCount} users</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {role.isSystem && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      System
                    </span>
                  )}
                  {role.isDefault && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {role.description || 'No description provided'}
              </p>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Permissions:</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(role.permissions)
                    .filter(([_, actions]) => Object.values(actions).some(v => v))
                    .slice(0, 3)
                    .map(([module]) => (
                      <span
                        key={module}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                      >
                        {permissionLabels[module]}
                      </span>
                    ))}
                  {Object.keys(role.permissions).filter(module => 
                    Object.values(role.permissions[module]).some(v => v)
                  ).length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      +{Object.keys(role.permissions).filter(module => 
                        Object.values(role.permissions[module]).some(v => v)
                      ).length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleView(role)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  <EyeIcon className="w-4 h-4 mr-1" />
                  View
                </button>
                <button
                  onClick={() => handleEdit(role)}
                  disabled={role.isSystem}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                    role.isSystem
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                  title={role.isSystem ? 'System roles cannot be edited' : 'Edit role'}
                >
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setAssigningRole(role);
                    setShowAssignModal(true);
                  }}
                  disabled={role.isSystem}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                    role.isSystem
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                  title={role.isSystem ? 'System roles cannot be modified' : 'Assign users to role'}
                >
                  <UsersIcon className="w-4 h-4 mr-1" />
                  Assign Users
                </button>
                <button
                  onClick={() => handleDelete(role.id, role.name)}
                  disabled={role.isSystem || role.isDefault || role.usersCount > 0}
                  className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                    role.isSystem || role.isDefault || role.usersCount > 0
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-red-600 bg-red-50 hover:bg-red-100'
                  }`}
                  title={
                    role.isSystem ? 'System roles cannot be deleted' :
                    role.isDefault ? 'Default roles cannot be deleted' :
                    role.usersCount > 0 ? 'Cannot delete role with assigned users' :
                    'Delete role'
                  }
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <ShieldCheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No roles found' : 'No roles created yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? 'Try adjusting your search criteria' 
              : 'Get started by creating your first role'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Role
            </button>
          )}
        </div>
      )}

      {/* Role Modal */}
      {showModal && (
        <RoleModal
          role={editingRole}
          formData={formData}
          errors={errors}
          setFormData={setFormData}
          onClose={() => {
            setShowModal(false);
            setEditingRole(null);
            setFormData({
              name: '',
              description: '',
              permissions: { ...defaultPermissions },
              sidebarPermissions: [],
              pagePermissions: [],
            });
            setErrors({});
          }}
          onSubmit={handleSubmit}
          onPermissionChange={handlePermissionChange}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* View Role Modal */}
      {viewingRole && (
        <ViewRoleModal
          role={viewingRole}
          onClose={() => setViewingRole(null)}
          onEdit={() => {
            setViewingRole(null);
            handleEdit(viewingRole);
          }}
        />
      )}

      {showAssignModal && assigningRole && (
        <AssignUsersModal
          role={assigningRole}
          onClose={() => {
            setShowAssignModal(false);
            setAssigningRole(null);
          }}
          onSaved={() => fetchRoles()}
        />
      )}
    </div>
  );
}

// Role Modal Component
function RoleModal({ 
  role, 
  formData, 
  errors, 
  setFormData,
  onClose, 
  onSubmit, 
  onPermissionChange, 
  onSelectAll 
}: {
  role: Role | null;
  formData: any;
  errors: Record<string, string>;
  setFormData: Dispatch<SetStateAction<any>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onPermissionChange: (module: string, action: string, checked: boolean) => void;
  onSelectAll: (module: string, selected: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions' | 'menus' | 'pages'>('basic');

  const allMenus = [
    { id: 'dashboard', name: 'Dashboard', description: 'Main overview and statistics' },
    { id: 'employees', name: 'Employee Management', description: 'View and manage employees' },
    { id: 'departments', name: 'Departments', description: 'Manage departments' },
    { id: 'attendance', name: 'Attendance', description: 'Track attendance' },
    { id: 'leave', name: 'Leave Management', description: 'Manage leave requests' },
    { id: 'payroll', name: 'Payroll', description: 'Process payroll' },
    { id: 'projects', name: 'Projects', description: 'Manage projects' },
    { id: 'reports', name: 'Reports & Analytics', description: 'View reports' },
    { id: 'roles', name: 'Roles & Access', description: 'Manage permissions' },
    { id: 'communication', name: 'Communication', description: 'Announcements' },
    { id: 'security', name: 'Security', description: 'Security settings' },
    { id: 'settings', name: 'System Settings', description: 'Configure system' },
  ];

  const toggleSidebarMenu = (menuId: string) => {
    const current = formData.sidebarPermissions || [];
    if (current.includes(menuId)) {
      setFormData({ ...formData, sidebarPermissions: current.filter((m: string) => m !== menuId) });
    } else {
      setFormData({ ...formData, sidebarPermissions: [...current, menuId] });
    }
  };

  const togglePagePermission = (pageId: string) => {
    const current = formData.pagePermissions || [];
    if (current.includes(pageId)) {
      setFormData({ ...formData, pagePermissions: current.filter((p: string) => p !== pageId) });
    } else {
      setFormData({ ...formData, pagePermissions: [...current, pageId] });
    }
  };

  const selectAllMenus = (selected: boolean) => {
    setFormData({ 
      ...formData, 
      sidebarPermissions: selected ? allMenus.map(m => m.id) : [] 
    });
  };

  const selectAllPages = (selected: boolean) => {
    setFormData({ 
      ...formData, 
      pagePermissions: selected ? allMenus.map(m => m.id) : [] 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {role ? 'Edit Role' : 'Create New Role'}
        </h2>
        
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('menus')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'menus'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sidebar Menus ({formData.sidebarPermissions?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pages')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pages'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Page Access ({formData.pagePermissions?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Action Permissions
              </button>
            </nav>
          </div>

          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., HR Manager, Team Lead, Employee"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe the role and its responsibilities..."
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📌 How Role Permissions Work</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Sidebar Menus:</strong> Controls which menu items are visible in the sidebar</li>
                  <li>• <strong>Page Access:</strong> Controls which pages the user can access (navigation guards)</li>
                  <li>• <strong>Action Permissions:</strong> Controls what actions (view, create, edit, delete) the user can perform</li>
                  <li>• <strong>Admin Role:</strong> Has full access to all menus, pages, and actions by default</li>
                </ul>
              </div>
            </div>
          )}

          {/* Sidebar Menus Tab */}
          {activeTab === 'menus' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Sidebar Menu Visibility</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select which menu items will appear in the sidebar for this role
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectAllMenus(formData.sidebarPermissions?.length !== allMenus.length)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                >
                  {formData.sidebarPermissions?.length === allMenus.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allMenus.map(menu => (
                  <div
                    key={menu.id}
                    onClick={() => toggleSidebarMenu(menu.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.sidebarPermissions?.includes(menu.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.sidebarPermissions?.includes(menu.id) || false}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">{menu.name}</div>
                        <div className="text-sm text-gray-600">{menu.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page Access Tab */}
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Page Access Control</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select which pages this role can access (protected by navigation guards)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectAllPages(formData.pagePermissions?.length !== allMenus.length)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                >
                  {formData.pagePermissions?.length === allMenus.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Note:</strong> Page access should match sidebar menu visibility. If a menu is visible but the page is not accessible, users will get an error.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allMenus.map(menu => (
                  <div
                    key={menu.id}
                    onClick={() => togglePagePermission(menu.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.pagePermissions?.includes(menu.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.pagePermissions?.includes(menu.id) || false}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">{menu.name}</div>
                        <div className="text-sm text-gray-600">{menu.description}</div>
                        {formData.sidebarPermissions?.includes(menu.id) && (
                          <div className="text-xs text-indigo-600 mt-1">✓ Visible in sidebar</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Action Permissions Matrix</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Define what actions (view, create, edit, delete, approve, export) this role can perform in each module
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-sm font-medium text-gray-900 p-2">Module</th>
                        {Object.keys(actionLabels).map(action => (
                          <th key={action} className="text-center text-sm font-medium text-gray-900 p-2">
                            {actionLabels[action]}
                          </th>
                        ))}
                        <th className="text-center text-sm font-medium text-gray-900 p-2">
                          All
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.keys(defaultPermissions).map(module => (
                        <tr key={module} className="hover:bg-white">
                          <td className="p-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {permissionLabels[module]}
                          </td>
                          {Object.keys(actionLabels).map(action => (
                            <td key={action} className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions[module]?.[action] || false}
                                onChange={(e) => onPermissionChange(module, action, e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={Object.values(formData.permissions[module] || {}).every(v => v) && Object.values(formData.permissions[module] || {}).length > 0}
                              onChange={(e) => onSelectAll(module, e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Role Modal Component
function ViewRoleModal({ role, onClose, onEdit }: {
  role: Role;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-indigo-100 rounded-lg">
              <ShieldCheckIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{role.name}</h2>
              <p className="text-sm text-gray-500 mt-1">Role Details & Permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-900">
              {role.description || 'No description provided'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Users Assigned</h3>
              <p className="text-sm text-gray-900">{role.usersCount} users</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Role Type</h3>
              <div className="flex space-x-2">
                {role.isSystem && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                    System Role
                  </span>
                )}
                {role.isDefault && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    Default Role
                  </span>
                )}
                {!role.isSystem && !role.isDefault && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                    Custom Role
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Created</h3>
              <p className="text-sm text-gray-900">
                {new Date(role.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h3>
              <p className="text-sm text-gray-900">
                {new Date(role.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(role.permissions)
                  .filter(([_, actions]) => Object.values(actions).some(v => v))
                  .map(([module, actions]) => (
                    <div key={module} className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        {permissionLabels[module]}
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(actions)
                          .filter(([_, enabled]) => enabled)
                          .map(([action]) => (
                            <div key={action} className="flex items-center text-sm text-gray-600">
                              <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                              {actionLabels[action]}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                {Object.keys(role.permissions).filter(module => 
                  Object.values(role.permissions[module]).some(v => v)
                ).length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No permissions assigned</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onEdit}
              disabled={role.isSystem}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                role.isSystem
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Edit Role
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Assign Users Modal
function AssignUsersModal({ role, onClose, onSaved }: { role: Role; onClose: () => void; onSaved: () => void; }) {
  const [users, setUsers] = useState<{ id: string; email: string; firstName: string; lastName: string; position: string; assigned: boolean; currentRole: { id: string; name: string } | null }[]>([]);
  const [originalAssigned, setOriginalAssigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (!role) return;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth-token');
        const res = await fetch(`/api/admin/roles/${role.id}/assign`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.users || [];
          setUsers(list);
          setOriginalAssigned(new Set(list.filter((u: any) => u.assigned).map((u: any) => u.id)));
        }
      } catch (e) {
        console.error('Failed to fetch users for role:', e);
        alert('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [role]);

  const toggle = (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    // If assigning and user has a different role, show confirmation
    if (!user.assigned && user.currentRole && user.currentRole.id !== role.id) {
      const confirmed = confirm(
        `${user.firstName} ${user.lastName} is currently assigned to "${user.currentRole.name}".\n\n` +
        `Assigning to "${role.name}" will remove them from "${user.currentRole.name}".\n\nContinue?`
      );
      if (!confirmed) return;
    }

    setUsers(prev => prev.map(u => u.id === id ? { ...u, assigned: !u.assigned } : u));
  };

  const handleSelectAll = (selected: boolean) => {
    // Only update filtered users, not all users
    const filteredIds = new Set(filteredUsers.map(u => u.id));
    setUsers(prev => prev.map(u => 
      filteredIds.has(u.id) ? { ...u, assigned: selected } : u
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth-token');
      // Compute diffs between current checked state and original assigned state
      const toAssign = users.filter(u => u.assigned && !originalAssigned.has(u.id));
      const toUnassign = users.filter(u => !u.assigned && originalAssigned.has(u.id));

      const results = await Promise.allSettled([
        ...toAssign.map(u =>
          fetch(`/api/admin/roles/${role.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId: u.id }),
          })
        ),
        ...toUnassign.map(u =>
          fetch(`/api/admin/roles/${role.id}/assign`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId: u.id }),
          })
        ),
      ]);

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        alert(`Failed to save ${failed.length} assignment(s). Please try again.`);
      } else {
        alert('Assignments saved successfully');
        onSaved();
        onClose();
      }
    } catch (e) {
      console.error('Failed to save role assignments:', e);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchFilter.toLowerCase()) ||
    u.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (u.position || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  const assignedCount = users.filter(u => u.assigned).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assign Employees to Role</h2>
            <p className="text-sm text-gray-600 mt-1">{role.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Total Employees</p>
            <p className="text-2xl font-bold text-blue-600">{users.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Assigned</p>
            <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
          </div>
        </div>

        {/* Search and Select All */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Search by name, email, or position..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={() => handleSelectAll(!filteredUsers.every(u => u.assigned))}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
          >
            Select Filtered
          </button>
        </div>

        {/* Employees List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-600">Loading employees...</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700">
                <div className="col-span-1">
                  <input type="checkbox" checked={filteredUsers.length > 0 && filteredUsers.every(u => u.assigned)} 
                    onChange={(e) => handleSelectAll(e.target.checked)} />
                </div>
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Position</div>
                <div className="col-span-2">Current Role</div>
                <div className="col-span-1">Action</div>
              </div>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center px-4 py-3 hover:bg-gray-50">
                    <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1">
                        <input 
                          type="checkbox" 
                          checked={u.assigned} 
                          onChange={() => toggle(u.id)}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="col-span-3">
                        <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm text-gray-600">{u.email}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {u.position || 'N/A'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        {u.currentRole ? (
                          <span className={
                            u.currentRole.id === role.id 
                              ? "text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium"
                              : "text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium"
                          }>
                            {u.currentRole.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No role</span>
                        )}
                      </div>
                      <div className="col-span-1">
                        {u.assigned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(u.id);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 hover:bg-red-50 rounded"
                            title="Remove from role"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <p>No employees found matching "{searchFilter}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}