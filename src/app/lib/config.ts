// src/app/lib/config.ts
// Consolidated configuration for the Shopify Curves App

export const APP_CONFIG = {
  // Business Constants
  business: {
    gstRate: 0.10, // GST rate for reference (all prices below are already inclusive)
    manufactureRate: 88, // $/sheet (inc GST) - was 80, now 80 * 1.10 = 88
    manufactureAreaRate: 22, // $/m² (inc GST) - was 20, now 20 * 1.10 = 22
    defaultEfficiency: 0.5,
    maxSplits: 10,
    shopifyVariantId: 45300623343794, // Updated to correct variant ID for Radius Pro
  },

  // Materials are now loaded dynamically from /api/materials.json
  // This supports texture properties and maintains a single source of truth

  // Product Configuration
  product: {
    id: "curves",
    name: "Radius and Curves",
    description: "Custom curved timber elements",
    parameters: [
      {
        id: "radiusType",
        label: "Define Radius By",
        type: "button-group",
        defaultValue: "internal",
        options: [
          { value: "internal", label: "Internal Dimensions" },
          { value: "external", label: "External Dimensions" }
        ],
        description: "Radius: inner or outer edge."
      },
      {
        id: "specifiedRadius",
        label: "Radius Value (r)",
        type: "number",
        defaultValue: "",
        min: 1,
        max: 50000, // Increased from 5000 to allow very large radii - splitting will handle oversized parts
        step: 1,
        description: ""
      },
      {
        id: "width",
        label: "Width (w)",
        type: "number",
        defaultValue: "",
        min: 1,
        max: 1190, // Width still limited by sheet width (cannot be split)
        step: 1,
        description: ""
      },
      {
        id: "angle",
        label: "Angle (θ) (degrees)",
        type: "number",
        defaultValue: "",
        min: 1,
        max: 359.9,
        step: 0.1,
        description: "Angle of the curved segment in degrees."
      },
      {
        id: "material",
        label: "Material",
        type: "select",
        optionsSource: "materials",
        defaultValue: "",
        description: ""
      }
    ],
    derivedParameters: [
      {
        id: "arcLength",
        label: "Arc Length (L) (mm)",
        description: "Length along the outer curved edge",
        formula: "(actualOuterRadius) * (angle * Math.PI / 180)"
      },
      {
        id: "chordLength",
        label: "Chord Length (c) (mm)",
        description: "Straight-line distance between ends of the outer arc",
        formula: "2 * (actualOuterRadius) * Math.sin(angle * Math.PI / 360)"
      }
    ],
    constraints: {
      maxExternalRadius: 50000, // Increased from 5000 to allow very large radii - splitting handles oversized parts
      maxWidth: 1190, // Width still limited by sheet width (cannot be split)
      maxAngle: 360,
      minAngle: 1,
      maxChordLength: 100000, // Increased from 10000 to accommodate larger radii - splitting handles this
    }
  },

  // Efficiency Data for Pricing Calculations
  efficiency: {
    // Reference width for efficiency calculations
    referenceWidth: 100,
    
    // Sensitivity factors for width adjustments
    widthAdjustmentSensitivity: 0.5,
    minWidthAdjustmentFactor: 0.7,
    maxWidthAdjustmentFactor: 1.3,
    
    // Efficiency bounds
    minEfficiency: 0.05,
    maxEfficiency: 0.95,
    defaultEfficiency: 0.3,
    
    // Efficiency data points for calculations
    dataPoints: [
      // 90-degree angle data (width: 100mm)
      { radius: 200, angle: 90, width: 100, efficiency: 0.65 },
      { radius: 400, angle: 90, width: 100, efficiency: 0.58 },
      { radius: 600, angle: 90, width: 100, efficiency: 0.42 },
      { radius: 800, angle: 90, width: 100, efficiency: 0.44 },
      { radius: 1000, angle: 90, width: 100, efficiency: 0.38 },
      { radius: 1200, angle: 90, width: 100, efficiency: 0.34 },
      { radius: 1400, angle: 90, width: 100, efficiency: 0.39 },
      { radius: 1600, angle: 90, width: 100, efficiency: 0.25 },
      
      // 180-degree angle data (width: 100mm)
      { radius: 200, angle: 180, width: 100, efficiency: 0.30 },
      { radius: 400, angle: 180, width: 100, efficiency: 0.37 },
      { radius: 600, angle: 180, width: 100, efficiency: 0.20 },
      { radius: 800, angle: 180, width: 100, efficiency: 0.18 },
    ]
  },

  // UI Configuration
  ui: {
    // Visualizer settings
    visualizer: {
      svgViewSize: 400, // pixels
      svgPadding: 25, // pixels
      scaleFactor: 500,
      defaultDimensions: {
        radius: 900, // mm
        width: 100, // mm
        angle: 90, // degrees
        thickness: 18 // mm
      }
    },
    
    // Form input placeholders
    placeholders: {
      radius: 'mm',
      width: 'mm',
      angle: 'deg',
      arcLength: 'mm',
      chordLength: 'mm',
      qty: '',
    }
  }
};

// Legacy compatibility exports
// MATERIAL_RATES now loaded dynamically from materials.json instead of static config

export const GST_RATE = APP_CONFIG.business.gstRate;
export const SHOPIFY_VARIANT_ID = APP_CONFIG.business.shopifyVariantId;
export const EFFICIENCY = APP_CONFIG.business.defaultEfficiency;
export const MANUFACTURE_RATE = APP_CONFIG.business.manufactureRate;
export const MANUFACTURE_AREA_RATE = APP_CONFIG.business.manufactureAreaRate;
export const SVG_VIEW_SIZE = APP_CONFIG.ui.visualizer.svgViewSize;
export const SVG_PADDING = APP_CONFIG.ui.visualizer.svgPadding;
export const DEFAULT_VISUALIZER_DIMENSIONS = APP_CONFIG.ui.visualizer.defaultDimensions;
export const PLACEHOLDERS = APP_CONFIG.ui.placeholders;

// Efficiency data export for pricing utilities
export const CURVE_EFFICIENCY_RATES = APP_CONFIG.efficiency.dataPoints; 