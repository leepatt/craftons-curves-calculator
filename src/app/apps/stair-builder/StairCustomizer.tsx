'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StairVisualizer } from './StairVisualizer';
import { StairBuilderForm } from './StairBuilderForm';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import materials from './materials.json';
import { stairBuilderConfig } from './config';
import { submitToShopifyCart, isEmbeddedInShopify } from '@/lib/shopify-cart';

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

  // Add to Cart states
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // 🎯 UNIFIED ADD TO CART FUNCTION
  // Uses postMessage when embedded in Shopify (adds to cart without replacing)
  // Falls back to permalink when accessed directly (replaces cart - Shopify limitation)
  const handleAddToCart = async () => {
    if (!calculation || calculation.totalCost <= 0) {
      alert("Please configure your stair dimensions to add to cart!");
      return;
    }

    console.log('🎯 Stair Builder: Using unified cart utility');
    const isEmbedded = isEmbeddedInShopify();
    console.log('📍 Embedded in Shopify:', isEmbedded);

    setIsAddingToCart(true);
    
    try {
      const quantity = Math.round(calculation.totalCost);
      const materialData = materials.find(m => m.id === selectedMaterial);
      const riserHeight = Math.round(totalRise / stepCount);

      if (!stairBuilderConfig.shopify.dollarVariantId) {
        alert('Stair Builder $1 variant ID is not configured.');
        throw new Error('Missing stairBuilderConfig.shopify.dollarVariantId');
      }

      // Build all properties
      const properties: Record<string, string> = {
        '_order_type': 'custom_stair_builder',
        '_total_price': calculation.totalCost.toFixed(2),
        '_display_price': `$${calculation.totalCost.toFixed(2)}`,
        '_material': materialData?.name || selectedMaterial,
        '_total_rise': `${totalRise}mm`,
        '_step_count': String(stepCount),
        '_tread_depth': `${treadDepth}mm`,
        '_stringer_width': `${stringerWidth}mm`,
        '_riser_height': `${riserHeight}mm`,
        '_total_run': `${calculation.totalRun}mm`,
        '_turnaround': '5-7 days',
        '_configuration_summary': `${materialData?.name || selectedMaterial}: Custom stair with ${stepCount} steps, ${totalRise}mm total rise, ${treadDepth}mm tread depth`,
        '_material_cost': calculation.materialCost.toFixed(2),
        '_manufacture_cost': calculation.manufactureCost.toFixed(2),
        '_material_area': `${calculation.materialArea.toFixed(2)}m²`,
        '_timestamp': new Date().toISOString(),
        // Visible properties
        'Material': materialData?.name || selectedMaterial,
        'Total Rise': `${totalRise}mm`,
        'Number of Steps': String(stepCount),
        'Tread Depth': `${treadDepth}mm`,
        'Stringer Width': `${stringerWidth}mm`,
        'Riser Height': `${riserHeight}mm`,
        'Total Price': `$${calculation.totalCost.toFixed(2)}`
      };

      console.log('🛒 Adding to cart with quantity:', quantity, 'for price:', calculation.totalCost.toFixed(2));
      console.log('📦 Properties:', properties);

      // Use the unified cart utility
      const result = await submitToShopifyCart({
        variantId: stairBuilderConfig.shopify.dollarVariantId,
        quantity: quantity,
        properties: properties,
        shopDomain: stairBuilderConfig.shopify.shopDomain,
        redirectToCart: true
      });

      console.log('🛒 Cart submission result:', result);

      if (result.success && result.method === 'postMessage') {
        console.log('✅ Added to cart via postMessage (items accumulated, not replaced)');
      } else if (result.method === 'permalink') {
        console.log('🔗 Redirected via permalink');
      } else if (!result.success) {
        throw new Error(result.error || 'Failed to add to cart');
      }

    } catch (cartError) {
      console.error('💥 Error adding to cart:', cartError);
      
      let errorMessage = 'Failed to add to cart. ';
      if (cartError instanceof Error) {
        errorMessage += cartError.message;
        
        if (cartError.message.includes('422') || cartError.message.includes('variant')) {
          errorMessage += '\n\n🔧 Note: The $1 product may need to be set up in your Shopify store.';
        } else if (cartError.message.includes('405')) {
          errorMessage += '\n\n🔧 Note: This app needs to be embedded in your Shopify store or accessed through a Shopify product page for cart functionality to work.';
        }
      } else {
        errorMessage += 'An unknown error occurred.';
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsAddingToCart(false);
    }
  };

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

                      {/* Add to Cart Button */}
                      <div className="mt-4">
                        <Button 
                          onClick={handleAddToCart}
                          disabled={isAddingToCart}
                          className="w-full text-white font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md hover:shadow-lg"
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
                          size="lg"
                        >
                          {isAddingToCart ? 'Adding to Cart...' : `Add to Cart - $${calculation.totalCost.toFixed(2)}`}
                        </Button>
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
