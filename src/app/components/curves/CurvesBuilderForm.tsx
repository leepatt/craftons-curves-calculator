'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ProductDefinition,
  Material,
  ProductParameter,
  ProductConfiguration,
  NumberParameter,
  ButtonGroupParameter,
  SelectParameter,
} from '@/types';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertTriangle, PlusCircle, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { getApiBasePath } from '@/lib/utils';

interface CurvesBuilderFormProps {
  product: ProductDefinition;
  initialConfig: ProductConfiguration;
  onConfigChange: (changedValues: Partial<ProductConfiguration>) => void;
  onFieldFocusChange?: (fieldId: string | null) => void;
  splitInfo?: {
    isTooLarge: boolean;
    numSplits: number;
  };
  setSplitLinesHovered: (hovered: boolean) => void;
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  // New props for add part functionality
  onAddPart?: () => void;
  isAddPartDisabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
  // Edit mode props
  isEditMode?: boolean;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

export function CurvesBuilderForm({ 
  product, 
  initialConfig, 
  onConfigChange, 
  onFieldFocusChange,
  splitInfo, 
  setSplitLinesHovered,
  quantity,
  onQuantityChange,
  onAddPart,
  isAddPartDisabled,
  isLoading,
  error,
  isEditMode,
  onSaveEdit,
  onCancelEdit
}: CurvesBuilderFormProps) {
  // Display states are now primarily synced from initialConfig prop
  const [displayAngle, setDisplayAngle] = useState<string | number>(String(initialConfig.angle ?? ''));
  const [displayArcLength, setDisplayArcLength] = useState<string | number>('');
  const [displayChordLength, setDisplayChordLength] = useState<string | number>('');
  const [displaySpecifiedRadius, setDisplaySpecifiedRadius] = useState<string | number>(String(initialConfig.specifiedRadius ?? ''));
  const [displayWidth, setDisplayWidth] = useState<string | number>(String(initialConfig.width ?? ''));
  
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [materialsLoading, setMaterialsLoading] = useState<boolean>(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validation functions
  const validateInput = useCallback((field: string, value: string) => {
    const numValue = parseFloat(value);
    const errors = { ...validationErrors };
    
    if (field === 'specifiedRadius') {
      if (value && !isNaN(numValue)) {
        if (numValue < 100) {
          errors[field] = 'Radius must be at least 100mm';
        } else {
          // Only check basic geometric constraints, not sheet size limits (splitting handles oversized parts)
          const currentRadiusType = initialConfig.radiusType as 'internal' | 'external' || 'internal';
          const currentWidth = Number(initialConfig.width) || 0;
          
          if (currentRadiusType === 'external' && currentWidth > 0) {
            // For external radius, width must be less than the specified radius
            if (currentWidth >= numValue) {
              errors[field] = 'External radius must be greater than width';
            }
          }
        }
      }
      
      if (!errors[field]) {
        delete errors[field];
      }
    } else if (field === 'width') {
      if (value && !isNaN(numValue)) {
        if (numValue <= 0) {
          errors[field] = 'Width must be greater than 0mm';
        } else if (numValue > 1190) {
          errors[field] = 'Width cannot exceed 1190mm (sheet width)';
        } else {
          // Check geometric constraints for external radius type
          const currentRadiusType = initialConfig.radiusType as 'internal' | 'external' || 'internal';
          const currentSpecifiedRadius = Number(initialConfig.specifiedRadius) || 0;
          
          if (currentRadiusType === 'external' && currentSpecifiedRadius > 0) {
            if (numValue >= currentSpecifiedRadius) {
              errors[field] = 'Width must be less than external radius';
            }
          }
        }
      }
      
      if (!errors[field]) {
        delete errors[field];
      }
    } else if (field === 'angle') {
      if (value && (!isNaN(numValue) && (numValue <= 0 || numValue >= 361))) {
        errors[field] = 'Angle must be between 0.1° and 360°';
      } else {
        delete errors[field];
      }
    }
    
    setValidationErrors(errors);
  }, [initialConfig.radiusType, initialConfig.width, initialConfig.specifiedRadius, validationErrors]);

  // Callback to inform parent of focus change
  useEffect(() => {
    if (onFieldFocusChange) {
      onFieldFocusChange(activeField);
    }
  }, [activeField, onFieldFocusChange]);

  // Effect to fetch materials
  useEffect(() => {
    // Check if any parameter needs materials
    const needsMaterials = product.parameters.some(p => (p as SelectParameter).optionsSource === 'materials');

    if (needsMaterials) {
      const fetchMaterials = async () => {
        setMaterialsLoading(true);
        setMaterialsError(null);
        try {
          const basePath = getApiBasePath();
          const response = await fetch(`${basePath}/api/materials.json`);
          if (!response.ok) {
            throw new Error(`Failed to fetch materials: ${response.statusText}`);
          }
          const data: Material[] = await response.json();
          setMaterials(data);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error fetching materials';
          console.error("Error fetching materials:", message);
          setMaterialsError(message);
          setMaterials(null); // Clear materials on error
        } finally {
          setMaterialsLoading(false);
        }
      };
      fetchMaterials();
    }
  }, [product.parameters]); // Re-run if product parameters change

  // Update display states when initialConfig changes
  useEffect(() => {
    setDisplayAngle(String(initialConfig.angle ?? ''));
    setDisplaySpecifiedRadius(String(initialConfig.specifiedRadius ?? ''));
    setDisplayWidth(String(initialConfig.width ?? ''));
    
    const rType = initialConfig.radiusType as 'internal' | 'external' || 'internal';
    const specRad = Number(initialConfig.specifiedRadius);
    const w = Number(initialConfig.width);
    const angleNum = Number(initialConfig.angle);

    let calcInnerR, calcOuterR;
    if (rType === 'internal') {
      calcInnerR = specRad;
      calcOuterR = specRad + w;
    } else {
      calcOuterR = specRad;
      calcInnerR = specRad - w;
    }
    if (calcInnerR < 0) calcInnerR = 0;

    if (!isNaN(calcOuterR) && calcOuterR > 0 && 
        !isNaN(w) && w > 0 &&
        !isNaN(angleNum) && angleNum > 0) {
        const angleRad = angleNum * (Math.PI / 180);
        const calculatedArc = calcOuterR * angleRad;
        
        // FIXED: For angles > 180°, the piece spans the full diameter
        let calculatedChord;
        if (angleNum > 180) {
          calculatedChord = 2 * calcOuterR; // Diameter for any angle > 180°
        } else {
          calculatedChord = 2 * calcOuterR * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
        }
        
        // Only update derived values if user is not currently editing them
        if (activeField !== 'arcLength') {
          setDisplayArcLength(calculatedArc > 0 ? calculatedArc.toFixed(2) : '');
        }
        if (activeField !== 'chordLength') {
          setDisplayChordLength(calculatedChord > 0 ? calculatedChord.toFixed(2) : '');
        }
    } else {
        if (activeField !== 'arcLength') {
          setDisplayArcLength('');
        }
        if (activeField !== 'chordLength') {
          setDisplayChordLength('');
        }
    }
  }, [initialConfig, activeField]);

  // Separate handlers for input change vs blur to prevent typing interference
  const handleGeometricInputChange = useCallback((field: 'angle' | 'arcLength' | 'chordLength', value: string) => {
    // Update the display value for the field being typed in
    if (field === 'angle') {
      setDisplayAngle(value);
    }
    if (field === 'arcLength') setDisplayArcLength(value);
    if (field === 'chordLength') setDisplayChordLength(value);

    // Also calculate and update config for real-time visualizer updates
    const numValue = parseFloat(value);
    const specRad = Number(initialConfig.specifiedRadius);
    const w = Number(initialConfig.width);
    const rType = initialConfig.radiusType as 'internal' | 'external';
    
    // Calculate current outer radius for calculations
    let currentOuterR = 0;
    if (rType === 'internal') {
      currentOuterR = specRad + w;
    } else {
      currentOuterR = specRad;
    }

    // Only update config if we have valid input and configuration
    if (!isNaN(numValue) && numValue > 0 && 
        !isNaN(specRad) && specRad > 0 && 
        !isNaN(w) && w > 0 && 
        !(rType === 'external' && specRad <= w) && 
        currentOuterR > 0) {
      
      let calculatedAngle = 0;
      let isValidForConfig = false;

      try {
        if (field === 'angle' && numValue <= 360 && numValue >= 0.1) {
          calculatedAngle = numValue;
          isValidForConfig = true;
        } else if (field === 'arcLength') {
          const angleRad = numValue / currentOuterR;
          calculatedAngle = angleRad * (180 / Math.PI);
          isValidForConfig = calculatedAngle >= 0.1 && calculatedAngle <= 360;
        } else if (field === 'chordLength') {
          const maxChordLength = 2 * currentOuterR;
          if (numValue <= maxChordLength) {
            const sinHalfAngle = numValue / (2 * currentOuterR);
            if (sinHalfAngle <= 1 && sinHalfAngle > 0) {
              const angleRad = 2 * Math.asin(sinHalfAngle);
              calculatedAngle = angleRad * (180 / Math.PI);
              isValidForConfig = calculatedAngle >= 0.1 && calculatedAngle <= 360;
            }
          }
        }

        if (isValidForConfig && !isNaN(calculatedAngle)) {
          onConfigChange({ angle: Number(calculatedAngle.toFixed(2)) });
        }
      } catch {
        // Ignore calculation errors during typing
      }
    }
  }, [initialConfig, onConfigChange]);

  const handleGeometricInputBlur = useCallback((field: 'angle' | 'arcLength' | 'chordLength', value: string) => {
    const numValue = parseFloat(value);
    const specRad = Number(initialConfig.specifiedRadius);
    const w = Number(initialConfig.width);
    const rType = initialConfig.radiusType as 'internal' | 'external';
    
    // Calculate current outer radius for calculations
    let currentOuterR = 0;
    if (rType === 'internal') {
      currentOuterR = specRad + w;
    } else {
      currentOuterR = specRad;
    }

    let changedConfig: Partial<ProductConfiguration> = {};

    // Enhanced validation - check for invalid configurations early
    if (isNaN(specRad) || specRad <= 0 || isNaN(w) || w <= 0 || (rType === 'external' && specRad <= w) || currentOuterR <= 0) {
      // Reset to stored values if configuration is invalid
      const currentAngleFromStore = Number(initialConfig.angle);
      if (!isNaN(currentAngleFromStore) && currentAngleFromStore > 0) {
        setDisplayAngle(currentAngleFromStore.toFixed(2));
        const angleRad = currentAngleFromStore * (Math.PI / 180);
        const calcArc = currentOuterR > 0 ? currentOuterR * angleRad : 0;
        
        // FIXED: For angles > 180°, the piece spans the full diameter
        let calcChord = 0;
        if (currentOuterR > 0) {
          if (currentAngleFromStore > 180) {
            calcChord = 2 * currentOuterR; // Diameter for any angle > 180°
          } else {
            calcChord = 2 * currentOuterR * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
          }
        }
        
        if (calcArc > 0) setDisplayArcLength(calcArc.toFixed(2));
        if (calcChord > 0) setDisplayChordLength(calcChord.toFixed(2));
      } else {
        setDisplayAngle('');
        setDisplayArcLength('');
        setDisplayChordLength('');
      }
      return; 
    }

    let calculatedAngle = Number(initialConfig.angle);
    let calculatedArc = 0;
    let calculatedChord = 0;
    let isValidInput = !isNaN(numValue) && numValue > 0;

    try {
      if (field === 'angle' && isValidInput && numValue <= 360 && numValue >= 0.1) {
        const angleRad = numValue * (Math.PI / 180);
        calculatedAngle = numValue;
        calculatedArc = currentOuterR * angleRad;
        
        // FIXED: For angles > 180°, the piece spans the full diameter
        if (numValue > 180) {
          calculatedChord = 2 * currentOuterR; // Diameter for any angle > 180°
        } else {
          calculatedChord = 2 * currentOuterR * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
        }
        
        // Validate calculated values before setting
        if (!isNaN(calculatedArc) && !isNaN(calculatedChord) && calculatedArc > 0 && calculatedChord > 0) {
          setDisplayAngle(calculatedAngle.toFixed(2));
          setDisplayArcLength(calculatedArc.toFixed(2));
          setDisplayChordLength(calculatedChord.toFixed(2));
          changedConfig = { angle: Number(calculatedAngle.toFixed(2)) };
        } else {
          isValidInput = false;
        }
      } else if (field === 'arcLength' && isValidInput) {
        if (currentOuterR > 0) {
          const angleRad = numValue / currentOuterR;
          calculatedAngle = angleRad * (180 / Math.PI);
          
          // Validate angle range
          if (calculatedAngle >= 0.1 && calculatedAngle <= 360) {
            // FIXED: For angles > 180°, the piece spans the full diameter
            if (calculatedAngle > 180) {
              calculatedChord = 2 * currentOuterR; // Diameter for any angle > 180°
            } else {
              calculatedChord = 2 * currentOuterR * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
            }
            
            // Validate calculated values
            if (!isNaN(calculatedAngle) && !isNaN(calculatedChord) && calculatedChord >= 0) {
              setDisplayAngle(calculatedAngle.toFixed(2));
              setDisplayArcLength(String(numValue));
              setDisplayChordLength(calculatedChord.toFixed(2));
              changedConfig = { angle: Number(calculatedAngle.toFixed(2)) };
            } else {
              isValidInput = false;
            }
          } else {
            isValidInput = false;
          }
        } else {
          isValidInput = false;
        }
      } else if (field === 'chordLength' && isValidInput) {
        // Enhanced chord length validation
        const maxChordLength = 2 * currentOuterR;
        if (currentOuterR > 0 && numValue <= maxChordLength && numValue > 0) {
          const sinHalfAngle = numValue / (2 * currentOuterR);
          
          // Validate sine value is within valid range
          if (sinHalfAngle <= 1 && sinHalfAngle > 0) {
            const angleRad = 2 * Math.asin(sinHalfAngle);
            calculatedAngle = angleRad * (180 / Math.PI);
            
            // Validate angle range
            if (calculatedAngle >= 0.1 && calculatedAngle <= 360) {
              calculatedArc = currentOuterR * angleRad;
              
              // Validate calculated values
              if (!isNaN(calculatedAngle) && !isNaN(calculatedArc) && calculatedArc > 0) {
                setDisplayAngle(calculatedAngle.toFixed(2));
                setDisplayArcLength(calculatedArc.toFixed(2));
                setDisplayChordLength(String(numValue));
                changedConfig = { angle: Number(calculatedAngle.toFixed(2)) };
              } else {
                isValidInput = false;
              }
            } else {
              isValidInput = false;
            }
          } else {
            isValidInput = false;
          }
        } else {
          isValidInput = false;
        }
      } else {
        // Invalid input - restore values from store
        const currentAngleFromStore = Number(initialConfig.angle);
        if (!isNaN(currentAngleFromStore) && currentAngleFromStore > 0) {
          setDisplayAngle(currentAngleFromStore.toFixed(2));
          const angleRad = currentAngleFromStore * (Math.PI / 180);
          const calcArc = currentOuterR > 0 ? currentOuterR * angleRad : 0;
          
          // FIXED: For angles > 180°, the piece spans the full diameter
          let calcChord = 0;
          if (currentOuterR > 0) {
            if (currentAngleFromStore > 180) {
              calcChord = 2 * currentOuterR; // Diameter for any angle > 180°
            } else {
              calcChord = 2 * currentOuterR * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
            }
          }
          
          if (calcArc > 0) setDisplayArcLength(calcArc.toFixed(2));
          if (calcChord > 0) setDisplayChordLength(calcChord.toFixed(2));
        } else {
          setDisplayAngle('');
          setDisplayArcLength('');
          setDisplayChordLength('');
          onConfigChange({ angle: '' });
        }
        isValidInput = false;
      }
      
      if (isValidInput && Object.keys(changedConfig).length > 0) {
        onConfigChange(changedConfig);
      }
    } catch (e) {
      console.error("Calculation error in handleGeometricInputBlur:", e);
      // Restore from store on calculation error
      const currentAngleFromStore = Number(initialConfig.angle);
      if (!isNaN(currentAngleFromStore) && currentAngleFromStore > 0) {
        setDisplayAngle(currentAngleFromStore.toFixed(2));
        const angleRad = currentAngleFromStore * (Math.PI / 180);
        const calcArc = currentOuterR > 0 ? currentOuterR * angleRad : 0;
        
        // FIXED: For angles > 180°, the piece spans the full diameter
        let calcChord = 0;
        if (currentOuterR > 0) {
          if (currentAngleFromStore > 180) {
            calcChord = 2 * currentOuterR; // Diameter for any angle > 180°
          } else {
            calcChord = 2 * currentOuterR * Math.sin(angleRad / 2); // Standard chord formula for ≤ 180°
          }
        }
        
        if (calcArc > 0) setDisplayArcLength(calcArc.toFixed(2));
        if (calcChord > 0) setDisplayChordLength(calcChord.toFixed(2));
      } else {
        setDisplayAngle(''); 
        setDisplayArcLength(''); 
        setDisplayChordLength('');
        onConfigChange({ angle: '' });
      }
    }
  }, [initialConfig, onConfigChange]);

  const handleValueChange = useCallback((id: string, value: string | number) => {
    const param = product.parameters.find(p => p.id === id);
    if (!param) return;
    const valueStr = String(value);
    let changedConfig: Partial<ProductConfiguration> = {};

    if (id === 'radiusType') {
      changedConfig = { [id]: valueStr } as Partial<ProductConfiguration>;
      onConfigChange(changedConfig);
      
      // Re-validate existing values when radius type changes
      setTimeout(() => {
        const currentSpecifiedRadius = String(initialConfig.specifiedRadius || '');
        const currentWidth = String(initialConfig.width || '');
        if (currentSpecifiedRadius) {
          validateInput('specifiedRadius', currentSpecifiedRadius);
        }
        if (currentWidth) {
          validateInput('width', currentWidth);
        }
        
        const currentAngle = Number(initialConfig.angle);
        if (!isNaN(currentAngle) && currentAngle > 0) {
          handleGeometricInputChange('angle', String(currentAngle));
        }
      }, 0);
      return;
    }

    if (id === 'specifiedRadius') {
      setDisplaySpecifiedRadius(valueStr);
      const numericValue = parseFloat(valueStr);
      if (param.type === 'number') {
          const numParam = param as NumberParameter;
          if (!isNaN(numericValue) && numericValue >= numParam.min! && (numParam.max === undefined || numericValue <= numParam.max)) {
              changedConfig = { [id]: numericValue };
          } else if (valueStr === '') {
              changedConfig = { [id]: '' };
          } else return;
          onConfigChange(changedConfig); 
          const currentAngle = Number(initialConfig.angle);
          if (!isNaN(currentAngle) && currentAngle > 0) {
              setTimeout(() => handleGeometricInputBlur('angle', String(currentAngle)), 0);
          }
      }
      return;
    }

    if (id === 'width') {
        setDisplayWidth(valueStr);
        const numericValue = parseFloat(valueStr);
        if (param.type === 'number') {
            const numParam = param as NumberParameter;
            if (!isNaN(numericValue) && numericValue >= numParam.min! && (numParam.max === undefined || numericValue <= numParam.max)) {
                changedConfig = { [id]: numericValue };
            } else if (valueStr === '') {
                changedConfig = { [id]: '' };
            } else return;
            onConfigChange(changedConfig);
            const currentAngle = Number(initialConfig.angle);
            if (!isNaN(currentAngle) && currentAngle > 0) {
                setTimeout(() => handleGeometricInputBlur('angle', String(currentAngle)), 0);
            }
        }
      return;
    }
    
    if (id === 'angle') {
        handleGeometricInputBlur('angle', valueStr);
        return;
    }

    let finalUpdatedValue: string | number | undefined = undefined;
    if (param.type === 'number') { 
      const numericValue = parseFloat(valueStr);
      const numParam = param as NumberParameter;
      if (!isNaN(numericValue) && (numParam.min === undefined || numericValue >= numParam.min) && (numParam.max === undefined || numericValue <= numParam.max)) {
        finalUpdatedValue = numericValue;
      } else if (valueStr === '') {
        finalUpdatedValue = '';
      } else {
        return; 
      }
    } else { 
      finalUpdatedValue = valueStr;
    }

    if (finalUpdatedValue !== undefined) {
      const currentValInInitialConfig = initialConfig[id];
      if (Object.prototype.hasOwnProperty.call(initialConfig, id)) {
        if (currentValInInitialConfig !== finalUpdatedValue) {
          changedConfig = { [id]: finalUpdatedValue };
          onConfigChange(changedConfig);
        }
      } else {
        changedConfig = { [id]: finalUpdatedValue };
        onConfigChange(changedConfig);
      }
    }
  }, [product.parameters, initialConfig, onConfigChange, handleGeometricInputBlur, validateInput, handleGeometricInputChange]);
  
  const materialParam = useMemo(() => product.parameters.find(p => p.id === 'material'), [product.parameters]);
  const radiusTypeParam = useMemo(() => product.parameters.find(p => p.id === 'radiusType'), [product.parameters]);
  const specifiedRadiusParam = useMemo(() => product.parameters.find(p => p.id === 'specifiedRadius'), [product.parameters]);
  const widthParam = useMemo(() => product.parameters.find(p => p.id === 'width'), [product.parameters]);

  const otherParams = useMemo(() => 
      product.parameters.filter(p => !['material', 'radiusType', 'specifiedRadius', 'width', 'angle'].includes(p.id)), 
      [product.parameters]
  );

  const renderParameter = (param: ProductParameter) => {
    if (['specifiedRadius', 'width', 'angle', 'material', 'radiusType'].includes(param.id)) return null;
    
    const commonProps = {
      id: param.id,
    };
    const label = <Label htmlFor={param.id} className="block mb-2 font-medium text-foreground">{param.label}</Label>;

    switch (param.type) {
      case 'number': {
        if (['angle', 'specifiedRadius', 'width'].includes(param.id)) return null;
        const numParam = param as NumberParameter;
        return (
          <div key={param.id}>
            <Label htmlFor={param.id} className="block mb-2 font-medium text-foreground">{param.label}</Label>
            <Input
              type="number"
              id={numParam.id}
              value={String(initialConfig[numParam.id] ?? '')}
              onChange={(e) => handleValueChange(numParam.id, e.target.value)}
              onFocus={() => setActiveField(numParam.id)}
              onBlur={() => setActiveField(null)}
              min={numParam.min}
              max={numParam.max}
              step={numParam.step}
              className="w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
            {numParam.description && <p className="text-sm text-muted-foreground mt-1">{numParam.description}</p>}
          </div>
        );
      }
      case 'button-group': {
        if (param.id === 'radiusType') return null;
        const btnParam = param as ButtonGroupParameter;
        return (
          <div key={param.id}>
            <Label htmlFor={param.id} className="block mb-2 font-medium text-foreground">{param.label}</Label>
            <ToggleGroup
              type="single"
              value={String(initialConfig[btnParam.id] ?? '')}
              onValueChange={(value: string) => { if (value) { handleValueChange(btnParam.id, value); }}}
              className="justify-start"
            >
              {btnParam.options.map(option => (
                <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {btnParam.description && <p className="text-sm text-muted-foreground mt-1">{btnParam.description}</p>}
          </div>
        );
      }
      case 'select': {
        if (param.id === 'material') return null;
        
        let options: { value: string, label: string }[] = [];
        let isLoading = false;
        let errorMsg: string | null = null;
        let placeholder = `Select ${param.label}...`;

        if (param.optionsSource === 'materials') {
          if (materialsLoading) {
            isLoading = true;
            placeholder = 'Loading materials...';
          } else if (materialsError) {
            errorMsg = materialsError;
            placeholder = 'Error loading materials';
          } else if (materials) {
            options = materials.map(mat => ({ value: mat.id, label: mat.name }));
          } else {
            placeholder = 'No materials available';
          }
        } else if (param.options) {
          options = param.options;
        } else {
          errorMsg = `No options defined for ${param.label}`;
          placeholder = errorMsg;
          console.warn(`Select parameter '${param.id}' has no options defined or sourced.`);
        }

        if (isLoading || errorMsg) {
          return (
            <div key={param.id} {...commonProps}>
              {label}
              <Select disabled className="w-full">
                <option value="" disabled>{placeholder}</option>
              </Select>
              {param.description && <p className="text-sm text-muted-foreground mt-1">{param.description}</p>}
              {errorMsg && <p className="text-sm text-red-500 mt-1">{errorMsg}</p>}
            </div>
          );
        }

        return (
          <div key={param.id} {...commonProps}>
            {label}
            <Select
              value={String(initialConfig[param.id] ?? '')}
              onValueChange={(value) => handleValueChange(param.id, value)}
              className="w-full"
            >
              <option value="" disabled>{placeholder}</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {param.description && <p className="text-sm text-muted-foreground mt-1">{param.description}</p>}
          </div>
        );
      }
      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <div key={(param as any).id}>Unsupported: {(param as any).type}</div>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Material Selection */}
      {materialParam && (
          <div>
              <Label htmlFor={materialParam.id} className="block mb-2 font-medium text-foreground">{materialParam.label}</Label>
              <Select
                value={String(initialConfig[materialParam.id] ?? '')}
                onValueChange={(value) => handleValueChange(materialParam.id, value)}
                disabled={materialsLoading || !!materialsError || !materials}
                className="w-full"
              >
                <option value="" disabled>
                  {materialsLoading ? 'Loading...' : materialsError ? 'Error' : 'Select Material...'}
                </option>
                {materials?.map(mat => (
                  <option key={mat.id} value={mat.id}>
                    {mat.name} · {mat.thickness_mm}mm · {mat.sheet_length_mm}×{mat.sheet_width_mm}mm · ${mat.sheet_price.toFixed(2)}
                  </option>
                ))}
              </Select>
              {materialsError && <p className="text-sm text-red-500 mt-1">{materialsError}</p>}
              {(materialParam as SelectParameter).description && <p className="text-sm text-muted-foreground mt-1">{(materialParam as SelectParameter).description}</p>}
          </div>
      )}

      {/* Radius Type Selection */}
      {radiusTypeParam && (
        <div>
            <ToggleGroup
              type="single"
              value={String(initialConfig[radiusTypeParam.id] ?? 'internal')}
              onValueChange={(val) => { if (val) handleValueChange(radiusTypeParam.id, val); }}
              className="justify-start"
            >
              {(radiusTypeParam as ButtonGroupParameter).options?.map(option => (
                <ToggleGroupItem 
                  key={option.value} 
                  value={option.value} 
                  aria-label={option.label}
                  variant="outline"
                  className={`text-sm font-medium transition-all duration-200 border rounded-lg px-4 py-2 ${
                    String(initialConfig[radiusTypeParam.id] ?? 'internal') === option.value 
                      ? 'bg-slate-100 text-slate-800 border-slate-400 shadow-sm' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-sm text-muted-foreground mt-2">Radius: inner or outer edge.</p>
          </div>
      )}

      {/* Radius and Width Row */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {specifiedRadiusParam && (
            <div>
                 <Label htmlFor={specifiedRadiusParam.id} className="block mb-1 font-medium text-foreground">
                    {initialConfig.radiusType === 'external' ? 'Ext. Radius (r)' : 'Int. Radius (r)'}
                 </Label>
                 <Input
                   type="number"
                   id={specifiedRadiusParam.id}
                   value={String(displaySpecifiedRadius)} 
                   onChange={(e) => handleValueChange(specifiedRadiusParam.id, e.target.value)}
                   onFocus={() => {
                     // Clear validation error when user starts typing
                     const errors = { ...validationErrors };
                     delete errors[specifiedRadiusParam.id];
                     setValidationErrors(errors);
                     setActiveField(specifiedRadiusParam.id);
                   }}
                   onBlur={() => {
                     validateInput(specifiedRadiusParam.id, String(displaySpecifiedRadius));
                     setActiveField(null);
                   }}
                   placeholder="mm"
                   min={(specifiedRadiusParam as NumberParameter).min}
                   step={(specifiedRadiusParam as NumberParameter).step}
                   className={`w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                     validationErrors.specifiedRadius ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                   }`}
                 />
                 {validationErrors.specifiedRadius && (
                   <p className="text-sm text-red-500 mt-1">{validationErrors.specifiedRadius}</p>
                 )}
            </div>
        )}

        {widthParam && (
            <div>
                 <Label htmlFor={widthParam.id} className="block mb-1 font-medium text-foreground">{widthParam.label}</Label>
                 <Input
                   type="number"
                   id={widthParam.id}
                   value={String(displayWidth)} 
                   onChange={(e) => handleValueChange(widthParam.id, e.target.value)}
                   onFocus={() => {
                     // Clear validation error when user starts typing
                     const errors = { ...validationErrors };
                     delete errors[widthParam.id];
                     setValidationErrors(errors);
                     setActiveField(widthParam.id);
                   }}
                   onBlur={() => {
                     validateInput(widthParam.id, String(displayWidth));
                     setActiveField(null);
                   }}
                   placeholder="mm"
                   min={(widthParam as NumberParameter).min}
                   step={(widthParam as NumberParameter).step}
                   className={`w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                     validationErrors.width ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                   }`}
                 />
                 {validationErrors.width && (
                   <p className="text-sm text-red-500 mt-1">{validationErrors.width}</p>
                 )}
            </div>
        )}
      </div>
        
      {/* Angle, Arc Length, Chord Length Row */}
      <div>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div>
                 <Label htmlFor="angle" className="block mb-1 font-medium text-foreground">Angle (θ)</Label>
                 <Input 
                   type="number" 
                   id="angle" 
                   value={displayAngle}
                   onChange={(e) => handleGeometricInputChange('angle', e.target.value)}
                   onBlur={(e) => {
                     validateInput('angle', e.target.value);
                     handleGeometricInputBlur('angle', e.target.value);
                     setActiveField(null);
                   }}
                   onFocus={() => {
                     // Clear validation error when user starts typing
                     const errors = { ...validationErrors };
                     delete errors.angle;
                     setValidationErrors(errors);
                     setActiveField('angle');
                   }} 
                   min={1} 
                   max={360} 
                   step={0.1} 
                   placeholder="degrees" 
                   className={`w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                     validationErrors.angle ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                   }`}
                 />
                 {validationErrors.angle && (
                   <p className="text-sm text-red-500 mt-1">{validationErrors.angle}</p>
                 )}
              </div>
              <div>
                 <Label htmlFor="arcLength" className="block mb-1 font-medium text-foreground">Arc Length (L)</Label>
                 <Input 
                   type="number" 
                   id="arcLength" 
                   value={displayArcLength}
                   onChange={(e) => handleGeometricInputChange('arcLength', e.target.value)}
                   onBlur={(e) => {
                     handleGeometricInputBlur('arcLength', e.target.value);
                     setActiveField(null);
                   }}
                   onFocus={() => setActiveField('arcLength')} 
                   min={0.01} 
                   step={0.1} 
                   placeholder="mm" 
                   className="w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" 
                 />
              </div>
              <div>
                 <Label htmlFor="chordLength" className="block mb-1 font-medium text-foreground">Chord Length (c)</Label>
                 <Input 
                   type="number" 
                   id="chordLength" 
                   value={String(displayChordLength)}
                   onChange={(e) => handleGeometricInputChange('chordLength', e.target.value)}
                   onBlur={(e) => {
                     handleGeometricInputBlur('chordLength', e.target.value);
                     setActiveField(null);
                   }}
                   onFocus={() => setActiveField('chordLength')} 
                   min={0.01} 
                   step={0.1} 
                   placeholder="mm" 
                   className="w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                 />
              </div>
          </div>
          <p className={`text-sm mt-3 transition-all duration-200 ease-in-out ${
            activeField === 'angle' || activeField === 'arcLength' || activeField === 'chordLength'
              ? 'text-amber-800 font-medium'
              : 'text-gray-700'
          }`}>
          Input Angle, Arc Length, or Chord Length and the others will auto-calculate.
          </p>
      </div>

      {/* Other Parameters */}
      {otherParams
        .filter(param => param.id !== radiusTypeParam?.id)
        .map(param => (
          <div key={param.id}>
              {renderParameter(param)}
          </div>
      ))}
      
      {/* Split Warning */}
      {splitInfo?.isTooLarge && (
          <div 
            className="cursor-pointer group"
            onMouseEnter={() => setSplitLinesHovered(true)}
            onMouseLeave={() => setSplitLinesHovered(false)}
          >
              <div className="border border-amber-300/40 text-amber-700 bg-amber-50/95 px-4 py-3 rounded-lg flex items-center text-sm shadow-lg hover:shadow-xl transition-all duration-200 group-hover:border-amber-400/60">
                  <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 text-amber-600" />
                  <div className="flex flex-col">
                      <span className="font-medium">Part will be split into 3 sections due to size constraints.</span>
                  </div>
              </div>
          </div>
      )}

      {/* Part Quantity */}
      <div>
        <Label htmlFor="part-quantity" className="block mb-1 font-medium text-foreground">Part Quantity</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center w-fit">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-r-none border-r-0 hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-all duration-200" 
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))} 
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input 
              id="part-quantity" 
              type="number" 
              value={String(quantity)} 
              onChange={(e) => { 
                const val = parseInt(e.target.value, 10); 
                onQuantityChange(isNaN(val) || val < 1 ? 1 : val);
              }} 
              min={1} 
              step={1} 
              className="h-9 w-16 rounded-none border-x-0 text-center border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" 
              aria-label="Part quantity"
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-l-none border-l-0 hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-all duration-200" 
              onClick={() => onQuantityChange(quantity + 1)} 
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Add Part Button or Edit Mode Buttons */}
          {isEditMode ? (
            <div className="flex gap-2 flex-1">
              <Button 
                onClick={onSaveEdit}
                disabled={isLoading || !!error || isAddPartDisabled} 
                className="flex-1 bg-green-700 hover:bg-green-800 text-white font-semibold transition-all duration-200 border border-green-700 hover:border-green-800 rounded-lg shadow-md hover:shadow-lg"
                size="default"
              >
                <Check className="mr-2 h-4 w-4"/>
                Save Changes
              </Button>
              <Button 
                onClick={onCancelEdit}
                variant="outline"
                className="flex-1 font-semibold border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 hover:text-gray-800 transition-all duration-200 rounded-lg"
                size="default"
              >
                <XIcon className="mr-2 h-4 w-4"/>
                Cancel
              </Button>
            </div>
          ) : (
            onAddPart && (
              <Button 
                onClick={onAddPart}
                disabled={isLoading || !!error || isAddPartDisabled} 
                className="flex-1 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-md hover:shadow-lg"
                style={{
                    backgroundColor: '#192344',
                    borderColor: '#192344'
                }}
                onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#0f1a35';
                        e.currentTarget.style.borderColor = '#0f1a35';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#192344';
                        e.currentTarget.style.borderColor = '#192344';
                    }
                }}
                size="default"
              >
                <PlusCircle className="mr-2 h-4 w-4"/>
                Add Part
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
} 