// Box Builder App Configuration
// TODO: Update with actual configuration based on detailed requirements

export const boxBuilderConfig = {
  app: {
    name: 'Box Builder',
    description: 'Custom box calculations and manufacturing',
    version: '1.0.0',
    icon: '📦',
  },
  
  // TODO: Replace with actual Shopify product/variant IDs
  shopify: {
    productId: 'BOX_BUILDER_PRODUCT_ID', // TODO: Set actual Shopify product ID
    variantId: 'BOX_BUILDER_VARIANT_ID', // TODO: Set actual Shopify variant ID
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
