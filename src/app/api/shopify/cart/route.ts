import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '../../../lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const { variantId, quantity, customAttributes } = await request.json();
    
    if (!variantId || !quantity) {
      return NextResponse.json({ error: 'Variant ID and quantity are required' }, { status: 400 });
    }

    // For private apps, you would typically use the Storefront API
    // or redirect to Shopify's cart with the product
    const shopifyCartUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/cart/add`;
    
    const cartData = {
      id: variantId,
      quantity: quantity,
      properties: customAttributes || {}
    };

    // Return the cart URL for redirect or use AJAX to add to cart
    const addToCartUrl = `${shopifyCartUrl}?${new URLSearchParams({
      'items[0][id]': variantId,
      'items[0][quantity]': quantity.toString(),
      ...Object.entries(customAttributes || {}).reduce((acc, [key, value], index) => {
        acc[`items[0][properties][${key}]`] = value as string;
        return acc;
      }, {} as Record<string, string>)
    })}`;

    return NextResponse.json({ 
      success: true,
      cartUrl: addToCartUrl,
      cartData 
    });
  } catch (error) {
    console.error('Cart error:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get cart information
    const cartUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/cart.js`;
    
    return NextResponse.json({ 
      cartUrl,
      message: 'Use Shopify\'s cart.js API to fetch cart contents' 
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json({ error: 'Failed to get cart' }, { status: 500 });
  }
} 