import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // More modern than jsonwebtoken for Edge runtime

// List of routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/teachers',
  '/students',
  '/subjects',
  '/academic-years',
  '/class-groups',
  '/portfolios',
  '/attendance',
  '/credits',
  '/work-experience'
];

// List of routes that require admin privileges
const ADMIN_ONLY_ROUTES = [
  '/teachers',
  '/academic-years',
  '/class-groups'
];

// Routes excluded from authentication check
const PUBLIC_ROUTES = [
  '/login',
  '/reset-password',
  '/api',
  '/_next',
  '/favicon.ico'
];

/**
 * Middleware to check authentication for protected routes
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Allow access to public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Check if the path requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  if (isProtectedRoute) {
    // Get the token from cookies
    const token = req.cookies.get('auth_token')?.value;
    
    if (!token) {
      // No token, redirect to login
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      // Verify the token
      // In production, get the secret from environment variables
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-jwt-secret-key'
      );
      
      const { payload } = await jwtVerify(token, secret);
      
      // Check if admin-only route
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => 
        pathname === route || pathname.startsWith(`${route}/`)
      );
      
      if (isAdminRoute && payload.isAdmin !== true) {
        // Not an admin, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      
      // Valid token and proper permissions, proceed
      return NextResponse.next();
    } catch (error) {
      console.error('Token verification failed:', error);
      
      // Invalid token, redirect to login
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // For non-protected routes that aren't explicitly public
  // Default redirect to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Allow access to any other route
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
