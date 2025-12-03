'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Edit, Trash2, UserPlus } from 'lucide-react';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'hr' | 'employee'>('hr');

  // Mock data
  const hrUsers = [
    { id: 1, name: 'Sarah Johnson', email: 'sarah@company.com', department: 'HR', status: 'Active' },
    { id: 2, name: 'Mike Chen', email: 'mike@company.com', department: 'Finance', status: 'Active' },
  ];

  const employeeUsers = [
    { id: 1, name: 'John Doe', email: 'john@company.com', department: 'IT', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@company.com', department: 'Marketing', status: 'Inactive' },
  ];

  const currentUsers = activeTab === 'hr' ? hrUsers : employeeUsers;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add {activeTab === 'hr' ? 'HR' : 'Employee'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        <Button
          variant={activeTab === 'hr' ? 'ghost' : 'ghost'}
          onClick={() => setActiveTab('hr')}
          className={`rounded-none border-b-2 ${activeTab === 'hr' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'} hover:text-primary`}
        >
          HR Management
        </Button>
        <Button
          variant={activeTab === 'employee' ? 'ghost' : 'ghost'}
          onClick={() => setActiveTab('employee')}
           className={`rounded-none border-b-2 ${activeTab === 'employee' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'} hover:text-primary`}
        >
          Employee Management
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab === 'hr' ? 'HRs' : 'employees'}...`}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'hr' ? 'HR Users' : 'Employees'} 
            <span className="text-sm text-muted-foreground ml-2">
              ({currentUsers.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
