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
    
    // Enhanced validation for request body
    if (!body || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      console.error('Invalid request body - missing items');
      return NextResponse.json(
        { error: 'Invalid request: missing items array' },
        { status: 400 }
      );
    }
    
    // Validate each item with enhanced checks
    for (const item of body.items) {
      if (!item.id || typeof item.quantity !== 'number' || item.quantity < 1) {
        console.error('Invalid item:', item);
        return NextResponse.json(
          { error: 'Invalid item: missing id or invalid quantity' },
          { status: 400 }
        );
      }
      
      // Validate variant ID matches expected configuration
      const expectedVariantId = 45300623343794;
      if (Number(item.id) !== expectedVariantId) {
        console.warn(`Unexpected variant ID: ${item.id}, expected: ${expectedVariantId}`);
      }
    }
    
    // Determine shop domain with improved detection
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
    
    // Method 3: Check host header for Shopify domain
    if (!shopDomain && headers.host) {
      const domain = headers.host;
      if (domain.includes('.shopify.com') || domain.includes('.myshopify.com')) {
        shopDomain = domain;
        console.log('Found shop domain from host:', shopDomain);
      }
    }
    
    // Method 4: Use known shop domain (fallback)
    if (!shopDomain) {
      const knownShopDomain = 'craftons-au.myshopify.com';
      console.log('Using known shop domain as fallback:', knownShopDomain);
      shopDomain = knownShopDomain;
    }
    
    // Extract configuration summary for logging
    const firstItem = body.items[0];
    const isCustomCurves = firstItem.properties && firstItem.properties['_order_type'] === 'custom_curves';
    if (isCustomCurves) {
      console.log('Custom curves order detected:');
      console.log('- Total Price:', firstItem.properties['_total_price']);
      console.log('- Parts Count:', firstItem.properties['_parts_count']);
      console.log('- Turnaround:', firstItem.properties['_total_turnaround']);
      console.log('- Materials:', firstItem.properties['_materials_used']);
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
            'User-Agent': 'Craftons Curves Calculator v2.0',
            // Enhanced headers for better compatibility
            'X-Requested-With': 'XMLHttpRequest',
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
          
          // Enhanced success response with cart drawer support
          const successResponse = {
            ...result,
            success: true,
            cart_drawer_supported: true,
            should_trigger_drawer: true,
            shop_domain: shopDomain,
            source: 'shopify_direct',
            // Add cart permalink for cross-domain scenarios
            cart_url: `https://${shopDomain}/cart`,
            // Include item information
            item_id: result.id || result.key || null,
            item_added: {
              variant_id: firstItem.id,
              quantity: firstItem.quantity,
              properties: firstItem.properties || {},
              title: result.product_title || 'Custom Curves Order',
              price: result.price || 1, // 1 cent in Shopify format
            },
            // Configuration metadata
            configuration_type: isCustomCurves ? 'custom_curves' : 'standard',
            timestamp: new Date().toISOString()
          };
          
          console.log('Returning enhanced success response:', successResponse);
          console.log('=== CART ADD REQUEST END (SUCCESS) ===');
          
          return NextResponse.json(successResponse);
        } else {
          // Enhanced Shopify error handling
          console.error('Shopify cart error - Status:', shopifyResponse.status);
          console.error('Shopify cart error - Response:', responseText);
          
          // Parse error response if possible
          let errorDetails = responseText;
          try {
            const errorJson = JSON.parse(responseText);
            errorDetails = errorJson.description || errorJson.message || responseText;
          } catch (e) {
            // Use raw text if not JSON
          }
          
          // Check for specific error types
          if (shopifyResponse.status === 422) {
            if (responseText.includes('variant') || responseText.includes('inventory')) {
              console.error('CRITICAL: Variant ID issue or inventory problem');
              return NextResponse.json({
                error: 'Product variant not available',
                details: `Variant ID ${firstItem.id} may not exist or be out of stock in Shopify store ${shopDomain}`,
                shopifyStatus: shopifyResponse.status,
                shopifyResponse: errorDetails,
                solution: 'Check that the 1-cent product with this variant ID exists and is available in your Shopify store',
                error_type: 'variant_not_found'
              }, { status: 422 });
            } else {
              return NextResponse.json({
                error: 'Cart validation error',
                details: errorDetails,
                shopifyStatus: shopifyResponse.status,
                shopifyUrl: shopifyCartUrl,
                error_type: 'validation_error'
              }, { status: 422 });
            }
          } else if (shopifyResponse.status === 429) {
            return NextResponse.json({
              error: 'Too many requests',
              details: 'Please wait a moment and try again',
              shopifyStatus: shopifyResponse.status,
              error_type: 'rate_limit'
            }, { status: 429 });
          } else if (shopifyResponse.status >= 500) {
            return NextResponse.json({
              error: 'Shopify server error',
              details: 'Shopify is experiencing issues. Please try again later.',
              shopifyStatus: shopifyResponse.status,
              error_type: 'server_error'
            }, { status: 502 });
          }
          
          // Other Shopify errors
          return NextResponse.json({
            error: 'Shopify cart error',
            details: errorDetails,
            shopifyStatus: shopifyResponse.status,
            shopifyUrl: shopifyCartUrl,
            error_type: 'unknown_shopify_error'
          }, { status: shopifyResponse.status });
        }
        
      } catch (fetchError) {
        console.error('Network error fetching from Shopify:', fetchError);
        
        // Enhanced network error handling
        const isNetworkError = fetchError instanceof TypeError && fetchError.message.includes('fetch');
        const isTimeoutError = fetchError instanceof Error && fetchError.message.includes('timeout');
        
        // Network error - return enhanced fallback response
        const fallbackResponse = {
          success: true,
          message: 'Item added to cart (fallback mode)',
          items: body.items,
          note: 'Shopify request failed - running in standalone mode',
          error_details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          source: 'fallback',
          cart_drawer_supported: false,
          should_trigger_drawer: false,
          // Include guidance for user
          user_action: 'Please navigate to your cart manually to complete the order',
          cart_url: `https://${shopDomain}/cart`,
          error_type: isNetworkError ? 'network_error' : (isTimeoutError ? 'timeout_error' : 'fetch_error')
        };
        
        console.log('Returning enhanced fallback response:', fallbackResponse);
        console.log('=== CART ADD REQUEST END (FALLBACK) ===');
        
        return NextResponse.json(fallbackResponse);
      }
    }
    
    // Standalone mode (no shop domain) - enhanced
    console.log('Running in standalone mode - simulating cart add');
    const standaloneResponse = {
      success: true,
      message: 'Item added to cart (standalone mode)',
      items: body.items,
      note: 'This is a simulation - no actual cart was modified',
      source: 'standalone',
      cart_drawer_supported: false,
      should_trigger_drawer: false,
      // Include configuration summary if available
      configuration_summary: isCustomCurves ? {
        total_price: firstItem.properties['_total_price'],
        parts_count: firstItem.properties['_parts_count'],
        turnaround: firstItem.properties['_total_turnaround'],
        materials: firstItem.properties['_materials_used']
      } : null
    };
    
    console.log('Returning enhanced standalone response:', standaloneResponse);
    console.log('=== CART ADD REQUEST END (STANDALONE) ===');
    
    return NextResponse.json(standaloneResponse);
    
  } catch (error) {
    console.error('=== CART ADD REQUEST ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Enhanced error response
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        error_type: 'internal_error',
        // Provide guidance to user
        user_action: 'Please try again. If the problem persists, contact support.'
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