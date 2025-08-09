'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BoxBuilderVisualizer } from './BoxBuilderVisualizer';
import { BoxBuilderForm } from './BoxBuilderForm';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import materials from './materials.json';
import { boxBuilderConfig } from './config';

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
  thickness: number;
  texture: string;
}

export function BoxBuilderCustomizer() {
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [selectedMaterial, setSelectedMaterial] = useState(materials[0]?.id || '');
  const [width, setWidth] = useState(420);
  const [depth, setDepth] = useState(400);
  const [height, setHeight] = useState(400);
  const [dimensionsType, setDimensionsType] = useState<'inside' | 'outside'>('inside');
  const [boxType, setBoxType] = useState<'open-top' | 'closed-lid'>('open-top');
  const [joinType, setJoinType] = useState<'butt-join' | 'finger-join'>('butt-join');
  const [quantity, setQuantity] = useState(1);

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
  }, [selectedMaterial, width, depth, height, dimensionsType, boxType, joinType, quantity]);

  // Real-time calculation logic
  const calculation = useMemo((): BoxBuilderCalculation => {
    const materialData = materials.find(m => m.id === selectedMaterial) as Material | undefined;
    
    if (!materialData || width <= 0 || depth <= 0 || height <= 0) {
      return {
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
        volume: 0,
        surfaceArea: 0,
      };
    }

    // Calculate dimensions based on inside/outside preference and material thickness
    const materialThickness = materialData.thickness || 18;
    const actualWidth = dimensionsType === 'inside' ? width + (2 * materialThickness) : width;
    const actualDepth = dimensionsType === 'inside' ? depth + (2 * materialThickness) : depth;
    const actualHeight = dimensionsType === 'inside' ? height + materialThickness : height;
    
    // Calculate volume and surface area
    const volume = (actualWidth * actualDepth * actualHeight) / 1000000; // Convert mm³ to cm³
    
    // Calculate surface area based on box type
    let surfaceArea;
    if (boxType === 'open-top') {
      // Bottom + 4 sides
      surfaceArea = (actualWidth * actualDepth + 2 * (actualWidth * actualHeight) + 2 * (actualDepth * actualHeight)) / 10000;
    } else {
      // All 6 sides including lid
      surfaceArea = 2 * ((actualWidth * actualDepth) + (actualWidth * actualHeight) + (actualDepth * actualHeight)) / 10000;
    }
    
    // Adjust material cost based on join type (finger joints require more precision/time)
    const joinMultiplier = joinType === 'finger-join' ? 1.3 : 1.0;
    const materialCost = surfaceArea * materialData.price * 0.01 * joinMultiplier;
    
    // Manufacturing cost varies by complexity
    const baseCost = 25;
    const complexityCost = volume * 0.5;
    const joinComplexityCost = joinType === 'finger-join' ? 15 : 0;
    const lidComplexityCost = boxType === 'closed-lid' ? 10 : 0;
    const manufactureCost = baseCost + complexityCost + joinComplexityCost + lidComplexityCost;
    
    const totalCost = (materialCost + manufactureCost) * quantity;

    return {
      materialCost,
      manufactureCost,
      totalCost,
      volume,
      surfaceArea,
    };
  }, [selectedMaterial, width, depth, height, dimensionsType, boxType, joinType, quantity]);

  // Add to Cart states
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Add to Cart Handler - Using Shopify Cart Permalink Approach
  const handleAddToCart = async () => {
    if (!calculation || calculation.totalCost <= 0) {
      alert("Please configure your box dimensions to add to cart!");
      return;
    }

    setIsAddingToCart(true);
    
    try {
      // Calculate quantity for $1.00 variant (whole dollar pricing like ripping app)
      const quantity = Math.round(calculation.totalCost);
      const materialData = materials.find(m => m.id === selectedMaterial);

      if (!boxBuilderConfig.shopify.dollarVariantId) {
        alert('Box Builder $1 variant ID is not configured. Check boxBuilderConfig.shopify.dollarVariantId');
        throw new Error('Missing boxBuilderConfig.shopify.dollarVariantId');
      }

      // Build comprehensive cart item data (matching ripping app approach)
      const cartItemData = {
        items: [{
          id: boxBuilderConfig.shopify.dollarVariantId,
          quantity: quantity, // $1.00 variant: quantity = dollars
          properties: {
            '_order_type': 'custom_box_builder',
            '_total_price': calculation.totalCost.toFixed(2),
            '_display_price': `$${calculation.totalCost.toFixed(2)}`,
            '_material': materialData?.name || selectedMaterial,
            '_box_width': `${width}mm`,
            '_box_depth': `${depth}mm`,
            '_box_height': `${height}mm`,
            '_dimensions_type': dimensionsType,
            '_box_type': boxType,
            '_join_type': joinType,
            '_quantity': String(quantity),
            '_turnaround': '3-5 days',
            '_configuration_summary': `${materialData?.name || selectedMaterial}: ${boxType === 'open-top' ? 'Open top' : 'Closed lid'} box, ${dimensionsType} dimensions ${width}×${depth}×${height}mm, ${joinType} joints`,
            '_material_cost': calculation.materialCost.toFixed(2),
            '_manufacture_cost': calculation.manufactureCost.toFixed(2),
            '_volume': calculation.volume ? `${calculation.volume.toFixed(2)}L` : '0L',
            '_surface_area': calculation.surfaceArea ? `${calculation.surfaceArea.toFixed(2)}m²` : '0m²',
            '_timestamp': new Date().toISOString()
          }
        }]
      };

      console.log('🛒 Adding to cart with quantity:', quantity, 'for price:', calculation.totalCost.toFixed(2), '($1.00 variant: quantity = dollars)');
      console.log('📦 Cart data:', JSON.stringify(cartItemData, null, 2));

      // --- SHOPIFY CART PERMALINK APPROACH (like ripping app) ---
      // Build visible part summaries as separate properties (for cart display)
      const visibleProps: Record<string, string> = {
        'Material': materialData?.name || selectedMaterial,
        'Box Type': boxType === 'open-top' ? 'Open Top' : 'Closed Lid',
        'Dimensions': `${width}×${depth}×${height}mm (${dimensionsType})`,
        'Join Type': joinType === 'butt-join' ? 'Butt Join' : 'Finger Join',
        'Quantity': String(quantity),
        'Volume': calculation.volume ? `${calculation.volume.toFixed(2)}L` : '0L',
        'Total Price': `$${calculation.totalCost.toFixed(2)}`
      };

      // Merge visible props into the main properties object
      cartItemData.items[0].properties = {
        ...cartItemData.items[0].properties,
        ...visibleProps,
      };

      const propsJson = JSON.stringify(cartItemData.items[0].properties);
      // Base64-URL encode the JSON string (Shopify requires URL-safe Base64)
      const base64Props = btoa(unescape(encodeURIComponent(propsJson)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const shopDomain = boxBuilderConfig.shopify.shopDomain;
      const variantId = boxBuilderConfig.shopify.dollarVariantId;
      const permalink = `https://${shopDomain}/cart/${variantId}:${quantity}?properties=${encodeURIComponent(base64Props)}&storefront=true`;

      console.log('🚀 Redirecting to cart permalink:', permalink);
      console.log(`Added box configuration to cart. Redirecting…`);

      // If embedded inside an iframe (Shopify app embed), redirect the parent;
      // otherwise redirect the current window.
      if (window.top) {
        window.top.location.href = permalink;
      } else {
        window.location.href = permalink;
      }

      return; // Skip any other logic

    } catch (cartError) {
      console.error('💥 Error adding to cart:', cartError);
      
      let errorMessage = 'Failed to add to cart. ';
      if (cartError instanceof Error) {
        errorMessage += cartError.message;
        
        // Enhanced error message based on common issues
        if (cartError.message.includes('422') || cartError.message.includes('variant')) {
          errorMessage += '\n\n🔧 Note: The 1-cent product may need to be set up in your Shopify store.';
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
          <BoxBuilderVisualizer
            width={width}
            depth={depth}
            height={height}
            dimensionsType={dimensionsType}
            boxType={boxType}
            joinType={joinType}
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
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Configure Your Box</h2>
                </div>
                
                <BoxBuilderForm
                  materials={materials}
                  selectedMaterial={selectedMaterial}
                  onMaterialChange={setSelectedMaterial}
                  width={width}
                  onWidthChange={setWidth}
                  depth={depth}
                  onDepthChange={setDepth}
                  height={height}
                  onHeightChange={setHeight}
                  dimensionsType={dimensionsType}
                  onDimensionsTypeChange={setDimensionsType}
                  boxType={boxType}
                  onBoxTypeChange={setBoxType}
                  joinType={joinType}
                  onJoinTypeChange={setJoinType}
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
                        <span className="font-semibold text-gray-900">{width} × {depth} × {height} mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-semibold text-gray-900">{boxType === 'open-top' ? 'Open Top' : 'Closed Lid'} ({joinType === 'butt-join' ? 'Butt Join' : 'Finger Join'})</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Material thickness:</span>
                        <span className="font-semibold text-gray-900">{materials.find(m => m.id === selectedMaterial)?.thickness || 18}mm</span>
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
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
