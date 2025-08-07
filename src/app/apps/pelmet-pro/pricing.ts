// Pelmet Pro Pricing Logic

import { PELMET_PRO_CONFIG } from './config';

// Material interface
interface Material {
  id: string;
  name: string;
  price: number; // per m²
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

// Calculation parameters
interface PelmetProPricingParams {
  length: number;        // mm
  height: number;        // mm
  depth: number;         // mm
  quantity: number;
  material: Material;
}

// Calculation result
export interface PelmetProPricingResult {
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
  // Additional calculated values
  materialUsage: number;    // m²
  wasteAmount: number;      // m²
  totalMaterialNeeded: number; // m²
  linearMeters: number;     // total linear meters
}

/**
 * Calculate pelmet pricing based on dimensions and material
 * TODO: Implement actual pelmet-specific pricing logic
 */
export function calculatePelmetProPricing(params: PelmetProPricingParams): PelmetProPricingResult {
  const { length, height, depth, quantity, material } = params;
  
  // Basic validation
  if (length <= 0 || height <= 0 || depth <= 0 || quantity <= 0) {
    return {
      materialCost: 0,
      manufactureCost: 0,
      totalCost: 0,
      materialUsage: 0,
      wasteAmount: 0,
      totalMaterialNeeded: 0,
      linearMeters: 0,
    };
  }
  
  // TODO: Implement actual pelmet calculation logic
  // This is placeholder logic that should be replaced with real requirements
  
  // Calculate material usage (front face + top face for depth)
  const frontArea = (length * height) / 1000000; // Convert mm² to m²
  const topArea = (length * depth) / 1000000;    // Convert mm² to m²
  const materialUsagePerUnit = frontArea + topArea;
  
  // Total material usage for all units
  const totalMaterialUsage = materialUsagePerUnit * quantity;
  
  // Add waste factor
  const wasteAmount = totalMaterialUsage * PELMET_PRO_CONFIG.materialWasteFactor;
  const totalMaterialNeeded = totalMaterialUsage + wasteAmount;
  
  // Calculate costs
  const materialCost = totalMaterialNeeded * material.price;
  
  // Manufacturing cost calculation
  const linearMeters = (length / 1000) * quantity; // Convert mm to meters
  const manufactureCost = linearMeters * PELMET_PRO_CONFIG.pricing.baseManufacturingCostPerMeter;
  
  // Total cost (including GST)
  const subtotal = materialCost + manufactureCost;
  const totalCost = subtotal * (1 + PELMET_PRO_CONFIG.gstRate);
  
  return {
    materialCost: parseFloat(materialCost.toFixed(2)),
    manufactureCost: parseFloat(manufactureCost.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    materialUsage: parseFloat(totalMaterialUsage.toFixed(3)),
    wasteAmount: parseFloat(wasteAmount.toFixed(3)),
    totalMaterialNeeded: parseFloat(totalMaterialNeeded.toFixed(3)),
    linearMeters: parseFloat(linearMeters.toFixed(2)),
  };
}

/**
 * Validate pelmet dimensions against constraints
 */
export function validatePelmetDimensions(length: number, height: number, depth: number, quantity: number): string[] {
  const errors: string[] = [];
  
  // Length validation
  if (length < PELMET_PRO_CONFIG.constraints.length.min) {
    errors.push(`Length must be at least ${PELMET_PRO_CONFIG.constraints.length.min}mm`);
  }
  if (length > PELMET_PRO_CONFIG.constraints.length.max) {
    errors.push(`Length cannot exceed ${PELMET_PRO_CONFIG.constraints.length.max}mm`);
  }
  
  // Height validation
  if (height < PELMET_PRO_CONFIG.constraints.height.min) {
    errors.push(`Height must be at least ${PELMET_PRO_CONFIG.constraints.height.min}mm`);
  }
  if (height > PELMET_PRO_CONFIG.constraints.height.max) {
    errors.push(`Height cannot exceed ${PELMET_PRO_CONFIG.constraints.height.max}mm`);
  }
  
  // Depth validation
  if (depth < PELMET_PRO_CONFIG.constraints.depth.min) {
    errors.push(`Depth must be at least ${PELMET_PRO_CONFIG.constraints.depth.min}mm`);
  }
  if (depth > PELMET_PRO_CONFIG.constraints.depth.max) {
    errors.push(`Depth cannot exceed ${PELMET_PRO_CONFIG.constraints.depth.max}mm`);
  }
  
  // Quantity validation
  if (quantity < PELMET_PRO_CONFIG.constraints.quantity.min) {
    errors.push(`Quantity must be at least ${PELMET_PRO_CONFIG.constraints.quantity.min}`);
  }
  if (quantity > PELMET_PRO_CONFIG.constraints.quantity.max) {
    errors.push(`Quantity cannot exceed ${PELMET_PRO_CONFIG.constraints.quantity.max}`);
  }
  
  return errors;
}

/**
 * Generate pelmet product configuration for Shopify
 * TODO: Extend with actual pelmet specifications for manufacturing
 */
export interface PelmetProProductConfiguration {
  app: 'pelmet-pro';
  material: string;
  dimensions: {
    length: number;
    height: number;
    depth: number;
  };
  quantity: number;
  totalPrice: number;
  specifications: {
    // TODO: Add manufacturing specifications
    materialUsage: number;
    linearMeters: number;
    notes: string;
  };
}

export function generatePelmetProConfiguration(
  params: PelmetProPricingParams,
  result: PelmetProPricingResult
): PelmetProProductConfiguration {
  return {
    app: 'pelmet-pro',
    material: params.material.id,
    dimensions: {
      length: params.length,
      height: params.height,
      depth: params.depth,
    },
    quantity: params.quantity,
    totalPrice: result.totalCost,
    specifications: {
      materialUsage: result.materialUsage,
      linearMeters: result.linearMeters,
      notes: `Custom pelmet: ${params.length}×${params.height}×${params.depth}mm in ${params.material.name}`,
    },
  };
}
