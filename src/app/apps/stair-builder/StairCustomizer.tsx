'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StairVisualizer } from './StairVisualizer';
import { StairBuilderForm } from './StairBuilderForm';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import materials from './materials.json';

// Define calculation interface
interface StairCalculation {
  // Placeholder properties - TODO: Add specific stair calculation properties
  steps: number;
  totalRise: number;
  totalRun: number;
  materialArea: number;
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
}

// Material interface
interface Material {
  id: string;
  name: string;
  price: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

export function StairCustomizer() {
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  
  // State management - Placeholder fields
  const [selectedMaterial, setSelectedMaterial] = useState(materials[0]?.id || '');
  const [totalRise, setTotalRise] = useState(2400); // TODO: Replace with actual field
  const [stepCount, setStepCount] = useState(13);   // TODO: Replace with actual field
  const [treadDepth, setTreadDepth] = useState(250); // TODO: Replace with actual field
  const [stringerWidth, setStringerWidth] = useState(300); // TODO: Replace with actual field
  
  // Iframe height communication (REQUIRED for Shopify embedding)
  const communicateHeightToParent = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const newHeight = Math.ceil(document.body.scrollHeight);
      window.parent.postMessage({ type: 'IFRAME_HEIGHT_UPDATE', height: newHeight }, '*');
    }
  };

  useEffect(() => {
    communicateHeightToParent();
  }, [totalRise, stepCount, treadDepth, stringerWidth]);

  // Real-time calculation logic - Placeholder implementation
  const calculation = useMemo((): StairCalculation => {
    const materialData = materials.find(m => m.id === selectedMaterial) as Material;
    
    if (!materialData || totalRise <= 0 || stepCount <= 0) {
      return {
        steps: 0,
        totalRise: 0,
        totalRun: 0,
        materialArea: 0,
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
      };
    }

    // TODO: Implement actual stair calculation logic
    const totalRun = (stepCount - 1) * treadDepth;
    
    // Placeholder calculation - approximate material area
    const stringerArea = (totalRun * stringerWidth * 2) / 1000000; // Convert to m²
    const treadArea = (stepCount * treadDepth * 300) / 1000000; // Assume 300mm tread width
    const totalArea = stringerArea + treadArea;
    
    const materialCost = totalArea * materialData.price;
    const manufactureCost = stepCount * 25; // Placeholder: $25 per step
    const totalCost = materialCost + manufactureCost;

    return {
      steps: stepCount,
      totalRise,
      totalRun,
      materialArea: totalArea,
      materialCost,
      manufactureCost,
      totalCost,
    };
  }, [selectedMaterial, totalRise, stepCount, treadDepth, stringerWidth]);

  return (
    <div ref={customizerContainerRef} className="flex flex-col text-foreground overflow-x-hidden">
      <div className="flex flex-1 gap-4 md:flex-row flex-col px-2 md:px-6">
        {/* Visualizer - LEFT SIDE */}
        <main className="w-full md:flex-1 relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 flex flex-col items-center justify-center h-[400px] md:h-[576px] overflow-hidden order-1 md:order-1">
          <StairVisualizer
            totalRise={totalRise}
            stepCount={stepCount}
            treadDepth={treadDepth}
            stringerWidth={stringerWidth}
            material={materials.find(m => m.id === selectedMaterial)}
          />
        </main>
        
        {/* Controls - RIGHT SIDE */}
        <aside className="w-full md:w-[28rem] lg:w-[33rem] flex-shrink-0 min-h-0 order-2 md:order-2">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-1">
              {/* Configuration Form */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">⛏</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Stair Configuration</h2>
                </div>
                
                <StairBuilderForm
                  materials={materials}
                  selectedMaterial={selectedMaterial}
                  onMaterialChange={setSelectedMaterial}
                  totalRise={totalRise}
                  onTotalRiseChange={setTotalRise}
                  stepCount={stepCount}
                  onStepCountChange={setStepCount}
                  treadDepth={treadDepth}
                  onTreadDepthChange={setTreadDepth}
                  stringerWidth={stringerWidth}
                  onStringerWidthChange={setStringerWidth}
                />
              </div>

              {/* Real-time Calculation Summary */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-4 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">📊</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Stair Calculation</h2>
                </div>
                
                <div className="space-y-3 text-sm">
                  {calculation.totalCost > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Number of steps:</span>
                        <span className="font-semibold text-gray-900">{calculation.steps}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total rise:</span>
                        <span className="font-semibold text-gray-900">{calculation.totalRise}mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total run:</span>
                        <span className="font-semibold text-gray-900">{calculation.totalRun}mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Material area:</span>
                        <span className="font-semibold text-gray-900">{calculation.materialArea.toFixed(2)}m²</span>
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
                      Enter stair dimensions to see pricing
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
