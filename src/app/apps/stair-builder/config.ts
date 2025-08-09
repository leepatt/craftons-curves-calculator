// Stair Builder App Configuration
export const stairBuilderConfig = {
  app: {
    name: 'Stair Builder',
    id: 'stair-builder',
    description: 'Custom stair calculations with risers, treads, and stringers',
    version: '1.0.0'
  },
  
  // Shopify integration - TODO: Replace with actual product/variant IDs
  shopify: {
    productId: 'STAIR_BUILDER_PRODUCT_ID', // TODO: Set actual Shopify product ID
    variantId: 'STAIR_BUILDER_VARIANT_ID', // TODO: Set actual Shopify variant ID
  },
  
  // Default values for form inputs
  defaults: {
    totalRise: 2400,      // mm - typical floor-to-floor height
    stepCount: 13,        // steps
    treadDepth: 250,      // mm - comfortable step depth
    stringerWidth: 300,   // mm - support beam width
    riserHeight: 184,     // mm - calculated from totalRise/stepCount
  },
  
  // Validation constraints
  validation: {
    totalRise: { min: 1000, max: 5000 },      // mm
    stepCount: { min: 2, max: 50 },           // steps
    treadDepth: { min: 200, max: 400 },       // mm
    stringerWidth: { min: 200, max: 500 },    // mm
    riserHeight: { min: 120, max: 220 },      // mm - building code limits
  },
  
  // Pricing configuration
  pricing: {
    manufacturingCostPerStep: 25.00,  // Base cost per step for cutting/assembly
    complexityMultiplier: 1.0,        // Adjust based on stair complexity
    gstRate: 0.10,                    // 10% GST included in final price
  }
};

export type StairBuilderConfig = typeof stairBuilderConfig;
