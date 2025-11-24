// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { systemSettings, users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any = verifyToken(token);
    // If token verification failed, allow the dev admin session cookie as a fallback
    // This supports the built-in 'Admin' login which sets a `hrms-session` cookie
    // NOTE: Only allow this fallback in non-production to avoid security issues
    if (!decoded) {
      const sessionCookie = request.cookies.get && request.cookies.get('hrms-session')?.value;
      if (process.env.NODE_ENV !== 'production' && sessionCookie === 'admin-authenticated') {
        decoded = { id: '00000000-0000-0000-0000-000000000001', role: 'admin', email: 'admin@hrms.com' };
      }
    }

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all system settings
    const settings = await db
      .select()
      .from(systemSettings);

    // Organize settings by category
    const organizedSettings: any = {
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
    };

    // Merge with database settings
    settings.forEach(setting => {
      if (organizedSettings[setting.category]) {
        organizedSettings[setting.category] = {
          ...organizedSettings[setting.category],
          ...(typeof setting.settings === 'object' ? setting.settings : {}),
        };
      }
    });

    return NextResponse.json({ 
      settings: organizedSettings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get system settings error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch system settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any = verifyToken(token);
    if (!decoded) {
      const sessionCookie = request.cookies.get && request.cookies.get('hrms-session')?.value;
      if (process.env.NODE_ENV !== 'production' && sessionCookie === 'admin-authenticated') {
        decoded = { id: '00000000-0000-0000-0000-000000000001', role: 'admin', email: 'admin@hrms.com' };
      }
    }

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate that we have settings data
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 });
    }

    const categories = [
      'company',
      'attendance',
      'leave',
      'payroll',
      'notifications',
      'security'
    ];

    const results = [];

    // Verify that the decoded user (updater) exists in DB; if not, allow null (dev/admin cookie fallback may not map to real user)
    let updaterId: string | null = null;
    if (decoded && decoded.id) {
      try {
        const [foundUser] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
        if (foundUser) updaterId = decoded.id;
      } catch (e) {
        // any DB error — keep updaterId as null
        updaterId = null;
      }
    }

    // Update each category
    for (const category of categories) {
      if (body[category]) {
        // Validate attendance settings specifically
        if (category === 'attendance') {
          const attendanceSettings = body.attendance;
          
          // Validate required fields for attendance
          const requiredFields = [
            'workHours', 'overtimeRate', 'autoCheckout',
            'checkInStart', 'checkInEnd', 'checkOutStart', 'checkOutEnd'
          ];
          
          const missingFields = requiredFields.filter(field => !(field in attendanceSettings));
          if (missingFields.length > 0) {
            return NextResponse.json({ 
              error: `Missing required attendance fields: ${missingFields.join(', ')}` 
            }, { status: 400 });
          }
        }

        // Check if category exists
        const existingSettings = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.category, category))
          .limit(1);

        let result;

        if (existingSettings.length > 0) {
          // Update existing settings
          [result] = await db
            .update(systemSettings)
            .set({
              settings: body[category],
              updatedBy: updaterId,
              updatedAt: new Date(),
            })
            .where(eq(systemSettings.category, category))
            .returning();
        } else {
          // Create new settings
          [result] = await db
            .insert(systemSettings)
            .values({
              category: category,
              settings: body[category],
              updatedBy: updaterId,
            })
            .returning();
        }

        results.push({ category, success: true });
      }
    }

    return NextResponse.json({ 
      success: true,
      updatedCategories: results.map(r => r.category),
      message: 'System settings updated successfully'
    });

  } catch (error) {
    console.error('Update system settings error:', error);
    return NextResponse.json({ 
      error: 'Failed to update system settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}