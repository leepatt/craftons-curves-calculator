import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cart storage for development testing
let localCart: any = {
  token: 'dev-local-cart-token',
  note: null,
  attributes: {},
  original_total_price: 0,
  total_price: 0,
  total_discount: 0,
  total_weight: 0,
  item_count: 0,
  items: [],
  requires_shipping: false,
  currency: 'AUD',
  items_subtotal_price: 0,
  cart_level_discount_applications: [],
  discount_codes: []
};

export async function GET() {
  console.log('[Local Cart] Getting local cart contents...');
  console.log('[Local Cart] Current items:', localCart.items.length);
  return NextResponse.json(localCart);
}

export async function POST(req: NextRequest) {
  console.log('[Local Cart] Adding item to local cart...');
  
  try {
    const body = await req.json();
    console.log('[Local Cart] Item to add:', JSON.stringify(body, null, 2));
    
    // Create a cart item similar to Shopify's format
    const cartItem = {
      id: body.id,
      properties: body.properties || {},
      quantity: body.quantity || 1,
      variant_id: body.id,
      key: `${body.id}:${Date.now()}`, // Unique key
      title: 'Custom Radius Pro Configuration',
      price: 100, // $1.00 in cents
      original_price: 100,
      discounted_price: 100,
      line_price: 100,
      original_line_price: 100,
      total_discount: 0,
      discounts: [],
      sku: '',
      grams: 0,
      vendor: 'Craftons',
      taxable: true,
      product_id: Math.floor(body.id / 1000), // Approximate product ID
      product_has_only_default_variant: false,
      gift_card: false,
      final_price: 100,
      final_line_price: 100,
      url: '/products/custom-radius-pro',
      featured_image: {
        aspect_ratio: 1.0,
        alt: 'Custom Radius Pro Configuration',
        height: 100,
        url: '/images/placeholder.png',
        width: 100
      },
      image: '/images/placeholder.png',
      handle: 'custom-radius-pro',
      requires_shipping: true,
      product_type: 'Custom Manufacturing',
      product_title: 'Custom Radius Pro Configuration',
      product_description: 'Custom curved timber element configuration',
      variant_title: 'Default Title',
      variant_options: ['Default Title'],
      options_with_values: [{ name: 'Title', value: 'Default Title' }],
      has_components: false,
      selling_plan_allocation: null,
      unit_price_measurement: null
    };
    
    // Add to cart
    localCart.items.push(cartItem);
    localCart.item_count = localCart.items.length;
    localCart.total_price += cartItem.price;
    localCart.original_total_price += cartItem.original_price;
    localCart.items_subtotal_price += cartItem.price;
    
    console.log('[Local Cart] Item added successfully. Cart now has', localCart.items.length, 'items');
    
    return NextResponse.json(cartItem);
    
  } catch (error) {
    console.error('[Local Cart] Error adding item:', error);
    return NextResponse.json(
      { error: 'Failed to add item to local cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  console.log('[Local Cart] Clearing local cart...');
  localCart = {
    token: 'dev-local-cart-token',
    note: null,
    attributes: {},
    original_total_price: 0,
    total_price: 0,
    total_discount: 0,
    total_weight: 0,
    item_count: 0,
    items: [],
    requires_shipping: false,
    currency: 'AUD',
    items_subtotal_price: 0,
    cart_level_discount_applications: [],
    discount_codes: []
  };
  
  return NextResponse.json({ message: 'Cart cleared', cart: localCart });
}







