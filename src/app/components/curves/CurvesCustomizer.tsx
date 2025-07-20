'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique IDs
import { CurvesBuilderForm } from './CurvesBuilderForm';
import CurvesVisualizer from './CurvesVisualizer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductDefinition, ProductConfiguration, Material, PartListItem } from '@/types'; // Added PartListItem
import { AlertTriangle, Trash2, Sheet, RotateCcw, X, Pencil, Check, X as XIcon, Share2, Copy, ExternalLink } from 'lucide-react'; // Added icons for edit functionality
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

// Add iframe height communication utilities
const communicateHeightToParent = () => {
  if (window.parent && window.parent !== window) {
    // Visualizer has fixed height of 400px (as set in CSS)
    const visualizerHeight = 400; // Fixed height - matches CSS h-[400px]
    console.log('📐 Visualizer height: FIXED at', visualizerHeight + 'px');
    
    // Find the customizer sidebar (aside element with order-2)
    const customizerAside = document.querySelector('aside[class*="order-2"]') as HTMLElement;
    let customizerHeight = 600; // Default fallback
    
    if (customizerAside) {
      // Measure the actual customizer content height
      customizerHeight = Math.max(
        customizerAside.scrollHeight,
        customizerAside.offsetHeight
      );
      console.log('📐 Customizer panel height:', customizerHeight + 'px');
    } else {
      console.log('⚠️ Could not find customizer panel, using fallback height');
    }
    
    // Use the larger of the two heights + padding for overall layout
    const paddingHeight = 100; // Space for margins and container padding
    const totalHeight = Math.max(visualizerHeight, customizerHeight) + paddingHeight;
    
    console.log('📏 Iframe Height: Visualizer=' + visualizerHeight + 'px, Customizer=' + customizerHeight + 'px, Using=' + Math.max(visualizerHeight, customizerHeight) + 'px, Total=' + totalHeight + 'px');
    
    // Send height to parent window
    try {
      window.parent.postMessage({
        type: 'IFRAME_HEIGHT_CHANGE',
        height: totalHeight,
        source: 'craftons-curves-calculator'
      }, '*');
      console.log('📤 Iframe Height: Message sent successfully');
    } catch (error) {
      console.warn('❌ Iframe Height: Could not communicate with parent window:', error);
    }
  } else {
    console.log('📌 Iframe Height: Not in iframe context (window.parent === window)');
  }
};

