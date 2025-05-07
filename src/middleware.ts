import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// Public paths that don't require authentication
const publicPaths = [
  '/login',
  '/reset-password',
  '/change-password',
  '/_next',
  '/favicon.ico',
  '/api/auth',  // Authentication API endpoints
];

// JWT Secret - same as in auth.js
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key';

export async function middleware(req: NextRequest) {
  // Check if the path is public
  const url = req.nextUrl.clone();
  const path = url.pathname;
  
  // Allow public paths
  if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }
  
  // Check for auth token
  const authToken = req.cookies.get('auth_token')?.value;
  
  if (!authToken) {
    // Redirect to login with return URL
    url.pathname = '/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }
  
  // Verify token
  try {
    const textEncoder = new TextEncoder();
    const secretKey = textEncoder.encode(JWT_SECRET);
    
    const { payload } = await jose.jwtVerify(authToken, secretKey);
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      // Token expired - redirect to login
      url.pathname = '/login';
      url.searchParams.set('redirectTo', path);
      return NextResponse.redirect(url);
    }
    
    // Check if account is active
    if (payload.isActive === false) {
      // Account inactive - redirect to login with message
      url.pathname = '/login';
      url.searchParams.set('error', 'account_inactive');
      return NextResponse.redirect(url);
    }
    
    // If this is an admin-only route, check for admin privileges
    const adminRoutes = [
      '/teachers',
      '/academic-years',
      '/class-groups',
      '/subjects'
    ];
    
    if (adminRoutes.some(route => path.startsWith(route)) && !payload.isAdmin) {
      // Not an admin, redirect to dashboard
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    
    // User is authenticated and authorized, proceed
    return NextResponse.next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Invalid token - redirect to login
    url.pathname = '/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }
}

// Configure middleware matching
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}