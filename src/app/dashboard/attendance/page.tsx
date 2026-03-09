// src/app/dashboard/attendance/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  calculateCheckInStatus,
  calculateCheckOutStatus,
  calculateWorkHours,
  calculateAttendanceStatus,
  formatDuration,
  AttendanceSettings as AttendanceSettingsType,
} from '@/lib/utils/attendance-calculator';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/auth/permissions';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: string | number;
  status: 'present' | 'absent' | 'late' | 'early' | 'half_day';
  lateMinutes?: number;
  earlyCheckout?: boolean;
  overtimeMinutes?: number;
}

interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  halfDayToday: number;
  averageWorkHours: number;
  onTimePercentage: number;
}

interface AttendanceSettings {
  workHours: number;
  overtimeRate: number;
  autoCheckout: boolean;
  checkInStart: string;
  checkInEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
}

interface ManualEntryData {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  notes?: string;
}

interface CalculatedStatus {
  checkInStatus: 'early' | 'on_time' | 'late' | null;
  checkInDuration: number;
  checkOutStatus: 'early' | 'on_time' | 'over_time' | null;
  checkOutDuration: number;
  attendanceStatus: 'present' | 'absent' | 'half_day';
  totalWorkHours: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    halfDayToday: 0,
    averageWorkHours: 0,
    onTimePercentage: 0,
  });
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>({
    workHours: 8,
    overtimeRate: 1.5,
    autoCheckout: true,
    checkInStart: '08:00',
    checkInEnd: '10:00',
    checkOutStart: '17:00',
    checkOutEnd: '19:00',
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [manualEntryData, setManualEntryData] = useState<ManualEntryData>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '18:00',
    notes: '',
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  // Check permissions for each action
  const canCreateAttendance = isAdmin || hasPermission(user?.permissions, 'attendance', 'create');
  const canEditAttendance = isAdmin || hasPermission(user?.permissions, 'attendance', 'edit');
  const canDeleteAttendance = isAdmin || hasPermission(user?.permissions, 'attendance', 'delete');
  const canExportAttendance = isAdmin || hasPermission(user?.permissions, 'attendance', 'export');

  // Toast functions
  const addToast = (type: Toast['type'], message: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message, duration }]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    if (user) {
      fetchAttendance();
      fetchAttendanceStats();
      fetchAttendanceSettings();
      if (isAdmin) {
        fetchDepartments();
      }
    }
  }, [dateFilter, view, departmentFilter, statusFilter, user]);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        date: dateFilter,
        view: view,
        ...(isAdmin && departmentFilter && { department: departmentFilter }),
        ...(isAdmin && statusFilter && { status: statusFilter }),
      });

      // Add employee filter for non-admin users
      if (!isAdmin && user?.employeeId) {
        params.append('employeeId', user.employeeId);
      }

      const response = await fetch(`/api/admin/attendance?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.attendance);
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Failed to fetch attendance');
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      addToast('error', 'Failed to fetch attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams();
      
      // Add employee filter for non-admin users
      if (!isAdmin && user?.employeeId) {
        params.append('employeeId', user.employeeId);
      }

      const response = await fetch(`/api/admin/attendance/stats?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Failed to fetch attendance stats');
      }
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
      addToast('error', 'Failed to fetch attendance stats. Please try again.');
    }
  };

  const fetchAttendanceSettings = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/settings/attendance', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceSettings(data.settings);
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Failed to fetch attendance settings');
      }
    } catch (error) {
      console.error('Failed to fetch attendance settings:', error);
      addToast('error', 'Failed to fetch attendance settings. Please try again.');
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/departments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments.map((dept: any) => dept.name));
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Failed to fetch departments');
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      addToast('error', 'Failed to fetch departments. Please try again.');
    }
  };

  /**
   * Calculate all status information for a record based on the new requirements
   */
  const calculateAllStatus = (record: AttendanceRecord): CalculatedStatus => {
    let checkInStatus: 'early' | 'on_time' | 'late' | null = null;
    let checkInDuration = 0;
    let checkOutStatus: 'early' | 'on_time' | 'over_time' | null = null;
    let checkOutDuration = 0;
    let attendanceStatus: 'present' | 'absent' | 'half_day' = 'absent';
    let totalWorkHours = 0;

    if (!record.checkIn) {
      // No check-in: Check if past checkout start time
      const checkOutStartMinutes = timeToMinutes(attendanceSettings.checkOutStart);
      const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

      if (currentMinutes >= checkOutStartMinutes) {
        attendanceStatus = 'absent';
      } else {
        attendanceStatus = 'half_day';
      }
      return { checkInStatus, checkInDuration, checkOutStatus, checkOutDuration, attendanceStatus, totalWorkHours };
    }

    // Calculate check-in status
    const checkInTime = new Date(record.checkIn);
    const checkInCalc = calculateCheckInStatus(
      checkInTime,
      attendanceSettings.checkInStart,
      attendanceSettings.checkInEnd
    );
    checkInStatus = checkInCalc.status;
    checkInDuration = checkInCalc.duration;

    if (record.checkOut) {
      // Calculate check-out status
      const checkOutTime = new Date(record.checkOut);
      const checkOutCalc = calculateCheckOutStatus(
        checkOutTime,
        attendanceSettings.checkOutStart,
        attendanceSettings.checkOutEnd
      );
      checkOutStatus = checkOutCalc.status;
      checkOutDuration = checkOutCalc.duration;

      // Calculate work hours
      totalWorkHours = calculateWorkHours(checkInTime, checkOutTime);

      // Determine final attendance status
      const hasValidCheckIn = checkInStatus === 'early' || checkInStatus === 'on_time';
      const hasValidCheckOut = checkOutStatus === 'on_time' || checkOutStatus === 'over_time';

      if (hasValidCheckIn && hasValidCheckOut) {
        attendanceStatus = 'present';
      } else if (checkInStatus === 'late' && checkOutStatus === 'early') {
        attendanceStatus = 'absent';
      } else if (checkInStatus === 'late' || checkOutStatus === 'early') {
        attendanceStatus = 'half_day';
      }
    } else {
      // No check-out yet
      const checkOutStartMinutes = timeToMinutes(attendanceSettings.checkOutStart);
      const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

      if (currentMinutes >= checkOutStartMinutes) {
        attendanceStatus = 'absent';
      } else {
        attendanceStatus = 'half_day';
      }
    }

    return { checkInStatus, checkInDuration, checkOutStatus, checkOutDuration, attendanceStatus, totalWorkHours };
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleManualEntry = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      
      // For non-admin users, force employeeId to be their own
      const entryData = {
        ...manualEntryData,
        employeeId: isAdmin ? manualEntryData.employeeId : (user?.employeeId || ''),
      };

      const response = await fetch('/api/admin/attendance/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entryData),
      });

      if (response.ok) {
        await fetchAttendance();
        await fetchAttendanceStats();
        setShowManualEntryModal(false);
        setManualEntryData({
          employeeId: '',
          date: new Date().toISOString().split('T')[0],
          checkIn: '09:00',
          checkOut: '18:00',
          notes: '',
        });
        addToast('success', selectedRecord ? 'Attendance record updated successfully' : 'Attendance record added successfully');
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
      addToast('error', 'Failed to update attendance. Please try again.');
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    // Check if user has permission to edit this record
    if (!isAdmin && record.employeeId !== user?.employeeId) {
      addToast('error', 'You do not have permission to edit this record');
      return;
    }
    
    setSelectedRecord(record);
    setManualEntryData({
      employeeId: record.employeeId,
      date: record.date,
      checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '09:00',
      checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '18:00',
      notes: '',
    });
    setShowManualEntryModal(true);
  };

  const handleDeleteRecord = (recordId: string, recordEmployeeId: string) => {
    // Check if user has permission to delete this record
    if (!isAdmin && recordEmployeeId !== user?.employeeId) {
      addToast('error', 'You do not have permission to delete this record');
      return;
    }

    setDeleteRecordId(recordId);
    setDeleteEmployeeId(recordEmployeeId);
    setShowDeleteConfirm(recordId);
  };

  const confirmDelete = async () => {
    if (!deleteRecordId) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/attendance/${deleteRecordId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchAttendance();
        await fetchAttendanceStats();
        addToast('success', 'Attendance record deleted successfully');
        setShowDeleteConfirm(null);
        setDeleteRecordId(null);
        setDeleteEmployeeId(null);
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Failed to delete attendance record');
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete attendance record:', error);
      addToast('error', 'Failed to delete attendance record. Please try again.');
      setShowDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
    setDeleteRecordId(null);
    setDeleteEmployeeId(null);
  };

  const exportAttendance = async () => {
    if (!isAdmin) {
      addToast('error', 'You do not have permission to export attendance data');
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        date: dateFilter,
        view: view,
        ...(departmentFilter && { department: departmentFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/attendance/export?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${dateFilter}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast('success', 'Attendance data exported successfully');
      } else {
        addToast('error', 'Failed to export attendance data');
      }
    } catch (error) {
      console.error('Failed to export attendance:', error);
      addToast('error', 'Failed to export attendance data. Please try again.');
    }
  };

  // Filter attendance records - for non-admin, this is redundant as API already filters,
  // but kept for additional security
  const filteredAttendance = attendance.filter(
    (record) => {
      // For non-admin users, only show their own records
      if (!isAdmin && record.employeeId !== user?.employeeId) {
        return false;
      }
      
      // Apply search filter
      return record.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'early':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'absent':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'late':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'half_day':
        return <ClockIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'early':
        return 'bg-blue-100 text-blue-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'half_day':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeWindowInfo = () => {
    return {
      checkIn: `${attendanceSettings.checkInStart} - ${attendanceSettings.checkInEnd}`,
      checkOut: `${attendanceSettings.checkOutStart} - ${attendanceSettings.checkOutEnd}`,
      workHours: `${attendanceSettings.workHours} hours`,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center p-4 rounded-lg shadow-lg max-w-md transform transition-all duration-300 animate-slide-in ${
              toast.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
              toast.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
              toast.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
              'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
              {toast.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-400" />}
              {toast.type === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />}
              {toast.type === 'info' && <InformationCircleIcon className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-green-800' :
                toast.type === 'error' ? 'text-red-800' :
                toast.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-center text-gray-900">
              Confirm Delete
            </h3>
            <p className="mt-2 text-sm text-center text-gray-500">
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            {isAdmin 
              ? 'Track and manage employee attendance with dynamic status calculation'
              : 'View and manage your attendance records'}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>✅ Check-in: {getTimeWindowInfo().checkIn}</span>
            <span>🚪 Check-out: {getTimeWindowInfo().checkOut}</span>
            <span>📊 Work Hours: {getTimeWindowInfo().workHours}</span>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setView('daily')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === 'daily'
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Daily View
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === 'monthly'
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly Report
          </button>
          {canExportAttendance && isAdmin && (
            <button
              onClick={exportAttendance}
              className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100"
            >
              Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid - Show simplified stats for non-admin users */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          // Admin stats
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present Today</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.presentToday}</p>
                  <p className="text-sm text-green-600">
                    {stats.totalEmployees > 0
                      ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Late Today</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.lateToday}</p>
                  <p className="text-sm text-yellow-600">
                    {stats.presentToday > 0 ? Math.round((stats.lateToday / stats.presentToday) * 100) : 0}% of present
                  </p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Work Hours</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.averageWorkHours.toFixed(1)}h</p>
                  <p className="text-sm text-purple-600">{stats.onTimePercentage}% on time</p>
                </div>
                <ClockIcon className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </>
        ) : (
          // Employee stats (personalized)
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">My Attendance Today</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.presentToday > 0 ? 'Present' : 'Not Marked'}
                  </p>
                </div>
                <CheckCircleIcon className={`w-8 h-8 ${stats.presentToday > 0 ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.presentToday} days</p>
                  <p className="text-sm text-green-600">Present</p>
                </div>
                <CalendarIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.lateToday}</p>
                  <p className="text-sm text-yellow-600">This month</p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Hours</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.averageWorkHours.toFixed(1)}h</p>
                  <p className="text-sm text-purple-600">Per day</p>
                </div>
                <ClockIcon className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters - Show department filter only for admin */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={isAdmin ? "Search employees..." : "Search your records..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {isAdmin && (
            <>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="early">Early</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
              </select>
            </>
          )}
          {canCreateAttendance && (
            <button
              onClick={() => setShowManualEntryModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Manual Entry
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-out Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-out Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Early/Late/OT Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendance.map((record) => {
                const calc = calculateAllStatus(record);
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {record.firstName[0]}
                            {record.lastName[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.firstName} {record.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{record.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.departmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {calc.checkInStatus ? (
                        <div>
                          <div className="text-sm font-medium">
                            {calc.checkInStatus === 'early' && '✓ Early'}
                            {calc.checkInStatus === 'on_time' && '✓ On Time'}
                            {calc.checkInStatus === 'late' && '⚠ Late'}
                          </div>
                          {calc.checkInDuration !== 0 && (
                            <div className="text-xs text-gray-600">
                              {calc.checkInStatus === 'early' ? '-' : '+'}
                              {Math.abs(calc.checkInDuration)}m
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {calc.checkOutStatus ? (
                        <div>
                          <div className="text-sm font-medium">
                            {calc.checkOutStatus === 'early' && 'Early'}
                            {calc.checkOutStatus === 'on_time' && '✓ On Time'}
                            {calc.checkOutStatus === 'over_time' && '⏱ OT'}
                          </div>
                          {calc.checkOutDuration !== 0 && (
                            <div className="text-xs text-gray-600">
                              {calc.checkOutStatus === 'early' ? '-' : '+'}
                              {Math.abs(calc.checkOutDuration)}m
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {calc.totalWorkHours > 0 ? `${calc.totalWorkHours.toFixed(1)}h` : '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        {calc.checkInDuration !== 0 && (
                          <div className={calc.checkInStatus === 'early' ? 'text-blue-600' : 'text-yellow-600'}>
                            {calc.checkInStatus === 'early' ? 'Early' : 'Late'}: {Math.abs(calc.checkInDuration)}m
                          </div>
                        )}
                        {calc.checkOutDuration !== 0 && (
                          <div className={calc.checkOutStatus === 'early' ? 'text-orange-600' : 'text-green-600'}>
                            {calc.checkOutStatus === 'early' ? 'Early Checkout' : 'OT'}: {Math.abs(calc.checkOutDuration)}m
                          </div>
                        )}
                        {calc.checkInDuration === 0 && calc.checkOutDuration === 0 && (
                          <span className="text-gray-500">--</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(calc.attendanceStatus)}
                        <span
                          className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            calc.attendanceStatus
                          )}`}
                        >
                          {calc.attendanceStatus === 'present' && 'PRESENT'}
                          {calc.attendanceStatus === 'absent' && 'ABSENT'}
                          {calc.attendanceStatus === 'half_day' && 'HALF DAY'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {(canEditAttendance && (isAdmin || record.employeeId === user?.employeeId)) && (
                          <button
                            onClick={() => handleEditRecord(record)}
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                            title="Edit Record"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {(canDeleteAttendance && (isAdmin || record.employeeId === user?.employeeId)) && (
                          <button
                            onClick={() => handleDeleteRecord(record.id, record.employeeId)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                            title="Delete Record"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAttendance.length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
            <p className="text-gray-600">
              {searchQuery || departmentFilter || statusFilter
                ? 'Try adjusting your search criteria'
                : isAdmin 
                  ? 'No attendance data available for the selected date'
                  : 'You have no attendance records for the selected date'}
            </p>
          </div>
        )}
      </div>

      {/* Monthly Report View - Simplified for non-admin */}
      {view === 'monthly' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isAdmin 
              ? `Monthly Attendance Summary - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
              : `My Monthly Attendance Summary - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
            }
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Attendance Chart - Show only for admin */}
            {isAdmin && (
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">Attendance Trend</h3>
                <div className="h-64 flex items-end justify-around space-x-1 bg-gray-50 rounded-lg p-4">
                  {Array.from({ length: 30 }, (_, i) => {
                    const presentCount = Math.floor(Math.random() * (stats.totalEmployees - 5)) + 5;
                    const height = (presentCount / stats.totalEmployees) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col justify-end h-48">
                          <div
                            className="w-full bg-green-500 rounded-t transition-all duration-300"
                            style={{ height: `${height}%` }}
                            title={`Present: ${presentCount}`}
                          ></div>
                          <div
                            className="w-full bg-red-500 rounded-t"
                            style={{ height: `${100 - height}%` }}
                            title={`Absent: ${stats.totalEmployees - presentCount}`}
                          ></div>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">{i + 1}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">
                {isAdmin ? 'Monthly Summary' : 'My Monthly Summary'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Working Days</p>
                  <p className="text-2xl font-bold text-gray-900">22</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {isAdmin ? 'Avg. Attendance' : 'My Attendance'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.onTimePercentage}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {isAdmin ? 'Total Late Arrivals' : 'My Late Arrivals'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.lateToday * (isAdmin ? 22 : 1)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {isAdmin ? 'Avg. Work Hours' : 'My Avg. Hours'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageWorkHours.toFixed(1)}h</p>
                </div>
              </div>

<div className="bg-blue-50 rounded-lg p-4">
  <h4 className="text-sm font-medium text-blue-900 mb-2">Performance Insights</h4>
  <ul className="text-sm text-blue-700 space-y-1">
    {isAdmin ? (
      <>
        <li>• {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% attendance rate this month</li>
        <li>• {Math.round((stats.lateToday / stats.presentToday) * 100)}% of employees arrived late</li>
        <li>• Average overtime: {stats.averageWorkHours > 8 ? (stats.averageWorkHours - 8).toFixed(1) : 0}h per day</li>
      </>
    ) : (
      <>
        <li>• You have been present for {stats.presentToday} days this month</li>
        <li>• You arrived late {stats.lateToday} times</li>
        <li>• Your average work hours: {stats.averageWorkHours.toFixed(1)}h per day</li>
        {stats.averageWorkHours > 8 && (
          <li>• You worked {(stats.presentToday * (stats.averageWorkHours - 8)).toFixed(1)} hours of overtime this month</li>
        )}
      </>
    )}
  </ul>
</div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <ManualEntryModal
          data={manualEntryData}
          onChange={setManualEntryData}
          onSave={handleManualEntry}
          onClose={() => {
            setShowManualEntryModal(false);
            setSelectedRecord(null);
            setManualEntryData({
              employeeId: '',
              date: new Date().toISOString().split('T')[0],
              checkIn: '09:00',
              checkOut: '18:00',
              notes: '',
            });
          }}
          isEdit={!!selectedRecord}
          isAdmin={isAdmin}
          userEmployeeId={user?.employeeId}
          addToast={addToast}
        />
      )}
    </div>
  );
}

// Manual Entry Modal Component
function ManualEntryModal({
  data,
  onChange,
  onSave,
  onClose,
  isEdit,
  isAdmin,
  userEmployeeId,
  addToast,
}: {
  data: ManualEntryData;
  onChange: (data: ManualEntryData) => void;
  onSave: () => void;
  onClose: () => void;
  isEdit: boolean;
  isAdmin: boolean;
  userEmployeeId?: string;
  addToast: (type: Toast['type'], message: string, duration?: number) => void;
}) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else if (userEmployeeId) {
      // For non-admin users, set their employee ID automatically
      onChange({ ...data, employeeId: userEmployeeId });
    }
  }, [isAdmin, userEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/employees', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Failed to fetch employees');
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      addToast('error', 'Failed to fetch employees. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate times
    if (data.checkIn >= data.checkOut) {
      addToast('error', 'Check-out time must be after check-in time');
      return;
    }

    setLoading(true);
    await onSave();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isEdit ? 'Edit Attendance Record' : 'Manual Attendance Entry'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee *
              </label>
              <select
                required
                value={data.employeeId}
                onChange={(e) => onChange({ ...data, employeeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.departmentName})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Employee:</span> You are creating/editing your own attendance record
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              required
              value={data.date}
              onChange={(e) => onChange({ ...data, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check In Time *
              </label>
              <input
                type="time"
                required
                value={data.checkIn}
                onChange={(e) => onChange({ ...data, checkIn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Out Time *
              </label>
              <input
                type="time"
                required
                value={data.checkOut}
                onChange={(e) => onChange({ ...data, checkOut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Optional notes about this attendance record..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">📌 Important Notes:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Check-out time must be after check-in time</li>
              <li>• The system will automatically calculate late/early/overtime based on settings</li>
              <li>• Manual entries are subject to admin approval</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Record' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}