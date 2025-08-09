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
type BoxBuilderFormProps = {
  materials: Material[];
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  // TODO: Replace with actual fields based on app requirements
  length: number;
  onLengthChange: (value: number) => void;
  width: number;
  onWidthChange: (value: number) => void;
  height: number;
  onHeightChange: (value: number) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
};

export const BoxBuilderForm: React.FC<BoxBuilderFormProps> = ({
  materials,
  selectedMaterial,
  onMaterialChange,
  length,
  onLengthChange,
  width,
  onWidthChange,
  height,
  onHeightChange,
  quantity,
  onQuantityChange,
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validation logic
  const validateInput = (field: string, value: string) => {
    const errors = { ...validationErrors };
    const numValue = parseFloat(value);
    
    if (field === 'length' || field === 'width' || field === 'height') {
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

      {/* TODO: Replace with actual input fields based on app requirements */}
      
      {/* Box Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="length" className="block mb-1 font-medium text-foreground">Length (mm)</Label>
          <Input
            id="length"
            type="number"
            value={length}
            onChange={(e) => handleInputChange('length', e.target.value, onLengthChange)}
            placeholder="Enter length"
            className={validationErrors.length ? 'border-red-500' : ''}
          />
          {validationErrors.length && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.length}</p>
          )}
        </div>

        <div>
          <Label htmlFor="width" className="block mb-1 font-medium text-foreground">Width (mm)</Label>
          <Input
            id="width"
            type="number"
            value={width}
            onChange={(e) => handleInputChange('width', e.target.value, onWidthChange)}
            placeholder="Enter width"
            className={validationErrors.width ? 'border-red-500' : ''}
          />
          {validationErrors.width && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.width}</p>
          )}
        </div>

        <div>
          <Label htmlFor="height" className="block mb-1 font-medium text-foreground">Height (mm)</Label>
          <Input
            id="height"
            type="number"
            value={height}
            onChange={(e) => handleInputChange('height', e.target.value, onHeightChange)}
            placeholder="Enter height"
            className={validationErrors.height ? 'border-red-500' : ''}
          />
          {validationErrors.height && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.height}</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <Label htmlFor="quantity" className="block mb-1 font-medium text-foreground">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          value={quantity}
          onChange={(e) => handleInputChange('quantity', e.target.value, onQuantityChange)}
          placeholder="Enter quantity"
          min="1"
          max="100"
          className={validationErrors.quantity ? 'border-red-500' : ''}
        />
        {validationErrors.quantity && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
        )}
      </div>

      {/* Placeholder notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
        <p className="text-yellow-800 text-xs">
          📝 <strong>Placeholder Form:</strong> These fields will be replaced with actual Box Builder requirements once detailed specifications are provided.
        </p>
      </div>
    </div>
  );
};
