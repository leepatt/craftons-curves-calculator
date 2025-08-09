'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Material interface (MUST match materials.json structure)
interface Material {
  id: string;
  name: string;
  price: number;
  sheet_width: number;
  sheet_height: number;
  thickness: number;
  texture: string;
}

// Props interface
type BoxBuilderFormProps = {
  materials: Material[];
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  width: number;
  onWidthChange: (value: number) => void;
  depth: number;
  onDepthChange: (value: number) => void;
  height: number;
  onHeightChange: (value: number) => void;
  dimensionsType: 'inside' | 'outside';
  onDimensionsTypeChange: (value: 'inside' | 'outside') => void;
  boxType: 'open-top' | 'closed-lid';
  onBoxTypeChange: (value: 'open-top' | 'closed-lid') => void;
  joinType: 'butt-join' | 'finger-join';
  onJoinTypeChange: (value: 'butt-join' | 'finger-join') => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
};

export const BoxBuilderForm: React.FC<BoxBuilderFormProps> = ({
  materials,
  selectedMaterial,
  onMaterialChange,
  width,
  onWidthChange,
  depth,
  onDepthChange,
  height,
  onHeightChange,
  dimensionsType,
  onDimensionsTypeChange,
  boxType,
  onBoxTypeChange,
  joinType,
  onJoinTypeChange,
  quantity,
  onQuantityChange,
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validation logic
  const validateInput = (field: string, value: string) => {
    const errors = { ...validationErrors };
    const numValue = parseFloat(value);
    
    if (field === 'width' || field === 'depth' || field === 'height') {
      if (isNaN(numValue) || numValue <= 0) {
        errors[field] = 'Must be a positive number';
      } else if (numValue < 10) {
        errors[field] = 'Minimum dimension is 10mm';
      } else if (numValue > 3000) {
        errors[field] = 'Maximum dimension is 3000mm';
      } else {
        delete errors[field];
      }
    } else if (field === 'quantity') {
      if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
        errors[field] = 'Must be a positive whole number';
      } else if (numValue > 100) {
        errors[field] = 'Maximum quantity is 100';
      } else {
        delete errors[field];
      }
    }
    
    setValidationErrors(errors);
  };

  const handleInputChange = (field: string, value: string, onChange: (val: number) => void) => {
    validateInput(field, value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Box Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="width" className="block mb-1 font-medium text-foreground">Width (mm)</Label>
          <Input
            id="width"
            type="number"
            value={width}
            onChange={(e) => handleInputChange('width', e.target.value, onWidthChange)}
            placeholder="420"
            className={validationErrors.width ? 'border-red-500' : ''}
          />
          {validationErrors.width && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.width}</p>
          )}
        </div>

        <div>
          <Label htmlFor="depth" className="block mb-1 font-medium text-foreground">Depth (mm)</Label>
          <Input
            id="depth"
            type="number"
            value={depth}
            onChange={(e) => handleInputChange('depth', e.target.value, onDepthChange)}
            placeholder="400"
            className={validationErrors.depth ? 'border-red-500' : ''}
          />
          {validationErrors.depth && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.depth}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="height" className="block mb-1 font-medium text-foreground">Height (mm)</Label>
          <Input
            id="height"
            type="number"
            value={height}
            onChange={(e) => handleInputChange('height', e.target.value, onHeightChange)}
            placeholder="400"
            className={validationErrors.height ? 'border-red-500' : ''}
          />
          {validationErrors.height && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.height}</p>
          )}
        </div>

        <div>
          <Label className="block mb-1 font-medium text-foreground">Dimensions Are</Label>
          <ToggleGroup 
            type="single" 
            value={dimensionsType} 
            onValueChange={(value) => value && onDimensionsTypeChange(value as 'inside' | 'outside')}
            className="justify-start"
          >
            <ToggleGroupItem value="inside" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
              Inside
            </ToggleGroupItem>
            <ToggleGroupItem value="outside" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
              Outside
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Material Selection */}
      <div>
        <Label htmlFor="material-select" className="block mb-1 font-medium text-foreground">Material</Label>
        <Select value={selectedMaterial} onValueChange={onMaterialChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Material..." />
          </SelectTrigger>
          <SelectContent>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{material.name}</span>
                  <span className="text-sm text-gray-500">
                    {material.sheet_width}×{material.sheet_height}mm × {material.thickness}mm - ${material.price}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Box Type and Join Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block mb-1 font-medium text-foreground">Box Type</Label>
          <ToggleGroup 
            type="single" 
            value={boxType} 
            onValueChange={(value) => value && onBoxTypeChange(value as 'open-top' | 'closed-lid')}
            className="justify-start grid grid-cols-1 gap-1"
          >
            <ToggleGroupItem value="open-top" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
              Open Top
            </ToggleGroupItem>
            <ToggleGroupItem value="closed-lid" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
              Closed Lid
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div>
          <Label className="block mb-1 font-medium text-foreground">Join Type</Label>
          <ToggleGroup 
            type="single" 
            value={joinType} 
            onValueChange={(value) => value && onJoinTypeChange(value as 'butt-join' | 'finger-join')}
            className="justify-start grid grid-cols-1 gap-1"
          >
            <ToggleGroupItem value="butt-join" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
              Butt Join
            </ToggleGroupItem>
            <ToggleGroupItem value="finger-join" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
              Finger Join
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
};
