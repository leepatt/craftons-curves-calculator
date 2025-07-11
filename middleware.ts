import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow public access to main page and static files
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes
  if (pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    const response = NextResponse.next();
    
    // Add iframe headers for embedding
    response.headers.set('X-Frame-Options', 'ALLOWALL');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://*.shopify.com https://*.myshopify.com https://craftons.com.au;");
    response.headers.set('Access-Control-Allow-Origin', '*');
    
    return response;
  }
  
  // Add CORS headers for Shopify app embedding
  const response = NextResponse.next();
  
  // Allow iframe embedding from Shopify and your domain
  response.headers.set('X-Frame-Options', 'ALLOWALL');
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://*.shopify.com https://*.myshopify.com https://craftons.com.au;");
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle Shopify app bridge authentication only for API routes
  if (pathname.startsWith('/api/shopify')) {
    const shop = request.nextUrl.searchParams.get('shop');
    const host = request.nextUrl.searchParams.get('host');
    
    if (shop && host) {
      // Store shop and host information for the session
      response.cookies.set('shopify-shop', shop, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
      
      response.cookies.set('shopify-host', host, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
    }
  }
  
  return response;
}

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