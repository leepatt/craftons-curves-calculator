// Pelmet Pro App Configuration

export const PELMET_PRO_CONFIG = {
  // App identification
  appName: 'pelmet-pro',
  displayName: 'Pelmet Pro',
  version: '1.0.0',
  
  // Shopify integration (TODO: Replace with actual product/variant IDs)
  shopify: {
    productId: 'PELMET_PRO_PRODUCT_ID', // TODO: Set actual Shopify product ID
    variantId: 'PELMET_PRO_VARIANT_ID', // TODO: Set actual Shopify variant ID
  },
  
  // Default values for form inputs
  defaults: {
    length: 2400,     // mm
    height: 100,      // mm (Front panel height)
    depth: 100,       // mm (Return depth)
    quantity: 1,
    materialId: 'mdf-15mm',
    pelmetType: 'c-channel',
    ceilingPlasterDeduction: false,
    addEndCaps: false,
  },
  
  // Validation constraints
  constraints: {
    length: {
      min: 100,       // mm
      max: 5000,      // mm
      step: 1,
    },
    height: {
      min: 50,        // mm
      max: 500,       // mm
      step: 1,
    },
    depth: {
      min: 20,        // mm
      max: 200,       // mm
      step: 1,
    },
    quantity: {
      min: 1,
      max: 50,
      step: 1,
    },
  },
  
  // Pelmet-specific configuration options
  features: {
    pelmetTypes: [
      {
        id: 'c-channel',
        name: 'C-Channel Pelmet',
        description: 'Inverted C-shaped design'
      },
      {
        id: 'l-shaped',
        name: 'L-Shaped Pelmet',
        description: 'Traditional L-shaped design'
      }
    ],
    options: [
      {
        id: 'ceilingPlasterDeduction',
        name: 'Ceiling Plaster Deduction',
        description: 'Account for ceiling plaster thickness'
      },
      {
        id: 'addEndCaps',
        name: 'Add End Caps',
        description: 'Closed ends for a finished look'
      }
    ]
  },
  
  // Pricing configuration
  pricing: {
    // Base manufacturing cost per linear meter
    baseManufacturingCostPerMeter: 25.0,
    
    // Additional costs (TODO: Implement based on requirements)
    complexityMultipliers: {
      straight: 1.0,
      curved: 1.5,
      decorative: 2.0,
    },
    
    // Minimum order value
    minimumOrderValue: 50.0,
  },
  
  // Material waste factor (percentage)
  materialWasteFactor: 0.1, // 10% waste
  
  // GST rate
  gstRate: 0.1, // 10%
} as const;

export type PelmetProConfig = typeof PELMET_PRO_CONFIG;
