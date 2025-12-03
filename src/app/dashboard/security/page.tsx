// src/app/dashboard/security/page.tsx
'use client';
import { useState } from 'react';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface SecurityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ipAddress: string;
  status: 'success' | 'failed';
  details: string;
}

export default function Security() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPassword, setShowPassword] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
    },
    twoFactorAuth: {
      enabled: true,
      requiredForAdmins: true,
    },
    sessionSettings: {
      timeout: 30,
      maxSessions: 3,
    },
    ipRestrictions: {
      enabled: false,
      allowedIPs: [] as string[],
    },
  });

  const securityLogs: SecurityLog[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      user: 'admin@company.com',
      action: 'Login',
      ipAddress: '192.168.1.100',
      status: 'success',
      details: 'Successful login from office network',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      user: 'hr@company.com',
      action: 'Failed Login',
      ipAddress: '103.45.67.89',
      status: 'failed',
      details: '3 failed login attempts from unknown IP',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      user: 'admin@company.com',
      action: 'Password Change',
      ipAddress: '192.168.1.100',
      status: 'success',
      details: 'Password updated successfully',
    },
  ];

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'password', name: 'Password Policy' },
    { id: '2fa', name: 'Two-Factor Auth' },
    { id: 'sessions', name: 'Sessions' },
    { id: 'logs', name: 'Security Logs' },
  ];

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security</h1>
        <p className="mt-2 text-sm text-gray-600">Manage security settings and monitor activities</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Security Score */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Security Score</h3>
                <p className="text-sm text-gray-600 mt-1">Overall system security assessment</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">85%</div>
                <div className="text-sm text-gray-600">Good</div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>

          {/* Security Recommendations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-4">
              {[
                {
                  title: 'Enable IP Restrictions',
                  description: 'Restrict access to specific IP addresses for enhanced security',
                  priority: 'high',
                },
                {
                  title: 'Review Failed Login Attempts',
                  description: 'Multiple failed login attempts detected from unknown IPs',
                  priority: 'medium',
                },
                {
                  title: 'Update Password Policy',
                  description: 'Consider increasing minimum password length to 12 characters',
                  priority: 'low',
                },
              ].map((rec, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                  <ExclamationTriangleIcon
                    className={`w-5 h-5 mt-0.5 ${
                      rec.priority === 'high' ? 'text-red-500' :
                      rec.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`}
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  </div>
                  <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Implement
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow">
              <ShieldCheckIcon className="w-8 h-8 text-indigo-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Policy</h3>
              <p className="text-sm text-gray-600">Configure password requirements and expiration</p>
            </button>
            <button 
              onClick={() => setActiveTab('2fa')}
              className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
            >
              <LockClosedIcon className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Two-Factor Auth</h3>
              <p className="text-sm text-gray-600">Enable additional security layer for logins</p>
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
            >
              <DocumentTextIcon className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Logs</h3>
              <p className="text-sm text-gray-600">Monitor system access and security events</p>
            </button>
          </div>
        </div>
      )}

      {/* Password Policy Tab */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Password Policy</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Password Length
              </label>
              <input
                type="number"
                value={securitySettings.passwordPolicy.minLength}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  passwordPolicy: { ...prev.passwordPolicy, minLength: Number(e.target.value) }
                }))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Password Requirements</h4>
              {[
                { key: 'requireUppercase', label: 'Require uppercase letters' },
                { key: 'requireLowercase', label: 'Require lowercase letters' },
                { key: 'requireNumbers', label: 'Require numbers' },
                { key: 'requireSpecialChars', label: 'Require special characters' },
              ].map((req) => (
                <label key={req.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordPolicy[req.key as keyof typeof securitySettings.passwordPolicy] as boolean}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      passwordPolicy: { ...prev.passwordPolicy, [req.key]: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{req.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Expiry (days)
              </label>
              <input
                type="number"
                value={securitySettings.passwordPolicy.expiryDays}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  passwordPolicy: { ...prev.passwordPolicy, expiryDays: Number(e.target.value) }
                }))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Save Password Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Auth Tab */}
      {activeTab === '2fa' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Two-Factor Authentication</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Enable 2FA</h4>
                <p className="text-sm text-gray-600 mt-1">Require two-factor authentication for all users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.twoFactorAuth.enabled}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    twoFactorAuth: { ...prev.twoFactorAuth, enabled: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Require 2FA for Admins</h4>
                <p className="text-sm text-gray-600 mt-1">Mandatory two-factor authentication for admin accounts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.twoFactorAuth.requiredForAdmins}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    twoFactorAuth: { ...prev.twoFactorAuth, requiredForAdmins: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">2FA Setup Instructions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Users will need to install an authenticator app (Google Authenticator, Authy)</li>
                <li>• QR codes will be generated for each user during setup</li>
                <li>• Backup codes will be provided for recovery</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Save 2FA Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Security Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {securityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}