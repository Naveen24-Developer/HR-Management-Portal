// src/app/dashboard/departments/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Department {
  id: string;
  name: string;
  description: string;
  employeeCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('auth-token');
      const url = editingDepartment 
        ? `/api/admin/departments/${editingDepartment.id}`
        : '/api/admin/departments';
      
      const response = await fetch(url, {
        method: editingDepartment ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(`Department ${editingDepartment ? 'updated' : 'created'} successfully`);
        setShowModal(false);
        setEditingDepartment(null);
        setFormData({ name: '', description: ''});
        fetchDepartments();
      } else {
        const error = await response.json();
        alert(error.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save department:', error);
      alert('Failed to save department');
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      
    });
    setShowModal(true);
  };

  const handleView = (dept: Department) => {
    setViewingDepartment(dept);
    setShowViewModal(true);
  };

  const handleDelete = async (deptId: string, employeeCount: number) => {
    if (employeeCount > 0) {
      alert('Cannot delete department with employees. Please reassign employees first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/departments/${deptId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Department deleted successfully');
        fetchDepartments();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
      alert('Failed to delete department');
    }
  };

  const handleToggleStatus = async (deptId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/departments/${deptId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        alert(`Department ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchDepartments();
      }
    } catch (error) {
      console.error('Failed to toggle department status:', error);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage organizational departments and structure
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDepartment(null);
            setFormData({ name: '', description: '' });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Department
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
            <BuildingOfficeIcon className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {departments.filter(d => d.isActive).length}
              </p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">
                {departments.reduce((sum, d) => sum + d.employeeCount, 0)}
              </p>
            </div>
            <UserCircleIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg per Dept</p>
              <p className="text-2xl font-bold text-gray-900">
                {departments.length > 0 
                  ? Math.round(departments.reduce((sum, d) => sum + d.employeeCount, 0) / departments.length)
                  : 0
                }
              </p>
            </div>
            <UserCircleIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${dept.isActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <BuildingOfficeIcon className={`w-6 h-6 ${dept.isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-sm text-gray-500">{dept.employeeCount} employees</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus(dept.id, dept.isActive)}
                  className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                    dept.isActive
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {dept.isActive ? (
                    <>
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-3 h-3 mr-1" />
                      Inactive
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {dept.description || 'No description provided'}
              </p>

              

              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleView(dept)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  <EyeIcon className="w-4 h-4 mr-1" />
                  View
                </button>
                <button
                  onClick={() => handleEdit(dept)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                >
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(dept.id, dept.employeeCount)}
                  disabled={dept.employeeCount > 0}
                  className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                    dept.employeeCount > 0
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-red-600 bg-red-50 hover:bg-red-100'
                  }`}
                  title={dept.employeeCount > 0 ? 'Cannot delete department with employees' : 'Delete department'}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDepartments.length === 0 && (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No departments found' : 'No departments yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? 'Try adjusting your search criteria' 
              : 'Get started by creating your first department'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Department
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingDepartment ? 'Edit Department' : 'Add New Department'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Engineering, Sales, Marketing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description of the department's role and responsibilities"
                />
              </div>

              

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-1">📌 Important Notes:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Department name must be unique</li>
                  <li>• Employees can be assigned to this department after creation</li>
                  <li>• Inactive departments won't appear in employee assignment dropdowns</li>
                  <li>• Departments with employees cannot be deleted</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDepartment(null);
                    setFormData({ name: '', description: ''});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  {editingDepartment ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-indigo-100 rounded-lg">
                  <BuildingOfficeIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{viewingDepartment.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">Department Details</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-900">
                  {viewingDepartment.description || 'No description provided'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Employee Count</h3>
                  <p className="text-sm text-gray-900">{viewingDepartment.employeeCount} employees</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      viewingDepartment.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {viewingDepartment.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Created</h3>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingDepartment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingDepartment);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Edit Department
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}