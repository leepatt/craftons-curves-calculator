import { GeometricValidation } from './utils';
import { APP_CONFIG } from './config';

export interface EfficiencyDataPoint {
  radius: number; // in mm
  angle: number;  // in degrees
  width: number;  // in mm
  efficiency: number; // decimal, e.g., 0.65 for 65%
}

// Use efficiency data from consolidated config
export const CURVE_EFFICIENCY_RATES: EfficiencyDataPoint[] = APP_CONFIG.efficiency.dataPoints;

export function calculateNestingEfficiency(
    radius: number,
    actualWidth: number,
    angle: number,
    dataset: EfficiencyDataPoint[] = CURVE_EFFICIENCY_RATES
): number {
    const { minEfficiency, maxEfficiency, defaultEfficiency, referenceWidth, widthAdjustmentSensitivity, minWidthAdjustmentFactor, maxWidthAdjustmentFactor } = APP_CONFIG.efficiency;

    // Enhanced validation using new utilities
    if (!GeometricValidation.isValidPositiveNumber(radius) || 
        !GeometricValidation.isValidPositiveNumber(actualWidth) || 
        !GeometricValidation.isValidAngle(angle)) {
        console.warn(`Invalid input parameters for efficiency calculation: radius=${radius}, width=${actualWidth}, angle=${angle}`);
        return defaultEfficiency;
    }

    // Validate dataset
    if (!dataset || dataset.length === 0) {
        console.warn("Empty or invalid efficiency dataset provided");
        return defaultEfficiency;
    }

    // Filter dataset for the given angle with validation
    const relevantData = dataset.filter(dp => {
        return GeometricValidation.isValidPositiveNumber(dp.radius) &&
               GeometricValidation.isValidAngle(dp.angle) &&
               GeometricValidation.isValidPositiveNumber(dp.width) &&
               GeometricValidation.isValidEfficiency(dp.efficiency) &&
               dp.angle === angle;
    });

    let baseEfficiencyAtRefWidth: number;

    if (relevantData.length === 0) {
        console.warn(`No valid efficiency data found for angle: ${angle} degrees. Using default efficiency.`);
        baseEfficiencyAtRefWidth = defaultEfficiency;
    } else {
        // Sort by radius for interpolation/extrapolation
        relevantData.sort((a, b) => a.radius - b.radius);

        const exactMatch = relevantData.find(dp => dp.radius === radius);
        if (exactMatch) {
            baseEfficiencyAtRefWidth = exactMatch.efficiency;
        } else if (relevantData.length === 1) {
            baseEfficiencyAtRefWidth = relevantData[0].efficiency;
        } else {
            // Enhanced interpolation/extrapolation with validation
            baseEfficiencyAtRefWidth = GeometricValidation.safeCalculate(() => {
                if (radius < relevantData[0].radius) {
                    // Extrapolate below smallest radius
                    const r1 = relevantData[0].radius;
                    const e1 = relevantData[0].efficiency;
                    const r2 = relevantData[1].radius;
                    const e2 = relevantData[1].efficiency;
                    
                    if (r2 === r1) return e1;
                    return e1 + (radius - r1) * (e2 - e1) / (r2 - r1);
                } else if (radius > relevantData[relevantData.length - 1].radius) {
                    // Extrapolate above largest radius
                    const rN_minus_1 = relevantData[relevantData.length - 2].radius;
                    const eN_minus_1 = relevantData[relevantData.length - 2].efficiency;
                    const rN = relevantData[relevantData.length - 1].radius;
                    const eN = relevantData[relevantData.length - 1].efficiency;
                    
                    if (rN === rN_minus_1) return eN;
                    return eN_minus_1 + (radius - rN_minus_1) * (eN - eN_minus_1) / (rN - rN_minus_1);
                } else {
                    // Interpolate between two radii
                    for (let i = 0; i < relevantData.length - 1; i++) {
                        if (radius >= relevantData[i].radius && radius <= relevantData[i + 1].radius) {
                            const r1 = relevantData[i].radius;
                            const e1 = relevantData[i].efficiency;
                            const r2 = relevantData[i + 1].radius;
                            const e2 = relevantData[i + 1].efficiency;
                            
                            if (r2 === r1) return e1;
                            return e1 + (radius - r1) * (e2 - e1) / (r2 - r1);
                        }
                    }
                    
                    // Fallback to closest point
                    let closestPoint = relevantData[0];
                    let minDiff = Math.abs(radius - closestPoint.radius);
                    for (let i = 1; i < relevantData.length; i++) {
                        const diff = Math.abs(radius - relevantData[i].radius);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestPoint = relevantData[i];
                        }
                    }
                    return closestPoint.efficiency;
                }
            }, defaultEfficiency);
        }
    }

    // Validate and clamp base efficiency
    if (!GeometricValidation.isValidEfficiency(baseEfficiencyAtRefWidth)) {
        console.warn(`Invalid base efficiency calculated: ${baseEfficiencyAtRefWidth}. Using default.`);
        baseEfficiencyAtRefWidth = defaultEfficiency;
    }
    
    baseEfficiencyAtRefWidth = GeometricValidation.clamp(baseEfficiencyAtRefWidth, minEfficiency, maxEfficiency);

    // Enhanced width adjustment calculation
    let widthAdjustmentFactor = 1.0;
    if (referenceWidth > 0 && actualWidth > 0) {
        const widthRatio = GeometricValidation.safeDivide(actualWidth, referenceWidth, 1.0);
        
        // Inverse relationship: larger width = lower efficiency
        widthAdjustmentFactor = 1 - widthAdjustmentSensitivity * (widthRatio - 1);
        widthAdjustmentFactor = GeometricValidation.clamp(
            widthAdjustmentFactor, 
            minWidthAdjustmentFactor, 
            maxWidthAdjustmentFactor
        );
    } else {
        console.warn(`Invalid width parameters for adjustment: actualWidth=${actualWidth}, referenceWidth=${referenceWidth}`);
    }

    // Calculate final efficiency with validation
    let finalCalculatedEfficiency = baseEfficiencyAtRefWidth * widthAdjustmentFactor;
    finalCalculatedEfficiency = GeometricValidation.clamp(finalCalculatedEfficiency, minEfficiency, maxEfficiency);

    if (!GeometricValidation.isValidEfficiency(finalCalculatedEfficiency)) {
        console.error(`Final efficiency calculation failed for radius=${radius}, angle=${angle}, width=${actualWidth}. Returning default.`);
        return defaultEfficiency;
    }

    return finalCalculatedEfficiency;
} 