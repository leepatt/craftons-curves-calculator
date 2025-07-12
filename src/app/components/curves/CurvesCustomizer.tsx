'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique IDs
import { CurvesBuilderForm } from './CurvesBuilderForm';
import CurvesVisualizer from './CurvesVisualizer';
import { Button } from '@/components/ui/button';
import { ProductDefinition, ProductConfiguration, Material, PartListItem } from '@/types'; // Added PartListItem
import { AlertTriangle, Trash2, PlusCircle, Sheet, RotateCcw, X } from 'lucide-react'; // Added X for delete icon
import { Separator } from "@/components/ui/separator"; // Added Separator
import { ScrollArea } from "@/components/ui/scroll-area"; // Added ScrollArea
import {
    MANUFACTURE_RATE, // inc GST
    MANUFACTURE_AREA_RATE, // inc GST
    EFFICIENCY, // General efficiency for non-curve parts (used in weighted average)
    APP_CONFIG,
} from '@/lib/config';
// Import the efficiency calculation logic
import { calculateNestingEfficiency, CURVE_EFFICIENCY_RATES } from '@/lib/pricingUtils';
import { getApiBasePath } from '@/lib/utils';

// Define Props Interface (Ensuring it exists)
interface CurvesCustomizerProps {
  onBack: () => void;
}

// Pricing interface - all prices are GST-inclusive as per Shopify standard
interface TotalPriceDetails {
    materialCost: number; // inc GST
    manufactureCost: number; // inc GST
    partIdEngravingCost: number; // inc GST - $1.50 per part (including splits)
    totalIncGST: number; // Total price (all components already inc GST)
    sheetsByMaterial: { [materialId: string]: number }; // Track sheets per material
    totalPartCount: number; // Total number of parts for engraving (including splits)
}

// Interface for derived measurements (remains the same)
// Note: DerivedMeasurements interface removed as it's not currently used

// Interface for split information (remains the same)
interface SplitInfo {
  isTooLarge: boolean;
  numSplits: number;
}

// Helper function to calculate internal radius and create display string
const getInternalRadiusDisplay = (part: PartListItem): { internalRadius: number, displayString: string } => {
  const specifiedRadius = Number(part.config.specifiedRadius);
  const width = Number(part.config.width);
  const angle = Number(part.config.angle);
  const radiusType = part.config.radiusType as 'internal' | 'external';
  
  let internalRadius: number;
  let radiusMarker: string;
  
  if (radiusType === 'internal') {
    internalRadius = specifiedRadius;
    radiusMarker = 'R'; // Internal radius specified
  } else {
    internalRadius = specifiedRadius - width;
    radiusMarker = 'R(int)'; // Internal radius calculated from external
  }
  
  // Ensure internal radius is not negative
  internalRadius = Math.max(0, internalRadius);
  
  const displayString = `${radiusMarker}:${internalRadius} W:${width} A:${angle}°`;
  
  return { internalRadius, displayString };
};

const R_PLACEHOLDER = 900;
const W_PLACEHOLDER = 100;
const A_PLACEHOLDER = 90;
const THICKNESS_PLACEHOLDER = 18; // Default thickness if no material for placeholder
const RADIUS_TYPE_PLACEHOLDER = 'internal'; // For placeholder, assume radiusType is 'internal' and R_PLACEHOLDER is inner radius

const getDefaultConfig = (): ProductConfiguration => ({
  material: 'form-17', // Default to FORMPLY
  radiusType: 'internal', // Default radiusType
  specifiedRadius: '',   // New field, formerly radius
  width: '',   
  angle: '',   
  // Other parameters will be added from product definition with their API defaults
});


