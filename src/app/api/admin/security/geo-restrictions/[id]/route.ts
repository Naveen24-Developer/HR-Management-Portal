// app/api/admin/security/geo-restrictions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { verifyToken } from '@/lib/auth/utils';
import { sql, eq, and } from 'drizzle-orm';
import { geoRestrictions, employeeRestrictions } from '@/lib/database/schema';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    if (process.env.NODE_ENV === 'development') console.debug('[geo-delete] id=', id);

    // Ensure geo restriction exists
    const existing = await db.select({ id: geoRestrictions.id }).from(geoRestrictions).where(eq(geoRestrictions.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Geo restriction not found' }, { status: 404 });
    }

    // Check if any employees are assigned to this restriction
    const assignmentCheck = await db
      .select({ id: employeeRestrictions.id })
      .from(employeeRestrictions)
      .where(and(eq(employeeRestrictions.restrictionType, 'GEO'), eq(employeeRestrictions.restrictionId, id)))
      .limit(1);

    if (assignmentCheck && assignmentCheck.length > 0) {
      return NextResponse.json({ error: 'Cannot delete geo restriction: employees are still assigned to it' }, { status: 400 });
    }

    // Delete using Drizzle
    const deleted = await db.delete(geoRestrictions).where(eq(geoRestrictions.id, id)).returning({ id: geoRestrictions.id });
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Geo restriction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Geo restriction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting geo restriction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to delete geo restriction',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}