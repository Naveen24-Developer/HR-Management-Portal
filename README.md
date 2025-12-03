# HRM Portal - Human Resource Management System

A comprehensive HR management portal built with Next.js 14, PostgreSQL, and TypeScript.

## Features

### ✅ Core Modules
- **Employee Management**: Complete CRUD operations with department assignments
- **Attendance Tracking**: Real-time attendance with check-in/check-out
- **Leave Management**: Advanced leave request system with approver workflow ⭐ NEW
- **Role-Based Access Control (RBAC)**: Dynamic permissions for menus, pages, and actions
- **User Authentication**: Secure JWT-based authentication
- **Dashboard Analytics**: Real-time insights and statistics

### 🆕 Leave Management System (Latest)
- **Approver Selection**: Employees select designated approver from filtered list
- **Automatic Balance Tracking**: Real-time leave balance updates via database triggers
- **Admin Manual Entry**: Create leave entries for phone/email requests
- **Policy-Based Quotas**: Configurable leave types (Sick, Casual, Earned, Maternity, Paternity)
- **Working Days Calculation**: Smart calculation excluding weekends
- **Approval Workflow**: Approve/reject with reasons and audit trail

**Quick Start:** See [LEAVE_QUICK_START.md](./LEAVE_QUICK_START.md)
**Full Guide:** See [LEAVE_MANAGEMENT_GUIDE.md](./LEAVE_MANAGEMENT_GUIDE.md)

### 🔐 Permission System
- Three-tier permissions: Sidebar visibility, Page access, Action controls
- Dynamic role management with granular permissions
- Permission guards for UI and API endpoints

**Quick Start:** See [RBAC_QUICK_START.md](./RBAC_QUICK_START.md)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with HTTP-only cookies
- **UI**: Tailwind CSS, Heroicons
- **State Management**: React Context API

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd HRM-Portal-main
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/hrm_db
JWT_SECRET=your-secret-key-here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Run database migrations
```bash
npm run db:push
```

5. Start development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Database Migrations

### Apply all migrations
```bash
npm run db:push
```

### Generate new migration
```bash
npm run db:generate
```

## Documentation

### Setup Guides
- [RBAC Quick Start](./RBAC_QUICK_START.md) - 5-minute permission system setup
- [Leave Quick Start](./LEAVE_QUICK_START.md) - 5-minute leave system setup
- [Attendance Quick Start](./ATTENDANCE_QUICK_START.md) - Attendance system guide

### Implementation Guides
- [Leave Management Guide](./LEAVE_MANAGEMENT_GUIDE.md) - Complete leave system documentation
- [RBAC Implementation](./RBAC_IMPLEMENTATION_GUIDE.md) - Detailed permission system guide
- [Permission Architecture](./PERMISSION_ARCHITECTURE.md) - System architecture diagrams

### Technical Documentation
- [Leave Implementation Summary](./LEAVE_IMPLEMENTATION_SUMMARY.md) - Latest features summary
- [Employee Deletion System](./EMPLOYEE_DELETION_SYSTEM.md) - Cascade delete documentation
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment testing

## Project Structure

```
HRM-Portal-main/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication pages
│   │   ├── dashboard/        # Dashboard modules
│   │   │   ├── employees/
│   │   │   ├── attendance/
│   │   │   ├── leave/        ⭐ Enhanced
│   │   │   ├── roles/
│   │   │   └── settings/
│   │   └── api/              # API routes
│   │       ├── auth/
│   │       ├── admin/
│   │       └── leave/        ⭐ NEW (8 endpoints)
│   ├── components/           # Reusable components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   └── lib/                  # Utilities
│       ├── auth/
│       ├── database/
│       └── restrictions/
├── drizzle/                  # Database migrations
└── docs/                     # Documentation
```

## Key Features Breakdown

### Leave Management
- 8 REST API endpoints
- 5 default leave types (customizable)
- Automatic balance calculation
- Permission-based approver filtering
- Admin manual entry with audit trail
- Real-time status updates

### RBAC System
- Dynamic sidebar menu filtering
- Page-level access control
- Action-level permissions
- Role assignment to users
- 3 authorization tiers

### Employee Management
- Complete CRUD operations
- Department assignments
- Cascade delete with safety checks
- Profile management
- Employment type tracking

### Attendance System
- Daily check-in/check-out
- Real-time status tracking
- Monthly attendance reports
- Late arrival detection
- Overtime calculation

## API Endpoints

### Leave Management APIs
```
GET    /api/leave/approvers              # Fetch approvers list
GET    /api/leave/requests               # List leave requests
POST   /api/leave/requests               # Create leave request
GET    /api/leave/stats                  # Leave statistics
GET    /api/leave/balance/:employeeId    # Fetch leave balance
PUT    /api/leave/:id/approve            # Approve request
PUT    /api/leave/:id/reject             # Reject request
POST   /api/admin/leave/manual           # Admin manual entry
```

### Authentication APIs
```
POST   /api/auth/login                   # User login
POST   /api/auth/register                # User registration
GET    /api/auth/me                      # Current user info
```

### Admin APIs
```
GET    /api/admin/roles                  # List roles
POST   /api/admin/roles                  # Create role
PUT    /api/admin/roles/:id              # Update role
DELETE /api/admin/roles/:id              # Delete role
POST   /api/admin/roles/:id/assign       # Assign users to role
```

## Testing

### Run Tests
```bash
npm test
```

### Testing Checklist
- See [RBAC_TESTING_CHECKLIST.md](./RBAC_TESTING_CHECKLIST.md)
- See [LEAVE_MANAGEMENT_GUIDE.md](./LEAVE_MANAGEMENT_GUIDE.md) (Testing section)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please:
1. Check the documentation in the `docs/` folder
2. Review the Quick Start guides
3. Open an issue on GitHub

---

**Latest Update:** Enhanced Leave Management System (Jan 28, 2025)
**Status:** ✅ Production Ready
**Version:** 2.0.0

