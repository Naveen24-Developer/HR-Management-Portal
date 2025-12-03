// src/app/dashboard/communication/page.tsx
'use client';
import { useState } from 'react';
import {
  PlusIcon,
  MegaphoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'urgent' | 'event';
  target: 'all' | 'department' | 'role';
  targetValue: string;
  scheduledFor: string;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: string;
  createdBy: string;
}

export default function Communication() {
  const [activeTab, setActiveTab] = useState('announcements');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      title: 'Company Holiday Schedule',
      message: 'Please find the updated holiday schedule for the upcoming year attached.',
      type: 'general',
      target: 'all',
      targetValue: 'All Employees',
      scheduledFor: new Date().toISOString(),
      status: 'sent',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      createdBy: 'Admin User',
    },
    {
      id: '2',
      title: 'System Maintenance',
      message: 'HR system will be unavailable this Saturday from 2-4 AM for maintenance.',
      type: 'urgent',
      target: 'all',
      targetValue: 'All Employees',
      scheduledFor: new Date(Date.now() + 86400000).toISOString(),
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      createdBy: 'Admin User',
    },
  ]);

  const tabs = [
    { id: 'announcements', name: 'Announcements', icon: MegaphoneIcon },
    { id: 'messages', name: 'Messages', icon: EnvelopeIcon },
    { id: 'notifications', name: 'Notifications', icon: ChatBubbleLeftRightIcon },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'event':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication</h1>
          <p className="mt-2 text-sm text-gray-600">Manage announcements and notifications</p>
        </div>
        <button
          onClick={() => setShowAnnouncementModal(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Announcement
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
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

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
                <MegaphoneIcon className="w-8 h-8 text-indigo-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <CalendarIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">2</p>
                </div>
                <EnvelopeIcon className="w-8 h-8 text-gray-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold text-gray-900">78%</p>
                </div>
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Announcements List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Announcements</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{announcement.title}</h4>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(announcement.type)}`}
                        >
                          {announcement.type.toUpperCase()}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(announcement.status)}`}
                        >
                          {announcement.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{announcement.message}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <UserGroupIcon className="w-4 h-4 mr-1" />
                          <span>To: {announcement.targetValue}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          <span>
                            {announcement.status === 'scheduled' 
                              ? `Scheduled for ${new Date(announcement.scheduledFor).toLocaleString()}`
                              : `Sent on ${new Date(announcement.createdAt).toLocaleString()}`
                            }
                          </span>
                        </div>
                        <span>By: {announcement.createdBy}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Messages</h3>
          <div className="text-center py-12">
            <EnvelopeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Bulk Messaging</h4>
            <p className="text-gray-600 mb-4">
              Send personalized messages to employees or groups
            </p>
            <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              Compose Message
            </button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Email Notifications</h4>
              <div className="space-y-3">
                {[
                  'New employee registrations',
                  'Leave request approvals',
                  'Payroll processing',
                  'System maintenance',
                  'Security alerts',
                ].map((notification) => (
                  <label key={notification} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{notification}</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Push Notifications</h4>
              <div className="space-y-3">
                {[
                  'Urgent announcements',
                  'Approval requests',
                  'Deadline reminders',
                ].map((notification) => (
                  <label key={notification} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{notification}</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Announcement</h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter announcement title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter announcement message"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">All Employees</option>
                    <option value="department">Specific Department</option>
                    <option value="role">Specific Role</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="schedule"
                      value="now"
                      defaultChecked
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Send Now</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="schedule"
                      value="later"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Schedule for Later</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Create Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}