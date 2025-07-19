
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('[Proxy] /api/cart/add POST request received.');

  try {
    console.log('[Proxy] 1. Parsing request body...');
    const body = await req.json();
    console.log('[Proxy] 2. Request body parsed successfully.');

    const shopDomain = process.env.NEXT_PUBLIC_SHOP_DOMAIN;
    console.log(`[Proxy] 3. Read shop domain from env: ${shopDomain}`);
    if (!shopDomain) {
      throw new Error('Shopify domain is not configured in environment variables.');
    }

    const shopifyCartUrl = `https://${shopDomain}/cart/add.js`;
    console.log(`[Proxy] 4. Forwarding request to Shopify URL: ${shopifyCartUrl}`);

    // Forward cookies from the original request to maintain the user's session
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const cookie = req.headers.get('cookie');
    if (cookie) {
      requestHeaders['Cookie'] = cookie;
    }

    const shopifyResponse = await fetch(shopifyCartUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
    });
    console.log(`[Proxy] 5. Received response from Shopify with status: ${shopifyResponse.status}`);

    const data = await shopifyResponse.json();
    console.log('[Proxy] 6. Shopify response body parsed successfully.');

    if (!shopifyResponse.ok) {
      console.error('[Proxy] Shopify returned an error:', data);
      return NextResponse.json({ error: data.description || 'Failed to add to cart on Shopify.' }, { status: shopifyResponse.status });
    }

    console.log('[Proxy] 7. Request successful. Returning Shopify data to client.');
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('[Proxy] 💥 An error occurred in the proxy route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    // This will be returned to the test script
    return NextResponse.json(
      { 
        error: 'Proxy Internal Server Error', 
        details: errorMessage,
        // Include stack trace in dev environment for easier debugging
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
} 