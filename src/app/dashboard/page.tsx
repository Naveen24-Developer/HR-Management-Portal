// src/app/dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  UsersIcon,
  UserGroupIcon,
  CheckCircleIcon,
  FolderIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PlayIcon,
  StopIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import CheckInDialog from '@/components/attendance/CheckInDialog';
import { formatErrorAlert } from '@/lib/utils/attendance-errors';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  activeProjects: number;
  pendingLeaves: number;
  todayBirthdays: number;
  departmentDistribution: { name: string; count: number }[];
  attendanceTrend: { date: string; present: number; absent: number }[];
  recentActivities: {
    id: string;
    action: string;
    user: string;
    time: string;
    type: 'success' | 'warning' | 'info' | 'error';
  }[];
  upcomingEvents: {
    id: string;
    event: string;
    date: string;
    type: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  performanceMetrics: {
    attendanceRate: number;
    projectCompletion: number;
    employeeSatisfaction: number;
    revenueGrowth: number;
  };
  currentAttendance: {
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    workHours: number;
    status: 'present' | 'absent' | 'late' | 'half day' | 'not checked in';
    lateMinutes: number;
    earlyCheckout: boolean;
    currentWorkHours: number;
  };
  attendanceSettings: {
    workHours: number;
    checkInStart: string;
    checkInEnd: string;
    checkOutStart: string;
    checkOutEnd: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: string;
  status: string;
  lateMinutes: number;
  earlyCheckout: boolean;
  overtimeMinutes: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    activeProjects: 0,
    pendingLeaves: 0,
    todayBirthdays: 0,
    departmentDistribution: [],
    attendanceTrend: [],
    recentActivities: [],
    upcomingEvents: [],
    performanceMetrics: {
      attendanceRate: 0,
      projectCompletion: 0,
      employeeSatisfaction: 0,
      revenueGrowth: 0,
    },
    currentAttendance: {
      hasCheckedIn: false,
      hasCheckedOut: false,
      checkInTime: null,
      checkOutTime: null,
      workHours: 0,
      status: 'not checked in',
      lateMinutes: 0,
      earlyCheckout: false,
      currentWorkHours: 0,
    },
    attendanceSettings: {
      workHours: 8.0,
      checkInStart: '08:00',
      checkInEnd: '10:00',
      checkOutStart: '17:00',
      checkOutEnd: '19:00',
    },
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [requiresGeo, setRequiresGeo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen for attendance settings updates from the settings page
  useEffect(() => {
    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.category === 'attendance') {
        console.log('Settings updated event received, refetching attendance settings...');
        fetchAttendanceSettings();
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    
    // Also listen for localStorage changes from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'settings-updated') {
        try {
          const data = JSON.parse(event.newValue || '{}');
          if (data.category === 'attendance') {
            console.log('Settings updated in another tab, refetching attendance settings...');
            fetchAttendanceSettings();
          }
        } catch (e) {
          console.error('Failed to parse settings update event:', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (!mounted) return;
      
      try {
        await Promise.all([
          fetchCurrentUser(),
          fetchDashboardStats(),
          fetchCurrentAttendance(),
          fetchAttendanceSettings(),
          fetchAttendanceRecords(),
          checkEmployeeRestrictions()
        ]);
      } catch (err) {
        if (mounted) {
          console.error('Error loading dashboard data:', err);
          setError('Failed to load dashboard data');
        }
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [timeRange]);

  const checkEmployeeRestrictions = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/attendance/check-restrictions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequiresGeo(data.requiresLocation || false);
      }
    } catch (error) {
      console.error('Failed to check restrictions:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/authe/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/dashboard?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, ...data.stats }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentAttendance = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/admin/attendance/today?date=${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ 
          ...prev, 
          currentAttendance: data.attendance 
        }));
      }
    } catch (error) {
      console.error('Failed to fetch current attendance:', error);
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
        // Map the API response to the dashboard settings format
        const attendanceSettings = {
          workHours: parseFloat(data.settings.workHours) || 8,
          overtimeRate: parseFloat(data.settings.overtimeRate) || 1.5,
          autoCheckout: data.settings.autoCheckout !== false,
          checkInStart: data.settings.checkInStart || '08:00',
          checkInEnd: data.settings.checkInEnd || '10:00',
          checkOutStart: data.settings.checkOutStart || '17:00',
          checkOutEnd: data.settings.checkOutEnd || '19:00',
        };
        
        setStats(prev => ({ 
          ...prev, 
          attendanceSettings
        }));
      }
    } catch (error) {
      console.error('Failed to fetch attendance settings:', error);
    }
  };

  const fetchAttendanceRecords = async () => {
    setAttendanceLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/attendance/list?limit=20&offset=0', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const calculateCheckInStatus = (checkInTime: Date) => {
    if (!checkInTime || !stats.attendanceSettings) {
      return { status: 'present' as const, lateMinutes: 0, earlyMinutes: 0 };
    }

    const checkInHours = checkInTime.getHours();
    const checkInMinutes = checkInTime.getMinutes();

    const [checkInStartHour, checkInStartMinute] = stats.attendanceSettings.checkInStart.split(':').map(Number);
    const [checkInEndHour, checkInEndMinute] = stats.attendanceSettings.checkInEnd.split(':').map(Number);
    const checkInStartTotalMinutes = checkInStartHour * 60 + checkInStartMinute;
    const checkInEndTotalMinutes = checkInEndHour * 60 + checkInEndMinute;
    const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;

    // EARLY: Check-in before Check-in Start time
    if (checkInTotalMinutes < checkInStartTotalMinutes) {
      const earlyMinutes = checkInStartTotalMinutes - checkInTotalMinutes;
      return { status: 'present' as const, lateMinutes: 0, earlyMinutes };
    }

    // LATE: Check-in after Check-in End time
    if (checkInTotalMinutes > checkInEndTotalMinutes) {
      const lateMinutes = checkInTotalMinutes - checkInEndTotalMinutes;
      return { status: 'late' as const, lateMinutes, earlyMinutes: 0 };
    }

    // ON TIME: Check-in within Check-in Start-End range
    return { status: 'present' as const, lateMinutes: 0, earlyMinutes: 0 };
  };

  const calculateCheckOutStatus = (checkInTime: Date, checkOutTime: Date) => {
    if (!checkInTime || !checkOutTime || !stats.attendanceSettings) {
      return { status: 'present' as const, earlyCheckout: false, earlyMinutes: 0, overtimeMinutes: 0 };
    }

    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    const requiredWorkHours = stats.attendanceSettings.workHours;

    const [checkOutStartHour, checkOutStartMinute] = stats.attendanceSettings.checkOutStart.split(':').map(Number);
    const [checkOutEndHour, checkOutEndMinute] = stats.attendanceSettings.checkOutEnd.split(':').map(Number);
    const checkOutStartTotalMinutes = checkOutStartHour * 60 + checkOutStartMinute;
    const checkOutEndTotalMinutes = checkOutEndHour * 60 + checkOutEndMinute;
    const checkOutTotalMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();

    // EARLY CHECK-OUT: before Check-out Start time
    if (checkOutTotalMinutes < checkOutStartTotalMinutes) {
      const earlyMinutes = checkOutStartTotalMinutes - checkOutTotalMinutes;
      return { status: 'present' as const, earlyCheckout: true, earlyMinutes, overtimeMinutes: 0 };
    }

    // OVER TIME: after Check-out End time
    if (checkOutTotalMinutes > checkOutEndTotalMinutes) {
      const overtimeMinutes = checkOutTotalMinutes - checkOutEndTotalMinutes;
      return { status: 'present' as const, earlyCheckout: false, earlyMinutes: 0, overtimeMinutes };
    }

    // ON TIME: Check-out within Check-out Start-End range
    return { status: 'present' as const, earlyCheckout: false, earlyMinutes: 0, overtimeMinutes: 0 };
  };

  const handleCheckIn = async () => {
    setCheckInDialogOpen(true);
  };

  const handleCheckInSubmit = async (data: {
    timestamp: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setCheckInLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchCurrentAttendance();
        await fetchDashboardStats();

        // Get the response data for the status message
        const result = await response.json();
        const message = result.message || 'Checked in successfully';

        // Add to recent activities
        setStats(prev => ({
          ...prev,
          recentActivities: [
            {
              id: Date.now().toString(),
              action: message,
              user: `${currentUser?.firstName} ${currentUser?.lastName}`,
              time: 'Just now',
              type: result.attendance?.status === 'late' ? 'warning' : 'success',
            },
            ...prev.recentActivities.slice(0, 4),
          ],
        }));
      } else {
        const error = await response.json();
        const errorAlert = formatErrorAlert(error);
        throw {
          code: error.code,
          message: error.error || error.message,
          response: { data: error },
        };
      }
    } catch (error) {
      console.error('Failed to check in:', error);
      throw error;
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const checkOutTime = new Date();
      const checkInTime = stats.currentAttendance.checkInTime ? new Date(stats.currentAttendance.checkInTime) : null;
      
      let status = 'present';
      let earlyCheckout = false;
      let workHours = 0;
      let earlyMinutes = 0;
      let overtimeMinutes = 0;

      if (checkInTime) {
        workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        const calc = calculateCheckOutStatus(checkInTime, checkOutTime) as any;
        status = calc.status;
        earlyCheckout = calc.earlyCheckout;
        earlyMinutes = calc.earlyMinutes || 0;
        overtimeMinutes = calc.overtimeMinutes || 0;
      }

      const response = await fetch('/api/admin/attendance/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timestamp: checkOutTime.toISOString(),
          status,
          workHours: parseFloat(workHours.toFixed(2)),
          earlyCheckout,
          earlyMinutes,
          overtimeMinutes,
        }),
      });

      if (response.ok) {
        await fetchCurrentAttendance();
        await fetchDashboardStats();
        
        // Add to recent activities
        const activityAction = earlyMinutes > 0
          ? `Checked out (Early ${earlyMinutes}m)`
          : overtimeMinutes > 0
          ? `Checked out (Overtime ${overtimeMinutes}m)`
          : 'Checked out (On time)';

        setStats(prev => ({
          ...prev,
          recentActivities: [
            {
              id: Date.now().toString(),
              action: activityAction,
              user: `${currentUser?.firstName} ${currentUser?.lastName}`,
              time: 'Just now',
              type: earlyCheckout ? 'warning' : 'success',
            },
            ...prev.recentActivities.slice(0, 4),
          ],
        }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to check out');
      }
    } catch (error: any) {
      console.error('Failed to check out:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to check out';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setCheckOutLoading(false);
    }
  };

  const canCheckIn = () => {
    if (!stats.attendanceSettings) return true;
    
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    const [checkInStartHour, checkInStartMinute] = stats.attendanceSettings.checkInStart.split(':').map(Number);
    const [checkInEndHour, checkInEndMinute] = stats.attendanceSettings.checkInEnd.split(':').map(Number);
    
    const checkInStartTotalMinutes = checkInStartHour * 60 + checkInStartMinute;
    const checkInEndTotalMinutes = checkInEndHour * 60 + checkInEndMinute;
    
    return currentTotalMinutes >= checkInStartTotalMinutes && currentTotalMinutes <= checkInEndTotalMinutes;
  };

  const canCheckOut = () => {
    if (!stats.currentAttendance.hasCheckedIn || !stats.attendanceSettings) return false;
    
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    const [checkOutStartHour, checkOutStartMinute] = stats.attendanceSettings.checkOutStart.split(':').map(Number);
    const [checkOutEndHour, checkOutEndMinute] = stats.attendanceSettings.checkOutEnd.split(':').map(Number);
    
    const checkOutStartTotalMinutes = checkOutStartHour * 60 + checkOutStartMinute;
    const checkOutEndTotalMinutes = checkOutEndHour * 60 + checkOutEndMinute;
    
    return currentTotalMinutes >= checkOutStartTotalMinutes && currentTotalMinutes <= checkOutEndTotalMinutes;
  };

  const calculateCurrentWorkHours = () => {
    if (!stats.currentAttendance.hasCheckedIn || stats.currentAttendance.hasCheckedOut) {
      return stats.currentAttendance.workHours;
    }
    
    const checkInTime = stats.currentAttendance.checkInTime ? new Date(stats.currentAttendance.checkInTime) : new Date();
    const currentTime = new Date();
    const workHours = (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    return parseFloat(workHours.toFixed(2));
  };

  const statCards = [
    {
      name: 'Total Employees',
      value: stats.totalEmployees,
      icon: UsersIcon,
      color: 'bg-blue-500',
      change: '+12%',
      description: 'Active workforce',
    },
    {
      name: 'Present Today',
      value: stats.presentToday,
      icon: CheckCircleIcon,
      color: 'bg-purple-500',
      change: `${stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%`,
      description: 'Attendance rate',
    },
    {
      name: 'Active Projects',
      value: stats.activeProjects,
      icon: FolderIcon,
      color: 'bg-yellow-500',
      change: '+8%',
      description: 'In progress',
    },
    {
      name: 'Pending Leaves',
      value: stats.pendingLeaves,
      icon: CalendarIcon,
      color: 'bg-orange-500',
      change: '5 requests',
      description: 'Awaiting approval',
    },
    {
      name: "Today's Birthdays",
      value: stats.todayBirthdays,
      icon: ClockIcon,
      color: 'bg-pink-500',
      change: 'Celebrations',
      description: 'Birthdays today',
    },
  ];

  const performanceMetrics = [
    {
      name: 'Attendance Rate',
      value: stats.performanceMetrics.attendanceRate,
      target: 95,
      color: 'bg-green-500',
    },
    {
      name: 'Project Completion',
      value: stats.performanceMetrics.projectCompletion,
      target: 85,
      color: 'bg-blue-500',
    },
    {
      name: 'Employee Satisfaction',
      value: stats.performanceMetrics.employeeSatisfaction,
      target: 90,
      color: 'bg-purple-500',
    },
    {
      name: 'Revenue Growth',
      value: stats.performanceMetrics.revenueGrowth,
      target: 15,
      color: 'bg-indigo-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900"> Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}! Here's an overview of your organization.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Time</p>
            <p className="text-lg font-semibold text-gray-900">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
        </div>
      </div>

{/* Enhanced Attendance Actions */}
<div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-8 border border-gray-100">
  {/* Header Section */}
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
    <div className="mb-6 md:mb-0">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Today's Attendance</h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>
      
      {/* Time Windows Badge */}
      {stats.attendanceSettings && (
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Check-in: {stats.attendanceSettings.checkInStart} - {stats.attendanceSettings.checkInEnd}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Check-out: {stats.attendanceSettings.checkOutStart} - {stats.attendanceSettings.checkOutEnd}
          </span>
        </div>
      )}
    </div>
    
    {/* Action Button */}
    <div className="flex items-center space-x-4">
      {!stats.currentAttendance.hasCheckedIn ? (
        <button
          onClick={handleCheckIn}
          disabled={checkInLoading}
          className={`
            relative group flex items-center px-8 py-4 rounded-xl transition-all duration-300
            ${checkInLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-inner'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 hover:-translate-y-0.5 active:translate-y-0'
            }
            disabled:opacity-60 disabled:cursor-not-allowed
          `}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <svg className={`w-7 h-6 mr-3 ${checkInLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {checkInLoading ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            )}
          </svg>
          <span className="font-semibold text-lg">
            {checkInLoading ? 'Processing...' : 'Check In Now'}
          </span>
          <div className="ml-4 text-left">
            <div className="text-sm opacity-90">Start your day</div>
          </div>
        </button>
      ) : !stats.currentAttendance.hasCheckedOut ? (
        <button
          onClick={handleCheckOut}
          disabled={checkOutLoading || !stats.currentAttendance.hasCheckedIn}
          className={`
            relative group flex items-center px-8 py-4 rounded-xl transition-all duration-300
            ${checkOutLoading || !stats.currentAttendance.hasCheckedIn
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-inner'
              : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg hover:shadow-xl hover:from-red-600 hover:to-rose-700 hover:-translate-y-0.5 active:translate-y-0'
            }
            disabled:opacity-60 disabled:cursor-not-allowed
          `}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <svg className={`w-6 h-6 mr-3 ${checkOutLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {checkOutLoading ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ) : (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </>
            )}
          </svg>
          <span className="font-semibold text-lg">
            {checkOutLoading ? 'Processing...' : 'Check Out Now'}
          </span>
          <div className="ml-4 text-left">
            <div className="text-sm opacity-90">End your day</div>
          </div>
        </button>
      ) : (
        <div className="text-center bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-center mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg mr-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Attendance Complete</h3>
          </div>
          <div className="text-3xl font-bold text-emerald-700 mb-1">
            {stats.currentAttendance.workHours.toFixed(1)}
            <span className="text-lg font-medium text-emerald-600"> hours</span>
          </div>
          <p className="text-sm text-emerald-600">Total work time today</p>
        </div>
      )}
    </div>
  </div>

  {/* Attendance Stats Cards */}
  <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
    {/* Check In Card */}
    <div className={`
      relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:shadow-md
      ${stats.currentAttendance.checkInTime 
        ? stats.currentAttendance.lateMinutes > 0 
          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100' 
          : 'bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100'
        : 'bg-gray-50 border border-gray-100'
      }
    `}>
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
      <div className="flex items-center mb-3">
        <div className={`
          p-2 rounded-lg mr-3
          ${stats.currentAttendance.checkInTime 
            ? stats.currentAttendance.lateMinutes > 0 
              ? 'bg-amber-100 text-amber-600' 
              : 'bg-blue-100 text-blue-600'
            : 'bg-gray-200 text-gray-500'
          }
        `}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">Check In Time</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {stats.currentAttendance.checkInTime 
          ? new Date(stats.currentAttendance.checkInTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : '--:-- --'
        }
      </p>
      {stats.currentAttendance.lateMinutes > 0 ? (
        <div className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          {stats.currentAttendance.lateMinutes} min late
        </div>
      ) : stats.currentAttendance.checkInTime && (
        <div className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          On time
        </div>
      )}
    </div>

    {/* Check Out Card */}
    <div className={`
      relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:shadow-md
      ${stats.currentAttendance.checkOutTime 
        ? stats.currentAttendance.earlyCheckout
          ? 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100'
          : 'bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100'
        : 'bg-gray-50 border border-gray-100'
      }
    `}>
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </div>
      <div className="flex items-center mb-3">
        <div className={`
          p-2 rounded-lg mr-3
          ${stats.currentAttendance.checkOutTime 
            ? stats.currentAttendance.earlyCheckout
              ? 'bg-orange-100 text-orange-600'
              : 'bg-purple-100 text-purple-600'
            : 'bg-gray-200 text-gray-500'
          }
        `}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">Check Out Time</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {stats.currentAttendance.checkOutTime 
          ? new Date(stats.currentAttendance.checkOutTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : '--:-- --'
        }
      </p>
      {stats.currentAttendance.earlyCheckout ? (
        <div className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Early checkout
        </div>
      ) : stats.currentAttendance.checkOutTime && (
        <div className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Regular checkout
        </div>
      )}
    </div>

    {/* Work Hours Card */}
    <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 transition-all duration-300 hover:shadow-md">
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.54l2.62 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.98 10 3.3 0 6.23-1.61 8.05-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z" />
        </svg>
      </div>
      <div className="flex items-center mb-3">
        <div className="p-2 bg-emerald-100 rounded-lg mr-3">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">Work Hours</p>
      </div>
      <div className="flex items-baseline">
        <p className="text-2xl font-bold text-gray-900">
          {calculateCurrentWorkHours().toFixed(1)}
        </p>
        <span className="text-lg font-medium text-gray-600 ml-1">hours</span>
      </div>
      {stats.attendanceSettings && (
        <div className="mt-3 pt-3 border-t border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Target</span>
            <span className="text-sm font-medium text-gray-700">{stats.attendanceSettings.workHours}h</span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 bg-emerald-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (calculateCurrentWorkHours() / stats.attendanceSettings.workHours) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Status Card */}
    <div className={`
      relative overflow-hidden rounded-xl p-5 border transition-all duration-300 hover:shadow-md
      ${stats.currentAttendance.status === 'present' 
        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
        : stats.currentAttendance.status === 'late'
        ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100'
        : stats.currentAttendance.status === 'half day'
        ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100'
        : stats.currentAttendance.status === 'absent'
        ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'
        : 'bg-gray-50 border-gray-100'
      }
    `}>
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
      <div className="flex items-center mb-3">
        <div className={`
          p-2 rounded-lg mr-3
          ${stats.currentAttendance.status === 'present'
            ? 'bg-green-100 text-green-600'
            : stats.currentAttendance.status === 'late'
            ? 'bg-amber-100 text-amber-600'
            : stats.currentAttendance.status === 'half day'
            ? 'bg-blue-100 text-blue-600'
            : stats.currentAttendance.status === 'absent'
            ? 'bg-red-100 text-red-600'
            : 'bg-gray-200 text-gray-500'
          }
        `}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">Attendance Status</p>
      </div>
      <div className={`
        inline-flex items-center px-4 py-2 rounded-lg font-semibold
        ${stats.currentAttendance.status === 'present' 
          ? 'bg-green-500 text-white'
          // : stats.currentAttendance.status === 'late'
          // ? 'bg-amber-500 text-white'
          // : stats.currentAttendance.status === 'half day'
          // ? 'bg-blue-500 text-white'
          : stats.currentAttendance.status === 'absent'
          ? 'bg-red-500 text-white'
          : 'bg-gray-500 text-white'
        }
      `}>
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          {stats.currentAttendance.status === 'present' ? (
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          ) : stats.currentAttendance.status === 'late' || stats.currentAttendance.status === 'absent' ? (
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          )}
        </svg>
        {stats.currentAttendance.status.replace('_', ' ').toUpperCase()}
      </div>
    </div>
  </div>

  {/* Real-time Status Banner */}
  {stats.currentAttendance.hasCheckedIn && !stats.currentAttendance.hasCheckedOut && (
    <div className="mt-8 p-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl text-white shadow-lg">
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-bold">Currently Working</h4>
          <p className="text-sm opacity-90">
            Checked in at {stats.currentAttendance.checkInTime && new Date(stats.currentAttendance.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            {stats.currentAttendance.lateMinutes > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full">
                {stats.currentAttendance.lateMinutes} min late
              </span>
            )}
          </p>
        </div>
        {stats.attendanceSettings && (
          <div className="text-right">
            <p className="text-sm opacity-90">You can check out from</p>
            <p className="font-bold text-lg">{stats.attendanceSettings.checkOutStart}</p>
          </div>
        )}
      </div>
    </div>
  )}
</div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <div className="mt-1 flex items-center">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                    <p className="text-sm text-green-600">{stat.change}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {performanceMetrics.map((metric) => (
            <div key={metric.name} className="text-center">
              <div className="relative inline-block">
                <svg className="w-20 h-20" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={metric.color.replace('bg-', '').split('-')[0] === 'green' ? '#10B981' : 
                           metric.color.replace('bg-', '').split('-')[0] === 'blue' ? '#3B82F6' :
                           metric.color.replace('bg-', '').split('-')[0] === 'purple' ? '#8B5CF6' : '#6366F1'}
                    strokeWidth="3"
                    strokeDasharray={`${metric.value}, 100`}
                  />
                  <text x="18" y="20.5" textAnchor="middle" className="text-sm font-bold fill-gray-900">
                    {metric.value}%
                  </text>
                </svg>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">{metric.name}</p>
              <p className="text-xs text-gray-500">Target: {metric.target}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts and Analytics Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Trend
            </h2>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span>Present</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                <span>Absent</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <AttendanceChart data={stats.attendanceTrend} />
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Department Distribution
          </h2>
          <div className="space-y-4">
            {stats.departmentDistribution.map((dept, index) => {
              const percentage = (dept.count / stats.totalEmployees) * 100;
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];
              return (
                <div key={`dept-${index}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full mr-2`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {dept.name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {dept.count} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[index % colors.length]} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activities and Upcoming Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activities
          </h2>
          <div className="space-y-4">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'success' ? 'bg-green-100' :
                    activity.type === 'warning' ? 'bg-yellow-100' :
                    activity.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <ArrowTrendingUpIcon className={`w-4 h-4 ${
                      activity.type === 'success' ? 'text-green-600' :
                      activity.type === 'warning' ? 'text-yellow-600' :
                      activity.type === 'error' ? 'text-red-600' : 'text-blue-600'
                    }`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Events
          </h2>
          <div className="space-y-4">
            {stats.upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    event.priority === 'high' ? 'bg-red-100' :
                    event.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <CalendarIcon className={`w-4 h-4 ${
                      event.priority === 'high' ? 'text-red-600' :
                      event.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {event.event}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString()} • {event.type}
                  </p>
                </div>
                <div className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  event.priority === 'high' ? 'bg-red-100 text-red-800' :
                  event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {event.priority.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      
      {/* Quick Stats and System Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Health
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Server Uptime</span>
              <span className="text-sm font-medium text-green-600">99.9%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="text-sm font-medium text-green-600">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Response</span>
              <span className="text-sm font-medium text-green-600">Fast</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="text-sm font-medium text-yellow-600">65% Used</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group">
              <UsersIcon className="w-8 h-8 mx-auto text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">Add Employee</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group">
              <UserGroupIcon className="w-8 h-8 mx-auto text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">Add HR</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group">
              <FolderIcon className="w-8 h-8 mx-auto text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">New Project</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors group">
              <ChartBarIcon className="w-8 h-8 mx-auto text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">View Reports</p>
            </button>
          </div>
        </div>
      </div>

      {/* Check-In Dialog */}
      <CheckInDialog
        isOpen={checkInDialogOpen}
        onClose={() => setCheckInDialogOpen(false)}
        onSubmit={handleCheckInSubmit}
        requiresGeo={requiresGeo}
      />
    </div>
  );
}

// Attendance Chart Component
function AttendanceChart({ data }: { data: DashboardStats['attendanceTrend'] }) {
  // If no data, show sample data for demonstration
  const chartData = data.length > 0 ? data : [
    { date: 'Mon', present: 85, absent: 15 },
    { date: 'Tue', present: 92, absent: 8 },
    { date: 'Wed', present: 78, absent: 22 },
    { date: 'Thu', present: 95, absent: 5 },
    { date: 'Fri', present: 88, absent: 12 },
    { date: 'Sat', present: 65, absent: 35 },
    { date: 'Sun', present: 70, absent: 30 },
  ];

  const maxValue = Math.max(...chartData.map(d => d.present + d.absent));

  return (
    <div className="h-64 flex items-end justify-around space-x-2">
      {chartData.map((day, index) => {
        const presentPercentage = (day.present / (day.present + day.absent)) * 100;
        const absentPercentage = (day.absent / (day.present + day.absent)) * 100;
        
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col justify-end h-48">
              <div
                className="w-full bg-green-500 rounded-t transition-all duration-500 hover:opacity-90 cursor-pointer"
                style={{ height: `${(day.present / maxValue) * 100}%` }}
                title={`Present: ${day.present}`}
              ></div>
              <div
                className="w-full bg-red-500 rounded-t transition-all duration-500 hover:opacity-90 cursor-pointer"
                style={{ height: `${(day.absent / maxValue) * 100}%` }}
                title={`Absent: ${day.absent}`}
              ></div>
            </div>
            <p className="mt-2 text-xs text-gray-600 font-medium">{day.date}</p>
            <p className="text-xs font-semibold text-gray-900">
              {presentPercentage.toFixed(0)}%
            </p>
            
          </div>
        );
      })}
    </div>
  );
}