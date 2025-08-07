'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';

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
type PelmetProBuilderFormProps = {
  materials: Material[];
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  length: number;
  onLengthChange: (value: number) => void;
  height: number;
  onHeightChange: (value: number) => void;
  depth: number;
  onDepthChange: (value: number) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  pelmetType: string;
  onPelmetTypeChange: (value: string) => void;
  ceilingPlasterDeduction: boolean;
  onCeilingPlasterDeductionChange: (value: boolean) => void;
  addEndCaps: boolean;
  onAddEndCapsChange: (value: boolean) => void;
};

export const PelmetProBuilderForm: React.FC<PelmetProBuilderFormProps> = ({
  materials,
  selectedMaterial,
  onMaterialChange,
  length,
  onLengthChange,
  height,
  onHeightChange,
  depth,
  onDepthChange,
  quantity,
  onQuantityChange,
  pelmetType,
  onPelmetTypeChange,
  ceilingPlasterDeduction,
  onCeilingPlasterDeductionChange,
  addEndCaps,
  onAddEndCapsChange,
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validation logic
  const validateInput = (field: string, value: string) => {
    const errors = { ...validationErrors };
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      errors[field] = 'Must be a positive number';
    } else if (field === 'length' && numValue > 5000) {
      errors[field] = 'Maximum length is 5000mm';
    } else if (field === 'height' && numValue > 500) {
      errors[field] = 'Maximum height is 500mm';
    } else if (field === 'depth' && numValue > 200) {
      errors[field] = 'Maximum depth is 200mm';
    } else if (field === 'quantity' && numValue > 50) {
      errors[field] = 'Maximum quantity is 50';
    } else {
      delete errors[field];
    }
    
    setValidationErrors(errors);
  };

  const handleInputChange = (field: string, value: string, onChange: (val: number) => void) => {
    validateInput(field, value);
    const numValue = parseFloat(value) || 0;
    onChange(numValue);
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
                    {material.sheet_width}×{material.sheet_height}mm - ${material.price} per sheet
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dimensions Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
            <span className="text-blue-600 text-xs font-bold">📏</span>
          </div>
          <Label className="text-base font-semibold text-gray-900">Dimensions</Label>
        </div>
        
        {/* Length */}
        <div>
          <Label htmlFor="length" className="block mb-1 font-medium text-foreground">
            Length (mm)
          </Label>
          <Input
            id="length"
            type="number"
            value={length}
            onChange={(e) => handleInputChange('length', e.target.value, onLengthChange)}
            placeholder="2400"
            min="100"
            max="5000"
            className={validationErrors.length ? 'border-red-500' : ''}
          />
          {validationErrors.length && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.length}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">2.40m</p>
        </div>

        {/* Height */}
        <div>
          <Label htmlFor="height" className="block mb-1 font-medium text-foreground">
            Height (mm)
          </Label>
          <Input
            id="height"
            type="number"
            value={height}
            onChange={(e) => handleInputChange('height', e.target.value, onHeightChange)}
            placeholder="100"
            min="50"
            max="500"
            className={validationErrors.height ? 'border-red-500' : ''}
          />
          {validationErrors.height && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.height}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Front panel height</p>
        </div>

        {/* Depth */}
        <div>
          <Label htmlFor="depth" className="block mb-1 font-medium text-foreground">
            Depth (mm)
          </Label>
          <Input
            id="depth"
            type="number"
            value={depth}
            onChange={(e) => handleInputChange('depth', e.target.value, onDepthChange)}
            placeholder="100"
            min="20"
            max="200"
            className={validationErrors.depth ? 'border-red-500' : ''}
          />
          {validationErrors.depth && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.depth}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Return depth</p>
        </div>
      </div>

      {/* Pelmet Type Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
            <span className="text-green-600 text-xs font-bold">🏗️</span>
          </div>
          <Label className="text-base font-semibold text-gray-900">Pelmet Type</Label>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div 
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              pelmetType === 'c-channel' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onPelmetTypeChange('c-channel')}
          >
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="c-channel"
                name="pelmetType"
                value="c-channel"
                checked={pelmetType === 'c-channel'}
                onChange={() => onPelmetTypeChange('c-channel')}
                className="text-blue-600"
              />
              <div>
                <Label htmlFor="c-channel" className="font-medium text-gray-900 cursor-pointer">
                  C-Channel Pelmet
                </Label>
                <p className="text-sm text-gray-500">Inverted C-shaped design</p>
              </div>
            </div>
          </div>
          
          <div 
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              pelmetType === 'l-shaped' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onPelmetTypeChange('l-shaped')}
          >
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="l-shaped"
                name="pelmetType"
                value="l-shaped"
                checked={pelmetType === 'l-shaped'}
                onChange={() => onPelmetTypeChange('l-shaped')}
                className="text-blue-600"
              />
              <div>
                <Label htmlFor="l-shaped" className="font-medium text-gray-900 cursor-pointer">
                  L-Shaped Pelmet
                </Label>
                <p className="text-sm text-gray-500">Traditional L-shaped design</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Options Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center">
            <span className="text-purple-600 text-xs font-bold">⚙️</span>
          </div>
          <Label className="text-base font-semibold text-gray-900">Options</Label>
        </div>
        
        {/* Ceiling Plaster Deduction */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="ceilingPlasterDeduction"
            checked={ceilingPlasterDeduction}
            onChange={(e) => onCeilingPlasterDeductionChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <Label htmlFor="ceilingPlasterDeduction" className="font-medium text-gray-900 cursor-pointer">
            Ceiling Plaster Deduction
          </Label>
        </div>
        
        {/* Add End Caps */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="addEndCaps"
            checked={addEndCaps}
            onChange={(e) => onAddEndCapsChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <div>
            <Label htmlFor="addEndCaps" className="font-medium text-gray-900 cursor-pointer">
              Add End Caps
            </Label>
            <p className="text-sm text-gray-500">Closed ends for a finished look</p>
          </div>
        </div>
      </div>

      {/* Quantity */}
      <div>
        <Label htmlFor="quantity" className="block mb-1 font-medium text-foreground">
          Quantity
        </Label>
        <Input
          id="quantity"
          type="number"
          value={quantity}
          onChange={(e) => handleInputChange('quantity', e.target.value, onQuantityChange)}
          placeholder="1"
          min="1"
          max="50"
          className={validationErrors.quantity ? 'border-red-500' : ''}
        />
        {validationErrors.quantity && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
        )}
      </div>
    </div>
  );
};
