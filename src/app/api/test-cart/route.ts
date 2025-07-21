import { NextResponse } from 'next/server';

export async function GET() {
  const shopDomain = 'craftons-au.myshopify.com';
  const variantId = 45300623343794;
  
  try {
    console.log('=== CART TEST ENDPOINT ===');
    console.log('Testing cart functionality with variant:', variantId);
    
    // Test 1: Check if the cart API endpoint exists
    const testData = {
      items: [{
        id: variantId,
        quantity: 1,
        properties: {
          'Test': 'Cart functionality test',
          'Timestamp': new Date().toISOString()
        }
      }]
    };
    
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    // Test 2: Try to add to Shopify cart directly
    const shopifyCartUrl = `https://${shopDomain}/cart/add.js`;
    
    console.log('Testing Shopify cart URL:', shopifyCartUrl);
    
    try {
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
        // Success
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { rawResponse: responseText };
        }
        
        return NextResponse.json({
          success: true,
          message: 'Cart test successful',
          shopify_status: shopifyResponse.status,
          shopify_response: result,
          variant_id: variantId,
          shop_domain: shopDomain,
          test_data: testData
        });
      } else {
        // Error
        return NextResponse.json({
          success: false,
          message: 'Cart test failed',
          shopify_status: shopifyResponse.status,
          shopify_error: responseText,
          variant_id: variantId,
          shop_domain: shopDomain,
          likely_issue: shopifyResponse.status === 422 || responseText.includes('variant') 
            ? 'The 1-cent product (variant ID ' + variantId + ') may not exist in the Shopify store'
            : 'Unknown Shopify error'
        });
      }
      
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      
      return NextResponse.json({
        success: false,
        message: 'Network error testing cart',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        variant_id: variantId,
        shop_domain: shopDomain,
        likely_issue: 'Network connectivity issue or CORS problem'
      });
    }
    
  } catch (error) {
    console.error('Test error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error',
      variant_id: variantId,
      shop_domain: shopDomain
    });
  }
}

export async function POST() {
  return NextResponse.json({
    message: 'Use GET method to test cart functionality',
    instructions: 'Visit /api/test-cart to run cart tests'
  });
} 