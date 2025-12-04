# Sidebar Debug Guide

## Issue: Only Dashboard showing in Sidebar

## Debug Steps:

### 1. Open Browser Console (F12)
Look for these console logs:
- `AuthContext - User loaded:` - Should show role and sidebarPermissions
- `Sidebar - User data:` - Should show role, isAdmin, and sidebarPermissions
- `Sidebar - Allowed items:` - Should show array of allowed menu modules

### 2. Check User Data in Console
Run this in browser console:
```javascript
// Check if user is loaded
console.log('User from localStorage:', localStorage.getItem('auth-token'));

// Decode the JWT token manually (if logged in)
const token = localStorage.getItem('auth-token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Sidebar permissions:', payload.sidebarPermissions);
}
```

### 3. Expected Data Structure

For **Admin**:
```javascript
{
  role: 'admin',
  sidebarPermissions: [...] // Can be any or empty, admins see all
}
```

For **Employee**:
```javascript
{
  role: 'employee',
  sidebarPermissions: ['dashboard', 'employees', 'attendance', 'leave', ...]
}
```

### 4. Quick Fixes

**Fix 1: Clear cache and re-login**
```javascript
localStorage.clear();
// Then logout and login again
```

**Fix 2: Check database**
Run this SQL to verify role has sidebarPermissions:
```sql
SELECT id, name, sidebar_permissions FROM roles;
```

**Fix 3: Verify the role assignment**
```sql
SELECT u.email, r.name, r.sidebar_permissions 
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'your-email@example.com';
```

## Code Changes Made:

### 1. AuthContext.tsx
✅ Fixed: Now properly preserves `sidebarPermissions` and `pagePermissions` when merging user data
✅ Added: Console logging for debugging

### 2. Sidebar.tsx  
✅ Added: Console logging to track filtering logic
✅ Logic: Dashboard always shows, Admins see all, Non-admins see only their sidebarPermissions

## Next Steps:

1. **Logout and Login again** - This ensures the JWT token has the latest sidebarPermissions
2. **Check browser console** - Look for the debug logs
3. **Verify database** - Ensure the role has correct sidebar_permissions set
