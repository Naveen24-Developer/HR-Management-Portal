// src/app/dashboard/reports/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  TableCellsIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  
} from '@heroicons/react/24/outline';

interface ReportData {
  id: string;
  type: string;
  title: string;
  description: string;
  data: any;
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface ReportStats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  activeProjects: number;
  monthlyExpenses: number;
}

export default function ReportsAnalytics() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    activeProjects: 0,
    monthlyExpenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string>('attendance');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [view, setView] = useState<'charts' | 'tables'>('charts');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReportStats();
    fetchSampleReports();
  }, []);

  const fetchReportStats = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/reports/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch report stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleReports = async () => {
    // In a real app, this would fetch from the API
    const sampleReports: ReportData[] = [
      {
        id: '1',
        type: 'attendance',
        title: 'Monthly Attendance Report',
        description: 'Detailed attendance analysis for the current month',
        data: { /* sample data */ },
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
      },
      {
        id: '2',
        type: 'leave',
        title: 'Leave Utilization Report',
        description: 'Analysis of leave patterns and balances',
        data: { /* sample data */ },
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
      },
    ];
    setReports(sampleReports);
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        type: selectedReport,
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...(departmentFilter && { department: departmentFilter }),
      });

      const response = await fetch(`/api/admin/reports/generate?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(prev => [data.report, ...prev]);
        alert('Report generated successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = async (reportId: string, format: 'pdf' | 'excel' | 'csv') => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/reports/${reportId}/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export report');
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report');
    }
  };

  const reportTypes = [
    { id: 'attendance', name: 'Attendance Report', icon: ChartBarIcon },
    { id: 'leave', name: 'Leave Analysis', icon: CalendarIcon },
    { id: 'employee', name: 'Employee Summary', icon: TableCellsIcon },
    { id: 'payroll', name: 'Payroll Summary', icon: DocumentArrowDownIcon },
    { id: 'project', name: 'Project Progress', icon: ChartBarIcon },
    { id: 'department', name: 'Department Analysis', icon: TableCellsIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generate and analyze comprehensive reports
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setView('charts')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === 'charts'
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline mr-2" />
            Charts
          </button>
          <button
            onClick={() => setView('tables')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === 'tables'
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TableCellsIcon className="w-5 h-5 inline mr-2" />
            Tables
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.totalEmployees}</div>
          <div className="text-sm text-gray-600">Total Employees</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.activeEmployees}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.presentToday}</div>
          <div className="text-sm text-gray-600">Present Today</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingLeaves}</div>
          <div className="text-sm text-gray-600">Pending Leaves</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.activeProjects}</div>
          <div className="text-sm text-gray-600">Active Projects</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            ${(stats.monthlyExpenses / 1000).toFixed(0)}K
          </div>
          <div className="text-sm text-gray-600">Monthly Expenses</div>
        </div>
      </div>

      {/* Report Generator */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              {reportTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="sales">Sales</option>
              <option value="marketing">Marketing</option>
              <option value="hr">HR</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <ChartBarIcon className="w-5 h-5 mr-2" />
            {generating ? 'Generating Report...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Content */}
      {view === 'charts' ? (
        <ChartsView 
          selectedReport={selectedReport}
          dateRange={dateRange}
          departmentFilter={departmentFilter}
        />
      ) : (
        <TablesView 
          selectedReport={selectedReport}
          dateRange={dateRange}
          departmentFilter={departmentFilter}
        />
      )}

      {/* Generated Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Generated Reports</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {reports.map((report) => (
            <div key={report.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {new Date(report.dateRange.start).toLocaleDateString()} - {new Date(report.dateRange.end).toLocaleDateString()}
                    <span className="mx-2">•</span>
                    Generated {new Date(report.generatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportReport(report.id, 'pdf')}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Export as PDF"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => exportReport(report.id, 'excel')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="Export as Excel"
                  >
                    <TableCellsIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => exportReport(report.id, 'csv')}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Export as CSV"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-12">
              <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reports generated yet
              </h3>
              <p className="text-gray-600">
                Generate your first report using the form above
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Charts View Component
function ChartsView({ selectedReport, dateRange, departmentFilter }: {
  selectedReport: string;
  dateRange: { start: string; end: string };
  departmentFilter: string;
}) {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    // Simulate fetching chart data based on report type
    const fetchChartData = async () => {
      // In a real app, this would be an API call
      const data = getChartData(selectedReport);
      setChartData(data);
    };

    fetchChartData();
  }, [selectedReport, dateRange, departmentFilter]);

  const getChartData = (reportType: string) => {
    switch (reportType) {
      case 'attendance':
        return {
          type: 'bar',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
              {
                label: 'Present',
                data: [85, 92, 78, 95, 88, 65, 70],
                backgroundColor: '#10B981',
              },
              {
                label: 'Absent',
                data: [15, 8, 22, 5, 12, 35, 30],
                backgroundColor: '#EF4444',
              },
            ],
          },
        };
      case 'leave':
        return {
          type: 'doughnut',
          data: {
            labels: ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity', 'Paternity'],
            datasets: [
              {
                data: [25, 15, 40, 10, 5],
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
              },
            ],
          },
        };
      case 'employee':
        return {
          type: 'bar',
          data: {
            labels: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'],
            datasets: [
              {
                label: 'Employees by Department',
                data: [45, 32, 28, 15, 20],
                backgroundColor: '#6366F1',
              },
            ],
          },
        };
      default:
        return null;
    }
  };

  if (!chartData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Main Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedReport === 'attendance' && 'Attendance Overview'}
          {selectedReport === 'leave' && 'Leave Distribution'}
          {selectedReport === 'employee' && 'Department Distribution'}
        </h3>
        <div className="h-80 flex items-center justify-center">
          {/* In a real app, you would use a charting library like Chart.js or Recharts */}
          <div className="text-center">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Chart visualization would appear here</p>
            <p className="text-sm text-gray-500 mt-2">
              Using libraries like Chart.js or Recharts
            </p>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Attendance</span>
              <span className="text-sm font-medium text-gray-900">85%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Leaves Taken</span>
              <span className="text-sm font-medium text-gray-900">95</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Late Arrivals</span>
              <span className="text-sm font-medium text-gray-900">12%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overtime Hours</span>
              <span className="text-sm font-medium text-gray-900">245h</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">This Month vs Last Month</span>
              <span className="text-green-600 font-medium">+5.2%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Quarterly Growth</span>
              <span className="text-green-600 font-medium">+12.8%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Year-over-Year</span>
              <span className="text-green-600 font-medium">+18.3%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tables View Component
function TablesView({ selectedReport, dateRange, departmentFilter }: {
  selectedReport: string;
  dateRange: { start: string; end: string };
  departmentFilter: string;
}) {
  const [tableData, setTableData] = useState<any[]>([]);

  useEffect(() => {
    // Simulate fetching table data based on report type
    const fetchTableData = async () => {
      // In a real app, this would be an API call
      const data = getTableData(selectedReport);
      setTableData(data);
    };

    fetchTableData();
  }, [selectedReport, dateRange, departmentFilter]);

  const getTableData = (reportType: string) => {
    switch (reportType) {
      case 'attendance':
        return [
          { employee: 'John Doe', department: 'Engineering', present: 22, absent: 3, late: 2, overtime: 8 },
          { employee: 'Jane Smith', department: 'Sales', present: 20, absent: 5, late: 1, overtime: 12 },
          { employee: 'Mike Johnson', department: 'Marketing', present: 23, absent: 2, late: 0, overtime: 5 },
          { employee: 'Sarah Wilson', department: 'HR', present: 21, absent: 4, late: 3, overtime: 6 },
          { employee: 'Tom Brown', department: 'Finance', present: 24, absent: 1, late: 1, overtime: 10 },
        ];
      case 'leave':
        return [
          { employee: 'John Doe', department: 'Engineering', sick: 3, casual: 2, earned: 5, total: 10 },
          { employee: 'Jane Smith', department: 'Sales', sick: 2, casual: 3, earned: 8, total: 13 },
          { employee: 'Mike Johnson', department: 'Marketing', sick: 1, casual: 1, earned: 6, total: 8 },
          { employee: 'Sarah Wilson', department: 'HR', sick: 4, casual: 2, earned: 7, total: 13 },
          { employee: 'Tom Brown', department: 'Finance', sick: 2, casual: 1, earned: 4, total: 7 },
        ];
      case 'employee':
        return [
          { department: 'Engineering', employees: 45, active: 42, turnover: '3%' },
          { department: 'Sales', employees: 32, active: 30, turnover: '6%' },
          { department: 'Marketing', employees: 28, active: 26, turnover: '7%' },
          { department: 'HR', employees: 15, active: 15, turnover: '0%' },
          { department: 'Finance', employees: 20, active: 19, turnover: '5%' },
        ];
      default:
        return [];
    }
  };

  const getColumns = (reportType: string) => {
    switch (reportType) {
      case 'attendance':
        return ['Employee', 'Department', 'Present Days', 'Absent Days', 'Late Days', 'Overtime Hours'];
      case 'leave':
        return ['Employee', 'Department', 'Sick Leave', 'Casual Leave', 'Earned Leave', 'Total Leaves'];
      case 'employee':
        return ['Department', 'Total Employees', 'Active Employees', 'Turnover Rate'];
      default:
        return [];
    }
  };

  const columns = getColumns(selectedReport);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedReport === 'attendance' && 'Attendance Details'}
          {selectedReport === 'leave' && 'Leave Utilization'}
          {selectedReport === 'employee' && 'Employee Distribution'}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {Object.values(row).map((value: any, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tableData.length === 0 && (
        <div className="text-center py-12">
          <TableCellsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No data available
          </h3>
          <p className="text-gray-600">
            No report data found for the selected criteria
          </p>
        </div>
      )}
    </div>
  );
}