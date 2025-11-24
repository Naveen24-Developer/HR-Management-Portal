// app/admin/attendance/page.tsx - COMPLETE UPDATED VERSION
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
  PlayIcon,
  StopIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workHours: number;
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
  const [manualEntryData, setManualEntryData] = useState<ManualEntryData>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '18:00',
    notes: '',
  });
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchAttendance();
    fetchAttendanceStats();
    fetchAttendanceSettings();
    fetchDepartments();
  }, [dateFilter, view, departmentFilter, statusFilter]);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        date: dateFilter,
        view: view,
        ...(departmentFilter && { department: departmentFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/attendance?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Calculate dynamic status for each record
        const attendanceWithCalculatedStatus = data.attendance.map((record: AttendanceRecord) => {
          const { status, lateMinutes, earlyCheckout, overtimeMinutes } = calculateAttendanceStatus(record);
          return {
            ...record,
            status,
            lateMinutes,
            earlyCheckout,
            overtimeMinutes,
          };
        });
        
        setAttendance(attendanceWithCalculatedStatus);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/attendance/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
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
      }
    } catch (error) {
      console.error('Failed to fetch attendance settings:', error);
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
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const calculateAttendanceStatus = (record: AttendanceRecord) => {
    // If no check-in, mark as absent
    if (!record.checkIn) {
      return { status: 'absent' as const, lateMinutes: 0, earlyCheckout: false, overtimeMinutes: 0 };
    }

    const checkInTime = new Date(record.checkIn);
    const checkInHours = checkInTime.getHours();
    const checkInMinutes = checkInTime.getMinutes();
    const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;
    
    // Parse check-in start and end times from settings
    const [checkInStartHour, checkInStartMinute] = attendanceSettings.checkInStart.split(':').map(Number);
    const [checkInEndHour, checkInEndMinute] = attendanceSettings.checkInEnd.split(':').map(Number);
    const checkInStartTotalMinutes = checkInStartHour * 60 + checkInStartMinute;
    const checkInEndTotalMinutes = checkInEndHour * 60 + checkInEndMinute;

    let status: 'present' | 'late' | 'early' | 'half_day' | 'absent' = 'present';
    let lateMinutes = 0;
    let earlyCheckout = false;
    let overtimeMinutes = 0;

    // Check-in Status: On Time, Early, or Late
    if (checkInTotalMinutes < checkInStartTotalMinutes) {
      // EARLY: Check-in before Check-in Start time
      status = 'early';
      lateMinutes = checkInStartTotalMinutes - checkInTotalMinutes; // Store early minutes as positive
    } else if (checkInTotalMinutes > checkInEndTotalMinutes) {
      // LATE: Check-in after Check-in End time
      status = 'late';
      lateMinutes = checkInTotalMinutes - checkInEndTotalMinutes;
    }
    // else: Check-in within Check-in Start-End range = present (On Time)

    // Check-out Status and Present/Absent Condition
    if (record.checkOut) {
      const checkOutTime = new Date(record.checkOut);
      const checkOutHours = checkOutTime.getHours();
      const checkOutMinutes = checkOutTime.getMinutes();
      const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes;

      // Parse check-out start and end times
      const [checkOutStartHour, checkOutStartMinute] = attendanceSettings.checkOutStart.split(':').map(Number);
      const [checkOutEndHour, checkOutEndMinute] = attendanceSettings.checkOutEnd.split(':').map(Number);
      const checkOutStartTotalMinutes = checkOutStartHour * 60 + checkOutStartMinute;
      const checkOutEndTotalMinutes = checkOutEndHour * 60 + checkOutEndMinute;

      // Calculate work hours
      const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      const requiredWorkHours = attendanceSettings.workHours || 8;

      // Check-out Status: On Time, Early, or Over Time
      if (checkOutTotalMinutes < checkOutStartTotalMinutes) {
        // EARLY: Check-out before Check-out Start time
        earlyCheckout = true;
      } else if (checkOutTotalMinutes > checkOutEndTotalMinutes) {
        // OVER TIME: Check-out after Check-out End time
        overtimeMinutes = Math.round((checkOutTotalMinutes - checkOutEndTotalMinutes));
      }

      // Present Condition: checked in AND checked out
      // (status already determined by check-in, check-out status just adds details)
    } else {
      // No check-out: potentially half_day or absent
      // Check if within work hours but not checked out yet
      const requiredWorkHours = attendanceSettings.workHours || 8;
      const checkOutStartHour = parseInt(attendanceSettings.checkOutStart.split(':')[0]);
      const checkOutStartMinute = parseInt(attendanceSettings.checkOutStart.split(':')[1]);
      const checkOutStartTotalMinutes = checkOutStartHour * 60 + checkOutStartMinute;

      const now = new Date();
      const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();

      // If it's past check-out start time and no check-out, mark as absent
      if (nowTotalMinutes >= checkOutStartTotalMinutes) {
        status = 'absent';
      } else {
        // Still within work hours but not checked out yet
        status = 'half_day';
        earlyCheckout = true;
      }
    }
    
    return { status, lateMinutes, earlyCheckout, overtimeMinutes };
  };

  const handleManualEntry = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/attendance/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(manualEntryData),
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
        alert('Attendance record updated successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
      alert('Failed to update attendance');
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
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

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/attendance/${recordId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchAttendance();
        await fetchAttendanceStats();
        alert('Attendance record deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete attendance record');
      }
    } catch (error) {
      console.error('Failed to delete attendance record:', error);
      alert('Failed to delete attendance record');
    }
  };

  const exportAttendance = async () => {
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
      } else {
        alert('Failed to export attendance data');
      }
    } catch (error) {
      console.error('Failed to export attendance:', error);
      alert('Failed to export attendance data');
    }
  };

  const filteredAttendance = attendance.filter(record =>
    record.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track and manage employee attendance with dynamic status calculation
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>✅ Check-in: {getTimeWindowInfo().checkIn}</span>
            <span>🚪 Check-out: {getTimeWindowInfo().checkOut}</span>
            {/* Grace period removed */}
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
          <button
            onClick={exportAttendance}
            className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
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
              <p className="text-sm text-purple-600">
                {stats.onTimePercentage}% on time
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
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
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="present">On Time</option>
            <option value="early">Early</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
          </select>
          <button
            onClick={() => setShowManualEntryModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Manual Entry
          </button>
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
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {record.firstName[0]}{record.lastName[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.firstName} {record.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.departmentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkIn ? (
                      <div>
                        <div>{new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {record.lateMinutes && record.lateMinutes > 0 && record.status === 'late' && (
                          <div className="text-xs text-yellow-600">
                            Late: +{record.lateMinutes}m
                          </div>
                        )}
                        {record.lateMinutes && record.lateMinutes > 0 && record.status === 'early' && (
                          <div className="text-xs text-blue-600">
                            Early: -{record.lateMinutes}m
                          </div>
                        )}
                      </div>
                    ) : (
                      '--:--'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkOut ? (
                      <div>
                        <div>{new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {record.earlyCheckout && (
                          <div className="text-xs text-orange-600">
                            Early checkout
                          </div>
                        )}
                      </div>
                    ) : (
                      '--:--'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{Number(record.workHours) > 0 ? `${Number(record.workHours).toFixed(1)}h` : '--'}</div>
                      {record.overtimeMinutes && record.overtimeMinutes > 0 && (
                        <div className="text-xs text-green-600">
                          +{record.overtimeMinutes}m OT
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(record.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditRecord(record)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        title="Edit Record"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                        title="Delete Record"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAttendance.length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No attendance records found
            </h3>
            <p className="text-gray-600">
              {searchQuery || departmentFilter || statusFilter
                ? 'Try adjusting your search criteria'
                : 'No attendance data available for the selected date'}
            </p>
          </div>
        )}
      </div>

      {/* Monthly Report View */}
      {view === 'monthly' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Attendance Summary - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Attendance Chart */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">Attendance Trend</h3>
              <div className="h-64 flex items-end justify-around space-x-1 bg-gray-50 rounded-lg p-4">
                {Array.from({ length: 30 }, (_, i) => {
                  const presentCount = Math.floor(Math.random() * (stats.totalEmployees - 5)) + 5;
                  const absentCount = stats.totalEmployees - presentCount;
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
                          title={`Absent: ${absentCount}`}
                        ></div>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">{i + 1}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Monthly Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Working Days</p>
                  <p className="text-2xl font-bold text-gray-900">22</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.onTimePercentage}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Late Arrivals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.lateToday * 22}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Avg. Work Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageWorkHours.toFixed(1)}h</p>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Performance Insights</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% attendance rate this month</li>
                  <li>• {Math.round((stats.lateToday / stats.presentToday) * 100)}% of employees arrived late</li>
                  <li>• Average overtime: {stats.averageWorkHours > 8 ? (stats.averageWorkHours - 8).toFixed(1) : 0}h per day</li>
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
        />
      )}
    </div>
  );
}

// Manual Entry Modal Component
function ManualEntryModal({ data, onChange, onSave, onClose, isEdit }: {
  data: ManualEntryData;
  onChange: (data: ManualEntryData) => void;
  onSave: () => void;
  onClose: () => void;
  isEdit: boolean;
}) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

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
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.departmentName})
                </option>
              ))}
            </select>
          </div>

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
              {loading ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}