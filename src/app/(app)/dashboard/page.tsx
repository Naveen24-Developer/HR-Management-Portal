//app/admin/dashboard/page.tsx
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
    status: 'present' | 'absent' | 'late' | 'half_day' | 'not_checked_in';
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
      status: 'not_checked_in',
      lateMinutes: 0,
      earlyCheckout: false,
      currentWorkHours: 0,
    },
    attendanceSettings: {
      workHours: 8,
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
        fetchAttendanceSettings();
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchDashboardStats();
    fetchCurrentAttendance();
    fetchAttendanceSettings();
    fetchAttendanceRecords();
    checkEmployeeRestrictions();
  }, [timeRange]);

// In your dashboard component, update the checkEmployeeRestrictions function:
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
      console.log('Employee restrictions:', data);
    } else {
      console.error('Failed to check restrictions:', response.status);
    }
  } catch (error) {
    console.error('Failed to check restrictions:', error);
  }
};

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/auth/me', {
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
        setStats(prev => ({ 
          ...prev, 
          attendanceSettings: data.settings 
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
      return { status: 'early' as const, lateMinutes: earlyMinutes, earlyMinutes };
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
    // Ensure we have the latest restriction info before opening the dialog
    try {
      await checkEmployeeRestrictions();
    } catch (e) {
      console.error('Failed to refresh restrictions before check-in:', e);
    }
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

      // Parse response body safely (some responses may be empty or non-JSON)
      let result: any = null;
      try {
        // Clone not available for Response from fetch; parse directly
        result = await response.json();
      } catch (parseErr) {
        // ignore parse errors; result stays null
        result = null;
      }

      if (response.ok) {
        // Update UI state first
        await fetchCurrentAttendance();
        await fetchDashboardStats();

        const message = result?.message || 'Checked in successfully';
        const attendanceStatus = result?.attendance?.status;

        // Add to recent activities
        setStats(prev => ({
          ...prev,
          recentActivities: [
            {
              id: Date.now().toString(),
              action: message,
              user: `${currentUser?.firstName} ${currentUser?.lastName}`,
              time: 'Just now',
              type: attendanceStatus === 'late' ? 'warning' : 'success',
            },
            ...prev.recentActivities.slice(0, 4),
          ],
        }));
      } else {
        // Ensure we throw a consistent, informative error object
        const errorData = result || { error: response.statusText || 'Failed to check in', code: 'UNKNOWN' };
        const code = errorData.code || errorData.error || 'UNKNOWN';
        const message = errorData.error || errorData.message || response.statusText || 'Failed to check in';
        const debug = errorData.debug;

        // Optionally format for UI (not used here directly)
        const errorAlert = formatErrorAlert(errorData);

        // Throw a plain object with predictable shape for CheckInDialog
        throw {
          code,
          message,
          response: { data: errorData },
          debug,
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
    } catch (error) {
      console.error('Failed to check out:', error);
      alert('Failed to check out');
    } finally {
      setCheckOutLoading(false);
    }
  };

  const canCheckIn = () => {
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
    if (!stats.currentAttendance.hasCheckedIn) return false;
    
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back, {currentUser?.firstName}! Here's an overview of your organization.
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

      {/* Quick Attendance Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Today's Attendance</h2>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Check-in: {stats.attendanceSettings.checkInStart} - {stats.attendanceSettings.checkInEnd} • 
              Check-out: {stats.attendanceSettings.checkOutStart} - {stats.attendanceSettings.checkOutEnd}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {!stats.currentAttendance.hasCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={checkInLoading}
                className={`flex items-center px-6 py-3 rounded-lg transition-colors ${
                  checkInLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:opacity-50`}
              >
                <PlayIcon className="w-5 h-5 mr-2" />
                {checkInLoading ? 'Checking In...' : 'Check In'}
              </button>
            ) : !stats.currentAttendance.hasCheckedOut ? (
              <button
                onClick={handleCheckOut}
                disabled={checkOutLoading || !stats.currentAttendance.hasCheckedIn}
                className={`flex items-center px-6 py-3 rounded-lg transition-colors ${
                  checkOutLoading || !stats.currentAttendance.hasCheckedIn
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                } disabled:opacity-50`}
              >
                <StopIcon className="w-5 h-5 mr-2" />
                {checkOutLoading ? 'Checking Out...' : 'Check Out'}
              </button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600">Today's attendance completed</p>
                <p className="text-lg font-semibold text-gray-900">
                  Worked: {stats.currentAttendance.workHours.toFixed(1)} hours
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Status Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Check In</p>
            <p className="text-lg font-semibold text-gray-900">
              {stats.currentAttendance.checkInTime 
                ? new Date(stats.currentAttendance.checkInTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : '--:--'
              }
            </p>
            {stats.currentAttendance.lateMinutes > 0 && (
              <p className="text-sm text-yellow-600">
                {stats.currentAttendance.lateMinutes} minutes late
              </p>
            )}
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Check Out</p>
            <p className="text-lg font-semibold text-gray-900">
              {stats.currentAttendance.checkOutTime 
                ? new Date(stats.currentAttendance.checkOutTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : '--:--'
              }
            </p>
            {stats.currentAttendance.earlyCheckout && (
              <p className="text-sm text-orange-600">Early checkout</p>
            )}
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Work Hours</p>
            <p className="text-lg font-semibold text-gray-900">
              {calculateCurrentWorkHours().toFixed(1)}h
            </p>
            <p className="text-xs text-gray-500">
              Required: {stats.attendanceSettings.workHours}h
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Status</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              stats.currentAttendance.status === 'present' 
                ? 'bg-green-100 text-green-800'
                : stats.currentAttendance.status === 'late'
                ? 'bg-yellow-100 text-yellow-800'
                : stats.currentAttendance.status === 'half_day'
                ? 'bg-blue-100 text-blue-800'
                : stats.currentAttendance.status === 'absent'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {stats.currentAttendance.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Check-in/out Instructions (informational only; employees may check in/out anytime)
            Calculations (late/early/overtime) are based on the windows shown below. */}
        {!stats.currentAttendance.hasCheckedIn && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Check-in Window:</strong> {stats.attendanceSettings.checkInStart} - {stats.attendanceSettings.checkInEnd}
            </p>
          </div>
        )}

        {stats.currentAttendance.hasCheckedIn && !stats.currentAttendance.hasCheckedOut && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Checked in at:</strong> {stats.currentAttendance.checkInTime && new Date(stats.currentAttendance.checkInTime).toLocaleTimeString()}
              {stats.currentAttendance.lateMinutes > 0 && (
                <span className="ml-2 text-yellow-600">
                  • {stats.currentAttendance.lateMinutes} minutes late
                </span>
              )}
              <br />
              <strong>Check-out Window:</strong> {stats.attendanceSettings.checkOutStart} - {stats.attendanceSettings.checkOutEnd}
            </p>
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

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Attendance Records
          </h2>
          <p className="text-xs text-gray-500">
            Check-in: {stats.attendanceSettings.checkInStart} - {stats.attendanceSettings.checkInEnd} | 
            Check-out: {stats.attendanceSettings.checkOutStart} - {stats.attendanceSettings.checkOutEnd}
          </p>
        </div>
        
        {attendanceLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading attendance records...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No attendance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Hours
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.map((record) => {
                  const statusColor =
                    record.status.includes('Late') ? 'bg-red-100 text-red-800' :
                    record.status.includes('Early') ? 'bg-yellow-100 text-yellow-800' :
                    record.status.includes('Overtime') ? 'bg-blue-100 text-blue-800' :
                    record.status === 'On Time' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

                  return (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.departmentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {parseFloat(record.workHours).toFixed(1)} hrs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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