// Hook to communicate height changes when content actually changes
const useIframeHeightCommunication = (dependencies: any[]) => {
  useEffect(() => {
    // Debounce height communication to avoid excessive messages
    const timeoutId = setTimeout(() => {
      communicateHeightToParent();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, dependencies);
};

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
  
  // Edit state management
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  
  // Set up iframe height communication to resize iframe when content changes
  useIframeHeightCommunication([partsList, totalPriceDetails, editingPartId, selectedPartId]);
  
  // Communicate initial height when app loads (one-time only)
  useEffect(() => {
    // Delay initial height communication to ensure DOM is fully rendered
    const initialHeightTimeout = setTimeout(() => {
      console.log('🎯 Iframe Height: Initial height communication on app load');
      communicateHeightToParent();
    }, 1000);
    
    return () => clearTimeout(initialHeightTimeout);
  }, []); // Empty dependency array - runs only once
  
  // Share state management
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

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
      // Clear edit mode if editing part is being deleted
      if (editingPartId === idToDelete) {
          setEditingPartId(null);
      }
  }, [selectedPartId, editingPartId]);

  // Edit handlers
  const handleStartEdit = useCallback((part: PartListItem) => {
      // Don't allow editing if another part is already being edited
      if (editingPartId && editingPartId !== part.id) {
          alert("Please save or cancel the current edit before editing another part.");
          return;
      }
      
      setEditingPartId(part.id);
      // Load the part's configuration into the main config panel
      setCurrentConfig({ ...part.config });
      setCurrentPartQuantity(part.quantity);
      // Clear selection when starting edit
      setSelectedPartId(null);
  }, [editingPartId]);

  const handleCancelEdit = useCallback(() => {
    setEditingPartId(null);
    // Reset form to default state
    if (product) {
        const defaultConfigForReset = getDefaultConfig();
        product.parameters.forEach(param => {
            if (!Object.prototype.hasOwnProperty.call(defaultConfigForReset, param.id) || defaultConfigForReset[param.id] === undefined) {
                defaultConfigForReset[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
            }
        });
        defaultConfigForReset.material = 'form-17';
        setCurrentConfig(defaultConfigForReset);
    } else {
        setCurrentConfig(getDefaultConfig());
    }
    setCurrentPartQuantity(1);
  }, [product]);

  const handleSaveEdit = useCallback(() => {
    if (!editingPartId || !materials) return;

    const partToUpdate = partsList.find(p => p.id === editingPartId);
    if (!partToUpdate) return;

    // Use the same validation logic as adding a part
    const specRadiusNum = Number(currentConfig.specifiedRadius);
    const widthNum = Number(currentConfig.width);
    const angleNum = Number(currentConfig.angle);
    const radiusTypeVal = currentConfig.radiusType as 'internal' | 'external';

    if (isConfigIncomplete || 
        widthNum <= 0 || 
        specRadiusNum <= 0 || 
        angleNum <= 0 || 
        angleNum > 360 ||
        (radiusTypeVal === 'external' && specRadiusNum <= widthNum)) {
        alert("Invalid configuration. Please check your inputs.");
        return;
    }

    try {
        // Calculate new values using the same logic as adding a part
        let actualInnerRadius, actualOuterRadius;
        if (radiusTypeVal === 'internal') {
            actualInnerRadius = specRadiusNum;
            actualOuterRadius = specRadiusNum + widthNum;
        } else {
            actualOuterRadius = specRadiusNum;
            actualInnerRadius = specRadiusNum - widthNum;
        }

        if (actualInnerRadius < 0) actualInnerRadius = 0;

        // Check if part needs to be split
        const material = materials.find(m => m.id === currentConfig.material);
        if (!material) {
            alert("Selected material not found.");
            return;
        }

        const maxSheetSize = Math.min(material.sheet_length_mm, material.sheet_width_mm);
        const outerDiameter = actualOuterRadius * 2;
        const isTooLarge = outerDiameter > maxSheetSize;
        const numSplits = isTooLarge ? Math.ceil(angleNum / (360 * maxSheetSize / outerDiameter)) : 1;

        // Calculate area and efficiency
        const fullPartAreaMM2 = (angleNum / 360) * Math.PI * (Math.pow(actualOuterRadius, 2) - Math.pow(actualInnerRadius, 2));
        let singlePartAreaM2, itemIdealEfficiency;

        if (numSplits <= 1) {
            singlePartAreaM2 = fullPartAreaMM2 / 1000000;
            itemIdealEfficiency = calculateNestingEfficiency(actualInnerRadius, widthNum, angleNum, CURVE_EFFICIENCY_RATES);
        } else {
            const splitPartAngle = angleNum / numSplits;
            singlePartAreaM2 = (fullPartAreaMM2 / numSplits) / 1000000;
            itemIdealEfficiency = calculateNestingEfficiency(actualInnerRadius, widthNum, splitPartAngle, CURVE_EFFICIENCY_RATES);
        }

        // Clamp efficiency to reasonable bounds
        itemIdealEfficiency = Math.max(0.05, Math.min(0.95, itemIdealEfficiency));

        // Update the part in the list
        setPartsList(prevList => 
            prevList.map(part => 
                part.id === editingPartId ? {
                    ...part,
                    config: { ...currentConfig },
                    quantity: currentPartQuantity,
                    singlePartAreaM2,
                    numSplits,
                    itemIdealEfficiency,
                    priceDetails: {
                        materialCost: 0,
                        manufactureCost: 0,
                        totalIncGST: 0,
                    },
                    turnaround: 1
                } : part
            )
        );

        // Exit edit mode and reset form
        setEditingPartId(null);
        if (product) {
            const defaultConfigForReset = getDefaultConfig();
            product.parameters.forEach(param => {
                if (!Object.prototype.hasOwnProperty.call(defaultConfigForReset, param.id) || defaultConfigForReset[param.id] === undefined) {
                    defaultConfigForReset[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
                }
            });
            defaultConfigForReset.material = 'form-17';
            setCurrentConfig(defaultConfigForReset);
        } else {
            setCurrentConfig(getDefaultConfig());
        }
        setCurrentPartQuantity(1);

    } catch (error) {
        console.error("Error updating part:", error);
        alert("Error updating part. Please try again.");
    }
  }, [editingPartId, currentConfig, currentPartQuantity, partsList, materials, isConfigIncomplete, product]);

  // Keyboard support for editing (moved here after handleCancelEdit and handleSaveEdit are defined)
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (editingPartId) {
        if (e.key === 'Escape') {
            handleCancelEdit();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            handleSaveEdit();
        }
    }
  }, [editingPartId, handleCancelEdit, handleSaveEdit]);

  useEffect(() => {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Share handlers
  const handleSaveAndShare = useCallback(async () => {
    if (partsList.length === 0) {
      alert("No parts to share!");
      return;
    }

    setIsSharing(true);
    try {
      const shareData = {
        partsList: partsList,
        totalPriceDetails: totalPriceDetails,
        totalTurnaround: totalTurnaround,
        isEngravingEnabled: isEngravingEnabled,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/api/share/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      const result = await response.json();

      if (response.ok && result.shareId) {
        const shareUrl = `${window.location.origin}/share/${result.shareId}`;
        setShareUrl(shareUrl);
        setShowShareModal(true);
      } else {
        throw new Error(result.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [partsList, totalPriceDetails, totalTurnaround, isEngravingEnabled]);

  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
    setShareUrl(null);
  }, []);

  const handleCopyShareUrl = useCallback(async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Link copied to clipboard!');
      }
    }
  }, [shareUrl]);




  // 🎯 FIXED ADD TO CART FUNCTION
  // The previous developers' approach failed because they used absolute URLs (https://domain.com/cart/add.js)
  // which triggered CORS restrictions. This fix uses context-aware URLs and handles both embedded and direct access.
  // This preserves the brilliant 1-cent hack and all detailed order properties while actually working!
  const handleAddToCart = useCallback(async () => {
    if (!totalPriceDetails || partsList.length === 0) {
      alert("No parts to add to cart!");
      return;
    }

    // DISABLED DEMO MODE - Always attempt real cart functionality
    // Demo mode was interfering with legitimate Shopify embedding
    console.log('🎯 Cart functionality enabled - attempting real Shopify cart API call');
  
    setIsAddingToCart(true);
  
    try {
      // Calculate quantity from price using the 1-cent hack. A price of $173.44 becomes a quantity of 17344.
      const quantity = Math.round(totalPriceDetails.totalIncGST * 100);

      // Prepare comprehensive cart item data for Shopify
      const cartItemData = {
        items: [{
          id: APP_CONFIG.business.shopifyVariantId,
          quantity: quantity, // Encoded price as quantity
          properties: {
            '_order_type': 'custom_curves',
            '_total_price': totalPriceDetails.totalIncGST.toFixed(2),
            '_parts_count': partsList.length.toString(),
            '_total_turnaround': totalTurnaround ? `${totalTurnaround} days` : 'TBD',
            '_configuration_summary': partsList.map((part, index) => {
              // Build compact summary: "1. R:3200 W:90 A:90 Qty:3 Split:3"
              const rType = part.config.radiusType as 'internal' | 'external';
              const specifiedRadius = Number(part.config.specifiedRadius);
              const width = Number(part.config.width);
              const angle = Number(part.config.angle);
              const internalRadiusCalc = rType === 'internal' ? specifiedRadius : specifiedRadius - width;
              const internalRadius = internalRadiusCalc < 0 ? 0 : internalRadiusCalc;
              const splitStr = part.numSplits > 1 ? ` Split:${part.numSplits}` : '';
              return `${index + 1}. R:${internalRadius} W:${width} A:${angle} Qty:${part.quantity}${splitStr}`;
            }).join('; '),
            // Add engraving info if applicable
            ...(partsList.length > 1 && isEngravingEnabled ? {
              '_part_id_engraving': 'Included',
              '_engraving_cost': totalPriceDetails.partIdEngravingCost.toFixed(2)
            } : {}),
            // Add detailed material breakdown
            '_materials_used': Object.entries(totalPriceDetails.sheetsByMaterial).map(([matId, count]) => {
              const materialName = materials?.find(m => m.id === matId)?.name || matId;
              return `${materialName}: ${count} sheet${count !== 1 ? 's' : ''}`;
            }).join(', '),
            '_material_cost': totalPriceDetails.materialCost.toFixed(2),
            '_manufacture_cost': totalPriceDetails.manufactureCost.toFixed(2),
            '_total_sheets': Object.values(totalPriceDetails.sheetsByMaterial).reduce((sum, count) => sum + count, 0).toString(),
            '_timestamp': new Date().toISOString()
          }
        }]
      };

      console.log('🛒 Adding to cart with quantity:', quantity, 'for price:', totalPriceDetails.totalIncGST.toFixed(2));
      console.log('📦 Cart data:', JSON.stringify(cartItemData, null, 2));

      // 🎯 FIXED CART URL LOGIC: Use the internal proxy to avoid CORS issues.
      // const cartUrl = '/api/cart/add';
      // 
      // console.log(`🎯 Cart request - Using proxy URL: ${cartUrl}`);
      // 
      // const cartResponse = await fetch(cartUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(cartItemData)
      // });
      //
      // console.log('📬 Response received. Status:', cartResponse.status, 'OK:', cartResponse.ok);
      //
      // if (!cartResponse.ok) {
      //   // Enhanced error handling with detailed Shopify error messages
      //   let errorData;
      //   try {
      //     errorData = await cartResponse.json();
      //   } catch {
      //     errorData = { message: `HTTP ${cartResponse.status}` };
      //   }
      //   
      //   console.error('🚨 Shopify Error Response:', errorData);
      //   throw new Error(errorData.description || errorData.message || `Failed to add item to cart (${cartResponse.status})`);
      // }
      // 
      // const cartResult = await cartResponse.json();
      // console.log('✅ Successfully added to cart:', cartResult);
      // 
      // --- NEW PERMALINK IMPLEMENTATION ---
      // Instead of relying on the server-side proxy (which can't pass session cookies
      // back to the browser), we build a Shopify cart permalink that encodes all
      // line-item properties in Base64 and sends the customer straight to the cart
      // page with their item pre-loaded. This guarantees that the cart page always
      // shows the newly-added item, even when the calculator is running on a
      // different origin (e.g. craftons-curves-calculator.vercel.app).
      
      // --- Build visible part summaries as separate properties ---
      const visiblePartProps: Record<string,string> = {};
      partsList.forEach((part, idx) => {
        const rType = part.config.radiusType as 'internal' | 'external';
        const specifiedRadius = Number(part.config.specifiedRadius);
        const width = Number(part.config.width);
        const angle = Number(part.config.angle);
        const internalRadiusCalc = rType === 'internal' ? specifiedRadius : specifiedRadius - width;
        const internalRadius = internalRadiusCalc < 0 ? 0 : internalRadiusCalc;
        const splitStr = part.numSplits > 1 ? ` Split:${part.numSplits}` : '';
        visiblePartProps[`${idx + 1}.`] = `R:${internalRadius} W:${width} A:${angle} Qty:${part.quantity}${splitStr}`;
      });

      // Merge visible props into the main properties object
      cartItemData.items[0].properties = {
        ...cartItemData.items[0].properties,
        ...visiblePartProps,
      };

      const propsJson = JSON.stringify(cartItemData.items[0].properties);
      // Base64-URL encode the JSON string (Shopify requires URL-safe Base64)
      const base64Props = btoa(unescape(encodeURIComponent(propsJson)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const shopDomain = process.env.NEXT_PUBLIC_SHOP_DOMAIN || 'craftons-au.myshopify.com';
      const variantId = APP_CONFIG.business.shopifyVariantId;
      const permalink = `https://${shopDomain}/cart/${variantId}:${quantity}?properties=${encodeURIComponent(base64Props)}&storefront=true`;

      console.log('🚀 Redirecting to cart permalink:', permalink);

      // Optionally log to console for debugging but no popup
      console.log(`Added ${partsList.length} part(s) to cart. Redirecting…`);

      // If embedded inside an iframe (Shopify app embed), redirect the parent;
      // otherwise redirect the current window.
      if (window.top) {
        window.top.location.href = permalink;
      } else {
        window.location.href = permalink;
      }

      return; // Skip legacy proxy logic

    } catch (error) {
      console.error('💥 Error adding to cart:', error);
      
      let errorMessage = 'Failed to add to cart. ';
      if (error instanceof Error) {
        errorMessage += error.message;
        
        // Enhanced error message based on common issues
        if (error.message.includes('422') || error.message.includes('variant')) {
          errorMessage += '\n\n🔧 Note: The 1-cent product may need to be set up in your Shopify store.';
        } else if (error.message.includes('405')) {
          errorMessage += '\n\n🔧 Note: This app needs to be embedded in your Shopify store or accessed through a Shopify product page for cart functionality to work.';
        } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          errorMessage += '\n\n🔧 Note: For full functionality, embed this app in your Shopify product page.';
        }
      } else {
        errorMessage += 'An unknown error occurred.';
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsAddingToCart(false);
    }
  }, [partsList, totalPriceDetails, totalTurnaround, isEngravingEnabled, materials, getInternalRadiusDisplay]);

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
    <div className="flex min-h-screen flex-col text-foreground overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100"> 
      <div className="flex flex-1 gap-4 md:flex-row flex-col overflow-hidden px-3 md:px-6 py-3"> 
        {/* Visualizer - now comes first for mobile-first approach */}
        <main className="w-full relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/50 flex flex-col items-center justify-center h-[400px] overflow-hidden order-1 md:order-1" style={{flexShrink: 0}}>
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
              showDimensions={!showShareModal} 
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
              <div className="border border-amber-300/40 text-amber-700 bg-amber-50/95 px-3 py-2 rounded-md flex items-center text-sm shadow-md">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 text-amber-600" />
                                  <span className="font-medium">Part will be split into {displaySplitInfo.numSplits} sections due to size constraints</span>
              </div>
            </div>
          )}
        </main>

        {/* Customizer - now comes second */}
        <aside className="w-full md:w-[44rem] lg:w-[53rem] flex-shrink-0 flex-1 md:flex-initial min-h-0 order-2 md:order-2"> 
          <ScrollArea className="h-full">
            <div className="space-y-5 p-2 pb-4">
              <div className={`rounded-xl border shadow-lg ${editingPartId ? 'border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-blue-100/40 shadow-blue-200/30' : 'border-gray-200/60 bg-white shadow-gray-200/40'} p-5 space-y-4`}> 
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {editingPartId && <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>}
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingPartId ? (
                        <span className="text-blue-700">Edit Part</span>
                      ) : (
                        'Configure New Part'
                      )}
                    </h2>
                  </div>
                  {editingPartId && (
                    <div className="text-xs text-gray-600 bg-white/60 px-3 py-1 rounded-full border border-gray-200/60">
                      <kbd className="text-xs">Esc</kbd> to cancel • <kbd className="text-xs">Ctrl+Enter</kbd> to save
                    </div>
                  )}
                </div>
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
                    onAddPart={handleAddPart}
                    isAddPartDisabled={isConfigIncomplete}
                    isLoading={isLoading}
                    error={error}
                    isEditMode={editingPartId !== null}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                  />
                ) : (
                   <div>Could not load product definition for the form.</div> // Fallback if product is null after load attempt
                )}
              </div>

              {partsList.length > 0 && (
                <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/40 p-4 space-y-4"> 
                    {/* Parts List */} 
                    <div>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                            <span className="text-slate-700 font-bold text-sm">{partsList.length}</span>
                          </div>
                          <h2 className="text-xl font-bold text-gray-900">Parts Added to Sheet</h2>
                        </div>
                        <ul className="space-y-2">
                            {partsList.map((part, index) => {
                                const { displayString } = getInternalRadiusDisplay(part);
                                const isBeingEdited = editingPartId === part.id;
                                
                                return (
                                <li key={part.id} className={`flex justify-between items-center text-sm border-b border-dashed border-gray-200 pb-1 ${isBeingEdited ? 'bg-blue-50 border-blue-200 p-2 rounded' : ''}`}>
                                    <span 
                                        className={`cursor-pointer transition-colors duration-200 flex-1 ${
                                            selectedPartId === part.id 
                                                ? 'text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded' 
                                                : isBeingEdited 
                                                    ? 'text-blue-700 font-medium px-2 py-1'
                                                    : 'hover:text-blue-500 hover:bg-gray-50 px-2 py-1 rounded'
                                        }`}
                                        onClick={() => setSelectedPartId(selectedPartId === part.id ? null : part.id)}
                                        title="Click to view in visualizer"
                                    >
                                        {`${index + 1}. ${displayString} (Qty: ${part.quantity})`}
                                        {part.numSplits > 1 && <span className="text-xs text-orange-500 ml-1">(Split x{part.numSplits})</span>}
                                        {isBeingEdited && <span className="text-xs text-blue-600 ml-2 font-medium">(Editing)</span>}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 hover:bg-blue-600 hover:border hover:border-blue-600 transition-colors" 
                                            onClick={() => handleStartEdit(part)}
                                            title="Edit part"
                                            disabled={editingPartId !== null && editingPartId !== part.id}
                                        >
                                            <Pencil className="h-3 w-3 text-blue-600 hover:text-white transition-colors" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 hover:bg-red-100" 
                                            onClick={() => handleDeletePart(part.id)}
                                            title="Delete part"
                                            disabled={editingPartId !== null && editingPartId !== part.id}
                                        >
                                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600 transition-colors" />
                                        </Button>
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
                    </div>
                    {/* Pricing Summary */} 
                    <div>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                            <span className="text-slate-700 font-bold text-sm">$</span>
                          </div>
                          <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
                        </div>
                        
                        {totalPriceDetails ? (
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center text-gray-600">
                                        <span className="text-gray-600">Material Cost </span>
                                        <span className="text-gray-500">
                                            {Object.entries(totalPriceDetails.sheetsByMaterial).map(([matId, count], index) => {
                                                const materialName = materials?.find(m=>m.id===matId)?.name || matId;
                                                return (
                                                    <span key={matId}>
                                                        {index === 0 ? ' ' : ''}({materialName} x {count} Sheet{count !== 1 ? 's' : ''}) 
                                                    </span>
                                                );
                                            })}
                                        </span>
                                    </div>
                                    <span className="font-semibold text-gray-900">${totalPriceDetails.materialCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                     <span className="text-gray-600">Manufacturing Cost</span>
                                    <span className="font-semibold text-gray-900">${totalPriceDetails.manufactureCost.toFixed(2)}</span>
                                </div>
                                {partsList.length > 1 && (
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`${isEngravingEnabled ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                                                Part ID Engraving
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
                                        <span className={`font-semibold ${isEngravingEnabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                                            ${isEngravingEnabled ? totalPriceDetails.partIdEngravingCost.toFixed(2) : (totalPriceDetails.totalPartCount * 1.50).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <Separator className="my-2 font-bold" />
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-base font-semibold text-gray-900">Total Price (inc GST):</span>
                                    <span className="text-xl font-bold text-gray-900">${totalPriceDetails.totalIncGST.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Estimated Turnaround:</span>
                                    <span className="font-semibold text-gray-900">
                                        {totalTurnaround ? `${totalTurnaround} Day${totalTurnaround !== 1 ? 's' : ''}` : 'N/A'}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-col space-y-3">
                                    <Button
                                        variant="ghost"
                                        onClick={handleReset}
                                        className="w-full text-gray-600 hover:text-red-500 hover:bg-red-50 border border-gray-200/60 hover:border-red-200 transition-all duration-200 rounded-lg"
                                        size="sm"
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" /> Reset Order
                                    </Button>
                                    <Button
                                        onClick={handleSaveAndShare}
                                        disabled={partsList.length === 0 || isSharing}
                                        className="w-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm hover:shadow-md"
                                        size="lg"
                                    >
                                        <Share2 className="mr-2 h-4 w-4" />
                                        {isSharing ? 'Generating Link...' : 'Save and Share'}
                                    </Button>
                                    <Button
                                        onClick={handleAddToCart} 
                                        disabled={partsList.length === 0 || isAddingToCart}
                                        className="w-full text-white font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md hover:shadow-lg"
                                        style={{
                                            backgroundColor: '#194431',
                                            borderColor: '#194431'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!e.currentTarget.disabled) {
                                                e.currentTarget.style.backgroundColor = '#0f3320';
                                                e.currentTarget.style.borderColor = '#0f3320';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!e.currentTarget.disabled) {
                                                e.currentTarget.style.backgroundColor = '#194431';
                                                e.currentTarget.style.borderColor = '#194431';
                                            }
                                        }}
                                        size="lg"
                                    >
                                        {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Add parts to see pricing.</p>
                        )}
                    </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
      
      {/* Share Modal */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Your Configuration</h3>
              <button
                onClick={handleCloseShareModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Share this link with others so they can view your configuration and complete the checkout:
              </p>
              
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
                />
                <button
                  onClick={handleCopyShareUrl}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <span>⏱️ Link expires in 30 days</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(shareUrl, '_blank')}
                  className="flex items-center space-x-1 px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open</span>
                </button>
                <button
                  onClick={handleCloseShareModal}
                  className="px-4 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurvesCustomizer; 