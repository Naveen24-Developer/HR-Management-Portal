// app/api/admin/settings/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendanceSettings, users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }
    
    // Allow all authenticated users to read settings (needed for check-in/check-out calculations)
    // Only admins can modify settings (handled in PUT endpoint)

    // Get attendance settings (create default if missing)
    let [settings] = await db.select().from(attendanceSettings).limit(1);

    if (!settings) {
      [settings] = await db
        .insert(attendanceSettings)
        .values({
          workHours: '8.0',
          overtimeRate: '1.5',
          autoCheckout: true,
          checkInStart: '08:00',
          checkInEnd: '10:00',
          checkOutStart: '17:00',
          checkOutEnd: '19:00',
        })
        .returning();
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get attendance settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      workHours,
      overtimeRate,
      autoCheckout,
      checkInStart,
      checkInEnd,
      checkOutStart,
      checkOutEnd,
    } = body;

    // Basic validation
    const checkInStartTime = new Date(`1970-01-01T${checkInStart}`);
    const checkInEndTime = new Date(`1970-01-01T${checkInEnd}`);
    const checkOutStartTime = new Date(`1970-01-01T${checkOutStart}`);
    const checkOutEndTime = new Date(`1970-01-01T${checkOutEnd}`);

    if (checkInStartTime >= checkInEndTime) {
      return NextResponse.json({ error: 'Check-in end time must be after start time' }, { status: 400 });
    }
    if (checkOutStartTime >= checkOutEndTime) {
      return NextResponse.json({ error: 'Check-out end time must be after start time' }, { status: 400 });
    }

    // Determine updater id
    let updaterId: string | null = null;
    const possibleId = decoded.userId ?? decoded.id;
    if (possibleId) {
      try {
        const [found] = await db.select().from(users).where(eq(users.id, possibleId)).limit(1);
        if (found) updaterId = possibleId;
      } catch (e) {
        updaterId = null;
      }
    }

    const [existing] = await db.select().from(attendanceSettings).limit(1);
    if (existing) {
      const [updated] = await db
        .update(attendanceSettings)
        .set({
          workHours: workHours.toString(),
          overtimeRate: overtimeRate.toString(),
          autoCheckout,
          checkInStart,
          checkInEnd,
          checkOutStart,
          checkOutEnd,
          updatedBy: updaterId,
          updatedAt: new Date(),
        })
        .where(eq(attendanceSettings.id, existing.id))
        .returning();

      return NextResponse.json({ success: true, settings: updated });
    } else {
      const [created] = await db
        .insert(attendanceSettings)
        .values({
          workHours: workHours.toString(),
          overtimeRate: overtimeRate.toString(),
          autoCheckout,
          checkInStart,
          checkInEnd,
          checkOutStart,
          checkOutEnd,
          updatedBy: updaterId,
        })
        .returning();

      return NextResponse.json({ success: true, settings: created });
    }
  } catch (error) {
    console.error('Update attendance settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}