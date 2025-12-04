// src/app/dashboard/settings/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  CogIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BellIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface SystemSettings {
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    logo: string;
    taxId: string;
  };
  attendance: {
    workHours: number;
    overtimeRate: number;
    autoCheckout: boolean;
    checkInStart: string;
    checkInEnd: string;
    checkOutStart: string;
    checkOutEnd: string;
  };
  leave: {
    sickLeave: number;
    casualLeave: number;
    earnedLeave: number;
    maternityLeave: number;
    paternityLeave: number;
    carryForward: boolean;
    maxCarryForward: number;
  };
  payroll: {
    currency: string;
    payday: number;
    taxPercentage: number;
    pfPercentage: number;
    bonusEligibility: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    leaveApproval: boolean;
    payrollProcessed: boolean;
    attendanceAlerts: boolean;
    systemUpdates: boolean;
  };
  security: {
    sessionTimeout: number;
    passwordExpiry: number;
    twoFactorAuth: boolean;
    loginAttempts: number;
    ipWhitelist: string[];
  };
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'company' | 'optional';
  description: string;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    company: {
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      logo: '',
      taxId: '',
    },
    attendance: {
      workHours: 8,
      overtimeRate: 1.5,
      autoCheckout: true,
      checkInStart: '08:00',
      checkInEnd: '10:00',
      checkOutStart: '17:00',
      checkOutEnd: '19:00',
    },
    leave: {
      sickLeave: 12,
      casualLeave: 8,
      earnedLeave: 21,
      maternityLeave: 180,
      paternityLeave: 15,
      carryForward: true,
      maxCarryForward: 30,
    },
    payroll: {
      currency: 'USD',
      payday: 25,
      taxPercentage: 15,
      pfPercentage: 12,
      bonusEligibility: 90,
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      leaveApproval: true,
      payrollProcessed: true,
      attendanceAlerts: true,
      systemUpdates: true,
    },
    security: {
      sessionTimeout: 60,
      passwordExpiry: 90,
      twoFactorAuth: false,
      loginAttempts: 5,
      ipWhitelist: [],
    },
  });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchHolidays();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/settings/holidays', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully');
        
        // Broadcast settings update so dashboard can refresh
        // This triggers a storage event that other tabs/windows can listen to
        const eventData = { timestamp: Date.now(), category: 'attendance' };
        localStorage.setItem('settings-updated', JSON.stringify(eventData));
        
        // Also dispatch a custom event for same-window listeners
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: { category: 'attendance' } }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (holiday: Omit<Holiday, 'id'>) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/settings/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(holiday),
      });

      if (response.ok) {
        fetchHolidays();
        setShowHolidayModal(false);
        alert('Holiday added successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add holiday');
      }
    } catch (error) {
      console.error('Failed to add holiday:', error);
      alert('Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/settings/holidays/${holidayId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchHolidays();
        alert('Holiday deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete holiday');
      }
    } catch (error) {
      console.error('Failed to delete holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  const tabs = [
    { id: 'company', name: 'Company', icon: BuildingOfficeIcon },
    { id: 'attendance', name: 'Attendance', icon: ClockIcon },
    { id: 'leave', name: 'Leave', icon: CalendarIcon },
    { id: 'payroll', name: 'Payroll', icon: DocumentTextIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Restricitions', icon: ShieldCheckIcon },
    { id: 'holidays', name: 'Holidays', icon: CalendarIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure system-wide settings and preferences
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <CogIcon className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {activeTab === 'company' && (
            <CompanySettings
              settings={settings.company}
              onChange={(company) => setSettings(prev => ({ ...prev, company }))}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceSettings
              settings={settings.attendance}
              onChange={(attendance) => setSettings(prev => ({ ...prev, attendance }))}
            />
          )}
          {activeTab === 'leave' && (
            <LeaveSettings
              settings={settings.leave}
              onChange={(leave) => setSettings(prev => ({ ...prev, leave }))}
            />
          )}
          {activeTab === 'payroll' && (
            <PayrollSettings
              settings={settings.payroll}
              onChange={(payroll) => setSettings(prev => ({ ...prev, payroll }))}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationSettings
              settings={settings.notifications}
              onChange={(notifications) => setSettings(prev => ({ ...prev, notifications }))}
            />
          )}
          {activeTab === 'security' && (
            <SecuritySettings
              settings={settings.security}
              onChange={(security) => setSettings(prev => ({ ...prev, security }))}
            />
          )}
          {activeTab === 'holidays' && (
            <HolidaySettings
              holidays={holidays}
              onAdd={() => setShowHolidayModal(true)}
              onEdit={setSelectedHoliday}
              onDelete={handleDeleteHoliday}
            />
          )}
        </div>
      </div>

      {/* Holiday Modal */}
      {showHolidayModal && (
        <HolidayModal
          holiday={null}
          onClose={() => setShowHolidayModal(false)}
          onSave={handleAddHoliday}
        />
      )}

      {selectedHoliday && (
        <HolidayModal
          holiday={selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
          onSave={handleAddHoliday}
        />
      )}
    </div>
  );
}

// Company Settings Component
function CompanySettings({ settings, onChange }: {
  settings: SystemSettings['company'];
  onChange: (company: SystemSettings['company']) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => onChange({ ...settings, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter company name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => onChange({ ...settings, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="company@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => onChange({ ...settings, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax ID
          </label>
          <input
            type="text"
            value={settings.taxId}
            onChange={(e) => onChange({ ...settings, taxId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Tax Identification Number"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <textarea
            rows={3}
            value={settings.address}
            onChange={(e) => onChange({ ...settings, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter company address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            value={settings.website}
            onChange={(e) => onChange({ ...settings, website: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Logo
          </label>
          <div className="flex items-center space-x-4">
            {settings.logo ? (
              <img src={settings.logo} alt="Company Logo" className="w-16 h-16 object-cover rounded" />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    onChange({ ...settings, logo: e.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="text-sm text-gray-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// app/admin/settings/page.tsx - Updated AttendanceSettings component
function AttendanceSettings({ settings, onChange }: {
  settings: SystemSettings['attendance'];
  onChange: (attendance: SystemSettings['attendance']) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateTimeWindow = (start: string, end: string, field: string) => {
    const startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);
    
    if (startTime >= endTime) {
      setErrors(prev => ({ ...prev, [field]: 'End time must be after start time' }));
      return false;
    } else {
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    }
  };

  const validateField = (field: string, value: any) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'workHours':
        if (value < 1 || value > 12) {
          newErrors.workHours = 'Work hours must be between 1 and 12';
        } else {
          delete newErrors.workHours;
        }
        break;
      
      case 'overtimeRate':
        if (value < 1 || value > 3) {
          newErrors.overtimeRate = 'Overtime rate must be between 1 and 3';
        } else {
          delete newErrors.overtimeRate;
        }
        break;
      
      
      
      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleFieldChange = (field: keyof SystemSettings['attendance'], value: any) => {
    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate the field
    validateField(field, value);
    
    // Update settings
    const newSettings = { ...settings, [field]: value };
    onChange(newSettings);
  };

  const handleTimeChange = (field: keyof SystemSettings['attendance'], value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const newSettings = { ...settings, [field]: value };
    
    // Validate time windows
    if (field === 'checkInStart' || field === 'checkInEnd') {
      validateTimeWindow(
        field === 'checkInStart' ? value : settings.checkInStart,
        field === 'checkInEnd' ? value : settings.checkInEnd,
        'checkInWindow'
      );
    }
    
    if (field === 'checkOutStart' || field === 'checkOutEnd') {
      validateTimeWindow(
        field === 'checkOutStart' ? value : settings.checkOutStart,
        field === 'checkOutEnd' ? value : settings.checkOutEnd,
        'checkOutWindow'
      );
    }

    onChange(newSettings);
  };

  const calculateWorkHours = () => {
    try {
      const checkInStart = new Date(`1970-01-01T${settings.checkInStart}`);
      const checkOutEnd = new Date(`1970-01-01T${settings.checkOutEnd}`);
      const diffMs = checkOutEnd.getTime() - checkInStart.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours.toFixed(1);
    } catch (error) {
      return '0.0';
    }
  };

  const hasErrors = Object.keys(errors).some(key => errors[key]);
  const allRequiredFieldsFilled = [
    settings.workHours,
    settings.overtimeRate,
    settings.checkInStart,
    settings.checkInEnd,
    settings.checkOutStart,
    settings.checkOutEnd
  ].every(field => field !== undefined && field !== null && field !== '');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Attendance Settings</h2>
      
      {/* Validation Status */}
      <div className={`p-4 rounded-lg border ${
        hasErrors 
          ? 'bg-red-50 border-red-200' 
          : allRequiredFieldsFilled 
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-medium ${
              hasErrors ? 'text-red-800' : allRequiredFieldsFilled ? 'text-green-800' : 'text-blue-800'
            }`}>
              {hasErrors ? 'Configuration Issues' : 
               allRequiredFieldsFilled ? 'All settings are valid' : 
               'Attendance Settings Status'}
            </h3>
            <p className={`text-sm ${
              hasErrors ? 'text-red-600' : allRequiredFieldsFilled ? 'text-green-600' : 'text-blue-600'
            }`}>
              {hasErrors ? 'Please fix the errors below before saving' : 
               allRequiredFieldsFilled ? 'Ready to save attendance settings' : 
               'Configure your attendance settings below'}
            </p>
          </div>
          {allRequiredFieldsFilled && !hasErrors && (
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
          )}
        </div>
      </div>

      {/* Work Hours Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Work Hours Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Configured Hours:</span>
            <span className="ml-2 font-medium">{settings.workHours}h/day</span>
          </div>
          <div>
            <span className="text-gray-600">Time Window:</span>
            <span className="ml-2 font-medium">{calculateWorkHours()}h</span>
          </div>
          <div>
            <span className="text-gray-600">Overtime Rate:</span>
            <span className="ml-2 font-medium">{settings.overtimeRate}x</span>
          </div>
          {/* Grace period removed from UI and calculations */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Work Hours *
          </label>
          <input
            type="number"
            min="1"
            max="12"
            step="0.5"
            value={settings.workHours}
            onChange={(e) => handleFieldChange('workHours', parseFloat(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.workHours ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.workHours && (
            <p className="mt-1 text-xs text-red-600">{errors.workHours}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Standard working hours per day</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overtime Rate (Multiplier) *
          </label>
          <input
            type="number"
            min="1"
            max="3"
            step="0.1"
            value={settings.overtimeRate}
            onChange={(e) => handleFieldChange('overtimeRate', parseFloat(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.overtimeRate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.overtimeRate && (
            <p className="mt-1 text-xs text-red-600">{errors.overtimeRate}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Multiplier for overtime pay calculation</p>
        </div>
        
        {/* Grace Period removed */}
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.autoCheckout}
            onChange={(e) => handleFieldChange('autoCheckout', e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Auto Check-out at End of Day
          </label>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Check-in/out Time Windows</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check-in Start *
            </label>
            <input
              type="time"
              value={settings.checkInStart}
              onChange={(e) => handleTimeChange('checkInStart', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.checkInWindow ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.checkInWindow && (
              <p className="mt-1 text-xs text-red-600">{errors.checkInWindow}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check-in End *
            </label>
            <input
              type="time"
              value={settings.checkInEnd}
              onChange={(e) => handleTimeChange('checkInEnd', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check-out Start *
            </label>
            <input
              type="time"
              value={settings.checkOutStart}
              onChange={(e) => handleTimeChange('checkOutStart', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.checkOutWindow ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.checkOutWindow && (
              <p className="mt-1 text-xs text-red-600">{errors.checkOutWindow}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check-out End *
            </label>
            <input
              type="time"
              value={settings.checkOutEnd}
              onChange={(e) => handleTimeChange('checkOutEnd', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Time Window Validation Summary */}
        {(errors.checkInWindow || errors.checkOutWindow) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-1">Time Window Issues</h4>
            <ul className="text-sm text-red-600 space-y-1">
              {errors.checkInWindow && <li>• Check-in: {errors.checkInWindow}</li>}
              {errors.checkOutWindow && <li>• Check-out: {errors.checkOutWindow}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Leave Settings Component
function LeaveSettings({ settings, onChange }: {
  settings: SystemSettings['leave'];
  onChange: (leave: SystemSettings['leave']) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Leave Policy</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sick Leave (Days/Year)
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={settings.sickLeave}
            onChange={(e) => onChange({ ...settings, sickLeave: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Casual Leave (Days/Year)
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={settings.casualLeave}
            onChange={(e) => onChange({ ...settings, casualLeave: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Earned Leave (Days/Year)
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={settings.earnedLeave}
            onChange={(e) => onChange({ ...settings, earnedLeave: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maternity Leave (Days)
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={settings.maternityLeave}
            onChange={(e) => onChange({ ...settings, maternityLeave: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paternity Leave (Days)
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={settings.paternityLeave}
            onChange={(e) => onChange({ ...settings, paternityLeave: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Leave Carry Forward</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.carryForward}
              onChange={(e) => onChange({ ...settings, carryForward: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Allow Leave Carry Forward
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Carry Forward (Days)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={settings.maxCarryForward}
              onChange={(e) => onChange({ ...settings, maxCarryForward: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Payroll Settings Component
function PayrollSettings({ settings, onChange }: {
  settings: SystemSettings['payroll'];
  onChange: (payroll: SystemSettings['payroll']) => void;
}) {
  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Payroll Settings</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            value={settings.currency}
            onChange={(e) => onChange({ ...settings, currency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payday (Day of Month)
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={settings.payday}
            onChange={(e) => onChange({ ...settings, payday: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax Percentage (%)
          </label>
          <input
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={settings.taxPercentage}
            onChange={(e) => onChange({ ...settings, taxPercentage: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provident Fund (%)
          </label>
          <input
            type="number"
            min="0"
            max="20"
            step="0.1"
            value={settings.pfPercentage}
            onChange={(e) => onChange({ ...settings, pfPercentage: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bonus Eligibility (% Attendance)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={settings.bonusEligibility}
            onChange={(e) => onChange({ ...settings, bonusEligibility: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

// Notification Settings Component
function NotificationSettings({ settings, onChange }: {
  settings: SystemSettings['notifications'];
  onChange: (notifications: SystemSettings['notifications']) => void;
}) {
  const toggleSetting = (key: keyof SystemSettings['notifications']) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Notifications
            </label>
            <p className="text-sm text-gray-500">
              Receive system notifications via email
            </p>
          </div>
          <button
            onClick={() => toggleSetting('emailNotifications')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.emailNotifications ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Push Notifications
            </label>
            <p className="text-sm text-gray-500">
              Receive real-time browser notifications
            </p>
          </div>
          <button
            onClick={() => toggleSetting('pushNotifications')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.pushNotifications ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.pushNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Leave Approval Notifications
            </label>
            <p className="text-sm text-gray-500">
              Notify when leave requests need approval
            </p>
          </div>
          <button
            onClick={() => toggleSetting('leaveApproval')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.leaveApproval ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.leaveApproval ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payroll Processed Notifications
            </label>
            <p className="text-sm text-gray-500">
              Notify when payroll processing is complete
            </p>
          </div>
          <button
            onClick={() => toggleSetting('payrollProcessed')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.payrollProcessed ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.payrollProcessed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Attendance Alerts
            </label>
            <p className="text-sm text-gray-500">
              Alert for unusual attendance patterns
            </p>
          </div>
          <button
            onClick={() => toggleSetting('attendanceAlerts')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.attendanceAlerts ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.attendanceAlerts ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              System Updates
            </label>
            <p className="text-sm text-gray-500">
              Notify about system maintenance and updates
            </p>
          </div>
          <button
            onClick={() => toggleSetting('systemUpdates')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.systemUpdates ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.systemUpdates ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// Updated SecuritySettings component
function SecuritySettings({ settings, onChange }: {
  settings: SystemSettings['security'];
  onChange: (security: SystemSettings['security']) => void;
}) {
  const [ipTitle, setIpTitle] = useState('');
  const [ipInput, setIpInput] = useState('');
  const [geoTitle, setGeoTitle] = useState('');
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [geoRadius, setGeoRadius] = useState('500');
  
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string; employeeId: string }>>([]);
  const [ipRestrictions, setIpRestrictions] = useState<any[]>([]);
  const [geoRestrictions, setGeoRestrictions] = useState<any[]>([]);
  const [employeeAssignments, setEmployeeAssignments] = useState<any[]>([]);

  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignType, setAssignType] = useState<'IP' | 'GEO'>('IP');
  const [assignRestrictionId, setAssignRestrictionId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuxData();
  }, []);

  const fetchAuxData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const [empRes, ipRes, geoRes, assignRes] = await Promise.all([
        fetch('/api/admin/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/security/ip-restrictions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/security/geo-restrictions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/security/assignments', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees || []);
      }
      if (ipRes.ok) {
        const data = await ipRes.json();
        setIpRestrictions(data.restrictions || []);
      }
      if (geoRes.ok) {
        const data = await geoRes.json();
        setGeoRestrictions(data.restrictions || []);
      }
      if (assignRes.ok) {
        const data = await assignRes.json();
        setEmployeeAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Failed to load security data', err);
      alert('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const createIpRestriction = async () => {
    const ips = ipInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!ipTitle || ips.length === 0) {
      alert('Please provide a title and at least one IP address');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/security/ip-restrictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: ipTitle, ips }),
      });

      if (response.ok) {
        alert('IP restriction created successfully');
        setIpTitle('');
        setIpInput('');
        fetchAuxData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create IP restriction');
      }
    } catch (error) {
      console.error('Failed to create IP restriction:', error);
      alert('Failed to create IP restriction');
    } finally {
      setLoading(false);
    }
  };

  const createGeoRestriction = async () => {
    const lat = parseFloat(geoLat);
    const lng = parseFloat(geoLng);
    const radius = parseInt(geoRadius);

    if (!geoTitle || isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      alert('Please provide valid geo details');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/security/geo-restrictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: geoTitle,
          latitude: lat,
          longitude: lng,
          radius_meters: radius,
        }),
      });

      if (response.ok) {
        alert('Geo restriction created successfully');
        setGeoTitle('');
        setGeoLat('');
        setGeoLng('');
        setGeoRadius('500');
        fetchAuxData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create geo restriction');
      }
    } catch (error) {
      console.error('Failed to create geo restriction:', error);
      alert('Failed to create geo restriction');
    } finally {
      setLoading(false);
    }
  };

  const deleteIpRestriction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this IP restriction?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/security/ip-restrictions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('IP restriction deleted successfully');
        fetchAuxData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete IP restriction');
      }
    } catch (error) {
      console.error('Failed to delete IP restriction:', error);
      alert('Failed to delete IP restriction');
    } finally {
      setLoading(false);
    }
  };

  const deleteGeoRestriction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this geo restriction?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/security/geo-restrictions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Geo restriction deleted successfully');
        fetchAuxData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete geo restriction');
      }
    } catch (error) {
      console.error('Failed to delete geo restriction:', error);
      alert('Failed to delete geo restriction');
    } finally {
      setLoading(false);
    }
  };

  const assignRestriction = async () => {
    if (!assignEmployeeId || !assignRestrictionId) {
      alert('Please select both employee and restriction');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/security/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_id: assignEmployeeId,
          restriction_type: assignType,
          restriction_id: assignRestrictionId,
        }),
      });

      if (response.ok) {
        alert('Restriction assigned to employee successfully');
        setAssignEmployeeId('');
        setAssignRestrictionId('');
        fetchAuxData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign restriction');
      }
    } catch (error) {
      console.error('Failed to assign restriction:', error);
      alert('Failed to assign restriction');
    } finally {
      setLoading(false);
    }
  };

  const unassignRestriction = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this restriction assignment?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/security/assign/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Restriction assignment removed successfully');
        fetchAuxData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove assignment');
      }
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeId})` : 'Unknown Employee';
  };

  const getRestrictionDetails = (assignment: any) => {
    if (assignment.restriction_type === 'IP') {
      const restriction = ipRestrictions.find(r => r.id === assignment.restriction_id);
      return restriction ? `${restriction.title} (${restriction.allowed_ips?.length || 0} IPs)` : 'Unknown IP Restriction';
    } else {
      const restriction = geoRestrictions.find(r => r.id === assignment.restriction_id);
      return restriction ? `${restriction.title} (${restriction.latitude}, ${restriction.longitude})` : 'Unknown Geo Restriction';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">IP & Geo Restriction Management</h2>

      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Create IP Restriction */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create IP Restriction</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={ipTitle}
                onChange={(e) => setIpTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Office Network"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed IPs/CIDR *
              </label>
              <textarea
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="192.168.1.100&#10;10.0.0.0/24&#10;172.16.1.50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter one IP or CIDR range per line, or separate with commas
              </p>
            </div>
            <button
              onClick={createIpRestriction}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Create IP Restriction
            </button>
          </div>
        </div>

        {/* Create Geo Restriction */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Geo Restriction</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={geoTitle}
                onChange={(e) => setGeoTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Main Office Location"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={geoLat}
                  onChange={(e) => setGeoLat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="40.7128"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={geoLng}
                  onChange={(e) => setGeoLng(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="-74.0060"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Radius (meters) *
              </label>
              <input
                type="number"
                value={geoRadius}
                onChange={(e) => setGeoRadius(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="500"
              />
            </div>
            <button
              onClick={createGeoRestriction}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Create Geo Restriction
            </button>
          </div>
        </div>
      </div>

      {/* Assign Restriction to Employee */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Restriction to Employee</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee *
            </label>
            <select
              value={assignEmployeeId}
              onChange={(e) => setAssignEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restriction Type *
            </label>
            <select
              value={assignType}
              onChange={(e) => {
                setAssignType(e.target.value as 'IP' | 'GEO');
                setAssignRestrictionId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="IP">IP Restriction</option>
              <option value="GEO">Geo Restriction</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Restrictions *
            </label>
            <select
              value={assignRestrictionId}
              onChange={(e) => setAssignRestrictionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Restriction</option>
              {assignType === 'IP' && ipRestrictions.map(restriction => (
                <option key={restriction.id} value={restriction.id}>
                  {restriction.title} ({restriction.allowed_ips?.length || 0} IPs)
                </option>
              ))}
              {assignType === 'GEO' && geoRestrictions.map(restriction => (
                <option key={restriction.id} value={restriction.id}>
                  {restriction.title} ({restriction.latitude}, {restriction.longitude})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={assignRestriction}
            disabled={loading || !assignEmployeeId || !assignRestrictionId}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Assign Restriction
          </button>
        </div>
      </div>

      {/* Existing Restrictions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* IP Restrictions List */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">IP Restrictions</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {ipRestrictions.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">
                No IP restrictions created
              </div>
            ) : (
              ipRestrictions.map(restriction => (
                <div key={restriction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{restriction.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {restriction.allowed_ips?.join(', ') || 'No IPs configured'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {new Date(restriction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteIpRestriction(restriction.id)}
                      disabled={loading}
                      className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Geo Restrictions List */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Geo Restrictions</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {geoRestrictions.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">
                No geo restrictions created
              </div>
            ) : (
              geoRestrictions.map(restriction => (
                <div key={restriction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{restriction.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Lat: {restriction.latitude}, Lng: {restriction.longitude}
                      </p>
                      <p className="text-sm text-gray-500">
                        Radius: {restriction.radius_meters} meters
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {new Date(restriction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteGeoRestriction(restriction.id)}
                      disabled={loading}
                      className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Employee Assignments */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Employee Assignments</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {employeeAssignments.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500">
              No restrictions assigned to employees
            </div>
          ) : (
            employeeAssignments.map(assignment => (
              <div key={assignment.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {getEmployeeName(assignment.employee_id)}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {assignment.restriction_type} Restriction: {getRestrictionDetails(assignment)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Assigned: {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => unassignRestriction(assignment.id)}
                    disabled={loading}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Holiday Settings Component
function HolidaySettings({ holidays, onAdd, onEdit, onDelete }: {
  holidays: Holiday[];
  onAdd: () => void;
  onEdit: (holiday: Holiday) => void;
  onDelete: (id: string) => void;
}) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'national':
        return 'bg-red-100 text-red-800';
      case 'company':
        return 'bg-blue-100 text-blue-800';
      case 'optional':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Holiday Calendar</h2>
        <button
          onClick={onAdd}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          <CalendarIcon className="w-5 h-5 mr-2" />
          Add Holiday
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Holiday Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {holidays.map((holiday) => (
              <tr key={holiday.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {holiday.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(holiday.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(holiday.type)}`}>
                    {holiday.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {holiday.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(holiday)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(holiday.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {holidays.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No holidays configured
            </h3>
            <p className="text-gray-600">
              Add holidays to create your company holiday calendar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Holiday Modal Component
function HolidayModal({ holiday, onClose, onSave }: {
  holiday: Holiday | null;
  onClose: () => void;
  onSave: (holiday: Omit<Holiday, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: holiday?.name || '',
    date: holiday?.date || new Date().toISOString().split('T')[0],
    type: holiday?.type || 'national',
    description: holiday?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {holiday ? 'Edit Holiday' : 'Add Holiday'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Holiday Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., New Year's Day"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="national">National Holiday</option>
              <option value="company">Company Holiday</option>
              <option value="optional">Optional Holiday</option>
            </select>
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
              placeholder="Optional description..."
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
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {holiday ? 'Update Holiday' : 'Add Holiday'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}