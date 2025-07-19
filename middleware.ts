import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();

  // Allow all origins to make requests
  response.headers.set('Access-Control-Allow-Origin', '*');

  // Allow specific methods
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Allow specific headers
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Allow credentials
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

export const config = {
  matcher: '/:path*',
}; 