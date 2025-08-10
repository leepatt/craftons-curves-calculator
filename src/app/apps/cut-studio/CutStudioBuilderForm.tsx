'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Minus, Plus, PlusCircle, Check, X } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  price: number;
  thickness: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

type ShapeType = 'rectangle' | 'circle';

type CutStudioBuilderFormProps = {
  materials: Material[];
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  shapeType: ShapeType | null;
  onShapeTypeChange: (value: ShapeType) => void;
  widthMm: number;
  onWidthChange: (value: number) => void;
  heightMm: number;
  onHeightChange: (value: number) => void;
  diameterMm: number;
  onDiameterChange: (value: number) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddPart: () => void;
  isEditMode?: boolean;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
};

export const CutStudioBuilderForm: React.FC<CutStudioBuilderFormProps> = ({
  materials,
  selectedMaterial,
  onMaterialChange,
  shapeType,
  onShapeTypeChange,
  widthMm,
  onWidthChange,
  heightMm,
  onHeightChange,
  diameterMm,
  onDiameterChange,
  quantity,
  onQuantityChange,
  onAddPart,
  isEditMode,
  onSaveEdit,
  onCancelEdit,
}) => {
  return (
    <div className="space-y-4">
      {/* Material Selection - ALWAYS FIRST */}
      <div>
        <Label htmlFor="material-select" className="block mb-2 font-medium text-foreground">Material</Label>
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

      {/* Shape selection */}
      <div>
        <Label className="block mb-1 font-medium text-foreground">Shape</Label>
        <ToggleGroup type="single" value={shapeType ?? ''} onValueChange={(v) => v && onShapeTypeChange(v as ShapeType)} className="flex flex-wrap gap-2">
          <ToggleGroupItem value="rectangle" aria-label="Rectangle">
            {/* rectangle icon */}
            <svg width="58" height="42" viewBox="0 0 28 20" className="text-gray-700"><rect x="2" y="2" width="24" height="16" rx="0" stroke="currentColor" fill="none" strokeWidth="1.5"/></svg>
          </ToggleGroupItem>
          <ToggleGroupItem value="circle" aria-label="Circle">
            {/* circle icon */}
            <svg width="47" height="47" viewBox="0 0 22 22" className="text-gray-700"><circle cx="11" cy="11" r="9" stroke="currentColor" fill="none" strokeWidth="1.5"/></svg>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Shape-specific inputs (placeholders) */}
      {shapeType === 'rectangle' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="rect-width" className="block mb-1 font-medium text-foreground">Width (mm)</Label>
            <Input id="rect-width" type="number" min={100} value={widthMm} onChange={(e) => onWidthChange(parseFloat(e.target.value) || 0)} placeholder="Width" />
          </div>
          <div>
            <Label htmlFor="rect-height" className="block mb-1 font-medium text-foreground">Height (mm)</Label>
            <Input id="rect-height" type="number" min={100} value={heightMm} onChange={(e) => onHeightChange(parseFloat(e.target.value) || 0)} placeholder="Height" />
          </div>
        </div>
      )}

      {shapeType === 'circle' && (
        <div>
          <Label htmlFor="circle-diameter" className="block mb-1 font-medium text-foreground">Diameter (mm)</Label>
          <Input id="circle-diameter" type="number" min={100} value={diameterMm} onChange={(e) => onDiameterChange(parseFloat(e.target.value) || 0)} placeholder="Diameter" />
        </div>
      )}

      {shapeType && (
        <div>
          <Label htmlFor="part-quantity" className="block mb-1 font-medium text-foreground">Part Quantity</Label>
          <div className="flex items-center gap-3">
            <div className="flex items-center w-fit">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 rounded-r-none border-r-0 hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-all duration-200" 
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))} 
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
                  onQuantityChange(isNaN(val) || val < 0 ? 0 : val);
                }} 
                min={0} 
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
            
            {/* Edit Mode Buttons or Add Button */}
            {isEditMode ? (
              <div className="flex gap-2 flex-1">
                <Button 
                  onClick={onSaveEdit}
                  className="flex-1 font-semibold transition-all duration-200 text-white rounded-lg shadow-md hover:shadow-lg"
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
                  size="default"
                >
                  <Check className="mr-2 h-4 w-4"/>
                  Save
                </Button>
                <Button 
                  onClick={onCancelEdit}
                  variant="outline"
                  className="flex-1 font-semibold transition-all duration-200 rounded-lg"
                  size="default"
                >
                  <X className="mr-2 h-4 w-4"/>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button 
                onClick={onAddPart}
                className="flex-1 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-md hover:shadow-lg"
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
                size="default"
              >
                <PlusCircle className="mr-2 h-4 w-4"/>
                Add More Parts
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


