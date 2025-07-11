import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if required environment variables are available
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      return NextResponse.json({ error: 'Shopify API credentials not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const host = searchParams.get('host');
    const code = searchParams.get('code');
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
    }

    if (!code) {
      // Redirect to Shopify OAuth
      const scopes = 'read_products,write_products,read_orders,write_orders';
      const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/shopify/auth`;
      const clientId = process.env.SHOPIFY_API_KEY;
      
      const authUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
      
      return NextResponse.redirect(authUrl);
    }

    // For now, return a mock success response
    // In production, this would exchange the code for an access token
    return NextResponse.json({ 
      success: true,
      message: 'Auth endpoint - configure for production deployment',
      shop,
      host 
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are available
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      return NextResponse.json({ error: 'Shopify API credentials not configured' }, { status: 500 });
    }

    const { code, shop } = await request.json();
    
    if (!code || !shop) {
      return NextResponse.json({ error: 'Code and shop are required' }, { status: 400 });
    }

    // For now, return a mock success response
    // In production, this would exchange the code for an access token using the Shopify Admin API
    return NextResponse.json({ 
      success: true,
      message: 'Auth callback - configure for production deployment',
      shop 
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.json({ error: 'Authentication callback failed' }, { status: 500 });
  }
} 