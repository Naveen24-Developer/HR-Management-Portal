//src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login', '/register', '/unauthorized'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if user has auth token
  const authToken = request.cookies.get('auth-token')?.value;
  
  // Redirect root to login if no auth token, otherwise to dashboard
  if (pathname === '/') {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect old /admin routes to /dashboard routes
  if (pathname.startsWith('/admin')) {
    const newPath = pathname.replace('/admin', '/dashboard');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // Protected routes - redirect to login if no auth token
  if (pathname.startsWith('/dashboard')) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // All other routes proceed normally
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
