// app/api/admin/security/geo-restrictions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { verifyToken } from '@/lib/auth/utils';
import { isValidLatitude, isValidLongitude } from '@/lib/restrictions/geo-validator';
import { geoRestrictions } from '@/lib/database/schema'; // <- use the table object
import { and } from 'drizzle-orm'; // optional, kept available
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, latitude, longitude, radius_meters } = body;

    // Validate input presence
    if (!title || latitude === undefined || longitude === undefined || radius_meters === undefined) {
      return NextResponse.json(
        { error: 'Title, latitude, longitude, and radius_meters are required' },
        { status: 400 }
      );
    }

    // Parse and validate numeric values
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = parseInt(String(radius_meters), 10);

    if (Number.isNaN(lat) || !isFinite(lat)) {
      return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 });
    }
    if (Number.isNaN(lng) || !isFinite(lng)) {
      return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 });
    }
    if (!Number.isInteger(radius) || radius <= 0) {
      return NextResponse.json({ error: 'Radius must be a positive integer (meters)' }, { status: 400 });
    }

    // Validate coordinates ranges
    if (!isValidLatitude(lat)) {
      return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 });
    }
    if (!isValidLongitude(lng)) {
      return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 });
    }

    // Prepare values - decimal columns often map best to string with fixed precision
    // keep 7 decimal places like your schema precision
    const latStr = lat.toFixed(7);
    const lngStr = lng.toFixed(7);

    // Use Drizzle insert so we get a consistent returned row
    const insertResult = await db.insert(geoRestrictions).values({
      title,
      latitude: latStr,
      longitude: lngStr,
      radiusMeters: radius,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({
      id: geoRestrictions.id,
      title: geoRestrictions.title,
      latitude: geoRestrictions.latitude,
      longitude: geoRestrictions.longitude,
      radius_meters: geoRestrictions.radiusMeters,
      created_at: geoRestrictions.createdAt,
      updated_at: geoRestrictions.updatedAt,
    });

    // insertResult is an array of rows (usually length 1)
    if (!insertResult || insertResult.length === 0) {
      // Fallback: something unexpected from driver
      console.error('Drizzle insert returned no rows', { title, latStr, lngStr, radius });
      return NextResponse.json(
        { error: 'Failed to create geo restriction - database did not return the created row' },
        { status: 500 }
      );
    }

    // Normalize the single row
    const inserted = insertResult[0];

    // Some drivers return numeric strings for decimals - coerce to numbers for JSON friendliness
    const restriction = {
      id: inserted.id,
      title: inserted.title,
      latitude: typeof inserted.latitude === 'string' ? parseFloat(inserted.latitude) : inserted.latitude,
      longitude: typeof inserted.longitude === 'string' ? parseFloat(inserted.longitude) : inserted.longitude,
      radius_meters: inserted.radius_meters ?? inserted.radius_meters ?? radius,
      created_at: inserted.created_at ?? inserted.created_at,
      updated_at: inserted.updated_at ?? inserted.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Geo restriction created successfully',
        restriction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating geo restriction (POST):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create geo restriction',
        details: errorMessage,
        // expose stack only in development
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restrictions = await db.select({
      id: geoRestrictions.id,
      title: geoRestrictions.title,
      latitude: geoRestrictions.latitude,
      longitude: geoRestrictions.longitude,
      radiusMeters: geoRestrictions.radiusMeters,
      createdAt: geoRestrictions.createdAt,
      updatedAt: geoRestrictions.updatedAt,
    }).from(geoRestrictions).orderBy(sql`created_at DESC`);

    return NextResponse.json({ success: true, restrictions });
  } catch (error) {
    console.error('Error fetching Geo restrictions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch Geo restrictions',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
