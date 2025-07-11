import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Validation utilities for geometric calculations
export const GeometricValidation = {
  /**
   * Validates if a number is finite, positive, and within reasonable bounds
   */
  isValidPositiveNumber: (value: number, min: number = 0.001, max: number = Number.MAX_SAFE_INTEGER): boolean => {
    return Number.isFinite(value) && value > min && value <= max;
  },

  /**
   * Validates angle in degrees (0.1 to 359.9)
   */
  isValidAngle: (angle: number): boolean => {
    return Number.isFinite(angle) && angle >= 0.1 && angle <= 359.9;
  },

  /**
   * Validates radius configuration for internal/external types
   */
  isValidRadiusConfig: (specifiedRadius: number, width: number, radiusType: 'internal' | 'external'): boolean => {
    if (!GeometricValidation.isValidPositiveNumber(specifiedRadius) || 
        !GeometricValidation.isValidPositiveNumber(width)) {
      return false;
    }
    
    // For external radius, specified radius must be greater than width
    if (radiusType === 'external' && specifiedRadius <= width) {
      return false;
    }
    
    return true;
  },

  /**
   * Validates chord length against maximum possible for given radius
   */
  isValidChordLength: (chordLength: number, outerRadius: number): boolean => {
    if (!GeometricValidation.isValidPositiveNumber(chordLength) || 
        !GeometricValidation.isValidPositiveNumber(outerRadius)) {
      return false;
    }
    
    const maxChordLength = 2 * outerRadius;
    return chordLength <= maxChordLength;
  },

  /**
   * Validates calculated area
   */
  isValidArea: (area: number): boolean => {
    return Number.isFinite(area) && area > 0 && area < 1000; // Max 1000 m²
  },

  /**
   * Validates efficiency value
   */
  isValidEfficiency: (efficiency: number): boolean => {
    return Number.isFinite(efficiency) && efficiency >= 0.01 && efficiency <= 1.0;
  },

  /**
   * Validates sheet dimensions
   */
  isValidSheetDimensions: (length: number, width: number): boolean => {
    return GeometricValidation.isValidPositiveNumber(length, 100, 10000) && // 100mm to 10m
           GeometricValidation.isValidPositiveNumber(width, 100, 10000);
  },

  /**
   * Clamps a value between min and max bounds
   */
  clamp: (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Safe division that returns 0 if denominator is invalid
   */
  safeDivide: (numerator: number, denominator: number, fallback: number = 0): number => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return fallback;
    }
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : fallback;
  },

  /**
   * Safe calculation wrapper that catches errors and returns fallback
   */
  safeCalculate: <T>(calculation: () => T, fallback: T): T => {
    try {
      const result = calculation();
      return result;
    } catch (error) {
      console.warn("Calculation error caught:", error);
      return fallback;
    }
  }
};

// Calculation utilities
export const CalculationUtils = {
  /**
   * Calculate arc length with validation
   */
  calculateArcLength: (radius: number, angleInDegrees: number): number => {
    if (!GeometricValidation.isValidPositiveNumber(radius) || 
        !GeometricValidation.isValidAngle(angleInDegrees)) {
      return 0;
    }
    
    const angleInRadians = angleInDegrees * (Math.PI / 180);
    const arcLength = radius * angleInRadians;
    
    return Number.isFinite(arcLength) ? arcLength : 0;
  },

  /**
   * Calculate chord length with validation
   */
  calculateChordLength: (radius: number, angleInDegrees: number): number => {
    if (!GeometricValidation.isValidPositiveNumber(radius) || 
        !GeometricValidation.isValidAngle(angleInDegrees)) {
      return 0;
    }
    
    const angleInRadians = angleInDegrees * (Math.PI / 180);
    const chordLength = 2 * radius * Math.sin(angleInRadians / 2);
    
    return Number.isFinite(chordLength) ? chordLength : 0;
  },

  /**
   * Calculate angle from arc length with validation
   */
  calculateAngleFromArc: (arcLength: number, radius: number): number => {
    if (!GeometricValidation.isValidPositiveNumber(arcLength) || 
        !GeometricValidation.isValidPositiveNumber(radius)) {
      return 0;
    }
    
    const angleInRadians = arcLength / radius;
    const angleInDegrees = angleInRadians * (180 / Math.PI);
    
    return GeometricValidation.isValidAngle(angleInDegrees) ? angleInDegrees : 0;
  },

  /**
   * Calculate angle from chord length with validation
   */
  calculateAngleFromChord: (chordLength: number, radius: number): number => {
    if (!GeometricValidation.isValidChordLength(chordLength, radius)) {
      return 0;
    }
    
    const sinHalfAngle = chordLength / (2 * radius);
    if (sinHalfAngle > 1 || sinHalfAngle <= 0) {
      return 0;
    }
    
    const angleInRadians = 2 * Math.asin(sinHalfAngle);
    const angleInDegrees = angleInRadians * (180 / Math.PI);
    
    return GeometricValidation.isValidAngle(angleInDegrees) ? angleInDegrees : 0;
  },

  /**
   * Calculate curve area with validation
   */
  calculateCurveArea: (innerRadius: number, outerRadius: number, angleInDegrees: number): number => {
    if (!GeometricValidation.isValidPositiveNumber(innerRadius) || 
        !GeometricValidation.isValidPositiveNumber(outerRadius) || 
        !GeometricValidation.isValidAngle(angleInDegrees) ||
        outerRadius <= innerRadius) {
      return 0;
    }
    
    const areaMM2 = (angleInDegrees / 360) * Math.PI * (Math.pow(outerRadius, 2) - Math.pow(innerRadius, 2));
    const areaM2 = areaMM2 / 1000000;
    
    return GeometricValidation.isValidArea(areaM2) ? areaM2 : 0;
  }
};
