// app/api/admin/security/assign/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { verifyToken } from '@/lib/auth/utils';
import { sql, eq } from 'drizzle-orm';
import { employeeRestrictions } from '@/lib/database/schema';

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

    const deleted = await db.delete(employeeRestrictions).where(eq(employeeRestrictions.id, id)).returning({ id: employeeRestrictions.id });

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Restriction assignment removed successfully',
    });
  } catch (error) {
    console.error('Error removing assignment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to remove assignment',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}