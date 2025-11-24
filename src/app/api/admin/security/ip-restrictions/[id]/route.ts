// app/api/admin/security/ip-restrictions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { verifyToken } from '@/lib/auth/utils';
import { sql, eq, and } from 'drizzle-orm';
import { ipRestrictions, employeeRestrictions } from '@/lib/database/schema';

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

    if (process.env.NODE_ENV === 'development') {
      console.debug('[ip-delete] request id=', id);
    }

    // Ensure the IP restriction exists first
    const existing = await db.select({ id: ipRestrictions.id }).from(ipRestrictions).where(eq(ipRestrictions.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'IP restriction not found' }, { status: 404 });
    }

    // Check if any employees are assigned to this restriction (use Drizzle select)
    const assigned = await db
      .select({ id: employeeRestrictions.id })
      .from(employeeRestrictions)
      .where(and(eq(employeeRestrictions.restrictionType, 'IP'), eq(employeeRestrictions.restrictionId, id)))
      .limit(1);

    if (assigned && assigned.length > 0) {
      return NextResponse.json({ error: 'Cannot delete IP restriction: employees are still assigned to it' }, { status: 400 });
    }

    // Delete the restriction using Drizzle and returning the deleted id
    const deleted = await db.delete(ipRestrictions).where(eq(ipRestrictions.id, id)).returning({ id: ipRestrictions.id });

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'IP restriction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'IP restriction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting IP restriction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to delete IP restriction',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}