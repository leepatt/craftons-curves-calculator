import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('[Cart Get] Fetching cart contents...');

  try {
    const shopDomain = process.env.NEXT_PUBLIC_SHOP_DOMAIN || 'craftons-au.myshopify.com';
    const shopifyCartUrl = `https://${shopDomain}/cart.js`;
    
    console.log(`[Cart Get] Fetching from: ${shopifyCartUrl}`);

    // Forward cookies from the original request to maintain the user's session
    const requestHeaders: HeadersInit = {
      'Accept': 'application/json',
    };
    const cookie = req.headers.get('cookie');
    if (cookie) {
      requestHeaders['Cookie'] = cookie;
    }

    const shopifyResponse = await fetch(shopifyCartUrl, {
      method: 'GET',
      headers: requestHeaders,
    });

    console.log(`[Cart Get] Response status: ${shopifyResponse.status}`);

    const data = await shopifyResponse.json();
    console.log('[Cart Get] Cart data:', JSON.stringify(data, null, 2));

    if (!shopifyResponse.ok) {
      console.error('[Cart Get] Shopify returned an error:', data);
      return NextResponse.json({ error: 'Failed to fetch cart from Shopify.' }, { status: shopifyResponse.status });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('[Cart Get] Error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch cart', 
        details: errorMessage,
      }, 
      { status: 500 }
    );
  }
}
