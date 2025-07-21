import { NextResponse } from 'next/server';
import { createSession, getProducts } from '@/lib/shopify';

export async function GET() {
  try {
    console.log('=== SHOPIFY API TEST ENDPOINT ===');
    
    // Get the access token from environment variable
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'SHOPIFY_ADMIN_ACCESS_TOKEN environment variable is not set',
        message: 'Please set the SHOPIFY_ADMIN_ACCESS_TOKEN environment variable and restart the app'
      }, { status: 500 });
    }

    console.log('Access token found, testing Shopify API connection...');
    console.log('Token preview:', `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 4)}`);

    // Create a session
    const session = createSession(accessToken);
    console.log('Session created for shop:', session.shop);

    // Test 1: Get store products (simple API call)
    console.log('Testing API call: Getting products...');
    const productsResult = await getProducts(session, 5);
    
    if (productsResult && productsResult.products) {
      return NextResponse.json({
        success: true,
        message: 'Shopify API key is working correctly!',
        test_results: {
          access_token_status: 'Valid',
          shop_domain: session.shop,
          products_found: productsResult.products.length,
          api_version: '2024-01',
          test_timestamp: new Date().toISOString()
        },
        sample_products: productsResult.products.slice(0, 3).map((p: { id: number; title: string; status: string; }) => ({
          id: p.id,
          title: p.title,
          status: p.status
        }))
      });
    } else {
      throw new Error('Unexpected API response format');
    }

  } catch (error) {
    console.error('Shopify API test failed:', error);
    
    // Analyze the error to provide helpful feedback
    let errorMessage = 'Unknown error occurred';
    let errorCode = 500;
    const suggestions: string[] = [];

    const errorMessageString = error instanceof Error ? error.message : String(error);

    if (errorMessageString.includes('401') || errorMessageString.includes('Unauthorized')) {
      errorMessage = 'Invalid access token - 401 Unauthorized';
      errorCode = 401;
      suggestions.push('Check that your access token is correct');
      suggestions.push('Ensure the token has the required permissions (read_products, write_products, etc.)');
    } else if (errorMessageString.includes('403') || errorMessageString.includes('Forbidden')) {
      errorMessage = 'Access forbidden - insufficient permissions';
      errorCode = 403;
      suggestions.push('Check that your app has the required scopes');
      suggestions.push('Ensure the token is associated with the correct Shopify store');
    } else if (errorMessageString.includes('404')) {
      errorMessage = 'Store not found or API endpoint not accessible';
      errorCode = 404;
      suggestions.push('Verify the shop domain is correct');
      suggestions.push('Check that the Shopify store exists and is accessible');
    } else if (errorMessageString.includes('network') || errorMessageString.includes('fetch')) {
      errorMessage = 'Network error connecting to Shopify';
      errorCode = 502;
      suggestions.push('Check your internet connection');
      suggestions.push('Verify Shopify services are operational');
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      error_details: errorMessageString || String(error),
      suggestions,
      test_timestamp: new Date().toISOString()
    }, { status: errorCode });
  }
} 