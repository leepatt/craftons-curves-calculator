import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are available
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      return NextResponse.json({ error: 'Shopify API credentials not configured' }, { status: 500 });
    }

    const productData = await request.json();
    
    // For now, return a mock response - implement full Shopify integration after deployment
    // In production, this would create an actual product using the Shopify Admin API
    const mockProduct = {
      product: {
        id: Date.now(),
        title: productData.title,
        variants: [{
          id: Date.now() + 1,
          price: productData.variants?.[0]?.price || '0.01'
        }]
      }
    };

    return NextResponse.json(mockProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check if required environment variables are available
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      return NextResponse.json({ error: 'Shopify API credentials not configured' }, { status: 500 });
    }

    // For now, return a mock response
    return NextResponse.json({ products: [] });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// PUT method disabled for now - not needed for 1 cent rule implementation
// export async function PUT(request: NextRequest) { ... } 