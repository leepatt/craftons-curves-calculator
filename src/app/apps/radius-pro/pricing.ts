import { Material } from '@/types';
import {
  MANUFACTURE_RATE,
  MANUFACTURE_AREA_RATE,
  EFFICIENCY,
  APP_CONFIG,
} from '@/lib/config';
import { calculateNestingEfficiency, CURVE_EFFICIENCY_RATES } from '@/lib/pricingUtils';

export interface RadiusProCalculation {
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
  // App-specific calculated values
  area: number;
  efficiency: number;
  materialUsed: number;
  cutTime: number;
  wastage: number;
}

export const calculateRadiusProPricing = (
  material: Material,
  innerRadius: number,
  width: number,
  angle: number,
  quantity: number = 1
): RadiusProCalculation => {
  // Calculate area
  const outerRadius = innerRadius + width;
  const angleRad = (angle * Math.PI) / 180;
  const area = (angleRad / (2 * Math.PI)) * Math.PI * (Math.pow(outerRadius, 2) - Math.pow(innerRadius, 2));
  const areaM2 = area / 1000000; // Convert mm² to m²
  
  // Calculate nesting efficiency for curved parts
  const efficiency = calculateNestingEfficiency(innerRadius, width, angle, CURVE_EFFICIENCY_RATES);
  
  // Calculate material usage with efficiency
  const materialUsed = areaM2 / efficiency;
  
  // Material cost calculation
  const materialCost = materialUsed * material.rate_per_m2 * quantity;
  
  // Manufacturing cost based on area and complexity
  const cutTime = (areaM2 * 1.5) / 100; // Estimate cutting time with curve complexity
  const manufactureCost = (MANUFACTURE_RATE * cutTime + MANUFACTURE_AREA_RATE * areaM2) * quantity;
  
  // Total cost including GST
  const totalCost = materialCost + manufactureCost;
  
  return {
    materialCost,
    manufactureCost,
    totalCost,
    area: areaM2,
    efficiency,
    materialUsed,
    cutTime,
    wastage: materialUsed - areaM2
  };
};
