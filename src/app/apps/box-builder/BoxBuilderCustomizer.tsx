'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BoxBuilderVisualizer } from './BoxBuilderVisualizer';
import { BoxBuilderForm } from './BoxBuilderForm';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import materials from './materials.json';

// Define calculation interface
interface BoxBuilderCalculation {
  // TODO: Add specific calculation properties based on requirements
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
  // Placeholder fields - will be replaced with actual box calculations
  volume?: number;
  surfaceArea?: number;
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

export function BoxBuilderCustomizer() {
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  
  // State management - placeholders until detailed requirements
  const [selectedMaterial, setSelectedMaterial] = useState(materials[0]?.id || '');
  const [length, setLength] = useState(300); // TODO: Replace with actual field
  const [width, setWidth] = useState(200);   // TODO: Replace with actual field
  const [height, setHeight] = useState(100); // TODO: Replace with actual field
  const [quantity, setQuantity] = useState(1); // TODO: Replace with actual field

  // Iframe height communication (REQUIRED for Shopify embedding)
  const communicateHeightToParent = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const newHeight = Math.ceil(document.body.scrollHeight);
      window.parent.postMessage({ type: 'IFRAME_HEIGHT_UPDATE', height: newHeight }, '*');
    }
  };

  useEffect(() => {
    const timer = setTimeout(communicateHeightToParent, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    communicateHeightToParent();
  }, [selectedMaterial, length, width, height, quantity]);

  // Real-time calculation logic - placeholder until detailed requirements
  const calculation = useMemo((): BoxBuilderCalculation => {
    const materialData = materials.find(m => m.id === selectedMaterial) as Material | undefined;
    
    if (!materialData || length <= 0 || width <= 0 || height <= 0) {
      return {
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
        volume: 0,
        surfaceArea: 0,
      };
    }

    // TODO: Implement actual calculation logic based on requirements
    // Placeholder calculations
    const volume = (length * width * height) / 1000000; // Convert mm³ to cm³
    const surfaceArea = 2 * ((length * width) + (length * height) + (width * height)) / 10000; // Convert mm² to cm²
    
    // Simple placeholder pricing
    const materialCost = surfaceArea * materialData.price * 0.01; // Placeholder formula
    const manufactureCost = 25 + (volume * 0.5); // Placeholder value
    const totalCost = (materialCost + manufactureCost) * quantity;

    return {
      materialCost,
      manufactureCost,
      totalCost,
      volume,
      surfaceArea,
    };
  }, [selectedMaterial, length, width, height, quantity]);

  // Add to cart handler - placeholder until Shopify integration
  const handleAddToCart = async () => {
    // TODO: Implement actual cart integration with proper product/variant IDs
    const configuration = {
      app: 'box-builder',
      material: selectedMaterial,
      dimensions: { length, width, height },
      quantity,
      totalPrice: calculation.totalCost,
      specifications: {
        volume: calculation.volume,
        surfaceArea: calculation.surfaceArea,
      }
    };

    console.log('Box Builder configuration:', configuration);
    alert('Box Builder - Add to cart functionality will be implemented after detailed requirements');
  };

  return (
    <div ref={customizerContainerRef} className="flex flex-col text-foreground overflow-x-hidden">
      <div className="flex flex-1 gap-4 md:flex-row flex-col px-2 md:px-6">
        {/* Visualizer - LEFT SIDE */}
        <main className="w-full md:flex-1 relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 flex flex-col items-center justify-center h-[400px] md:h-[576px] overflow-hidden order-1 md:order-1">
          <BoxBuilderVisualizer
            length={length}
            width={width}
            height={height}
            material={materials.find(m => m.id === selectedMaterial) as Material}
          />
        </main>
        
        {/* Controls - RIGHT SIDE */}
        <aside className="w-full md:w-[28rem] lg:w-[33rem] flex-shrink-0 min-h-0 order-2 md:order-2">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-1">
              {/* Configuration Form */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 p-3 md:p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">📦</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Box Configuration</h2>
                </div>
                
                <BoxBuilderForm
                  materials={materials}
                  selectedMaterial={selectedMaterial}
                  onMaterialChange={setSelectedMaterial}
                  length={length}
                  onLengthChange={setLength}
                  width={width}
                  onWidthChange={setWidth}
                  height={height}
                  onHeightChange={setHeight}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                />
              </div>

              {/* Real-time Calculation Summary */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 p-3 md:p-4 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">💰</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Box Calculation</h2>
                </div>
                
                <div className="space-y-3 text-sm">
                  {calculation.totalCost > 0 ? (
                    <>
                      {/* Box-specific calculation details */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-semibold text-gray-900">{length} × {width} × {height} mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Volume:</span>
                        <span className="font-semibold text-gray-900">{calculation.volume?.toFixed(1)} cm³</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Surface area:</span>
                        <span className="font-semibold text-gray-900">{calculation.surfaceArea?.toFixed(1)} cm²</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-semibold text-gray-900">{quantity}</span>
                      </div>
                      
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
                      Enter box dimensions to see pricing
                    </div>
                  )}
                </div>

                {/* Add to Cart Button */}
                {calculation.totalCost > 0 && (
                  <div className="pt-4">
                    <Button 
                      onClick={handleAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add to Cart - ${calculation.totalCost.toFixed(2)}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
