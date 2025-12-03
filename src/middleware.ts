//src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login', '/register', '/unauthorized'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Redirect root to dashboard (common for all roles)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect old /admin routes to /dashboard routes
  if (pathname.startsWith('/admin')) {
    const newPath = pathname.replace('/admin', '/dashboard');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // All other routes proceed normally
  // Page-level and API-level protection should be performed via
  // token verification and permissions checks
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|unauthorized).*)'
  ],
};
