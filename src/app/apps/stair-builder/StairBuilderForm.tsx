'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Material interface (MUST match materials.json structure)
interface Material {
  id: string;
  name: string;
  price: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

// Props interface
type StairBuilderFormProps = {
  materials: Material[];
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  // Placeholder props - TODO: Replace with actual stair-specific props
  totalRise: number;
  onTotalRiseChange: (value: number) => void;
  stepCount: number;
  onStepCountChange: (value: number) => void;
  treadDepth: number;
  onTreadDepthChange: (value: number) => void;
  stringerWidth: number;
  onStringerWidthChange: (value: number) => void;
};

export const StairBuilderForm: React.FC<StairBuilderFormProps> = ({
  materials,
  selectedMaterial,
  onMaterialChange,
  totalRise,
  onTotalRiseChange,
  stepCount,
  onStepCountChange,
  treadDepth,
  onTreadDepthChange,
  stringerWidth,
  onStringerWidthChange,
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validation logic
  const validateInput = (field: string, value: string) => {
    const errors = { ...validationErrors };
    const numValue = parseFloat(value);
    
    switch (field) {
      case 'totalRise':
        if (numValue <= 0 || numValue > 5000) {
          errors[field] = 'Total rise must be between 1-5000mm';
        } else {
          delete errors[field];
        }
        break;
      case 'stepCount':
        if (numValue < 2 || numValue > 50) {
          errors[field] = 'Step count must be between 2-50';
        } else {
          delete errors[field];
        }
        break;
      case 'treadDepth':
        if (numValue < 200 || numValue > 400) {
          errors[field] = 'Tread depth should be between 200-400mm';
        } else {
          delete errors[field];
        }
        break;
      case 'stringerWidth':
        if (numValue < 200 || numValue > 500) {
          errors[field] = 'Stringer width should be between 200-500mm';
        } else {
          delete errors[field];
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  return (
    <div className="space-y-4">
      {/* Material Selection - ALWAYS FIRST */}
      <div>
        <Label htmlFor="material-select" className="block mb-1 font-medium text-foreground">Material</Label>
        <Select value={selectedMaterial} onValueChange={onMaterialChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{material.name}</span>
                  <span className="text-sm text-gray-500">
                    {material.sheet_width}×{material.sheet_height}mm - ${material.price}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Placeholder stair-specific input fields - TODO: Replace with actual requirements */}
      <div>
        <Label htmlFor="total-rise" className="block mb-1 font-medium text-foreground">Total Rise (mm)</Label>
        <Input
          id="total-rise"
          type="number"
          value={totalRise}
          onChange={(e) => {
            const value = e.target.value;
            validateInput('totalRise', value);
            onTotalRiseChange(parseFloat(value) || 0);
          }}
          placeholder="Enter total rise"
          className={validationErrors.totalRise ? 'border-red-500' : ''}
        />
        {validationErrors.totalRise && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.totalRise}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Height from floor to floor</p>
      </div>

      <div>
        <Label htmlFor="step-count" className="block mb-1 font-medium text-foreground">Number of Steps</Label>
        <Input
          id="step-count"
          type="number"
          value={stepCount}
          onChange={(e) => {
            const value = e.target.value;
            validateInput('stepCount', value);
            onStepCountChange(parseFloat(value) || 0);
          }}
          placeholder="Enter number of steps"
          className={validationErrors.stepCount ? 'border-red-500' : ''}
        />
        {validationErrors.stepCount && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.stepCount}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Total number of treads</p>
      </div>

      <div>
        <Label htmlFor="tread-depth" className="block mb-1 font-medium text-foreground">Tread Depth (mm)</Label>
        <Input
          id="tread-depth"
          type="number"
          value={treadDepth}
          onChange={(e) => {
            const value = e.target.value;
            validateInput('treadDepth', value);
            onTreadDepthChange(parseFloat(value) || 0);
          }}
          placeholder="Enter tread depth"
          className={validationErrors.treadDepth ? 'border-red-500' : ''}
        />
        {validationErrors.treadDepth && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.treadDepth}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Depth of each step</p>
      </div>

      <div>
        <Label htmlFor="stringer-width" className="block mb-1 font-medium text-foreground">Stringer Width (mm)</Label>
        <Input
          id="stringer-width"
          type="number"
          value={stringerWidth}
          onChange={(e) => {
            const value = e.target.value;
            validateInput('stringerWidth', value);
            onStringerWidthChange(parseFloat(value) || 0);
          }}
          placeholder="Enter stringer width"
          className={validationErrors.stringerWidth ? 'border-red-500' : ''}
        />
        {validationErrors.stringerWidth && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.stringerWidth}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Width of support beams</p>
      </div>

      {/* TODO: Add more stair-specific fields based on requirements:
          - Riser height (calculated or manual override)
          - Stair width
          - Handrail requirements
          - Nosing specifications
          - Support post spacing
          - etc.
      */}
    </div>
  );
};
