// Example: How to protect a dashboard page with PermissionGuard
// File: /app/dashboard/[module]/page.tsx

'use client';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function ModulePage() {
  return (
    <PermissionGuard module="employees" action="view">
      <ModuleContent />
    </PermissionGuard>
  );
}

function ModuleContent() {
  // Your actual page content here
  // All hooks and logic can be used normally
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Module Title</h1>
      {/* Your content */}
    </div>
  );
}
