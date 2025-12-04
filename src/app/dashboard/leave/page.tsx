// src/app/dashboard/leave/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  UserGroupIcon,
  FunnelIcon,
  TrashIcon,
  PencilIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';


interface LeaveRequest {
  id: string;
  employeeId: string;
  approverId?: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  emergencyContact?: string;
  handoverNotes?: string;
  documentUrl?: string;
  createdAt: string;
}

interface LeaveStats {
  totalRequests: number;
  pendingRequests: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  myPendingRequests: number;
  leaveBalance: {
    sick: number;
    casual: number;
    earned: number;
    maternity: number;
    paternity: number;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string;
}

interface Approver {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  employeeId: string;
  role: string;
}

interface UserInfo {
  id: string;
  role: string;
  permissions: {
    leave: {
      view: boolean;
      create: boolean;
      edit: boolean;
      approve: boolean;
      delete: boolean;
      manage: boolean;
    };
  };
  employeeId?: string;
}

interface LeaveType {
  id: string;
  name: string;
  maxDays: number;
  requiresDocument: boolean;
  description: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    myPendingRequests: 0,
    leaveBalance: { sick: 0, casual: 0, earned: 0, maternity: 0, paternity: 0 }
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([
    { id: 'sick', name: 'Sick Leave', maxDays: 12, requiresDocument: true, description: 'For health issues' },
    { id: 'casual', name: 'Casual Leave', maxDays: 8, requiresDocument: false, description: 'Personal reasons' },
    { id: 'earned', name: 'Earned Leave', maxDays: 21, requiresDocument: false, description: 'Accumulated leave' },
    { id: 'maternity', name: 'Maternity Leave', maxDays: 180, requiresDocument: true, description: 'Maternity leave' },
    { id: 'paternity', name: 'Paternity Leave', maxDays: 15, requiresDocument: false, description: 'Paternity leave' },
  ]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
    approverId: '',
    emergencyContact: '',
    handoverNotes: '',
    documentUrl: '',
  });

  const [manualForm, setManualForm] = useState({
    employeeId: '',
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    days: 0,
    reason: '',
    status: 'approved',
    emergencyContact: '',
    handoverNotes: '',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
    approverId: '',
    emergencyContact: '',
    handoverNotes: '',
    documentUrl: '',
  });

