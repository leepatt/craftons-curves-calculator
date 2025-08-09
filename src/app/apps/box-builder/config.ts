// Box Builder App Configuration
// TODO: Update with actual configuration based on detailed requirements

export const boxBuilderConfig = {
  app: {
    name: 'Box Builder',
    description: 'Custom box calculations and manufacturing',
    version: '1.0.0',
    icon: '📦',
  },
  
  // Shopify integration - $1.00 variant for whole dollar pricing
  shopify: {
    productId: 'BOX_BUILDER_PRODUCT_ID', // TODO: Set actual Shopify product ID
    dollarVariantId: Number(
      process.env.NEXT_PUBLIC_BOX_BUILDER_DOLLAR_VARIANT_ID ||
      process.env.NEXT_PUBLIC_DOLLAR_VARIANT_ID ||
      process.env.BOX_BUILDER_DOLLAR_VARIANT_ID ||
      45721553469618  // Default fallback variant ID
    ),
    shopDomain: 
      process.env.NEXT_PUBLIC_BOX_BUILDER_SHOP_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOP_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN ||
      process.env.SHOPIFY_STORE_DOMAIN ||
      'craftons-au.myshopify.com', // Default fallback
  },
  
  // TODO: Define actual constraints based on manufacturing capabilities
  constraints: {
    dimensions: {
      min: 10,    // Minimum dimension in mm
      max: 3000,  // Maximum dimension in mm
    },
    quantity: {
      min: 1,
      max: 100,
    },
  },
  
  // Default values based on screenshot
  defaults: {
    width: 420,
    depth: 400,
    height: 400,
    dimensionsType: 'inside',
    boxType: 'open-top',
    joinType: 'butt-join',
    quantity: 1,
  },
  
  // TODO: Configure based on actual manufacturing processes
  manufacturing: {
    setupCost: 25,           // Base setup cost
    complexityMultiplier: 0.5, // Cost per volume unit
  },
  
  // TODO: Define visualization settings based on requirements
  visualization: {
    defaultView: '3d',       // '3d' | '2d-top' | '2d-front' | '2d-left'
    showDimensions: true,
    showMaterial: true,
    showGrid: true,
  },
} as const;

export type BoxBuilderConfig = typeof boxBuilderConfig;