const CurvesCustomizer: React.FC<CurvesCustomizerProps> = () => {
  // State specific to Curves Builder
  const [product, setProduct] = useState<ProductDefinition | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ProductConfiguration>(getDefaultConfig());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);

  // State for the list of parts added by the user
  const [partsList, setPartsList] = useState<PartListItem[]>([]);
  // State for the quantity of the part currently being configured
  const [currentPartQuantity, setCurrentPartQuantity] = useState<number>(1);
  
  // State for the calculated quote FOR THE ENTIRE partsList
  const [totalPriceDetails, setTotalPriceDetails] = useState<TotalPriceDetails | null>(null);
  const [totalTurnaround, setTotalTurnaround] = useState<number | null>(null); // Represents max turnaround
  
  // State for part ID engraving option
  const [isEngravingEnabled, setIsEngravingEnabled] = useState<boolean>(true); // Default to enabled

  // State for derived measurements of the CURRENTLY configured part - now computed in displayDerivedMeasurements
  // State for split information of the CURRENTLY configured part
  const [splitInfo, setSplitInfo] = useState<SplitInfo>({
    isTooLarge: false,
    numSplits: 1
  });

  // State for split line hover (remains the same)
  const [splitLinesHovered, setSplitLinesHovered] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null); // New state for focused field
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null); // State for selected part to view in visualizer
  
  // Add loading state for add to cart
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);

  // --- Data Fetching (remains largely the same) ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      setProduct(null);
      setTotalPriceDetails(null);
      setTotalTurnaround(null);
      try {
        const basePath = getApiBasePath();
        const productUrl = `${basePath}/api/products/curves.json`;
        console.log('[CurvesCustomizer] Fetching product from URL:', productUrl);
        
        const productRes = await fetch(productUrl);
        console.log('[CurvesCustomizer] Product fetch response status:', productRes.status);
        
        if (!productRes.ok) throw new Error(`Failed to fetch product: ${productRes.statusText} (Status: ${productRes.status})`);
        const productData: ProductDefinition = await productRes.json();
        console.log('[CurvesCustomizer] Product loaded successfully');
        setProduct(productData);

        const initialConfig = getDefaultConfig();
        productData.parameters.forEach(param => {
          // Add all params to initialConfig, using their defaultValue from JSON if defined, 
          // otherwise they'll keep what getDefaultConfig set (e.g. '' for core, 'internal' for radiusType)
          if (!Object.prototype.hasOwnProperty.call(initialConfig, param.id) || initialConfig[param.id] === undefined) {
            initialConfig[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
          }
        });
        setCurrentConfig(initialConfig);
        setCurrentPartQuantity(1);

      } catch (err: unknown) {
        console.error("Failed to load Curves product data:", err);
        const errorMessage = (err instanceof Error) ? err.message : 'Failed to load configuration data.';
        setError(errorMessage);
        setProduct(null);
        setCurrentConfig(getDefaultConfig()); // Reset to default on error
        setMaterials(null);
        setTotalPriceDetails(null);
        setTotalTurnaround(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Effect to fetch materials 
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const basePath = getApiBasePath();
        const url = `${basePath}/api/materials.json`;
        console.log('[CurvesCustomizer] Fetching materials from URL:', url);
        
        const response = await fetch(url);
        console.log('[CurvesCustomizer] Materials fetch response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch materials: ${response.statusText} (Status: ${response.status})`);
        }
        const data: Material[] = await response.json();
        console.log('[CurvesCustomizer] Materials loaded successfully:', data.length, 'materials');
        setMaterials(data);
        // DO NOT set default material here anymore, user must select.
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error fetching materials';
        console.error("[CurvesCustomizer] Error fetching materials:", message);
        console.error("[CurvesCustomizer] Full error:", err);
        setMaterials(null);
      }
    };

    if (!error) { // Only fetch if no initial error
        fetchMaterials();
    }
  // Removed currentConfig from dependencies to prevent re-fetching material when config changes to empty
  }, [error, product]);


  // Determine if the current configuration is incomplete for actual part calculation
  const isConfigIncomplete = !(
      currentConfig.material && currentConfig.material !== '' &&
      currentConfig.radiusType && (currentConfig.radiusType === 'internal' || currentConfig.radiusType === 'external') &&
      Number(currentConfig.specifiedRadius) > 0 &&
      Number(currentConfig.width) > 0 && // Width must be > 0 now
      Number(currentConfig.angle) > 0
  );

  // Calculate actual inner and outer radii based on currentConfig or placeholder values
  const getActualRadii = () => {
    // Use actual user input values when available, only fall back to placeholders for truly empty fields
    const rType = (currentConfig.radiusType && (currentConfig.radiusType === 'internal' || currentConfig.radiusType === 'external')) 
      ? currentConfig.radiusType as 'internal' | 'external' 
      : RADIUS_TYPE_PLACEHOLDER;
    
    const userSpecifiedRadius = Number(currentConfig.specifiedRadius);
    const specRad = (!isNaN(userSpecifiedRadius) && userSpecifiedRadius > 0) 
      ? userSpecifiedRadius 
      : R_PLACEHOLDER;
    
    const userWidth = Number(currentConfig.width);
    const w = (!isNaN(userWidth) && userWidth > 0) 
      ? userWidth 
      : W_PLACEHOLDER;

    let actualInnerR = 0;
    let actualOuterR = 0;

    if (rType === 'internal') {
      actualInnerR = specRad;
      actualOuterR = specRad + w;
    } else { // external
      actualOuterR = specRad;
      actualInnerR = specRad - w;
    }
    // Ensure inner radius is not negative (validation should prevent this for user input)
    if (actualInnerR < 0) actualInnerR = 0; 
    return { actualInnerRadius: actualInnerR, actualOuterRadius: actualOuterR };
  };

  const { actualInnerRadius, actualOuterRadius } = getActualRadii();

  const userAngle = Number(currentConfig.angle);
  const effectiveAngle = (!isNaN(userAngle) && userAngle > 0) ? userAngle : A_PLACEHOLDER;

  // --- Derived Measurements & Split Info for CURRENT Config (or placeholder) ---
  useEffect(() => {
    const angleNum = Number(effectiveAngle);

    // Enhanced validation for geometric properties
    if (isNaN(actualOuterRadius) || actualOuterRadius <= 0 || isNaN(angleNum) || angleNum <= 0 || angleNum > 360) {
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }

    // Enhanced Split Info Logic
    if (isConfigIncomplete || !currentConfig.material || !materials || materials.length === 0) {
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }

    const selectedMaterial = materials.find(m => m.id === (currentConfig.material as string));
    
    // Enhanced material validation
    if (!selectedMaterial || 
        !selectedMaterial.sheet_length_mm || 
        !selectedMaterial.sheet_width_mm || 
        selectedMaterial.sheet_length_mm <= 0 || 
        selectedMaterial.sheet_width_mm <= 0) {
      console.warn(`Invalid material data for ID: ${currentConfig.material}. Defaulting to no split.`);
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }

    const sheetL = selectedMaterial.sheet_length_mm;
    const sheetW = selectedMaterial.sheet_width_mm;
    const partConfigWidth = Number(currentConfig.width);

    // Enhanced width validation
    if (isNaN(partConfigWidth) || partConfigWidth <= 0) {
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }
    
    // Determine available sheet length for chord with improved logic
    let availableSheetLengthForChord: number;
    const minSheetDimension = Math.min(sheetL, sheetW);
    const maxSheetDimension = Math.max(sheetL, sheetW);
    
    if (partConfigWidth <= minSheetDimension) {
      // Part width fits in smaller dimension, chord can use larger dimension
      availableSheetLengthForChord = maxSheetDimension;
    } else if (partConfigWidth <= maxSheetDimension) {
      // Part width only fits in larger dimension, chord must use smaller dimension
      availableSheetLengthForChord = minSheetDimension;
    } else {
      // Part width exceeds both sheet dimensions - this is a fundamental issue
      console.warn(`Part width (${partConfigWidth}mm) exceeds maximum sheet dimension (${maxSheetDimension}mm)`);
      setSplitInfo({ isTooLarge: true, numSplits: 1 });
      return;
    }

    // Additional safety check for available length
    if (availableSheetLengthForChord <= 0) {
      console.error(`Invalid available sheet length calculated: ${availableSheetLengthForChord}mm`);
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }

    // Calculate chord length for split calculations
    const angleRad = angleNum * (Math.PI / 180);
    
    // FIXED: For angles > 180°, the piece spans the full diameter
    let chord_N1;
    if (angleNum > 180) {
      chord_N1 = 2 * actualOuterRadius; // Diameter for any angle > 180°
    } else {
      chord_N1 = 2 * actualOuterRadius * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
    }

    if (chord_N1 <= availableSheetLengthForChord) {
      // The part fits in a single sheet
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
    } else {
      // FIXED: The part needs to be split - calculate based on maximum angle that fits
      
      // Find the maximum angle that produces a chord that fits on the sheet
      // chord = 2 * R * sin(angle/2) ≤ availableSheetLength
      // sin(angle/2) ≤ availableSheetLength / (2 * R)
      // angle/2 ≤ arcsin(availableSheetLength / (2 * R))
      // angle ≤ 2 * arcsin(availableSheetLength / (2 * R))
      
      const maxSinValue = availableSheetLengthForChord / (2 * actualOuterRadius);
      
      if (maxSinValue >= 1) {
        // Sheet is large enough for any angle (shouldn't happen if we're here)
        setSplitInfo({ isTooLarge: false, numSplits: 1 });
        return;
      }
      
      if (maxSinValue <= 0) {
        // Radius is too large for any reasonable split
        console.warn(`Radius ${actualOuterRadius}mm is too large for sheet ${availableSheetLengthForChord}mm`);
        setSplitInfo({ isTooLarge: true, numSplits: 10 }); // Max splits
        return;
      }
      
      // Calculate maximum angle that fits (in degrees)
      const maxAngleRad = 2 * Math.asin(maxSinValue);
      const maxAngleDeg = maxAngleRad * (180 / Math.PI);
      
      // Calculate how many splits we need
      let numSplitsCalc = Math.ceil(angleNum / maxAngleDeg);
      
      // Apply reasonable limits
      const MAX_ALLOWED_SPLITS = 20; // Increased from 10 for very large parts
      numSplitsCalc = Math.max(2, Math.min(numSplitsCalc, MAX_ALLOWED_SPLITS));
      
      // Validate that splitting will actually work
      const splitAngle = angleNum / numSplitsCalc;
      // FIXED: Apply same logic for split chord calculation
      let splitChordLength;
      if (splitAngle > 180) {
        splitChordLength = 2 * actualOuterRadius; // Diameter for split angles > 180°
      } else {
        splitChordLength = 2 * actualOuterRadius * Math.sin((splitAngle * Math.PI / 180) / 2);
      }
      
      if (splitChordLength > availableSheetLengthForChord) {
        console.warn(`Split calculation insufficient. Split chord: ${splitChordLength.toFixed(2)}mm, Available: ${availableSheetLengthForChord}mm. Need more splits.`);
        // Force more splits if needed
        numSplitsCalc = Math.min(MAX_ALLOWED_SPLITS, numSplitsCalc + 1);
      }
      
      setSplitInfo({ isTooLarge: true, numSplits: numSplitsCalc });
    }

  }, [
    actualOuterRadius, 
    effectiveAngle, 
    currentConfig.material, 
    currentConfig.width,
    materials,
    isConfigIncomplete
  ]);


  // --- NEW: Main Pricing Calculation for the ENTIRE Parts List ---
  useEffect(() => {
    if (partsList.length === 0 || !materials) {
        setTotalPriceDetails(null);
        setTotalTurnaround(null);
        return;
    }

    try {
        let totalMaterialCost = 0;
        let totalManufactureCost = 0;
        let overallMaxTurnaround = 0;
        const sheetsByMaterial: { [materialId: string]: number } = {};

        // Group parts by material
        const groupedByMaterial: { [materialId: string]: PartListItem[] } = {};
        partsList.forEach(part => {
            const matId = part.config.material as string;
            if (!groupedByMaterial[matId]) {
                groupedByMaterial[matId] = [];
            }
            groupedByMaterial[matId].push(part);
        });

        // Process each material group
        for (const materialId_loopVariable in groupedByMaterial) {
            const groupItems = groupedByMaterial[materialId_loopVariable];
            const selectedMaterial = materials.find(m => m.id === materialId_loopVariable);

            if (!selectedMaterial) {
                console.error(`Material details not found for ID: ${materialId_loopVariable}. Skipping group.`);
                continue; 
            }

            let sumOfWeightedEfficiencies = 0;
            let sumOfTotalAreas = 0;

            // FIXED: Calculate area and efficiency for this material group
            groupItems.forEach(item => {
                // COMPREHENSIVE EFFICIENCY MODEL - Based on real-world nesting physics
                let effectiveEfficiency = item.itemIdealEfficiency;
                
                if (item.numSplits > 1) {
                    const anglePerSplit = Number(item.config.angle) / item.numSplits;
                    const outerRadius = item.config.radiusType === 'external' 
                        ? Number(item.config.specifiedRadius)
                        : Number(item.config.specifiedRadius) + Number(item.config.width);
                    
                    // PHYSICS-BASED EFFICIENCY CALCULATION
                    // Key insight: Large radius + many splits = pieces approach straight rectangles
                    
                    // 1. Base efficiency improvement from splitting
                    let splitEfficiencyBonus = 0;
                    
                    // 2. Radius factor - larger radius means straighter pieces
                    let radiusFactor = 1.0;
                    if (outerRadius >= 5000) {
                        radiusFactor = 1.4; // Very large radius - pieces are nearly straight
                    } else if (outerRadius >= 3000) {
                        radiusFactor = 1.3; // Large radius - good straightness
                    } else if (outerRadius >= 1500) {
                        radiusFactor = 1.2; // Medium-large radius
                    } else if (outerRadius >= 800) {
                        radiusFactor = 1.1; // Medium radius
                    }
                    
                    // 3. Angle-based efficiency (smaller angles nest better)
                    if (anglePerSplit <= 15) {
                        // Ultra-small pieces: almost like straight strips
                        splitEfficiencyBonus = 0.30 * radiusFactor; // Reduced from 0.45 - was too optimistic
                    } else if (anglePerSplit <= 25) {
                        // Very small pieces: excellent nesting
                        splitEfficiencyBonus = 0.25 * radiusFactor; // Reduced from 0.38
                    } else if (anglePerSplit <= 40) {
                        // Small pieces: very good nesting  
                        splitEfficiencyBonus = 0.20 * radiusFactor; // Reduced from 0.30
                    } else if (anglePerSplit <= 60) {
                        // Medium pieces: good nesting
                        splitEfficiencyBonus = 0.15 * radiusFactor; // Reduced from 0.22
                    } else if (anglePerSplit <= 90) {
                        // Larger pieces: moderate improvement
                        splitEfficiencyBonus = 0.10 * radiusFactor; // Reduced from 0.15
                    } else {
                        // Large split pieces: minimal improvement
                        splitEfficiencyBonus = 0.05 * radiusFactor; // Reduced from 0.08
                    }
                    
                    // 4. Split count bonus - more splits generally mean better utilization
                    let splitCountMultiplier = 1.0;
                    if (item.numSplits >= 15) {
                        splitCountMultiplier = 1.08; // Reduced from 1.15 - was too aggressive
                    } else if (item.numSplits >= 10) {
                        splitCountMultiplier = 1.05; // Reduced from 1.10
                    } else if (item.numSplits >= 6) {
                        splitCountMultiplier = 1.02; // Reduced from 1.05
                    }
                    
                    // Apply all factors
                    effectiveEfficiency = item.itemIdealEfficiency + (splitEfficiencyBonus * splitCountMultiplier);
                    
                    // Cap at realistic maximum - professional software achieves 70% max for curves
                    effectiveEfficiency = Math.min(0.70, effectiveEfficiency); // Increased from 0.65
                    
                    // Internal testing log for validation
                    if (item.numSplits > 5) {
                        console.log(`Efficiency Test - R:${outerRadius} Splits:${item.numSplits} AnglePerSplit:${anglePerSplit.toFixed(1)}° → Efficiency:${(effectiveEfficiency*100).toFixed(1)}%`);
                    }
                }
                
                // Total area calculation remains the same - splits don't change total material needed
                const itemTotalArea = item.singlePartAreaM2 * item.numSplits * item.quantity;
                sumOfWeightedEfficiencies += itemTotalArea * effectiveEfficiency;
                sumOfTotalAreas += itemTotalArea;
            });

            // Calculate group nesting efficiency 
            let groupNestingEfficiency = EFFICIENCY; 
            if (sumOfTotalAreas > 0 && !isNaN(sumOfWeightedEfficiencies)) {
                groupNestingEfficiency = sumOfWeightedEfficiencies / sumOfTotalAreas;
                groupNestingEfficiency = Math.max(0.05, Math.min(0.85, groupNestingEfficiency)); 
            } else if (sumOfTotalAreas <= 0) {
                console.warn(`Zero total area for material group ${materialId_loopVariable}. Using default efficiency.`);
                groupNestingEfficiency = EFFICIENCY;
            }
            
            if (isNaN(groupNestingEfficiency)) { 
                console.error(`NaN calculated for group efficiency (Material: ${materialId_loopVariable}). Using fallback.`);
                groupNestingEfficiency = EFFICIENCY;
            }

            // Calculate sheet area
            const materialSheetAreaM2 = (selectedMaterial.sheet_length_mm / 1000) * (selectedMaterial.sheet_width_mm / 1000);
            const defaultSheetAreaFallback = 2.88;
            const currentSheetAreaM2 = materialSheetAreaM2 > 0 ? materialSheetAreaM2 : defaultSheetAreaFallback;

            // FIXED: Calculate sheets needed with improved efficiency for split parts
            const sheetsNeededForGroup = sumOfTotalAreas > 0 && currentSheetAreaM2 > 0 && groupNestingEfficiency > 0
                ? Math.ceil(sumOfTotalAreas / (currentSheetAreaM2 * groupNestingEfficiency))
                : 0;

            sheetsByMaterial[materialId_loopVariable] = sheetsNeededForGroup;

            // Calculate costs for this material group
            const materialCostForGroup = sheetsNeededForGroup * selectedMaterial.sheet_price;
            const manufactureCostForGroup = MANUFACTURE_RATE * sheetsNeededForGroup + sumOfTotalAreas * MANUFACTURE_AREA_RATE;

            totalMaterialCost += materialCostForGroup;
            totalManufactureCost += manufactureCostForGroup;
        }

        // Calculate overall turnaround based on total number of sheets needed
        const totalSheets = Object.values(sheetsByMaterial).reduce((sum, sheets) => sum + sheets, 0);
        
        // IMPROVED: Turnaround logic accounts for split manufacturing complexity
        if (totalSheets <= 5) {
            overallMaxTurnaround = 2;
        } else if (totalSheets <= 15) {  // Increased threshold due to better efficiency
            overallMaxTurnaround = 3;
        } else if (totalSheets <= 40) {  // Increased threshold due to better efficiency
            overallMaxTurnaround = 5;
        } else {
            overallMaxTurnaround = 7;
        }

        // Calculate part ID engraving cost
        // Only applies when there are multiple parts AND user has engraving enabled
        const totalPartCount = partsList.reduce((sum, part) => sum + (part.numSplits * part.quantity), 0);
        const partIdEngravingCost = (partsList.length > 1 && isEngravingEnabled) ? totalPartCount * 1.50 : 0;

        // Calculate final totals
        const totalIncGST = totalMaterialCost + totalManufactureCost + partIdEngravingCost;

        setTotalPriceDetails({
            materialCost: totalMaterialCost,
            manufactureCost: totalManufactureCost,
            partIdEngravingCost: partIdEngravingCost,
            totalIncGST: totalIncGST,
            sheetsByMaterial: sheetsByMaterial,
            totalPartCount: totalPartCount,
        });
        
        setTotalTurnaround(overallMaxTurnaround);

    } catch (calcError) {
        console.error("Error during total price calculation:", calcError);
        setTotalPriceDetails(null);
        setTotalTurnaround(null);
    }

  }, [partsList, materials, isEngravingEnabled]);


  const handleConfigChange = useCallback((changedValues: Partial<ProductConfiguration>) => {
    setCurrentConfig(prevConfig => {
      const updatedConfig = { ...prevConfig };
      for (const key in changedValues) {
        if (Object.prototype.hasOwnProperty.call(changedValues, key)) {
          const value = changedValues[key];
          if (value !== undefined) { 
            updatedConfig[key] = value; 
          } 
          // Assuming CurvesBuilderForm sends '' or valid values, not undefined to signify deletion for ProductConfiguration
        }
      }
      return updatedConfig;
    });
  }, []);

  const handleFieldFocusChange = useCallback((fieldId: string | null) => {
    setFocusedField(fieldId);
    // Clear selected part when user starts configuring new part
    if (fieldId !== null && selectedPartId !== null) {
      setSelectedPartId(null);
    }
  }, [selectedPartId]);

  const handleCurrentPartQuantityChange = useCallback((newQuantity: number) => {
    setCurrentPartQuantity(Math.max(1, newQuantity)); 
  }, []);
  
  const handleAddPart = useCallback(() => {
    const specRadiusNum = Number(currentConfig.specifiedRadius);
    const widthNum = Number(currentConfig.width);
    const angleNum = Number(currentConfig.angle);
    const radiusTypeVal = currentConfig.radiusType as 'internal' | 'external';

    // Enhanced validation before adding part
    if (isConfigIncomplete || 
        widthNum <= 0 || 
        specRadiusNum <= 0 || 
        angleNum <= 0 || 
        angleNum > 360 ||
        (radiusTypeVal === 'external' && specRadiusNum <= widthNum)) {
        console.error("Cannot add part: Invalid configuration detected.");
        return;
    }
    
    // Validate split information
    const numSplitsValue = splitInfo.isTooLarge ? splitInfo.numSplits : 1;
    if (numSplitsValue <= 0 || isNaN(numSplitsValue)) {
        console.error("Cannot add part: Invalid split information.");
        return;
    }

    let singlePartAreaM2 = 0;
    let itemIdealEfficiency = 0.3; // Default efficiency

    try {
      // FIXED: Always calculate the full part area first, then adjust for splits in pricing
      const fullPartAreaMM2 = (angleNum / 360) * Math.PI * (Math.pow(actualOuterRadius, 2) - Math.pow(actualInnerRadius, 2));
      
      // Validate calculated area
      if (isNaN(fullPartAreaMM2) || fullPartAreaMM2 <= 0) {
        console.error("Cannot add part: Invalid area calculation.");
        return;
      }
      
      if (numSplitsValue <= 1) {
        // Single part calculation - use full area
        singlePartAreaM2 = fullPartAreaMM2 / 1000000;
        itemIdealEfficiency = calculateNestingEfficiency(actualInnerRadius, widthNum, angleNum, CURVE_EFFICIENCY_RATES);
      } else {
        // Split part calculation - store area per split section 
        const splitPartAngle = angleNum / numSplitsValue;
        
        // Validate split angle
        if (splitPartAngle <= 0 || splitPartAngle > 360) {
          console.error("Cannot add part: Invalid split angle calculation.");
          return;
        }
        
        singlePartAreaM2 = (fullPartAreaMM2 / numSplitsValue) / 1000000;
        itemIdealEfficiency = calculateNestingEfficiency(actualInnerRadius, widthNum, splitPartAngle, CURVE_EFFICIENCY_RATES);
      }

      // Final validation of calculated values
      if (isNaN(singlePartAreaM2) || singlePartAreaM2 <= 0) {
        console.error("Cannot add part: Final area validation failed.");
        return;
      }
      
      if (isNaN(itemIdealEfficiency) || itemIdealEfficiency <= 0) {
        console.warn("Calculated ideal efficiency is invalid, using default 0.3");
        itemIdealEfficiency = 0.3;
      }

      // Clamp efficiency to reasonable bounds
      itemIdealEfficiency = Math.max(0.05, Math.min(0.95, itemIdealEfficiency));

      const newPart: PartListItem = {
        id: uuidv4(),
        partType: 'curve',
        config: { ...currentConfig }, 
        quantity: currentPartQuantity,
        singlePartAreaM2: singlePartAreaM2,
        numSplits: numSplitsValue,
        itemIdealEfficiency: itemIdealEfficiency,
        priceDetails: {
          materialCost: 0,
          manufactureCost: 0,
          totalIncGST: 0,
        },
        turnaround: 1
      };

      setPartsList(prevList => [...prevList, newPart]);
      
      // Reset configurator to default state with FORMPLY
      if (product) {
        const defaultConfigForReset = getDefaultConfig();
        product.parameters.forEach(param => {
          if (!Object.prototype.hasOwnProperty.call(defaultConfigForReset, param.id) || defaultConfigForReset[param.id] === undefined) {
            defaultConfigForReset[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
          }
        });
        // Ensure material defaults to FORMPLY
        defaultConfigForReset.material = 'form-17';
        setCurrentConfig(defaultConfigForReset);
      } else {
        setCurrentConfig(getDefaultConfig());
      }
      setCurrentPartQuantity(1);

    } catch (error) {
      console.error("Error calculating part area:", error);
      return;
    }

  }, [currentConfig, currentPartQuantity, splitInfo, product, isConfigIncomplete, actualInnerRadius, actualOuterRadius]);

  const handleDeletePart = useCallback((idToDelete: string) => {
      setPartsList(prevList => prevList.filter(part => part.id !== idToDelete));
      // Clear selection if the selected part is being deleted
      if (selectedPartId === idToDelete) {
          setSelectedPartId(null);
      }
  }, [selectedPartId]);

  // Helper function to handle cart drawer or show success message
  const handleCartDrawerOrShowSuccess = useCallback(async (result: any): Promise<boolean> => {
    try {
      console.log('Handling cart success with result:', result);
      
      // Try to get parent window for iframe context
      const targetWindow = window.parent !== window ? window.parent : window;
      const isEmbedded = window.self !== window.top;
      
      console.log('Window context:', {
        isEmbedded,
        hasParent: window.parent !== window,
        shopDomain: result.shop_domain
      });
      
      // Try cart drawer events first (modern Shopify themes)
      if (result.cart_drawer_supported && result.should_trigger_drawer) {
        console.log('Attempting to trigger cart drawer...');
        
        // Common cart drawer events used by popular Shopify themes
        const cartDrawerEvents = [
          'cart:open',
          'cart-drawer:open', 
          'drawer:open',
          'cartDrawer:open',
          'theme:cart:open',
          'cart:toggle',
          'cart:refresh'
        ];
        
        // Try to dispatch events on parent window
        let eventDispatched = false;
        for (const eventName of cartDrawerEvents) {
          try {
            // Try custom event
            const customEvent = new CustomEvent(eventName, { 
              detail: { 
                items: result.items,
                source: 'curves-calculator' 
              }
            });
            targetWindow.dispatchEvent(customEvent);
            eventDispatched = true;
            console.log(`✅ Dispatched cart drawer event: ${eventName}`);
          } catch (e) {
            console.log(`❌ Failed to dispatch ${eventName}:`, e);
          }
        }
        
        // Also try to call common cart drawer functions
        const cartDrawerFunctions = [
          'openCartDrawer',
          'toggleCartDrawer', 
          'showCartDrawer',
          'CartDrawer.open',
          'theme.CartDrawer.open'
        ];
        
        for (const funcName of cartDrawerFunctions) {
          try {
            const func = funcName.split('.').reduce((obj, key) => obj && obj[key], targetWindow as any);
            if (typeof func === 'function') {
              func();
              eventDispatched = true;
              console.log(`✅ Called cart drawer function: ${funcName}`);
              break;
            }
          } catch (e) {
            console.log(`❌ Failed to call ${funcName}:`, e);
          }
        }
        
        if (eventDispatched) {
          // Give the drawer time to open
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('✅ Cart drawer events dispatched successfully');
          return true;
        }
      }
      
      // If cart drawer isn't available, try to redirect to cart page
      console.log('Cart drawer not available, trying cart page redirect...');
      
      // Try to redirect parent window to cart page
      if (isEmbedded && result.shop_domain) {
        try {
          const cartUrl = `https://${result.shop_domain}/cart`;
          console.log('Redirecting parent to cart:', cartUrl);
          window.parent.location.href = cartUrl;
          return true;
        } catch (redirectError) {
          console.log('Failed to redirect parent window:', redirectError);
        }
      }
      
      // Trigger cart refresh events for updating cart count/icon
      const cartRefreshEvents = ['cart:refresh', 'cart:update', 'cart:change'];
      for (const eventName of cartRefreshEvents) {
        try {
          const customEvent = new CustomEvent(eventName, { 
            detail: { 
              items: result.items,
              source: 'curves-calculator' 
            }
          });
          targetWindow.dispatchEvent(customEvent);
          console.log(`✅ Dispatched cart refresh event: ${eventName}`);
        } catch (e) {
          console.log(`❌ Failed to dispatch ${eventName}:`, e);
        }
      }
      
      // Show success message as fallback
      console.log('Using success message as fallback...');
      alert('✅ Successfully added to cart!\n\nYour custom curves order has been added to your cart. You can view your cart by clicking the cart icon in the store header.');
      
      return true;
      
    } catch (error) {
      console.error('Cart handling error:', error);
      // Show error message instead of redirect
      alert('❌ Unable to add to cart. Please try again or contact support.');
      return false;
    }
  }, []);
  
  // Add a test cart function for debugging
  const testAddToCart = useCallback(async () => {
    console.log('Testing add to cart with simple data...');
    
    const testData = {
      items: [{
        id: APP_CONFIG.business.shopifyVariantId,
        quantity: 100, // $1.00 worth
        properties: {
          'Test': 'Simple cart test',
          'Price': '$1.00',
          'Timestamp': new Date().toISOString()
        }
      }]
    };
    
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      console.log('Test cart response:', result);
      
      if (response.ok) {
        alert('✅ Test cart add successful!\n\nCheck console for details.');
      } else {
        alert('❌ Test cart add failed!\n\nCheck console for details.');
      }
    } catch (error) {
      console.error('Test cart error:', error);
      alert('❌ Test cart add error!\n\nCheck console for details.');
    }
  }, []);

  const handleAddToCart = useCallback(async () => {
      if (!totalPriceDetails || partsList.length === 0) {
          alert("No parts to add to cart!");
          return;
      }

      try {
          console.log("Adding to cart with 1 Cent Rule:");
          console.log("Parts:", partsList);
          console.log("Totals:", totalPriceDetails);

          // Calculate quantity for 1 cent rule (price * 100 to handle cents)
          const totalPriceCents = Math.round(totalPriceDetails.totalIncGST * 100);
          
          if (isNaN(totalPriceCents) || totalPriceCents <= 0) {
              alert("Cannot add item with zero or invalid price.");
              return;
          }

          // Create detailed description of the order
          const orderDescription = partsList.map((part, index) => {
              const material = materials?.find(m => m.id === part.config.material);
              const { displayString } = getInternalRadiusDisplay(part);
              
              return `Part ${index + 1}: ${displayString} - ${material?.name || 'Unknown'} - Qty: ${part.quantity}${part.numSplits > 1 ? ` (${part.numSplits} splits)` : ''}`;
          }).join('\n');

          const properties = {
              'Order Summary': `Craftons Curves Order - ${partsList.length} unique part${partsList.length !== 1 ? 's' : ''}`,
              'Total Parts': `${totalPriceDetails.totalPartCount} pieces`,
              'Materials': Object.entries(totalPriceDetails.sheetsByMaterial)
                  .map(([matId, sheets]) => {
                      const material = materials?.find(m => m.id === matId);
                      return `${material?.name || matId}: ${sheets} sheet${sheets !== 1 ? 's' : ''}`;
                  }).join(', '),
              'Part Details': orderDescription,
              'Material Cost': `$${totalPriceDetails.materialCost.toFixed(2)}`,
              'Manufacturing Cost': `$${totalPriceDetails.manufactureCost.toFixed(2)}`,
              'Engraving Cost': totalPriceDetails.partIdEngravingCost > 0 ? `$${totalPriceDetails.partIdEngravingCost.toFixed(2)}` : 'None',
              'Turnaround': `${totalTurnaround || 'TBD'} business days`,
              'Order Date': new Date().toISOString(),
              'Pricing Method': '1 Cent Rule - Quantity represents total price in cents'
          };

          // Log the properties and quantity being sent
          console.log("Sending properties:", JSON.stringify(properties, null, 2));
          console.log("Sending quantity:", totalPriceCents);

          const formData = {
              'items': [{
                  'id': APP_CONFIG.business.shopifyVariantId, // Use the ID of the $0.01 product
                  'quantity': totalPriceCents, // Use calculated quantity
                  'properties': properties // Attach all details as properties
              }]
          };

          setIsAddingToCart(true);

          // Try direct Shopify cart API first (works when embedded in Shopify)
          let response;
          let result;
          
          try {
              // Check if we're in an iframe (embedded in Shopify)
              const isEmbedded = window.self !== window.top;
              
              if (isEmbedded) {
                  // Try direct Shopify cart API
                  const shopifyDomain = window.location.ancestorOrigins?.[0] || document.referrer;
                  const shopDomain = shopifyDomain ? new URL(shopifyDomain).hostname : null;
                  
                  if (shopDomain && shopDomain.includes('shopify.com')) {
                      const shopifyCartUrl = `https://${shopDomain}/cart/add.js`;
                      
                      console.log('Attempting direct Shopify cart API:', shopifyCartUrl);
                      
                      response = await fetch(shopifyCartUrl, {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json',
                              'Accept': 'application/json',
                          },
                          body: JSON.stringify(formData),
                          credentials: 'include'
                      });
                      
                      if (response.ok) {
                          result = await response.json();
                          console.log('Direct Shopify cart success:', result);
                      } else {
                          throw new Error(`Shopify cart API failed: ${response.status}`);
                      }
                  } else {
                      throw new Error('Unable to determine Shopify domain');
                  }
              } else {
                  throw new Error('Not embedded in Shopify');
              }
          } catch (directError) {
              console.log('Direct Shopify cart failed, falling back to API route:', directError);
              
              // Fallback to Next.js API route
              response = await fetch('/api/cart/add', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(formData)
              });
              
              if (!response.ok) {
                  // Attempt to get more detailed error from response body
                  try {
                      const errData = await response.json();
                      console.error('API Route Error Response:', errData);
                      throw new Error(errData.description || errData.message || `HTTP error! status: ${response.status}`);
                  } catch (parseError) {
                      // Fallback if response isn't JSON
                      throw new Error(`HTTP error! status: ${response.status}`);
                  }
              }
              
              result = await response.json();
              console.log('API route success:', result);
          }
          
          // Handle success based on context
          if (result.note && result.note.includes('standalone mode')) {
              // In standalone mode, show success message
              alert(`Success: ${result.message}\n\nIn a real Shopify store, this would add the item to your cart.`);
          } else {
              // In embedded mode, try to trigger cart drawer or redirect
              const success = await handleCartDrawerOrShowSuccess(result);
              if (success) {
                  console.log('Cart drawer opened or success message shown');
              }
          }
          
      } catch (error) {
          console.error('Error adding to cart:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          alert(`Error adding item to cart: ${errorMessage}`);
      } finally {
          setIsAddingToCart(false);
      }
  }, [partsList, totalPriceDetails, materials, totalTurnaround, handleCartDrawerOrShowSuccess]);

  const handleReset = useCallback(() => {
    if (product) {
        const defaultConfigForReset = getDefaultConfig();
         product.parameters.forEach(param => {
          if (!Object.prototype.hasOwnProperty.call(defaultConfigForReset, param.id) || defaultConfigForReset[param.id] === undefined) {
            defaultConfigForReset[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
          }
        });
        // Ensure material defaults to FORMPLY
        defaultConfigForReset.material = 'form-17';
        setCurrentConfig(defaultConfigForReset);
    } else {
        setCurrentConfig(getDefaultConfig());
    }
    setCurrentPartQuantity(1);
    setPartsList([]);
    setTotalPriceDetails(null);
    setTotalTurnaround(null);
    setSelectedPartId(null); // Clear selected part when resetting
    setIsEngravingEnabled(true); // Reset engraving to enabled
  }, [product]);

  // --- Visualizer Props Extraction ---
  // Check if we should show a selected part or the current configuration
  const selectedPart = selectedPartId ? partsList.find(p => p.id === selectedPartId) : null;
  
  // Use selected part config if available, otherwise use current config
  const displayConfig = selectedPart ? selectedPart.config : currentConfig;
  const isDisplayingSelectedPart = !!selectedPart;
  
  // Calculate radii for the display config
  const getDisplayRadii = () => {
    // For selected parts, always use their actual values. For current config, use actual values when available
    const rType = (displayConfig.radiusType && (displayConfig.radiusType === 'internal' || displayConfig.radiusType === 'external')) 
      ? displayConfig.radiusType as 'internal' | 'external' 
      : RADIUS_TYPE_PLACEHOLDER;
    
    const userSpecifiedRadius = Number(displayConfig.specifiedRadius);
    const specRad = (!isNaN(userSpecifiedRadius) && userSpecifiedRadius > 0) 
      ? userSpecifiedRadius 
      : R_PLACEHOLDER;
    
    const userWidth = Number(displayConfig.width);
    const w = (!isNaN(userWidth) && userWidth > 0) 
      ? userWidth 
      : W_PLACEHOLDER;

    let displayInnerR = 0;
    let displayOuterR = 0;

    if (rType === 'internal') {
      displayInnerR = specRad;
      displayOuterR = specRad + w;
    } else { // external
      displayOuterR = specRad;
      displayInnerR = specRad - w;
    }
    if (displayInnerR < 0) displayInnerR = 0; 
    return { displayInnerRadius: displayInnerR, displayOuterRadius: displayOuterR };
  };

  const { displayInnerRadius, displayOuterRadius } = getDisplayRadii();
  
  const visualizerInnerRadius = displayInnerRadius;
  
  const userDisplayWidth = Number(displayConfig.width);
  const visualizerWidth = (!isNaN(userDisplayWidth) && userDisplayWidth > 0) ? userDisplayWidth : W_PLACEHOLDER;
  
  const userDisplayAngle = Number(displayConfig.angle);
  const visualizerAngle = (!isNaN(userDisplayAngle) && userDisplayAngle > 0) ? userDisplayAngle : A_PLACEHOLDER;
  
  let currentMaterialThickness = THICKNESS_PLACEHOLDER; 
  const materialId = displayConfig.material as string;
  if (materials && materialId && materialId !== '') {
      const material = materials.find(m => m.id === materialId);
      if (material) currentMaterialThickness = material.thickness_mm;
  }
  
  // Calculate derived measurements for display
  const displayDerivedMeasurements = useMemo(() => {
    const angleNum = visualizerAngle;
    if (isNaN(displayOuterRadius) || displayOuterRadius <= 0 || isNaN(angleNum) || angleNum <= 0 || angleNum > 360) {
      return { arcLength: 0, chordLength: 0 };
    }
    
    const angleRad = angleNum * (Math.PI / 180);
    const calculatedArcLength = displayOuterRadius * angleRad;
    
    // FIXED: For angles > 180°, the piece spans the full diameter
    let calculatedChordLength;
    if (angleNum > 180) {
      calculatedChordLength = 2 * displayOuterRadius; // Diameter for any angle > 180°
    } else {
      calculatedChordLength = 2 * displayOuterRadius * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
    }
    
    if (isNaN(calculatedArcLength) || isNaN(calculatedChordLength) || calculatedArcLength <= 0 || calculatedChordLength <= 0) {
      return { arcLength: 0, chordLength: 0 };
    }
    
    return {
      arcLength: calculatedArcLength,
      chordLength: calculatedChordLength
    };
  }, [displayOuterRadius, visualizerAngle]);
  
  // Calculate split info for display
  const displaySplitInfo = useMemo(() => {
    if (isDisplayingSelectedPart) {
      return { isTooLarge: selectedPart.numSplits > 1, numSplits: selectedPart.numSplits };
    }
    return splitInfo;
  }, [isDisplayingSelectedPart, selectedPart, splitInfo]);
  
  // --- Loading and Error States (remain the same) ---
  if (isLoading && !product) { // Adjusted loading condition
    return <div className="p-8 text-center">Loading Curves configuration...</div>;
  }
  if (error && !product) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }
  if (!product) { // If still no product after loading attempt (and no error shown)
    return <div className="p-8 text-center">No product configuration available. Please try refreshing.</div>;
  }
  
  // const visualizerRadiusValue = isConfigIncomplete ? R_PLACEHOLDER : Number(currentConfig.specifiedRadius); // Removed unused variable
  // const visualizerWidthValue = isConfigIncomplete ? W_PLACEHOLDER : Number(currentConfig.width); // Removed unused variable
  // const visualizerAngleValue = isConfigInincomplete ? A_PLACEHOLDER : Number(currentConfig.angle); // Removed unused variable


  // --- JSX Structure Update ---
  return (
    <div className="flex h-screen max-h-screen flex-col text-foreground overflow-hidden bg-white"> 
      <div className="flex flex-1 gap-1 md:flex-row-reverse flex-col overflow-hidden px-4 md:px-8 py-4"> 
        <aside className="w-full md:w-[30rem] lg:w-[36rem] flex-shrink-0 h-[40vh] md:h-auto"> 
          <ScrollArea className="h-full">
            <div className="space-y-4 px-4 pb-4">
              <div className="rounded-md border border-gray-200 bg-card p-4 space-y-3"> 
                <h2 className="text-lg font-semibold mb-1">Configure New Part</h2>
                {isLoading && !product ? ( // Show loading in form area if product is still loading
                  <div>Loading form...</div>
                ) : product ? ( // Only render form if product definition is available
                  <CurvesBuilderForm
                    product={product}
                    initialConfig={currentConfig} 
                    onConfigChange={handleConfigChange}
                    onFieldFocusChange={handleFieldFocusChange}
                    splitInfo={splitInfo} 
                    setSplitLinesHovered={setSplitLinesHovered}
                    quantity={currentPartQuantity}
                    onQuantityChange={handleCurrentPartQuantityChange}
                  />
                ) : (
                   <div>Could not load product definition for the form.</div> // Fallback if product is null after load attempt
                )}

                <Button 
                    onClick={handleAddPart}
                    disabled={isLoading || !!error || isConfigIncomplete} // Disable if loading, error, or config incomplete
                    className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-white"
                    size="lg"
                >
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add Part to Sheet
                </Button>
              </div>

              <div className="rounded-md border border-gray-200 bg-card p-4 space-y-4">
                  {/* Parts List */} 
                  <div>
                      <h2 className="text-lg font-semibold mb-3">Parts Added to Sheet</h2>
                      {partsList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No parts added yet.</p>
                      ) : (
                          <ul className="space-y-2">
                              {partsList.map((part, index) => {
                                  const { displayString } = getInternalRadiusDisplay(part);
                                  return (
                                  <li key={part.id} className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 pb-1">
                                      <span 
                                          className={`cursor-pointer transition-colors duration-200 flex-1 ${
                                              selectedPartId === part.id 
                                                  ? 'text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded' 
                                                  : 'hover:text-blue-500 hover:bg-gray-50 px-2 py-1 rounded'
                                          }`}
                                          onClick={() => setSelectedPartId(selectedPartId === part.id ? null : part.id)}
                                          title="Click to view in visualizer"
                                      >
                                          {`${index + 1}. ${displayString} (Qty: ${part.quantity})`}
                                          {part.numSplits > 1 && <span className="text-xs text-orange-500 ml-1">(Split x{part.numSplits})</span>}
                                      </span>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeletePart(part.id)}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                  </li>
                                  );
                              })}
                          </ul>
                      )}
                  </div>
                  <Separator/>
                  {/* Pricing Summary */} 
                  <div>
                      <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
                      
                      {totalPriceDetails ? (
                          <div className="space-y-2 text-sm">
                              {Object.entries(totalPriceDetails.sheetsByMaterial).map(([matId, count]) => (
                                  <div key={matId} className="flex justify-between items-center">
                                      <div className="flex items-center text-muted-foreground">
                                        <Sheet className="h-4 w-4 mr-2" /> 
                                        {materials?.find(m=>m.id===matId)?.name || matId} ({count} sheet{count !== 1 ? 's' : ''})
                                      </div>
                                  </div>
                              ))}
                               <Separator className="my-1" />
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Material Cost</span>
                                  <span className="font-medium text-foreground">${totalPriceDetails.materialCost.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                   <span className="text-muted-foreground">Manufacturing Cost</span>
                                  <span className="font-medium text-foreground">${totalPriceDetails.manufactureCost.toFixed(2)}</span>
                              </div>
                              {partsList.length > 1 && (
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                          <span className={`${isEngravingEnabled ? 'text-muted-foreground' : 'text-muted-foreground/50 line-through'}`}>
                                              ⚡ Part ID Engraving
                                          </span>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-4 w-4 p-0 hover:bg-red-100"
                                              onClick={() => setIsEngravingEnabled(!isEngravingEnabled)}
                                              title="Remove Engraving"
                                          >
                                              <X className="h-3 w-3 text-red-500 hover:text-red-700" />
                                          </Button>
                                      </div>
                                      <span className={`font-medium ${isEngravingEnabled ? 'text-foreground' : 'text-muted-foreground/50 line-through'}`}>
                                          ${isEngravingEnabled ? totalPriceDetails.partIdEngravingCost.toFixed(2) : (totalPriceDetails.totalPartCount * 1.50).toFixed(2)}
                                      </span>
                                  </div>
                              )}
                              <Separator className="my-2 font-bold" />
                              <div className="flex justify-between items-center pt-1">
                                  <span className="text-base font-semibold text-foreground">Total Price (inc GST):</span>
                                  <span className="text-xl font-bold text-foreground">${totalPriceDetails.totalIncGST.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Estimated Turnaround:</span>
                                  <span className="font-medium text-foreground">
                                      {totalTurnaround ? `${totalTurnaround} Day${totalTurnaround !== 1 ? 's' : ''}` : 'N/A'}
                                  </span>
                              </div>
                              <div className="mt-4 flex flex-col space-y-2 pt-4 border-t border-gray-200">
                                  <Button
                                      variant="ghost"
                                      onClick={handleReset}
                                      className="w-full text-muted-foreground hover:text-red-500 transition-colors duration-200"
                                      size="sm"
                                  >
                                      <RotateCcw className="mr-1 h-4 w-4" /> Reset Order
                                  </Button>
                                  <Button
                                      onClick={handleAddToCart} 
                                      disabled={partsList.length === 0 || isAddingToCart}
                                      className="w-full text-white font-bold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      style={{
                                          backgroundColor: '#194431'
                                      }}
                                      onMouseEnter={(e) => {
                                          if (!e.currentTarget.disabled) {
                                              e.currentTarget.style.backgroundColor = '#225539';
                                          }
                                      }}
                                      onMouseLeave={(e) => {
                                          if (!e.currentTarget.disabled) {
                                              e.currentTarget.style.backgroundColor = '#194431';
                                          }
                                      }}
                                      size="lg"
                                  >
                                      {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
                                  </Button>
                                  
                                  {/* Test button for debugging - only show in development */}
                                  {process.env.NODE_ENV === 'development' && (
                                      <Button
                                          onClick={testAddToCart}
                                          variant="outline"
                                          className="w-full text-xs"
                                          size="sm"
                                      >
                                          🧪 Test Cart API
                                      </Button>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <p className="text-sm text-muted-foreground">Add parts to see pricing.</p>
                      )}
                  </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-grow relative rounded-md border border-gray-200 bg-card flex flex-col items-center justify-center min-h-[300px] h-[40vh] md:h-auto md:min-h-0 max-h-[calc(100vh-180px)] overflow-hidden">
          {/* Selected Part Indicator */}
          {isDisplayingSelectedPart && (
            <div className="absolute top-2 left-2 z-10 bg-blue-100 border border-blue-300 text-blue-700 px-3 py-1 rounded-md text-sm shadow-sm">
              <span className="font-medium">Viewing:</span> R:{selectedPart?.config.specifiedRadius} W:{selectedPart?.config.width} A:{selectedPart?.config.angle}°
              <button 
                className="ml-2 text-blue-500 hover:text-blue-700"
                onClick={() => setSelectedPartId(null)}
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="w-full h-full">
            <CurvesVisualizer
              radius={visualizerInnerRadius}
              width={visualizerWidth}
              angle={visualizerAngle}
              materialThickness={currentMaterialThickness}
              arcLength={displayDerivedMeasurements.arcLength} 
              chordLength={displayDerivedMeasurements.chordLength} 
              showDimensions={true} 
                              isPlaceholderMode={!isDisplayingSelectedPart && (
                  Number(displayConfig.specifiedRadius) <= 0 || 
                  Number(displayConfig.width) <= 0 || 
                  Number(displayConfig.angle) <= 0
                )} 
              activeFieldHighlight={isDisplayingSelectedPart ? null : focusedField} 
              isTooLarge={displaySplitInfo.isTooLarge} 
              numSplits={displaySplitInfo.numSplits} 
              splitLinesHovered={splitLinesHovered}
              radiusType={displayConfig.radiusType as 'internal' | 'external' || 'internal'}
            />
          </div>
          
                        {displaySplitInfo.isTooLarge && (isDisplayingSelectedPart || (
                Number(displayConfig.specifiedRadius) > 0 && 
                Number(displayConfig.width) > 0 && 
                Number(displayConfig.angle) > 0
              )) && ( // Show split warning for selected part or current config
            <div 
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 cursor-pointer"
              onMouseEnter={() => setSplitLinesHovered(true)}
              onMouseLeave={() => setSplitLinesHovered(false)}
            >
              <div className="border border-orange-400/30 text-orange-600 px-3 py-2 rounded-md flex items-center text-sm shadow-md bg-white">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Will be manufactured in {displaySplitInfo.numSplits} sections due to size constraints</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CurvesCustomizer; 