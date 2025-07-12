import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the request for debugging
    console.log('Cart add request:', JSON.stringify(body, null, 2));
    
    // Check if we're in a Shopify context (embedded in iframe)
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    console.log('Origin:', origin);
    console.log('Referer:', referer);
    
    // If we're embedded in Shopify, we need to handle this differently
    if (referer && referer.includes('shopify.com')) {
      // Extract the shop domain from the referer
      const shopMatch = referer.match(/https?:\/\/([^\/]+)/);
      const shopDomain = shopMatch ? shopMatch[1] : null;
      
      if (shopDomain) {
        // Forward the request to the Shopify store's cart API
        const shopifyCartUrl = `https://${shopDomain}/cart/add.js`;
        
        console.log('Forwarding to Shopify cart:', shopifyCartUrl);
        
        const shopifyResponse = await fetch(shopifyCartUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          console.error('Shopify cart error:', errorText);
          return NextResponse.json(
            { error: 'Failed to add to cart', details: errorText },
            { status: shopifyResponse.status }
          );
        }
        
        const result = await shopifyResponse.json();
        console.log('Shopify cart success:', result);
        
        // Add cart drawer support flags
        return NextResponse.json({
          ...result,
          cart_drawer_supported: true,
          should_trigger_drawer: true
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
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Cart API endpoint is working' });
} 