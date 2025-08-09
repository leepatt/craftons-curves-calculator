'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RadiusProBuilderForm } from './RadiusProBuilderForm';
import RadiusProVisualizer from './RadiusProVisualizer';
import { Button } from '@/components/ui/button';
import { ProductDefinition, ProductConfiguration, Material, PartListItem, TotalPriceDetails } from '../../types';
import { AlertTriangle, Trash2, X, Pencil, Share2, Copy, ExternalLink, X as XIcon } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MANUFACTURE_RATE,
    MANUFACTURE_AREA_RATE,
    EFFICIENCY,
    APP_CONFIG,
} from '@/lib/config';
import { calculateNestingEfficiency, CURVE_EFFICIENCY_RATES } from '@/lib/pricingUtils';
import { SharedConfiguration } from '@/lib/shareStorage';
import materials from './materials.json';

// Add iframe height communication utilities
const communicateHeightToParent = () => {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    const newHeight = Math.ceil(document.body.scrollHeight);
    
    if (newHeight < 200) {
      console.warn(`📏 Iframe Height: Calculated height (${newHeight}px) is too small. Not sending update.`);
      return;
    }
    
    try {
      window.parent.postMessage({
        type: 'IFRAME_HEIGHT_CHANGE',
        height: newHeight,
        source: 'craftons-radius-pro-calculator'
      }, '*');
    } catch (error) {
      console.warn('❌ Iframe Height: Could not communicate with parent window:', error);
    }
  }
};

interface RadiusProCustomizerProps {
  defaultMaterial?: string;
  initialData?: SharedConfiguration;
}

interface SplitInfo {
  isTooLarge: boolean;
  numSplits: number;
}

const getInternalRadiusDisplay = (part: PartListItem): { internalRadius: number, displayString: string } => {
  const specifiedRadius = Number(part.config.specifiedRadius);
  const width = Number(part.config.width);
  const angle = Number(part.config.angle);
  const radiusType = part.config.radiusType as 'internal' | 'external';
  
  let internalRadius: number;
  let radiusMarker: string;
  
  if (radiusType === 'internal') {
    internalRadius = specifiedRadius;
    radiusMarker = 'R';
  } else {
    internalRadius = specifiedRadius - width;
    radiusMarker = 'R(int)';
  }
  
  internalRadius = Math.max(0, internalRadius);
  
  const displayString = `${radiusMarker}:${internalRadius} W:${width} A:${angle}°`;
  
  return { internalRadius, displayString };
};

const R_PLACEHOLDER = 900;
const W_PLACEHOLDER = 100;
const A_PLACEHOLDER = 90;
const THICKNESS_PLACEHOLDER = 18;
const RADIUS_TYPE_PLACEHOLDER = 'internal';

const getDefaultConfig = (defaultMaterial: string): ProductConfiguration => ({
  material: defaultMaterial,
  radiusType: 'internal',
  specifiedRadius: '',
  width: '',
  angle: '',
});

