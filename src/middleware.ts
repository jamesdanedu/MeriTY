import { NextRequest, NextResponse } from 'next/server';

// Completely disabled middleware to bypass authentication issues
export function middleware(req: NextRequest) {
  // Just pass through all requests without any auth checks
  return NextResponse.next();
}