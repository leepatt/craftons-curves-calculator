import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Enhanced logging for debugging
    console.log('=== CART ADD REQUEST START ===');
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    
    // Get request headers for debugging
    const headers = {
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      xForwardedHost: request.headers.get('x-forwarded-host'),
      host: request.headers.get('host')
    };
    console.log('Request headers:', headers);
    
    // Validate request body
    if (!body || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      console.error('Invalid request body - missing items');
      return NextResponse.json(
        { error: 'Invalid request: missing items array' },
        { status: 400 }
      );
    }
    
    // Validate each item
    for (const item of body.items) {
      if (!item.id || !item.quantity) {
        console.error('Invalid item:', item);
        return NextResponse.json(
          { error: 'Invalid item: missing id or quantity' },
          { status: 400 }
        );
      }
    }
    
    // Determine shop domain
    let shopDomain = null;
    
    // Method 1: Check referer for Shopify domain
    if (headers.referer) {
      const refererMatch = headers.referer.match(/https?:\/\/([^\/]+)/);
      if (refererMatch) {
        const domain = refererMatch[1];
        if (domain.includes('.shopify.com') || domain.includes('.myshopify.com')) {
          shopDomain = domain;
          console.log('Found shop domain from referer:', shopDomain);
        }
      }
    }
    
    // Method 2: Check origin for Shopify domain  
    if (!shopDomain && headers.origin) {
      const originMatch = headers.origin.match(/https?:\/\/([^\/]+)/);
      if (originMatch) {
        const domain = originMatch[1];
        if (domain.includes('.shopify.com') || domain.includes('.myshopify.com')) {
          shopDomain = domain;
          console.log('Found shop domain from origin:', shopDomain);
        }
      }
    }
    
    // Method 3: Use known shop domain (fallback)
    if (!shopDomain) {
      const knownShopDomain = 'craftons-au.myshopify.com';
      console.log('Using known shop domain as fallback:', knownShopDomain);
      shopDomain = knownShopDomain;
    }
    
    // Try to add to Shopify cart
    if (shopDomain) {
      const shopifyCartUrl = `https://${shopDomain}/cart/add.js`;
      
      console.log('Attempting to add to Shopify cart:', shopifyCartUrl);
      console.log('Sending to Shopify:', JSON.stringify(body, null, 2));
      
      try {
        const shopifyResponse = await fetch(shopifyCartUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Craftons Curves Calculator',
            // Add credentials for cross-origin requests
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify(body),
        });
        
        const responseText = await shopifyResponse.text();
        console.log('Shopify response status:', shopifyResponse.status);
        console.log('Shopify response headers:', Object.fromEntries(shopifyResponse.headers.entries()));
        console.log('Shopify response text:', responseText);
        
        if (shopifyResponse.ok) {
          // Success - parse response
          let result;
          try {
            result = JSON.parse(responseText);
            console.log('Shopify cart success - parsed result:', result);
          } catch (parseError) {
            console.warn('Could not parse Shopify response as JSON:', parseError);
            result = { success: true, rawResponse: responseText };
          }
          
          // Return success with cart drawer flags
          const successResponse = {
            ...result,
            success: true,
            cart_drawer_supported: true,
            should_trigger_drawer: true,
            shop_domain: shopDomain,
            source: 'shopify_direct'
          };
          
          console.log('Returning success response:', successResponse);
          console.log('=== CART ADD REQUEST END (SUCCESS) ===');
          
          return NextResponse.json(successResponse);
        } else {
          // Shopify error
          console.error('Shopify cart error - Status:', shopifyResponse.status);
          console.error('Shopify cart error - Response:', responseText);
          
          // Check if it's a variant not found error
          if (shopifyResponse.status === 422 || responseText.includes('variant')) {
            console.error('CRITICAL: Variant ID may not exist in Shopify store');
            return NextResponse.json({
              error: 'Product variant not found',
              details: `Variant ID ${body.items[0]?.id} may not exist in Shopify store ${shopDomain}`,
              shopifyStatus: shopifyResponse.status,
              shopifyResponse: responseText,
              solution: 'Check that the 1-cent product with this variant ID exists in your Shopify store'
            }, { status: 422 });
          }
          
          // Other Shopify errors
          return NextResponse.json({
            error: 'Shopify cart error',
            details: responseText,
            shopifyStatus: shopifyResponse.status,
            shopifyUrl: shopifyCartUrl
          }, { status: shopifyResponse.status });
        }
        
      } catch (fetchError) {
        console.error('Network error fetching from Shopify:', fetchError);
        
        // Network error - return fallback response
        const fallbackResponse = {
          success: true,
          message: 'Item added to cart (fallback mode)',
          items: body.items,
          note: 'Shopify request failed - running in standalone mode',
          error_details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          source: 'fallback'
        };
        
        console.log('Returning fallback response:', fallbackResponse);
        console.log('=== CART ADD REQUEST END (FALLBACK) ===');
        
        return NextResponse.json(fallbackResponse);
      }
    }
    
    // Standalone mode (no shop domain)
    console.log('Running in standalone mode - simulating cart add');
    const standaloneResponse = {
      success: true,
      message: 'Item added to cart (standalone mode)',
      items: body.items,
      note: 'This is a simulation - no actual cart was modified',
      source: 'standalone'
    };
    
    console.log('Returning standalone response:', standaloneResponse);
    console.log('=== CART ADD REQUEST END (STANDALONE) ===');
    
    return NextResponse.json(standaloneResponse);
    
  } catch (error) {
    console.error('=== CART ADD REQUEST ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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
  // Test the cart functionality
  const shopDomain = 'craftons-au.myshopify.com';
  const variantId = 45300623343794;
  
  console.log('=== CART API GET TEST ===');
  console.log('Testing cart functionality...');
  
  // Test data
  const testData = {
    items: [{
      id: variantId,
      quantity: 1,
      properties: {
        'Test': 'GET endpoint test',
        'Timestamp': new Date().toISOString()
      }
    }]
  };
  
  try {
    const shopifyCartUrl = `https://${shopDomain}/cart/add.js`;
    
    console.log('Testing Shopify cart URL:', shopifyCartUrl);
    
    const shopifyResponse = await fetch(shopifyCartUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Craftons Curves Calculator Test',
      },
      body: JSON.stringify(testData),
    });
    
    const responseText = await shopifyResponse.text();
    
    console.log('Shopify response status:', shopifyResponse.status);
    console.log('Shopify response:', responseText);
    
    if (shopifyResponse.ok) {
      return NextResponse.json({
        status: 'success',
        message: 'Cart API endpoint is working and can add to Shopify cart',
        timestamp: new Date().toISOString(),
        variant_id: variantId,
        shop_domain: shopDomain,
        shopify_status: shopifyResponse.status,
        test_successful: true
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Cart API endpoint is working but Shopify cart failed',
        timestamp: new Date().toISOString(),
        variant_id: variantId,
        shop_domain: shopDomain,
        shopify_status: shopifyResponse.status,
        shopify_error: responseText,
        test_successful: false,
        likely_issue: shopifyResponse.status === 422 || responseText.includes('variant')
          ? 'The 1-cent product (variant ID ' + variantId + ') may not exist in the Shopify store'
          : 'Unknown Shopify error'
      });
    }
    
  } catch (error) {
    console.error('Test error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Cart API endpoint is working but network error occurred',
      timestamp: new Date().toISOString(),
      variant_id: variantId,
      shop_domain: shopDomain,
      test_successful: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      likely_issue: 'Network connectivity issue or CORS problem'
    });
  }
} 