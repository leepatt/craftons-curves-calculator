import { stairBuilderConfig } from './config';

// Material interface matching materials.json
interface Material {
  id: string;
  name: string;
  price: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

// Stair calculation result interface
export interface StairCalculationResult {
  // Basic measurements
  steps: number;
  totalRise: number;
  totalRun: number;
  riserHeight: number;
  
  // Material requirements
  materialArea: number;
  sheetsRequired: number;
  wastePercentage: number;
  
  // Cost breakdown
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
  
  // Additional calculations
  stringerLength: number;
  treadArea: number;
  isValid: boolean;
  validationMessages: string[];
}

// Main calculation function
export function calculateStairPricing(
  totalRise: number,
  stepCount: number,
  treadDepth: number,
  stringerWidth: number,
  material: Material
): StairCalculationResult {
  const validationMessages: string[] = [];
  
  // Input validation
  if (totalRise <= 0 || stepCount <= 0 || treadDepth <= 0 || stringerWidth <= 0) {
    return createEmptyResult(validationMessages);
  }
  
  // Calculate basic dimensions
  const riserHeight = totalRise / stepCount;
  const totalRun = (stepCount - 1) * treadDepth;
  
  // Validate against building codes (Australian standards as example)
  if (riserHeight < stairBuilderConfig.validation.riserHeight.min) {
    validationMessages.push(`Riser height too low (${riserHeight.toFixed(1)}mm). Minimum: ${stairBuilderConfig.validation.riserHeight.min}mm`);
  }
  if (riserHeight > stairBuilderConfig.validation.riserHeight.max) {
    validationMessages.push(`Riser height too high (${riserHeight.toFixed(1)}mm). Maximum: ${stairBuilderConfig.validation.riserHeight.max}mm`);
  }
  
  // TODO: Implement more detailed stair calculations
  // This is placeholder logic - replace with detailed engineering calculations
  
  // Calculate material requirements (simplified)
  const stringerLength = Math.sqrt(totalRise * totalRise + totalRun * totalRun);
  const stringerArea = (stringerLength * stringerWidth * 2) / 1000000; // 2 stringers, convert mm² to m²
  const treadArea = (stepCount * treadDepth * 300) / 1000000; // Assume 300mm tread width, convert to m²
  const totalMaterialArea = stringerArea + treadArea;
  
  // Calculate sheet requirements
  const sheetArea = (material.sheet_width * material.sheet_height) / 1000000; // Convert to m²
  const sheetsRequired = Math.ceil(totalMaterialArea / sheetArea);
  const wastePercentage = ((sheetsRequired * sheetArea - totalMaterialArea) / totalMaterialArea) * 100;
  
  // Cost calculations
  const materialCost = totalMaterialArea * material.price;
  const manufactureCost = stepCount * stairBuilderConfig.pricing.manufacturingCostPerStep;
  const subtotal = materialCost + manufactureCost;
  const totalCost = subtotal * (1 + stairBuilderConfig.pricing.gstRate);
  
  const isValid = validationMessages.length === 0;
  
  return {
    steps: stepCount,
    totalRise,
    totalRun,
    riserHeight,
    materialArea: totalMaterialArea,
    sheetsRequired,
    wastePercentage,
    materialCost,
    manufactureCost,
    totalCost,
    stringerLength,
    treadArea,
    isValid,
    validationMessages
  };
}

// Helper function for empty/invalid results
function createEmptyResult(validationMessages: string[]): StairCalculationResult {
  return {
    steps: 0,
    totalRise: 0,
    totalRun: 0,
    riserHeight: 0,
    materialArea: 0,
    sheetsRequired: 0,
    wastePercentage: 0,
    materialCost: 0,
    manufactureCost: 0,
    totalCost: 0,
    stringerLength: 0,
    treadArea: 0,
    isValid: false,
    validationMessages
  };
}

// Product configuration for Shopify cart
export interface StairProductConfiguration {
  app: 'stair-builder';
  material: string;
  specifications: {
    totalRise: number;
    stepCount: number;
    treadDepth: number;
    stringerWidth: number;
    riserHeight: number;
    totalRun: number;
    stringerLength: number;
  };
  pricing: {
    materialCost: number;
    manufactureCost: number;
    totalCost: number;
    materialArea: number;
    sheetsRequired: number;
  };
  totalPrice: number;
}

// Generate configuration for cart
export function generateStairConfiguration(
  calculation: StairCalculationResult,
  materialId: string
): StairProductConfiguration {
  return {
    app: 'stair-builder',
    material: materialId,
    specifications: {
      totalRise: calculation.totalRise,
      stepCount: calculation.steps,
      treadDepth: calculation.totalRun / (calculation.steps - 1), // Back-calculate tread depth
      stringerWidth: 0, // TODO: Add to calculation result
      riserHeight: calculation.riserHeight,
      totalRun: calculation.totalRun,
      stringerLength: calculation.stringerLength,
    },
    pricing: {
      materialCost: calculation.materialCost,
      manufactureCost: calculation.manufactureCost,
      totalCost: calculation.totalCost,
      materialArea: calculation.materialArea,
      sheetsRequired: calculation.sheetsRequired,
    },
    totalPrice: calculation.totalCost
  };
}
