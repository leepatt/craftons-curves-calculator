import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the request for debugging
    console.log('Cart add request:', JSON.stringify(body, null, 2));
    
    // Get potential shop domains from various sources
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const xForwardedHost = request.headers.get('x-forwarded-host');
    const host = request.headers.get('host');
    
    console.log('Request headers:', {
      origin,
      referer,
      xForwardedHost,
      host
    });
    
    // Try to determine if we're in a Shopify context
    let shopDomain = null;
    
    // Method 1: Check referer for Shopify domain
    if (referer) {
      const refererMatch = referer.match(/https?:\/\/([^\/]+)/);
      if (refererMatch) {
        const domain = refererMatch[1];
        if (domain.includes('.shopify.com') || domain.includes('.myshopify.com')) {
          shopDomain = domain;
          console.log('Found shop domain from referer:', shopDomain);
        }
      }
    }
    
    // Method 2: Check origin for Shopify domain  
    if (!shopDomain && origin) {
      const originMatch = origin.match(/https?:\/\/([^\/]+)/);
      if (originMatch) {
        const domain = originMatch[1];
        if (domain.includes('.shopify.com') || domain.includes('.myshopify.com')) {
          shopDomain = domain;
          console.log('Found shop domain from origin:', shopDomain);
        }
      }
    }
    
    // Method 3: Check for known shop domain (fallback)
    if (!shopDomain) {
      // You can add your known shop domain here as a fallback
      const knownShopDomain = 'craftons-au.myshopify.com';
      console.log('Using known shop domain as fallback:', knownShopDomain);
      shopDomain = knownShopDomain;
    }
    
    // If we have a shop domain, try to forward to Shopify
    if (shopDomain) {
      const shopifyCartUrl = `https://${shopDomain}/cart/add.js`;
      
      console.log('Forwarding to Shopify cart:', shopifyCartUrl);
      
      try {
        const shopifyResponse = await fetch(shopifyCartUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Craftons Curves Calculator',
          },
          body: JSON.stringify(body),
        });
        
        const responseText = await shopifyResponse.text();
        console.log('Shopify response status:', shopifyResponse.status);
        console.log('Shopify response text:', responseText);
        
        if (!shopifyResponse.ok) {
          console.error('Shopify cart error:', responseText);
          return NextResponse.json(
            { 
              error: 'Failed to add to cart', 
              details: responseText,
              shopifyStatus: shopifyResponse.status,
              shopifyUrl: shopifyCartUrl
            },
            { status: shopifyResponse.status }
          );
        }
        
        // Try to parse JSON response
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse Shopify response as JSON:', parseError);
          result = { success: true, rawResponse: responseText };
        }
        
        console.log('Shopify cart success:', result);
        
        // Add cart drawer support flags
        return NextResponse.json({
          ...result,
          cart_drawer_supported: true,
          should_trigger_drawer: true,
          shop_domain: shopDomain
        });
        
      } catch (fetchError) {
        console.error('Error fetching from Shopify:', fetchError);
        
        // Fallback to standalone mode if Shopify request fails
        return NextResponse.json({
          success: true,
          message: 'Item added to cart (fallback mode)',
          items: body.items,
          note: 'Shopify request failed - running in standalone mode',
          error_details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
        });
      }
    }
    
    // Fallback: Return success for standalone mode (development/testing)
    console.log('Running in standalone mode - simulating cart add');
    return NextResponse.json({
      success: true,
      message: 'Item added to cart (standalone mode)',
      items: body.items,
      note: 'This is a simulation - no actual cart was modified'
    });
    
  } catch (error) {
    console.error('Cart add error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Cart API endpoint is working',
    timestamp: new Date().toISOString()
  });
} 