  const isAdmin = userInfo?.role === 'admin';
  const canCreate = userInfo?.permissions?.leave?.create;
  const canEdit = userInfo?.permissions?.leave?.edit;
  const canDelete = userInfo?.permissions?.leave?.delete;
  const canViewAll = userInfo?.permissions?.leave?.view;

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveStats();
    fetchUserInfo();
  }, [pagination.page, statusFilter, typeFilter, dateFilter, employeeFilter]);

  useEffect(() => {
    if (userInfo) {
      if (userInfo.role === 'admin') {
        fetchEmployees();
      } else {
        fetchApprovers();
      }
    }
  }, [userInfo]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(dateFilter && { date: dateFilter }),
        ...(employeeFilter && { employeeId: employeeFilter }),
      });

      const response = await fetch(`/api/admin/leave/requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.leaveRequests);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      alert('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveStats = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/leave/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch leave stats:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/employees?active=true&limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchApprovers = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/leave/approvers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Approvers API Response:', data);
        setApprovers(data.approvers || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch approvers - API Error:', errorData);
        alert(`Failed to load approvers: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch approvers:', error);
      alert('Failed to load approvers. Please check console for details.');
    }
  };

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('Are you sure you want to approve this leave request?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/leave/${requestId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchLeaveRequests();
        fetchLeaveStats();
        alert('Leave request approved successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to approve leave request');
      }
    } catch (error) {
      console.error('Failed to approve leave request:', error);
      alert('Failed to approve leave request');
    }
  };

  const handleReject = async (requestId: string) => {
    const rejectReason = prompt('Please enter rejection reason:', '');
    if (rejectReason === null) return;
    if (!rejectReason.trim()) {
      alert('Rejection reason is required');
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/leave/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        fetchLeaveRequests();
        fetchLeaveStats();
        alert('Leave request rejected successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reject leave request');
      }
    } catch (error) {
      console.error('Failed to reject leave request:', error);
      alert('Failed to reject leave request');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates
    if (!createForm.startDate || !createForm.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const startDate = new Date(createForm.startDate);
    const endDate = new Date(createForm.endDate);
    
    if (endDate < startDate) {
      alert('End date cannot be before start date');
      return;
    }

    // Validate approver selection (for non-admin employees only)
    if (userInfo?.role !== 'admin' && !createForm.approverId) {
      alert('Please select an approver for your leave request');
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/leave/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({
          leaveType: 'casual',
          startDate: '',
          endDate: '',
          reason: '',
          approverId: '',
          emergencyContact: '',
          handoverNotes: '',
          documentUrl: '',
        });
        fetchLeaveRequests();
        fetchLeaveStats();
        alert('Leave request submitted successfully');
      } else {
        alert(data.error || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Failed to create leave request:', error);
      alert('Failed to submit leave request');
    }
  };

  const handleManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!manualForm.employeeId) {
      alert('Please select an employee');
      return;
    }
    
    if (!manualForm.startDate || !manualForm.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const startDate = new Date(manualForm.startDate);
    const endDate = new Date(manualForm.endDate);
    
    if (endDate < startDate) {
      alert('End date cannot be before start date');
      return;
    }

    if (manualForm.days <= 0) {
      alert('Number of days must be greater than 0');
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/leave/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(manualForm),
      });

      const data = await response.json();

      if (response.ok) {
        setShowManualModal(false);
        setManualForm({
          employeeId: '',
          leaveType: 'casual',
          startDate: '',
          endDate: '',
          days: 0,
          reason: '',
          status: 'approved',
          emergencyContact: '',
          handoverNotes: '',
        });
        fetchLeaveRequests();
        fetchLeaveStats();
        alert('Leave action completed successfully');
      } else {
        alert(data.error || 'Failed to process leave action');
      }
    } catch (error) {
      console.error('Failed to process manual leave action:', error);
      alert('Failed to process leave action');
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/leave/requests/${requestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchLeaveRequests();
        fetchLeaveStats();
        alert('Leave request deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete leave request');
      }
    } catch (error) {
      console.error('Failed to delete leave request:', error);
      alert('Failed to delete leave request');
    }
  };

  const handleEditClick = (request: LeaveRequest) => {
    setEditForm({
      id: request.id,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
      approverId: request.approverId || '',
      emergencyContact: request.emergencyContact || '',
      handoverNotes: request.handoverNotes || '',
      documentUrl: request.documentUrl || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate dates
    if (!editForm.startDate || !editForm.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const startDate = new Date(editForm.startDate);
    const endDate = new Date(editForm.endDate);
    
    if (endDate < startDate) {
      alert('End date cannot be before start date');
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/leave/requests/${editForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaveType: editForm.leaveType,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          reason: editForm.reason,
          approverId: editForm.approverId || null,
          emergencyContact: editForm.emergencyContact,
          handoverNotes: editForm.handoverNotes,
          documentUrl: editForm.documentUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowEditModal(false);
        setEditForm({
          id: '',
          leaveType: 'casual',
          startDate: '',
          endDate: '',
          reason: '',
          approverId: '',
          emergencyContact: '',
          handoverNotes: '',
          documentUrl: '',
        });
        fetchLeaveRequests();
        fetchLeaveStats();
        alert('Leave request updated successfully');
      } else {
        alert(data.error || 'Failed to update leave request');
      }
    } catch (error) {
      console.error('Failed to update leave request:', error);
      alert('Failed to update leave request');
    }
  };

  const handleCalculateEditDays = () => {
    if (!editForm.startDate || !editForm.endDate) return 0;
    
    const start = new Date(editForm.startDate);
    const end = new Date(editForm.endDate);
    let days = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const handleCalculateDays = () => {
    if (!createForm.startDate || !createForm.endDate) return 0;
    
    const start = new Date(createForm.startDate);
    const end = new Date(createForm.endDate);
    let days = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const handleCalculateManualDays = () => {
    if (!manualForm.startDate || !manualForm.endDate) return 0;
    
    const start = new Date(manualForm.startDate);
    const end = new Date(manualForm.endDate);
    let days = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sick':
        return 'bg-blue-100 text-blue-800';
      case 'casual':
        return 'bg-purple-100 text-purple-800';
      case 'earned':
        return 'bg-orange-100 text-orange-800';
      case 'maternity':
        return 'bg-pink-100 text-pink-800';
      case 'paternity':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = leaveRequests.filter(request =>
    request.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && leaveRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            {isAdmin ? 'Manage all employee leave requests' : 'View and manage your leave requests'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Request Leave
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Manual Action
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalRequests}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved (Month)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.approvedThisMonth}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected (Month)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.rejectedThisMonth}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Leave Balance */}
      {userInfo?.role !== 'admin' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="text-center p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">{stats.leaveBalance.sick}</div>
            <div className="text-sm text-blue-600">Sick Leave</div>
            <div className="text-xs text-blue-500">Days Available</div>
          </div>
          <div className="text-center p-4 border border-purple-200 rounded-lg bg-purple-50">
            <div className="text-2xl font-bold text-purple-600">{stats.leaveBalance.casual}</div>
            <div className="text-sm text-purple-600">Casual Leave</div>
            <div className="text-xs text-purple-500">Days Available</div>
          </div>
          <div className="text-center p-4 border border-orange-200 rounded-lg bg-orange-50">
            <div className="text-2xl font-bold text-orange-600">{stats.leaveBalance.earned}</div>
            <div className="text-sm text-orange-600">Earned Leave</div>
            <div className="text-xs text-orange-500">Days Available</div>
          </div>
          <div className="text-center p-4 border border-pink-200 rounded-lg bg-pink-50">
            <div className="text-2xl font-bold text-pink-600">{stats.leaveBalance.maternity}</div>
            <div className="text-sm text-pink-600">Maternity Leave</div>
            <div className="text-xs text-pink-500">Days Available</div>
          </div>
          <div className="text-center p-4 border border-cyan-200 rounded-lg bg-cyan-50">
            <div className="text-2xl font-bold text-cyan-600">{stats.leaveBalance.paternity}</div>
            <div className="text-sm text-cyan-600">Paternity Leave</div>
            <div className="text-xs text-cyan-500">Days Available</div>
          </div>
        </div>
      </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select 
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Types</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          
          {userInfo?.role === 'admin' && (
            <select 
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.departmentName})
                </option>
              ))}
            </select>
          )}
          
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <input
              type="month"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
              setTypeFilter('');
              setDateFilter('');
              setEmployeeFilter('');
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {request.firstName[0]}{request.lastName[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.firstName} {request.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.departmentName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeColor(request.leaveType)}`}>
                      {request.leaveType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {new Date(request.startDate).toLocaleDateString()}
                    </div>
                    <div className="text-gray-500 text-xs">to</div>
                    <div>
                      {new Date(request.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-semibold">{request.days} day{request.days > 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {request.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(request.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    {request.rejectionReason && (
                      <div className="text-xs text-red-600 mt-1 truncate" title={request.rejectionReason}>
                        {request.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      
                      {/* Show approve/reject buttons for admin OR if user is the designated approver */}
                      {request.status === 'pending' && ((isAdmin || (request.approverId === userInfo?.id && userInfo?.permissions?.leave?.approve)) && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Approve"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Reject"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        </>
                      ))}
                      
                      {canEdit && !isAdmin && request.employeeId === userInfo?.employeeId && request.status === 'pending' && (
                        <button
                          onClick={() => handleEditClick(request)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      )}
                      
                      {(isAdmin && (
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && !loading && (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No leave requests found
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter || typeFilter || dateFilter || employeeFilter
                ? 'Try adjusting your search criteria'
                : canCreate ? 'Submit your first leave request' : 'No leave requests available'
              }
            </p>
            {canCreate && !searchQuery && !statusFilter && !typeFilter && !dateFilter && !employeeFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Request Leave
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className={`px-3 py-1 text-sm rounded-md ${
                    pagination.page === 1
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination({ ...pagination, page: pageNum })}
                      className={`px-3 py-1 text-sm rounded-md ${
                        pagination.page === pageNum
                          ? 'text-white bg-indigo-600'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-3 py-1 text-sm rounded-md ${
                    pagination.page === pagination.totalPages
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Leave Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Request Leave</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type *
                  </label>
                  <select
                    required
                    value={createForm.leaveType}
                    onChange={(e) => setCreateForm({ ...createForm, leaveType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} (Max: {type.maxDays} days)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calculated Days
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <span className="font-semibold">{handleCalculateDays()} days</span>
                    <p className="text-xs text-gray-500 mt-1">(Weekends excluded)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Please provide a reason for your leave request..."
                />
              </div>

              {/* Approver Selection (Employees only - not for admin) */}
              {userInfo?.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Approver *
                  </label>
                  <select
                    required
                    value={createForm.approverId}
                    onChange={(e) => setCreateForm({ ...createForm, approverId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">-- Select Approver --</option>
                    {approvers.map((approver) => (
                      <option key={approver.id} value={approver.id}>
                        {approver.fullName} - {approver.position} ({approver.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the person who will approve your leave request
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={createForm.emergencyContact}
                    onChange={(e) => setCreateForm({ ...createForm, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Name and phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handover Notes
                  </label>
                  <textarea
                    rows={2}
                    value={createForm.handoverNotes}
                    onChange={(e) => setCreateForm({ ...createForm, handoverNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Any pending work to be handled..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supporting Document (Optional)
                </label>
                <input
                  type="url"
                  value={createForm.documentUrl}
                  onChange={(e) => setCreateForm({ ...createForm, documentUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="URL to medical certificate or other document"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for Sick Leave and Maternity Leave
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Submit Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Leave Request Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Leave Request</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type *
                  </label>
                  <select
                    required
                    value={editForm.leaveType}
                    onChange={(e) => setEditForm({ ...editForm, leaveType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} (Max: {type.maxDays} days)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calculated Days
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <span className="font-semibold">{handleCalculateEditDays()} days</span>
                    <p className="text-xs text-gray-500 mt-1">(Weekends excluded)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Please provide a reason for your leave request..."
                />
              </div>

              {/* Approver Selection (Employees only - not for admin) */}
              {userInfo?.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Approver *
                  </label>
                  <select
                    required
                    value={editForm.approverId}
                    onChange={(e) => setEditForm({ ...editForm, approverId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">-- Select Approver --</option>
                    {approvers.map((approver) => (
                      <option key={approver.id} value={approver.id}>
                        {approver.fullName} - {approver.position} ({approver.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the person who will approve your leave request
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Name and phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handover Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.handoverNotes}
                    onChange={(e) => setEditForm({ ...editForm, handoverNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Any pending work to be handled..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supporting Document (Optional)
                </label>
                <input
                  type="url"
                  value={editForm.documentUrl}
                  onChange={(e) => setEditForm({ ...editForm, documentUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="URL to medical certificate or other document"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for Sick Leave and Maternity Leave
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditForm({
                      id: '',
                      leaveType: 'casual',
                      startDate: '',
                      endDate: '',
                      reason: '',
                      approverId: '',
                      emergencyContact: '',
                      handoverNotes: '',
                      documentUrl: '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Update Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Leave Action Modal (Admin Only) */}
      {showManualModal && userInfo?.role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Manual Leave Action</h2>
            <p className="text-sm text-gray-600 mb-4">
              Use this form to manually approve/reject leave for employees. This is useful when employees call or message for leave.
            </p>
            
            <form onSubmit={handleManualAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee *
                </label>
                <select
                  required
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type *
                  </label>
                  <select
                    required
                    value={manualForm.leaveType}
                    onChange={(e) => setManualForm({ ...manualForm, leaveType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualForm.startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setManualForm({ ...manualForm, startDate: newStartDate });
                      // Auto-calculate days if both dates are set
                      if (newStartDate && manualForm.endDate) {
                        const start = new Date(newStartDate);
                        const end = new Date(manualForm.endDate);
                        if (end >= start) {
                          let days = 0;
                          let current = new Date(start);
                          while (current <= end) {
                            const dayOfWeek = current.getDay();
                            if (dayOfWeek !== 0 && dayOfWeek !== 6) days++;
                            current.setDate(current.getDate() + 1);
                          }
                          setManualForm(prev => ({ ...prev, days }));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualForm.endDate}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      setManualForm({ ...manualForm, endDate: newEndDate });
                      // Auto-calculate days if both dates are set
                      if (manualForm.startDate && newEndDate) {
                        const start = new Date(manualForm.startDate);
                        const end = new Date(newEndDate);
                        if (end >= start) {
                          let days = 0;
                          let current = new Date(start);
                          while (current <= end) {
                            const dayOfWeek = current.getDay();
                            if (dayOfWeek !== 0 && dayOfWeek !== 6) days++;
                            current.setDate(current.getDate() + 1);
                          }
                          setManualForm(prev => ({ ...prev, days }));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Days *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="365"
                    value={manualForm.days}
                    onChange={(e) => setManualForm({ ...manualForm, days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Auto-calculated or enter manually"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {manualForm.startDate && manualForm.endDate ? 
                      `Calculated: ${handleCalculateManualDays()} working days (weekends excluded)` : 
                      'Select dates to auto-calculate'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={manualForm.emergencyContact}
                    onChange={(e) => setManualForm({ ...manualForm, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Name and phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={manualForm.reason}
                  onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Reason for leave..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Handover Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={manualForm.handoverNotes}
                  onChange={(e) => setManualForm({ ...manualForm, handoverNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Any pending work notes..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Process Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Request Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Request ID: {selectedRequest.id.slice(0, 8)}...
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Employee Information */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedRequest.firstName} {selectedRequest.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedRequest.email}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.departmentName}</p>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Leave Type</h4>
                    <p className="text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeColor(selectedRequest.leaveType)}`}>
                        {selectedRequest.leaveType}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Date Range</h4>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedRequest.startDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} - {new Date(selectedRequest.endDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Duration</h4>
                    <p className="text-sm text-gray-900 font-semibold">
                      {selectedRequest.days} day{selectedRequest.days > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <div className="flex items-center">
                      {getStatusIcon(selectedRequest.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                        {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                      </span>
                    </div>
                    {selectedRequest.rejectionReason && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium text-gray-500">Rejection Reason</h4>
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {selectedRequest.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {selectedRequest.approvedBy && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Approved By</h4>
                      <p className="text-sm text-gray-900">{selectedRequest.approvedBy}</p>
                      <p className="text-xs text-gray-500">
                        on {selectedRequest.approvedAt ? new Date(selectedRequest.approvedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Applied On</h4>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Reason</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedRequest.reason}
                  </p>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedRequest.emergencyContact || selectedRequest.handoverNotes || selectedRequest.documentUrl) && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-4">Additional Information</h4>
                  <div className="space-y-3">
                    {selectedRequest.emergencyContact && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Emergency Contact</h5>
                        <p className="text-sm text-gray-900">{selectedRequest.emergencyContact}</p>
                      </div>
                    )}
                    
                    {selectedRequest.handoverNotes && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Handover Notes</h5>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedRequest.handoverNotes}
                        </p>
                      </div>
                    )}
                    
                    {selectedRequest.documentUrl && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Supporting Document</h5>
                        <a
                          href={selectedRequest.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-900 underline"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {/* {(isAdmin && selectedRequest.status === 'pending' && (
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              ))} */}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedRequest(null)}
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