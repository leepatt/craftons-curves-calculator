'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import PelmetProVisualizer from './PelmetProVisualizer';
import { PelmetProBuilderForm } from './PelmetProBuilderForm';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import materials from './materials.json';

// Define calculation interface
interface PelmetProCalculation {
  // TODO: Add specific calculation properties
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
  // TODO: Add pelmet-specific calculated values
  pelmetLength?: number;
  materialUsage?: number;
}

// Material interface (MUST match materials.json structure)
interface Material {
  id: string;
  name: string;
  price: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

export function PelmetProCustomizer() {
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [selectedMaterial, setSelectedMaterial] = useState(materials[0]?.id || 'mdf-15mm');
  
  // Pelmet-specific fields
  const [length, setLength] = useState(2400); // Length in mm
  const [height, setHeight] = useState(100); // Front panel height in mm
  const [depth, setDepth] = useState(100); // Return depth in mm
  const [quantity, setQuantity] = useState(1);
  const [pelmetType, setPelmetType] = useState('c-channel'); // c-channel or l-shaped
  const [ceilingPlasterDeduction, setCeilingPlasterDeduction] = useState(false);
  const [addEndCaps, setAddEndCaps] = useState(false);
  
  // Iframe height communication (REQUIRED for Shopify embedding)
  const communicateHeightToParent = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const newHeight = Math.ceil(document.body.scrollHeight);
      window.parent.postMessage({ type: 'IFRAME_HEIGHT_UPDATE', height: newHeight }, '*');
    }
  };

  useEffect(() => {
    communicateHeightToParent();
  }, []);

  // Real-time calculation logic
  const calculation = useMemo((): PelmetProCalculation => {
    const materialData = materials.find(m => m.id === selectedMaterial) as Material | undefined;
    
    if (!materialData || length <= 0 || height <= 0 || depth <= 0) {
      return {
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
        pelmetLength: 0,
        materialUsage: 0,
      };
    }

    // Calculate material usage based on pelmet type
    let materialArea = 0;
    
    // Adjust height for ceiling plaster deduction first
    const effectiveHeight = ceilingPlasterDeduction ? Math.max(height - 10, 0) : height;
    
    if (pelmetType === 'c-channel') {
      // C-Channel: Front panel + 2 side return panels
      const frontArea = (length * effectiveHeight) / 1000000; // Front panel
      const returnArea = 2 * (depth * effectiveHeight) / 1000000; // Two side return panels
      materialArea = frontArea + returnArea;
    } else {
      // L-Shaped: Front panel + 1 top return panel
      const frontArea = (length * effectiveHeight) / 1000000; // Front panel
      const returnArea = (length * depth) / 1000000; // Top return panel
      materialArea = frontArea + returnArea;
    }
    
    // Add material for end caps if selected
    if (addEndCaps) {
      const endCapArea = 2 * (effectiveHeight * depth) / 1000000; // Two end caps
      materialArea += endCapArea;
    }
    
    const totalMaterialUsage = materialArea * quantity;
    
    // Calculate costs using sheet pricing (materials.json shows per-sheet pricing)
    const sheetsNeeded = Math.ceil(totalMaterialUsage * 1000000 / (materialData.sheet_width * materialData.sheet_height));
    const materialCost = sheetsNeeded * materialData.price;
    
    // Manufacturing cost based on complexity and linear meters
    const linearMeters = (length / 1000) * quantity;
    const baseManufacturingCost = linearMeters * 25; // $25 per linear meter
    const complexityMultiplier = pelmetType === 'c-channel' ? 1.2 : 1.0; // C-channel is more complex
    const endCapsCost = addEndCaps ? 15 * quantity : 0; // $15 per pelmet for end caps
    const manufactureCost = (baseManufacturingCost * complexityMultiplier) + endCapsCost;
    
    const totalCost = materialCost + manufactureCost;
    
    return {
      materialCost,
      manufactureCost,
      totalCost,
      pelmetLength: length,
      materialUsage: totalMaterialUsage,
    };
  }, [selectedMaterial, length, height, depth, quantity, pelmetType, ceilingPlasterDeduction, addEndCaps]);

  // TODO: Implement actual add to cart functionality
  const handleAddToCart = async () => {
    console.log('Add to cart functionality - TODO: Implement');
    // Configuration will be added when Shopify integration is implemented
  };

  return (
    <div ref={customizerContainerRef} className="flex flex-col text-foreground overflow-x-hidden">
      <div className="flex flex-1 gap-4 md:flex-row flex-col px-2 md:px-6">
        {/* Visualizer - LEFT SIDE */}
        <main className="w-full md:flex-1 relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 flex flex-col items-center justify-center h-[400px] md:h-[576px] overflow-hidden order-1 md:order-1">
          <PelmetProVisualizer
            length={length}
            height={height}
            depth={depth}
            pelmetType={pelmetType}
            addEndCaps={addEndCaps}
            material={materials.find(m => m.id === selectedMaterial) as Material}
            showDimensions={true}
            isPlaceholderMode={false}
            activeFieldHighlight={null}
            ceilingPlasterDeduction={ceilingPlasterDeduction}
          />
        </main>
        
        {/* Controls - RIGHT SIDE */}
        <aside className="w-full md:w-[28rem] lg:w-[33rem] flex-shrink-0 min-h-0 order-2 md:order-2">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-2 md:p-4">
              {/* Configuration Form */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 p-3 md:p-4 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">P</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Pelmet Pro Builder</h2>
                </div>
                
                <PelmetProBuilderForm
                  materials={materials}
                  selectedMaterial={selectedMaterial}
                  onMaterialChange={setSelectedMaterial}
                  length={length}
                  onLengthChange={setLength}
                  height={height}
                  onHeightChange={setHeight}
                  depth={depth}
                  onDepthChange={setDepth}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  pelmetType={pelmetType}
                  onPelmetTypeChange={setPelmetType}
                  ceilingPlasterDeduction={ceilingPlasterDeduction}
                  onCeilingPlasterDeductionChange={setCeilingPlasterDeduction}
                  addEndCaps={addEndCaps}
                  onAddEndCapsChange={setAddEndCaps}
                />
              </div>

              {/* Real-time Calculation Summary */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 p-3 md:p-4 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">$</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Pelmet Pro Calculation</h2>
                </div>
                
                <div className="space-y-3 text-sm">
                  {calculation.totalCost > 0 ? (
                    <>
                      {/* Pelmet-specific calculation details */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Pelmet type:</span>
                        <span className="font-medium text-gray-900">
                          {pelmetType === 'c-channel' ? 'C-Channel' : 'L-Shaped'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Length:</span>
                        <span className="font-medium text-gray-900">{calculation.pelmetLength}mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Front height:</span>
                        <span className="font-medium text-gray-900">{height}mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Return depth:</span>
                        <span className="font-medium text-gray-900">{depth}mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Material usage:</span>
                        <span className="font-medium text-gray-900">{calculation.materialUsage?.toFixed(3)}m²</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium text-gray-900">{quantity}</span>
                      </div>
                      {addEndCaps && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">End caps:</span>
                          <span className="font-medium text-gray-900">Yes</span>
                        </div>
                      )}
                      {ceilingPlasterDeduction && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Plaster deduction:</span>
                          <span className="font-medium text-gray-900">10mm</span>
                        </div>
                      )}
                      
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Material cost:</span>
                        <span className="font-semibold text-gray-900">${calculation.materialCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Manufacturing cost:</span>
                        <span className="font-semibold text-gray-900">${calculation.manufactureCost.toFixed(2)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-base font-semibold text-gray-900">Total Price (inc GST):</span>
                        <span className="text-xl font-bold text-gray-900">${calculation.totalCost.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Enter pelmet dimensions to see pricing
                    </div>
                  )}
                </div>

                {/* Add to Cart Button */}
                {calculation.totalCost > 0 && (
                  <Button 
                    onClick={handleAddToCart}
                    className="w-full mt-4"
                    size="lg"
                  >
                    Add to Cart - ${calculation.totalCost.toFixed(2)}
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
