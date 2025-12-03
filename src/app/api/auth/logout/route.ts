// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Logout successful' });

    // Attempt to clear known authentication cookies used by the app.
    // Use both delete and resetting with empty value/maxAge to be robust
    // across environments.
    try {
      response.cookies.delete('auth-token');
    } catch (e) {}
    try {
      response.cookies.delete('hrms-session');
    } catch (e) {}

    try {
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      });
    } catch (e) {}

    try {
      response.cookies.set('hrms-session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      });
    } catch (e) {}

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