export const RadiusProCustomizer: React.FC<RadiusProCustomizerProps> = ({ 
  defaultMaterial = 'form-17',
  initialData
}) => {
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  const [product, setProduct] = useState<ProductDefinition | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ProductConfiguration>(getDefaultConfig(defaultMaterial));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusProMaterials, setRadiusProMaterials] = useState<Material[] | null>(null);

  const [partsList, setPartsList] = useState<PartListItem[]>(initialData?.partsList || []);
  const [currentPartQuantity, setCurrentPartQuantity] = useState<number>(1);
  
  const [totalPriceDetails, setTotalPriceDetails] = useState<TotalPriceDetails | null>(initialData?.totalPriceDetails || null);
  const [totalTurnaround, setTotalTurnaround] = useState<number | null>(initialData?.totalTurnaround || null);
  
  const [isEngravingEnabled, setIsEngravingEnabled] = useState<boolean>(initialData?.isEngravingEnabled ?? true);
  const [isJoinerBlocksEnabled, setIsJoinerBlocksEnabled] = useState<boolean>(initialData?.isJoinerBlocksEnabled ?? true);

  const [splitInfo, setSplitInfo] = useState<SplitInfo>({
    isTooLarge: false,
    numSplits: 1
  });

  const [splitLinesHovered, setSplitLinesHovered] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  
  // Set up iframe height communication
  useEffect(() => {
    const container = customizerContainerRef.current;
    if (!container) return;

    let debounceTimeout: NodeJS.Timeout;

    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(communicateHeightToParent, 100);
    });
    observer.observe(container);

    const intervalId = setInterval(communicateHeightToParent, 500);
    const initialTimeout = setTimeout(communicateHeightToParent, 300);

    return () => {
      clearTimeout(debounceTimeout);
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      observer.disconnect();
    };
  }, [partsList, totalPriceDetails, editingPartId, selectedPartId]);

  // Request product context from parent window
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      console.log('🔍 Requesting product context from parent window...');
      
      let attempts = 0;
      const maxAttempts = 10;
      let requestInterval: NodeJS.Timeout | null = null;

      const handleProductContextMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PRODUCT_CONTEXT_RESPONSE' && event.data.source === 'shopify-parent') {
          console.log('📦 Received product context from parent window:', event.data.productContext);
          
          const productContext = event.data.productContext;
          if (productContext && productContext.material) {
            setCurrentConfig(prevConfig => ({
              ...prevConfig,
              material: productContext.material,
            }));
          } else {
            console.log('ℹ️ No product context or material found in parent response.');
          }

          if (requestInterval) {
            clearInterval(requestInterval);
          }
          window.removeEventListener('message', handleProductContextMessage);
        }
      };

      window.addEventListener('message', handleProductContextMessage);

      const sendRequestContext = () => {
        attempts++;
        console.log(`📤 Sending product context request (Attempt: ${attempts})`);
        try {
          window.parent.postMessage({
            type: 'PRODUCT_CONTEXT_REQUEST',
            source: 'craftons-radius-pro-calculator'
          }, '*');
        } catch (error) {
          console.warn('❌ Could not request product context from parent window:', error);
          if (requestInterval) clearInterval(requestInterval);
        }

        if (attempts >= maxAttempts) {
          console.log('⏰ Product context request timed out after 5 seconds. Using default material.');
          if (requestInterval) clearInterval(requestInterval);
        }
      };
      
      sendRequestContext();
      requestInterval = setInterval(sendRequestContext, 500);

      return () => {
        if (requestInterval) {
          clearInterval(requestInterval);
        }
        window.removeEventListener('message', handleProductContextMessage);
      };
    }
  }, []);

  // Data Fetching
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const productData: ProductDefinition = {
          id: "radius-pro",
          name: "Radius Pro",
          description: "Professional radius and curve calculator with advanced geometry",
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
              max: 50000,
              step: 1,
              description: ""
            },
            {
              id: "width",
              label: "Width (w)",
              type: "number",
              defaultValue: "",
              min: 1,
              max: 1190,
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
          ]
        };
        
        setProduct(productData);

        const initialConfig = getDefaultConfig(defaultMaterial);
        productData.parameters.forEach(param => {
          if (!Object.prototype.hasOwnProperty.call(initialConfig, param.id)) {
            initialConfig[param.id] = param.defaultValue || '';
          }
        });
        setCurrentConfig(initialConfig);
        setCurrentPartQuantity(1);

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration data.';
        setError(errorMessage);
        setProduct(null);
        setCurrentConfig(getDefaultConfig(defaultMaterial));
        setRadiusProMaterials(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [defaultMaterial]);

  // Effect to load materials from local file
  useEffect(() => {
    try {
      console.log('[RadiusProCustomizer] Loading local materials:', materials.length, 'materials');
      setRadiusProMaterials(materials as Material[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error loading materials';
      console.error("[RadiusProCustomizer] Error loading materials:", message);
      setRadiusProMaterials(null);
    }
  }, []);

  // Determine if the current configuration is incomplete
  const isConfigIncomplete = !(
      currentConfig.material && currentConfig.material !== '' &&
      currentConfig.radiusType && (currentConfig.radiusType === 'internal' || currentConfig.radiusType === 'external') &&
      Number(currentConfig.specifiedRadius) > 0 &&
      Number(currentConfig.width) > 0 &&
      Number(currentConfig.angle) > 0
  );

  // Calculate actual inner and outer radii
  const getActualRadii = () => {
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
    } else {
      actualOuterR = specRad;
      actualInnerR = specRad - w;
    }
    if (actualInnerR < 0) actualInnerR = 0; 
    return { actualInnerRadius: actualInnerR, actualOuterRadius: actualOuterR };
  };

  const { actualInnerRadius, actualOuterRadius } = getActualRadii();

  const userAngle = Number(currentConfig.angle);
  const effectiveAngle = (!isNaN(userAngle) && userAngle > 0) ? userAngle : A_PLACEHOLDER;

  // Split Info Logic
  useEffect(() => {
    const angleNum = Number(effectiveAngle);

    if (isNaN(actualOuterRadius) || actualOuterRadius <= 0 || isNaN(angleNum) || angleNum <= 0 || angleNum > 360) {
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }

    if (isConfigIncomplete || !currentConfig.material || !radiusProMaterials || radiusProMaterials.length === 0) {
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }

    const selectedMaterial = radiusProMaterials.find(m => m.id === (currentConfig.material as string));
    
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

    if (isNaN(partConfigWidth) || partConfigWidth <= 0) {
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }
    
    let availableSheetLengthForChord: number;
    const minSheetDimension = Math.min(sheetL, sheetW);
    const maxSheetDimension = Math.max(sheetL, sheetW);
    
    if (partConfigWidth <= minSheetDimension) {
      availableSheetLengthForChord = maxSheetDimension;
    } else if (partConfigWidth <= maxSheetDimension) {
      availableSheetLengthForChord = minSheetDimension;
    } else {
      console.warn(`Part width (${partConfigWidth}mm) exceeds maximum sheet dimension (${maxSheetDimension}mm)`);
      setSplitInfo({ isTooLarge: true, numSplits: 1 });
      return;
    }

    if (availableSheetLengthForChord <= 0) {
      console.error(`Invalid available sheet length calculated: ${availableSheetLengthForChord}mm`);
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
      return;
    }

    const angleRad = angleNum * (Math.PI / 180);
    
    let chord_N1;
    if (angleNum > 180) {
      chord_N1 = 2 * actualOuterRadius;
    } else {
      chord_N1 = 2 * actualOuterRadius * Math.sin(angleRad / 2);
    }

    if (chord_N1 <= availableSheetLengthForChord) {
      setSplitInfo({ isTooLarge: false, numSplits: 1 });
    } else {
      const maxSinValue = availableSheetLengthForChord / (2 * actualOuterRadius);
      
      if (maxSinValue >= 1) {
        setSplitInfo({ isTooLarge: false, numSplits: 1 });
        return;
      }
      
      if (maxSinValue <= 0) {
        console.warn(`Radius ${actualOuterRadius}mm is too large for sheet ${availableSheetLengthForChord}mm`);
        setSplitInfo({ isTooLarge: true, numSplits: 10 });
        return;
      }
      
      const maxAngleRad = 2 * Math.asin(maxSinValue);
      const maxAngleDeg = maxAngleRad * (180 / Math.PI);
      
      let numSplitsCalc = Math.ceil(angleNum / maxAngleDeg);
      
      const MAX_ALLOWED_SPLITS = 20;
      numSplitsCalc = Math.max(2, Math.min(numSplitsCalc, MAX_ALLOWED_SPLITS));
      
      const splitAngle = angleNum / numSplitsCalc;
      let splitChordLength;
      if (splitAngle > 180) {
        splitChordLength = 2 * actualOuterRadius;
      } else {
        splitChordLength = 2 * actualOuterRadius * Math.sin((splitAngle * Math.PI / 180) / 2);
      }
      
      if (splitChordLength > availableSheetLengthForChord) {
        console.warn(`Split calculation insufficient. Split chord: ${splitChordLength.toFixed(2)}mm, Available: ${availableSheetLengthForChord}mm. Need more splits.`);
        numSplitsCalc = Math.min(MAX_ALLOWED_SPLITS, numSplitsCalc + 1);
      }
      
      setSplitInfo({ isTooLarge: true, numSplits: numSplitsCalc });
    }

  }, [
    actualOuterRadius, 
    effectiveAngle, 
    currentConfig.material, 
    currentConfig.width,
    radiusProMaterials,
    isConfigIncomplete
  ]);

  // Main Pricing Calculation
  useEffect(() => {
    if (partsList.length === 0 || !radiusProMaterials) {
        setTotalPriceDetails(null);
        setTotalTurnaround(null);
        return;
    }

    try {
        let totalMaterialCost = 0;
        let totalManufactureCost = 0;
        let overallMaxTurnaround = 0;
        const sheetsByMaterial: { [materialId: string]: number } = {};

        const groupedByMaterial: { [key: string]: PartListItem[] } = {};
        partsList.forEach(part => {
            const matId = part.config.material as string;
            if (!groupedByMaterial[matId]) {
                groupedByMaterial[matId] = [];
            }
            groupedByMaterial[matId].push(part);
        });

        for (const materialId_loopVariable in groupedByMaterial) {
            const groupItems = groupedByMaterial[materialId_loopVariable];
            const selectedMaterial = radiusProMaterials.find(m => m.id === materialId_loopVariable);

            if (!selectedMaterial) {
                console.error(`Material details not found for ID: ${materialId_loopVariable}. Skipping group.`);
                continue; 
            }

            let sumOfWeightedEfficiencies = 0;
            let sumOfTotalAreas = 0;

            groupItems.forEach(item => {
                let effectiveEfficiency = item.itemIdealEfficiency;
                
                if (item.numSplits > 1) {
                    const anglePerSplit = Number(item.config.angle) / item.numSplits;
                    const outerRadius = item.config.radiusType === 'external' 
                        ? Number(item.config.specifiedRadius)
                        : Number(item.config.specifiedRadius) + Number(item.config.width);
                    
                    let splitEfficiencyBonus = 0;
                    
                    let radiusFactor = 1.0;
                    if (outerRadius >= 5000) {
                        radiusFactor = 1.4;
                    } else if (outerRadius >= 3000) {
                        radiusFactor = 1.3;
                    } else if (outerRadius >= 1500) {
                        radiusFactor = 1.2;
                    } else if (outerRadius >= 800) {
                        radiusFactor = 1.1;
                    }
                    
                    if (anglePerSplit <= 15) {
                        splitEfficiencyBonus = 0.30 * radiusFactor;
                    } else if (anglePerSplit <= 25) {
                        splitEfficiencyBonus = 0.25 * radiusFactor;
                    } else if (anglePerSplit <= 40) {
                        splitEfficiencyBonus = 0.20 * radiusFactor;
                    } else if (anglePerSplit <= 60) {
                        splitEfficiencyBonus = 0.15 * radiusFactor;
                    } else if (anglePerSplit <= 90) {
                        splitEfficiencyBonus = 0.10 * radiusFactor;
                    } else {
                        splitEfficiencyBonus = 0.05 * radiusFactor;
                    }
                    
                    let splitCountMultiplier = 1.0;
                    if (item.numSplits >= 15) {
                        splitCountMultiplier = 1.08;
                    } else if (item.numSplits >= 10) {
                        splitCountMultiplier = 1.05;
                    } else if (item.numSplits >= 6) {
                        splitCountMultiplier = 1.02;
                    }
                    
                    effectiveEfficiency = item.itemIdealEfficiency + (splitEfficiencyBonus * splitCountMultiplier);
                    effectiveEfficiency = Math.min(0.70, effectiveEfficiency);
                    
                    if (item.numSplits > 5) {
                        console.log(`Efficiency Test - R:${outerRadius} Splits:${item.numSplits} AnglePerSplit:${anglePerSplit.toFixed(1)}° → Efficiency:${(effectiveEfficiency*100).toFixed(1)}%`);
                    }
                }
                
                const itemTotalArea = item.singlePartAreaM2 * item.numSplits * item.quantity;
                sumOfWeightedEfficiencies += itemTotalArea * effectiveEfficiency;
                sumOfTotalAreas += itemTotalArea;
            });

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

            const materialSheetAreaM2 = (selectedMaterial.sheet_length_mm / 1000) * (selectedMaterial.sheet_width_mm / 1000);
            const defaultSheetAreaFallback = 2.88;
            const currentSheetAreaM2 = materialSheetAreaM2 > 0 ? materialSheetAreaM2 : defaultSheetAreaFallback;

            const sheetsNeededForGroup = sumOfTotalAreas > 0 && currentSheetAreaM2 > 0 && groupNestingEfficiency > 0
                ? Math.ceil(sumOfTotalAreas / (currentSheetAreaM2 * groupNestingEfficiency))
                : 0;

            sheetsByMaterial[materialId_loopVariable] = sheetsNeededForGroup;

            const materialCostForGroup = sheetsNeededForGroup * selectedMaterial.sheet_price;
            const manufactureCostForGroup = MANUFACTURE_RATE * sheetsNeededForGroup + sumOfTotalAreas * MANUFACTURE_AREA_RATE;

            totalMaterialCost += materialCostForGroup;
            totalManufactureCost += manufactureCostForGroup;
        }

        const totalSheets = Object.values(sheetsByMaterial).reduce((sum, sheets) => sum + sheets, 0);
        
        if (totalSheets <= 5) {
            overallMaxTurnaround = 2;
        } else if (totalSheets <= 15) {
            overallMaxTurnaround = 3;
        } else if (totalSheets <= 40) {
            overallMaxTurnaround = 5;
        } else {
            overallMaxTurnaround = 7;
        }

        const totalPartCount = partsList.reduce((sum, part) => sum + (part.numSplits * part.quantity), 0);
        const partIdEngravingCost = (partsList.length > 1 && isEngravingEnabled) ? totalPartCount * 1.50 : 0;

        const totalJoinerBlocks = partsList.reduce((sum, part) => {
            if (part.numSplits > 1) {
                return sum + ((part.numSplits - 1) * part.quantity);
            }
            return sum;
        }, 0);
        const joinerBlocksCost = (totalJoinerBlocks > 0 && isJoinerBlocksEnabled) ? totalJoinerBlocks * 1.50 : 0;

        const totalIncGST = totalMaterialCost + totalManufactureCost + partIdEngravingCost + joinerBlocksCost;

        setTotalPriceDetails({
            materialCost: totalMaterialCost,
            manufactureCost: totalManufactureCost,
            partIdEngravingCost: partIdEngravingCost,
            joinerBlocksCost: joinerBlocksCost,
            totalIncGST: totalIncGST,
            sheetsByMaterial: sheetsByMaterial,
            totalPartCount: totalPartCount,
            totalJoinerBlocks: totalJoinerBlocks,
        });
        
        setTotalTurnaround(overallMaxTurnaround);

    } catch (calcError) {
        console.error("Error during total price calculation:", calcError);
        setTotalPriceDetails(null);
        setTotalTurnaround(null);
    }

  }, [partsList, radiusProMaterials, isEngravingEnabled, isJoinerBlocksEnabled]);

  // Handler functions
  const handleConfigChange = useCallback((changedValues: Partial<ProductConfiguration>) => {
    setCurrentConfig(prevConfig => {
      const updatedConfig = { ...prevConfig };
      for (const key in changedValues) {
        if (Object.prototype.hasOwnProperty.call(changedValues, key)) {
          const value = changedValues[key];
          if (value !== undefined) { 
            updatedConfig[key] = value; 
          } 
        }
      }
      return updatedConfig;
    });
  }, []);

  const handleFieldFocusChange = useCallback((fieldId: string | null) => {
    setFocusedField(fieldId);
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

    if (isConfigIncomplete || 
        widthNum <= 0 || 
        specRadiusNum <= 0 || 
        angleNum <= 0 || 
        angleNum > 360 ||
        (radiusTypeVal === 'external' && specRadiusNum <= widthNum)) {
        console.error("Cannot add part: Invalid configuration detected.");
        return;
    }
    
    const numSplitsValue = splitInfo.isTooLarge ? splitInfo.numSplits : 1;
    if (numSplitsValue <= 0 || isNaN(numSplitsValue)) {
        console.error("Cannot add part: Invalid split information.");
        return;
    }

    let singlePartAreaM2 = 0;
    let itemIdealEfficiency = 0.3;

    try {
      const fullPartAreaMM2 = (angleNum / 360) * Math.PI * (Math.pow(actualOuterRadius, 2) - Math.pow(actualInnerRadius, 2));
      
      if (isNaN(fullPartAreaMM2) || fullPartAreaMM2 <= 0) {
        console.error("Cannot add part: Invalid area calculation.");
        return;
      }
      
      if (numSplitsValue <= 1) {
        singlePartAreaM2 = fullPartAreaMM2 / 1000000;
        itemIdealEfficiency = calculateNestingEfficiency(actualInnerRadius, widthNum, angleNum, CURVE_EFFICIENCY_RATES);
      } else {
        const splitPartAngle = angleNum / numSplitsValue;
        
        if (splitPartAngle <= 0 || splitPartAngle > 360) {
          console.error("Cannot add part: Invalid split angle calculation.");
          return;
        }
        
        singlePartAreaM2 = (fullPartAreaMM2 / numSplitsValue) / 1000000;
        itemIdealEfficiency = calculateNestingEfficiency(actualInnerRadius, widthNum, splitPartAngle, CURVE_EFFICIENCY_RATES);
      }

      if (isNaN(singlePartAreaM2) || singlePartAreaM2 <= 0) {
        console.error("Cannot add part: Final area validation failed.");
        return;
      }
      
      if (isNaN(itemIdealEfficiency) || itemIdealEfficiency <= 0) {
        console.warn("Calculated ideal efficiency is invalid, using default 0.3");
        itemIdealEfficiency = 0.3;
      }

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
      
      if (product) {
        const defaultConfigForReset = getDefaultConfig(currentConfig.material);
        product.parameters.forEach(param => {
          if (!Object.prototype.hasOwnProperty.call(defaultConfigForReset, param.id) || defaultConfigForReset[param.id] === undefined) {
            defaultConfigForReset[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
          }
        });
        setCurrentConfig(defaultConfigForReset);
      } else {
        setCurrentConfig(getDefaultConfig(currentConfig.material));
      }
      setCurrentPartQuantity(1);

    } catch (error) {
      console.error("Error calculating part area:", error);
      return;
    }

  }, [currentConfig, currentPartQuantity, splitInfo, product, isConfigIncomplete, actualInnerRadius, actualOuterRadius]);

  const handleDeletePart = useCallback((idToDelete: string) => {
      setPartsList(prevList => prevList.filter(part => part.id !== idToDelete));
      if (selectedPartId === idToDelete) {
          setSelectedPartId(null);
      }
      if (editingPartId === idToDelete) {
          setEditingPartId(null);
      }
  }, [selectedPartId, editingPartId]);

  const handleStartEdit = useCallback((part: PartListItem) => {
      if (editingPartId && editingPartId !== part.id) {
          alert("Please save or cancel the current edit before editing another part.");
          return;
      }
      
      setEditingPartId(part.id);
      setCurrentConfig({ ...part.config });
      setCurrentPartQuantity(part.quantity);
      setSelectedPartId(null);
  }, [editingPartId]);

  const handleCancelEdit = useCallback(() => {
    setEditingPartId(null);
    if (product) {
        const defaultConfigForReset = getDefaultConfig(defaultMaterial);
        product.parameters.forEach(param => {
            if (!Object.prototype.hasOwnProperty.call(defaultConfigForReset, param.id) || defaultConfigForReset[param.id] === undefined) {
                defaultConfigForReset[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
            }
        });
        const lastMaterial = partsList.length > 0 ? partsList[partsList.length - 1].config.material : defaultMaterial;
        defaultConfigForReset.material = lastMaterial || 'form-17';
        setCurrentConfig(defaultConfigForReset);
    } else {
        setCurrentConfig(getDefaultConfig(defaultMaterial));
    }
    setCurrentPartQuantity(1);
  }, [product, partsList, defaultMaterial]);

  const handleSaveEdit = useCallback(() => {
    if (!editingPartId || !radiusProMaterials) return;

    const partToUpdate = partsList.find(p => p.id === editingPartId);
    if (!partToUpdate) return;

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
        let actualInnerRadius, actualOuterRadius;
        if (radiusTypeVal === 'internal') {
            actualInnerRadius = specRadiusNum;
            actualOuterRadius = specRadiusNum + widthNum;
        } else {
            actualOuterRadius = specRadiusNum;
            actualInnerRadius = specRadiusNum - widthNum;
        }

        if (actualInnerRadius < 0) actualInnerRadius = 0;

        const material = radiusProMaterials.find(m => m.id === currentConfig.material);
        if (!material) {
            alert("Selected material not found.");
            return;
        }

        const maxSheetSize = Math.min(material.sheet_length_mm, material.sheet_width_mm);
        const outerDiameter = actualOuterRadius * 2;
        const isTooLarge = outerDiameter > maxSheetSize;
        const numSplits = isTooLarge ? Math.ceil(angleNum / (360 * maxSheetSize / outerDiameter)) : 1;

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

        itemIdealEfficiency = Math.max(0.05, Math.min(0.95, itemIdealEfficiency));

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

        setEditingPartId(null);
        if (product) {
            const defaultConfigForReset = getDefaultConfig(currentConfig.material);
            product.parameters.forEach(param => {
                if (!Object.prototype.hasOwnProperty.call(defaultConfigForReset, param.id) || defaultConfigForReset[param.id] === undefined) {
                    defaultConfigForReset[param.id] = param.defaultValue !== undefined ? param.defaultValue : '';
                }
            });
            setCurrentConfig(defaultConfigForReset);
        } else {
            setCurrentConfig(getDefaultConfig(currentConfig.material));
        }
        setCurrentPartQuantity(1);

    } catch (error) {
        console.error("Error updating part:", error);
        alert("Error updating part. Please try again.");
    }
  }, [editingPartId, currentConfig, currentPartQuantity, partsList, radiusProMaterials, isConfigIncomplete, product]);

  // Keyboard support for editing
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
        isJoinerBlocksEnabled: isJoinerBlocksEnabled,
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

      if (response.ok && result.shareUrl) {
        setShareUrl(result.shareUrl);
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
  }, [partsList, totalPriceDetails, totalTurnaround, isEngravingEnabled, isJoinerBlocksEnabled]);

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

  // Add to cart function for Radius Pro
  const handleAddToCart = useCallback(async () => {
    if (!totalPriceDetails || partsList.length === 0) {
      alert("No parts to add to cart!");
      return;
    }

    console.log('🎯 Radius Pro Cart functionality enabled - attempting real Shopify cart API call');
  
    setIsAddingToCart(true);
  
    try {
      const quantity = Math.round(totalPriceDetails.totalIncGST * 100);

      const cartItemData = {
        items: [{
          id: APP_CONFIG.business.shopifyVariantId,
          quantity: quantity,
          properties: {
            '_order_type': 'radius_pro',
            '_total_price': totalPriceDetails.totalIncGST.toFixed(2),
            '_parts_count': partsList.length.toString(),
            '_total_turnaround': totalTurnaround ? `${totalTurnaround} days` : 'TBD',
            '_configuration_summary': partsList.map((part, index) => {
              const rType = part.config.radiusType as 'internal' | 'external';
              const specifiedRadius = Number(part.config.specifiedRadius);
              const width = Number(part.config.width);
              const angle = Number(part.config.angle);
              const internalRadiusCalc = rType === 'internal' ? specifiedRadius : specifiedRadius - width;
              const internalRadius = internalRadiusCalc < 0 ? 0 : internalRadiusCalc;
              const radiusMarker = rType === 'internal' ? 'R' : 'R(int)';
              const splitStr = part.numSplits > 1 ? ` Split:${part.numSplits}` : '';
              const materialStr = ` ${part.config.material}`;
              return `${index + 1}. ${radiusMarker}:${internalRadius} W:${width} A:${angle} Qty:${part.quantity}${splitStr}${materialStr}`;
            }).join('; '),
            ...(partsList.length > 1 && isEngravingEnabled ? {
              '_part_id_engraving': 'Included',
              '_engraving_cost': totalPriceDetails.partIdEngravingCost.toFixed(2)
            } : {}),
            ...(totalPriceDetails.totalJoinerBlocks > 0 && isJoinerBlocksEnabled ? {
              '_joiner_blocks': 'Included',
              '_joiner_blocks_quantity': totalPriceDetails.totalJoinerBlocks.toString(),
              '_joiner_blocks_cost': totalPriceDetails.joinerBlocksCost.toFixed(2)
            } : {}),
            '_materials': partsList.map(part => part.config.material).join(', '),
            '_materials_used': Object.entries(totalPriceDetails.sheetsByMaterial).map(([matId, count]) => {
              const materialName = radiusProMaterials?.find(m => m.id === matId)?.name || matId;
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

      const visiblePartProps: Record<string,string> = {};
      partsList.forEach((part, idx) => {
        const rType = part.config.radiusType as 'internal' | 'external';
        const specifiedRadius = Number(part.config.specifiedRadius);
        const width = Number(part.config.width);
        const angle = Number(part.config.angle);
        const internalRadiusCalc = rType === 'internal' ? specifiedRadius : specifiedRadius - width;
        const internalRadius = internalRadiusCalc < 0 ? 0 : internalRadiusCalc;
        const radiusMarker = rType === 'internal' ? 'R' : 'R(int)';
        const splitStr = part.numSplits > 1 ? ` Split:${part.numSplits}` : '';
        const materialStr = ` ${part.config.material}`;
        visiblePartProps[`${idx + 1}.`] = `${radiusMarker}:${internalRadius} W:${width} A:${angle} Qty:${part.quantity}${splitStr}${materialStr}`;
      });

      cartItemData.items[0].properties = {
        ...cartItemData.items[0].properties,
        ...visiblePartProps,
      };

      const propsJson = JSON.stringify(cartItemData.items[0].properties);
      const base64Props = btoa(unescape(encodeURIComponent(propsJson)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const shopDomain = process.env.NEXT_PUBLIC_SHOP_DOMAIN || 'craftons-au.myshopify.com';
      const variantId = APP_CONFIG.business.shopifyVariantId;
      const permalink = `https://${shopDomain}/cart/${variantId}:${quantity}?properties=${encodeURIComponent(base64Props)}&storefront=true`;

      console.log('🚀 Redirecting to cart permalink:', permalink);

      console.log(`Added ${partsList.length} part(s) to cart. Redirecting…`);

      if (window.top) {
        window.top.location.href = permalink;
      } else {
        window.location.href = permalink;
      }

      return;

    } catch (cartError) {
      console.error('💥 Error adding to cart:', cartError);
      
      let errorMessage = 'Failed to add to cart. ';
      if (cartError instanceof Error) {
        errorMessage += cartError.message;
        
        if (cartError.message.includes('422') || cartError.message.includes('variant')) {
          errorMessage += '\n\n🔧 Note: The 1-cent product may need to be set up in your Shopify store.';
        } else if (cartError.message.includes('405')) {
          errorMessage += '\n\n🔧 Note: This app needs to be embedded in your Shopify store or accessed through a Shopify product page for cart functionality to work.';
        } else if (cartError.message.includes('CORS') || cartError.message.includes('Failed to fetch')) {
          errorMessage += '\n\n🔧 Note: For full functionality, embed this app in your Shopify product page.';
        }
      } else {
        errorMessage += 'An unknown error occurred.';
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsAddingToCart(false);
    }
  }, [partsList, totalPriceDetails, totalTurnaround, isEngravingEnabled, isJoinerBlocksEnabled, radiusProMaterials, currentConfig.material]);

  // Calculate visualizer properties
  const selectedPart = selectedPartId ? partsList.find(p => p.id === selectedPartId) : null;
  const displayConfig = selectedPart ? selectedPart.config : currentConfig;
  const isDisplayingSelectedPart = !!selectedPart;
  
  useEffect(() => {
    console.log('RadiusProCustomizer Debug:', {
      displayConfigMaterial: displayConfig.material,
      materialsLoaded: !!radiusProMaterials,
      materialsCount: radiusProMaterials?.length || 0,
      materialsList: radiusProMaterials?.map(m => ({ id: m.id, name: m.name, texture: m.texture_diffuse })),
      isPlaceholderMode: !isDisplayingSelectedPart && (
        Number(displayConfig.specifiedRadius) <= 0 || 
        Number(displayConfig.width) <= 0 || 
        Number(displayConfig.angle) <= 0
      )
    });
  }, [displayConfig.material, radiusProMaterials, isDisplayingSelectedPart, displayConfig]);
  
  const getDisplayRadii = () => {
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
    } else {
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
  if (radiusProMaterials && materialId && materialId !== '') {
      const material = radiusProMaterials.find(m => m.id === materialId);
      if (material) currentMaterialThickness = material.thickness_mm;
  }
  
  const displayDerivedMeasurements = useMemo(() => {
    const angleNum = visualizerAngle;
    if (isNaN(displayOuterRadius) || displayOuterRadius <= 0 || isNaN(angleNum) || angleNum <= 0 || angleNum > 360) {
      return { arcLength: 0, chordLength: 0 };
    }
    
    const angleRad = angleNum * (Math.PI / 180);
    const calculatedArcLength = displayOuterRadius * angleRad;
    
    let calculatedChordLength;
    if (angleNum > 180) {
      calculatedChordLength = 2 * displayOuterRadius;
    } else {
      calculatedChordLength = 2 * displayOuterRadius * Math.sin(angleRad / 2);
    }
    
    if (isNaN(calculatedArcLength) || isNaN(calculatedChordLength) || calculatedArcLength <= 0 || calculatedChordLength <= 0) {
      return { arcLength: 0, chordLength: 0 };
    }
    
    return {
      arcLength: calculatedArcLength,
      chordLength: calculatedChordLength
    };
  }, [displayOuterRadius, visualizerAngle]);
  
  const displaySplitInfo = useMemo(() => {
    if (isDisplayingSelectedPart) {
      return { isTooLarge: selectedPart.numSplits > 1, numSplits: selectedPart.numSplits };
    }
    return splitInfo;
  }, [isDisplayingSelectedPart, selectedPart, splitInfo]);
  
  // Loading and Error States
  if (isLoading && !product) {
    return <div className="p-8 text-center">Loading Radius Pro configuration...</div>;
  }
  if (error && !product) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }
  if (!product) {
    return <div className="p-8 text-center">No product configuration available. Please try refreshing.</div>;
  }
  
  // JSX Structure - identical to Curves but with RadiusPro components
  return (
    <div ref={customizerContainerRef} className="flex flex-col text-foreground overflow-x-hidden"> 
      <div className="flex flex-1 gap-4 md:flex-row flex-col px-2 md:px-6"> 
        {/* Visualizer */}
        <main className="w-full md:flex-1 relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 flex flex-col items-center justify-center h-[400px] md:h-[576px] overflow-hidden order-1 md:order-1" style={{flexShrink: 0}}>
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
            <RadiusProVisualizer
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
              materialId={displayConfig.material as string}
              materials={radiusProMaterials || undefined}
            />
          </div>
          
          {displaySplitInfo.isTooLarge && (isDisplayingSelectedPart || (
                Number(displayConfig.specifiedRadius) > 0 && 
                Number(displayConfig.width) > 0 && 
                Number(displayConfig.angle) > 0
              )) && (
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

        {/* Customizer */}
        <aside className="w-full md:w-[28rem] lg:w-[33rem] flex-shrink-0 min-h-0 order-2 md:order-2"> 
          <ScrollArea className="h-full">
            <div className="space-y-5">
              <div className={`rounded-xl border shadow-lg ${editingPartId ? 'border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-blue-100/40 shadow-blue-200/50' : 'border-gray-200/60 bg-white shadow-gray-200/60'} p-3 md:p-5 space-y-4`}> 
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {editingPartId && <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>}
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">
                      {editingPartId ? (
                        <span className="text-blue-700">Edit Part</span>
                      ) : (
                        'Configure New Part'
                      )}
                    </h2>
                  </div>
                  {editingPartId && (
                    <div className="hidden md:block text-xs text-gray-600 bg-white/60 px-3 py-1 rounded-full border border-gray-200/60">
                      <kbd className="text-xs">Esc</kbd> to cancel • <kbd className="text-xs">Ctrl+Enter</kbd> to save
                    </div>
                  )}
                </div>
                {isLoading && !product ? (
                  <div>Loading form...</div>
                ) : product ? (
                  <RadiusProBuilderForm
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
                   <div>Could not load product definition for the form.</div>
                )}
              </div>

              {partsList.length > 0 && (
                <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-4 space-y-4"> 
                    {/* Parts List */} 
                    <div>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                            <span className="text-slate-700 font-bold text-sm">{partsList.length}</span>
                          </div>
                          <h2 className="text-lg md:text-xl font-bold text-gray-900">Parts Added to Sheet</h2>
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
                          <h2 className="text-lg md:text-xl font-bold text-gray-900">Order Summary</h2>
                        </div>
                        
                        {totalPriceDetails ? (
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center text-gray-600">
                                        <span className="text-gray-600">Material Cost </span>
                                        <span className="text-gray-500">
                                            {Object.entries(totalPriceDetails.sheetsByMaterial).map(([matId, count]) => {
                                                const materialName = radiusProMaterials?.find(m=>m.id===matId)?.name || matId;
                                                return (
                                                    <span key={matId}>
                                                        : ({materialName} x {count} Sheet{count !== 1 ? 's' : ''}) 
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
                                {totalPriceDetails.totalJoinerBlocks > 0 && (
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`${isJoinerBlocksEnabled ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                                                Joiner Blocks ({totalPriceDetails.totalJoinerBlocks}x)
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 p-0 hover:bg-red-100"
                                                onClick={() => setIsJoinerBlocksEnabled(!isJoinerBlocksEnabled)}
                                                title="Remove Joiner Blocks"
                                            >
                                                <X className="h-3 w-3 text-red-500 hover:text-red-700" />
                                            </Button>
                                        </div>
                                        <span className={`font-semibold ${isJoinerBlocksEnabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                                            ${isJoinerBlocksEnabled ? totalPriceDetails.joinerBlocksCost.toFixed(2) : (totalPriceDetails.totalJoinerBlocks * 1.50).toFixed(2)}
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
