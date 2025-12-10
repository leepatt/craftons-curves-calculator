'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Material interface
interface Material {
  id: string;
  name: string;
  price: number;
  thickness: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

// Input mode type
export type InputMode = 'length' | 'quantity';

// Props for the form component
type RippingBuilderFormProps = {
  materials: Material[];
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  height: number;
  onHeightChange: (value: number) => void;
  totalLength: number;
  onTotalLengthChange: (value: number) => void;
  lengthUnit: 'mm' | 'm';
  onLengthUnitChange: (unit: 'mm' | 'm') => void;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  ripsQuantity: number;
  onRipsQuantityChange: (value: number) => void;
};

export const RippingBuilderForm: React.FC<RippingBuilderFormProps> = ({
  materials,
  selectedMaterial,
  onMaterialChange,
  height,
  onHeightChange,
  totalLength,
  onTotalLengthChange,
  lengthUnit,
  onLengthUnitChange,
  inputMode,
  onInputModeChange,
  ripsQuantity,
  onRipsQuantityChange,
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const validateInput = (field: string, value: string) => {
    const numValue = parseFloat(value);
    const errors = { ...validationErrors };
    
    if (field === 'height') {
      if (value && !isNaN(numValue)) {
        if (numValue < 0) {
          errors[field] = 'Height must be at least 0mm';
        } else if (numValue > 1200) {
          errors[field] = 'Height cannot exceed 1200mm (sheet height)';
        } else {
          delete errors[field];
        }
      } else {
        delete errors[field];
      }
    } else if (field === 'totalLength') {
      if (value && !isNaN(numValue)) {
        if (numValue < 0) {
          errors[field] = 'Total length must be at least 0mm';
        } else if (numValue > 100000) {
          errors[field] = 'Total length seems too large (max 100,000mm)';
        } else {
          delete errors[field];
        }
      } else {
        delete errors[field];
      }
    } else if (field === 'ripsQuantity') {
      if (value && !isNaN(numValue)) {
        if (numValue < 0) {
          errors[field] = 'Number of rips must be at least 0';
        } else if (numValue > 100) {
          errors[field] = 'Number of rips seems too large (max 100)';
        } else if (!Number.isInteger(numValue)) {
          errors[field] = 'Number of rips must be a whole number';
        } else {
          delete errors[field];
        }
      } else {
        delete errors[field];
      }
    }
    
    setValidationErrors(errors);
  };

  return (
    <div className="space-y-4">
      {/* Material Selection */}
      <div>
        <Label htmlFor="material-select" className="block mb-2 font-medium text-foreground">Material</Label>
        <Select value={selectedMaterial} onValueChange={onMaterialChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a material..." />
          </SelectTrigger>
          <SelectContent>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name} · {material.sheet_width}×{material.sheet_height}mm · ${material.price.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Height Input */}
      <div>
        <Label htmlFor="height-input" className="block mb-1 font-medium text-foreground">Rip Height (mm)</Label>
        <Input
          id="height-input"
          type="number"
          value={height || ''}
          onChange={(e) => onHeightChange(Number(e.target.value) || 0)}
          onFocus={() => {
            const errors = { ...validationErrors };
            delete errors.height;
            setValidationErrors(errors);
          }}
          onBlur={(e) => validateInput('height', e.target.value)}
          placeholder="Enter height in mm"
          min="0"
          max="1200"
          className={`w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
            validationErrors.height ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          }`}
        />
        {validationErrors.height && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.height}</p>
        )}
        <p className="text-sm text-gray-600 mt-1">Height of each ripped piece</p>
      </div>

      {/* Input Mode Toggle */}
      <div>
        <Label className="block mb-2 font-medium text-foreground">How would you like to specify?</Label>
        <ToggleGroup 
          type="single" 
          value={inputMode} 
          onValueChange={(value) => value && onInputModeChange(value as InputMode)}
          className="w-full justify-start"
        >
          <ToggleGroupItem 
            value="length" 
            className="flex-1 px-4 py-2 text-sm font-medium data-[state=on]:bg-slate-800 data-[state=on]:text-white"
          >
            Total Length
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="quantity" 
            className="flex-1 px-4 py-2 text-sm font-medium data-[state=on]:bg-slate-800 data-[state=on]:text-white"
          >
            Number of Rips
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Total Length Input with Unit Toggle - shown when inputMode is 'length' */}
      {inputMode === 'length' && (
        <div>
          <Label htmlFor="total-length-input" className="block mb-1 font-medium text-foreground">Total Length Needed</Label>
          <div className="flex gap-2">
            <Input
              id="total-length-input"
              type="number"
              value={totalLength || ''}
              onChange={(e) => onTotalLengthChange(Number(e.target.value) || 0)}
              onFocus={() => {
                const errors = { ...validationErrors };
                delete errors.totalLength;
                setValidationErrors(errors);
              }}
              onBlur={(e) => validateInput('totalLength', e.target.value)}
              placeholder={`Enter length in ${lengthUnit}`}
              min="0"
              max={lengthUnit === 'm' ? "100" : "100000"}
              className={`flex-1 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                validationErrors.totalLength ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }`}
            />
            <ToggleGroup 
              type="single" 
              value={lengthUnit} 
              onValueChange={(value) => value && onLengthUnitChange(value as 'mm' | 'm')}
              className=""
            >
              <ToggleGroupItem value="mm" className="px-3 py-1 text-sm font-medium">
                mm
              </ToggleGroupItem>
              <ToggleGroupItem value="m" className="px-3 py-1 text-sm font-medium">
                m
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {validationErrors.totalLength && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.totalLength}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Total length of ripped material needed 
            {lengthUnit === 'm' ? ' (e.g., 10 for 10 meters)' : ' (e.g., 10000 for 10 meters)'}
          </p>
        </div>
      )}

      {/* Number of Rips Input - shown when inputMode is 'quantity' */}
      {inputMode === 'quantity' && (
        <div>
          <Label htmlFor="rips-quantity-input" className="block mb-1 font-medium text-foreground">Number of Rips</Label>
          <Input
            id="rips-quantity-input"
            type="number"
            value={ripsQuantity || ''}
            onChange={(e) => onRipsQuantityChange(Math.floor(Number(e.target.value)) || 0)}
            onFocus={() => {
              const errors = { ...validationErrors };
              delete errors.ripsQuantity;
              setValidationErrors(errors);
            }}
            onBlur={(e) => validateInput('ripsQuantity', e.target.value)}
            placeholder="Enter number of rips needed"
            min="0"
            max="100"
            step="1"
            className={`w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
              validationErrors.ripsQuantity ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
          />
          {validationErrors.ripsQuantity && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.ripsQuantity}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Each rip is 2400mm long (full sheet length)
          </p>
        </div>
      )}
    </div>
  );
};
