'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { CutStudioVisualizer } from '@/apps/cut-studio/CutStudioVisualizer';
import { CutStudioBuilderForm } from '@/apps/cut-studio/CutStudioBuilderForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Share2, Pencil } from 'lucide-react';
import materials from './materials.json';
import { CUT_STUDIO_CONFIG } from '@/apps/cut-studio/config';
import { submitToShopifyCart, isEmbeddedInShopify } from '@/lib/shopify-cart';
import { EDGE_MARGIN_MM, PART_SPACING_MM, ROTATIONS_ALLOWED, calculateManufacturingCost, getSheetPrice, MaterialForPricing, MIN_PART_SIZE_MM, MIN_HOLE_DIAMETER_MM } from '@/apps/cut-studio/pricing';
import { NestingEngine, createNestingParts, type NestingOptions } from '@/apps/cut-studio/nesting';

type ShapeType = 'rectangle' | 'circle';

interface Material {
  id: string;
  name: string;
  price: number; // sheet price
  thickness: number;
  sheet_width: number; // mm
  sheet_height: number; // mm
  texture: string;
}

interface CutStudioCalculation {
  sheetsNeeded: number;
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
  efficiency: number;
  wastedArea: number;
}

interface PartSpec {
  id: string;
  shape: ShapeType;
  w: number; // bbox width mm
  h: number; // bbox height mm
  qty: number;
}

export function CutStudioCustomizer() {
  const customizerContainerRef = useRef<HTMLDivElement>(null);

  // Core selections
  const [selectedMaterial, setSelectedMaterial] = useState<string>(materials[0]?.id || '');
  const [shapeType, setShapeType] = useState<ShapeType | null>(null);

  // Shape inputs (placeholders - to be refined in Phase 3)
  const [widthMm, setWidthMm] = useState<number>(300);
  const [heightMm, setHeightMm] = useState<number>(300);
  const [diameterMm, setDiameterMm] = useState<number>(300);
  const [outerDiameterMm, setOuterDiameterMm] = useState<number>(0);
  const [innerDiameterMm, setInnerDiameterMm] = useState<number>(0);
  const [rectCornerRadiusMm, setRectCornerRadiusMm] = useState<number>(0); // unused for now
  const [quantity, setQuantity] = useState<number>(1);
  const [parts, setParts] = useState<PartSpec[]>([]);
  
  // States for cart and sharing functionality
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // State for editing functionality
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  
  // Nesting strategy state
  const [nestingStrategy, setNestingStrategy] = useState<NestingOptions['sortStrategy']>('area');

  // Iframe height communication (Shopify embed compatibility)
  const communicateHeightToParent = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const newHeight = Math.ceil(document.body.scrollHeight);
      window.parent.postMessage({ type: 'IFRAME_HEIGHT_UPDATE', height: newHeight }, '*');
    }
  };

  useEffect(() => {
    const container = customizerContainerRef.current;
    if (!container) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(communicateHeightToParent, 120);
    });
    observer.observe(container);
    const initial = setTimeout(communicateHeightToParent, 300);
    const interval = setInterval(communicateHeightToParent, 600);
    return () => {
      if (debounce) clearTimeout(debounce);
      clearTimeout(initial);
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  const calculation = useMemo((): CutStudioCalculation => {
    const materialData = (materials as Material[]).find(m => m.id === selectedMaterial) as (Material & MaterialForPricing) | undefined;

    if (!materialData || parts.length === 0) {
      return {
        sheetsNeeded: 0,
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
        efficiency: 0,
        wastedArea: 0,
      };
    }

    // Use the advanced nesting algorithm for accurate calculations
    const nestingParts = createNestingParts(parts);
    
    const nestingEngine = new NestingEngine({
      sheetWidth: materialData.sheet_width,
      sheetHeight: materialData.sheet_height,
      margin: EDGE_MARGIN_MM,
      spacing: PART_SPACING_MM,
      allowRotation: true,
      sortStrategy: nestingStrategy
    });

    const nestingResult = nestingEngine.nest(nestingParts);
    
    const totalSheets = nestingResult.sheets.length;
    const totalParts = parts.reduce((sum, p) => sum + p.qty, 0);
    
    const materialCost = totalSheets * getSheetPrice(materialData);
    const manufactureCost = calculateManufacturingCost(totalSheets, totalParts);
    const totalCost = materialCost + manufactureCost;

    return { 
      sheetsNeeded: totalSheets, 
      materialCost, 
      manufactureCost, 
      totalCost,
      efficiency: nestingResult.totalEfficiency,
      wastedArea: nestingResult.totalWastedArea
    };
  }, [selectedMaterial, parts, nestingStrategy]);

  const handleAddPart = () => {
    // Validate inputs by shape and push to parts list
    if (shapeType === 'rectangle') {
      if (widthMm < MIN_PART_SIZE_MM || heightMm < MIN_PART_SIZE_MM) return;
      setParts(prev => [...prev, { id: `p-${Date.now()}`, shape: 'rectangle', w: widthMm, h: heightMm, qty: quantity }]);
    } else if (shapeType === 'circle') {
      if (diameterMm < MIN_PART_SIZE_MM || diameterMm <= 0) return;
      setParts(prev => [...prev, { id: `p-${Date.now()}`, shape: 'circle', w: diameterMm, h: diameterMm, qty: quantity }]);
    }
    
    // Reset form to zero values after adding part
    resetForm();
  };

  const resetForm = () => {
    setShapeType(null); // Clear selection to highlight shape selection tool
    setWidthMm(300);
    setHeightMm(300);
    setDiameterMm(300);
    setQuantity(1);
    setEditingPartId(null);
  };

  const handleEditPart = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;
    
    // Load part data into form
    setShapeType(part.shape);
    if (part.shape === 'rectangle') {
      setWidthMm(part.w);
      setHeightMm(part.h);
    } else if (part.shape === 'circle') {
      setDiameterMm(part.w); // For circles, w and h are the same (diameter)
    }
    setQuantity(part.qty);
    setEditingPartId(partId);
  };

  const handleRemovePart = (id: string) => {
    setParts(prev => prev.filter(p => p.id !== id));
    // If we're removing the part we're editing, reset the form
    if (editingPartId === id) {
      resetForm();
    }
  };

  const handleSaveEdit = () => {
    if (!editingPartId) return;
    
    // Validate inputs
    if (shapeType === 'rectangle') {
      if (widthMm < MIN_PART_SIZE_MM || heightMm < MIN_PART_SIZE_MM) return;
    } else if (shapeType === 'circle') {
      if (diameterMm < MIN_PART_SIZE_MM || diameterMm <= 0) return;
    }
    
    // Update the existing part
    setParts(prev => prev.map(p => 
      p.id === editingPartId 
        ? {
            ...p, 
            shape: shapeType!,
            w: shapeType === 'rectangle' ? widthMm : diameterMm,
            h: shapeType === 'rectangle' ? heightMm : diameterMm,
            qty: quantity
          }
        : p
    ));
    
    // Reset form after saving
    resetForm();
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSaveAndShare = async () => {
    setIsSharing(true);
    try {
      // TODO: Implement save and share functionality
      console.log('Save and share functionality to be implemented');
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // 🎯 UNIFIED ADD TO CART FUNCTION
  // Uses postMessage when embedded in Shopify (adds to cart without replacing)
  // Falls back to permalink when accessed directly (replaces cart - Shopify limitation)
  const handleAddToCart = async () => {
    if (calculation.sheetsNeeded === 0 || calculation.totalCost <= 0) {
      alert("Please add parts to your cut sheet before adding to cart!");
      return;
    }

    console.log('🎯 Cut Studio: Using unified cart utility');
    const isEmbedded = isEmbeddedInShopify();
    console.log('📍 Embedded in Shopify:', isEmbedded);

    setIsAddingToCart(true);
    
    try {
      const quantity = Math.round(calculation.totalCost);
      const materialData = (materials as Material[]).find(m => m.id === selectedMaterial);

      // Build parts summary
      const partsSummary = parts.map((p, i) => 
        `${i + 1}. ${p.shape === 'circle' ? `Circle ⌀${p.w}mm` : `Rect ${p.w}×${p.h}mm`} x${p.qty}`
      ).join('; ');

      // Build all properties
      const properties: Record<string, string> = {
        '_order_type': 'custom_cut_studio',
        '_total_price': calculation.totalCost.toFixed(2),
        '_display_price': `$${calculation.totalCost.toFixed(2)}`,
        '_material': materialData?.name || selectedMaterial,
        '_sheets_needed': String(calculation.sheetsNeeded),
        '_total_parts': String(parts.reduce((sum, p) => sum + p.qty, 0)),
        '_nesting_strategy': nestingStrategy,
        '_turnaround': '3-5 days',
        '_configuration_summary': `${materialData?.name || selectedMaterial}: ${parts.length} part types, ${calculation.sheetsNeeded} sheets`,
        '_parts_detail': partsSummary,
        '_material_cost': calculation.materialCost.toFixed(2),
        '_manufacture_cost': calculation.manufactureCost.toFixed(2),
        '_timestamp': new Date().toISOString(),
        // Visible properties
        'Material': materialData?.name || selectedMaterial,
        'Sheets Needed': String(calculation.sheetsNeeded),
        'Total Parts': String(parts.reduce((sum, p) => sum + p.qty, 0)),
        'Parts': partsSummary,
        'Total Price': `$${calculation.totalCost.toFixed(2)}`
      };

      console.log('🛒 Adding to cart with quantity:', quantity, 'for price:', calculation.totalCost.toFixed(2));
      console.log('📦 Properties:', properties);

      // Use the unified cart utility
      const result = await submitToShopifyCart({
        variantId: CUT_STUDIO_CONFIG.shopify.dollarVariantId,
        quantity: quantity,
        properties: properties,
        shopDomain: CUT_STUDIO_CONFIG.shopify.shopDomain,
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

    } catch (error) {
      console.error('💥 Error adding to cart:', error);
      alert(`❌ Failed to add to cart. ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div ref={customizerContainerRef} className="flex flex-col text-foreground overflow-x-hidden">
      <div className="flex flex-1 gap-4 md:flex-row flex-col px-2 md:px-6">
        {/* Visualizer - LEFT SIDE */}
        <main className="w-full md:flex-1 relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 flex flex-col items-center justify-center min-h-[400px] overflow-auto order-1 md:order-1">
          <div className="w-full h-full">
            <CutStudioVisualizer
              shapeType={shapeType ?? 'rectangle'}
              widthMm={widthMm}
              heightMm={heightMm}
              diameterMm={diameterMm}
              outerDiameterMm={outerDiameterMm}
              innerDiameterMm={innerDiameterMm}
              material={(materials as Material[]).find(m => m.id === selectedMaterial)}
              edgeMarginMm={EDGE_MARGIN_MM}
              spacingMm={PART_SPACING_MM}
              quantity={quantity}
              parts={parts}
              pendingPart={shapeType && quantity > 0 ? (shapeType === 'rectangle' ? { shape: 'rectangle', w: widthMm, h: heightMm, qty: quantity } : { shape: 'circle', w: diameterMm, h: diameterMm, qty: quantity }) : null}
              nestingStrategy={nestingStrategy}
            />
          </div>
        </main>

        {/* Controls - RIGHT SIDE */}
        <aside className="w-full md:w-[28rem] lg:w-[33rem] flex-shrink-0 min-h-0 order-2 md:order-2">
          <ScrollArea className="h-full">
            <div className="space-y-5">
              {/* Config Card */}
              <div className={`rounded-xl border shadow-lg ${editingPartId ? 'border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-blue-100/40 shadow-blue-200/50' : 'border-gray-200/60 bg-white shadow-gray-200/60'} p-3 md:p-5 space-y-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {editingPartId && <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>}
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">
                      {editingPartId ? (
                        <span className="text-blue-700">Edit Part</span>
                      ) : (
                        'Configure Cut Studio'
                      )}
                    </h2>
                  </div>
                  {editingPartId && (
                    <div className="hidden md:block text-xs text-gray-600 bg-white/60 px-3 py-1 rounded-full border border-gray-200/60">
                      <kbd className="text-xs">Esc</kbd> to cancel • <kbd className="text-xs">Ctrl+Enter</kbd> to save
                    </div>
                  )}
                </div>

                <CutStudioBuilderForm
                  materials={materials as Material[]}
                  selectedMaterial={selectedMaterial}
                  onMaterialChange={setSelectedMaterial}
                  shapeType={shapeType}
                  onShapeTypeChange={(s) => setShapeType(s)}
                  widthMm={widthMm}
                  onWidthChange={setWidthMm}
                  heightMm={heightMm}
                  onHeightChange={setHeightMm}
                  diameterMm={diameterMm}
                  onDiameterChange={setDiameterMm}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  onAddPart={handleAddPart}
                  isEditMode={!!editingPartId}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                />
              </div>



              {/* Parts added to sheet - MOVED ABOVE CALCULATIONS */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-4 space-y-3">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">🧩</span>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-gray-900">Parts added to sheet</h3>
                </div>
                {parts.length === 0 ? (
                  <div className="text-sm text-gray-500">No parts added yet. Select a shape, set dimensions and quantity, then click &quot;Add&quot;.</div>
                ) : (
                  <ul className="space-y-2">
                    {parts.map((p, index) => (
                      <li key={p.id} className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 pb-2">
                        <span className="cursor-pointer transition-colors duration-200 flex-1 hover:text-blue-500 hover:bg-gray-50 px-2 py-1 rounded">
                          {`${index + 1}. ${p.shape.charAt(0).toUpperCase() + p.shape.slice(1)} ${p.shape === 'circle' ? `⌀${p.w}mm` : `${p.w}×${p.h}mm`} (Qty: ${p.qty})`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 p-1 rounded transition-colors duration-200"
                            onClick={() => handleEditPart(p.id)}
                            title="Edit part"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button 
                            className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 px-2 py-1 rounded transition-colors duration-200 text-xs"
                            onClick={() => handleRemovePart(p.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Real-time Calculation Summary - MOVED BELOW PARTS */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-4 space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">✂️</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Cut Studio Calculation</h2>
                </div>

                <div className="space-y-3 text-sm">
                  {calculation.totalCost > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sheets required:</span>
                        <span className="font-semibold text-gray-900">{calculation.sheetsNeeded}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Material efficiency:</span>
                        <span className={`font-semibold ${calculation.efficiency >= 0.8 ? 'text-green-600' : calculation.efficiency >= 0.6 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {(calculation.efficiency * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Waste area:</span>
                        <span className="font-semibold text-gray-900">{(calculation.wastedArea / 1000000).toFixed(2)} m²</span>
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
                      Add parts to see pricing
                    </div>
                  )}
                </div>

                {/* Nesting Strategy Selector */}
                {calculation.totalCost > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Nesting Strategy:</span>
                      <select 
                        value={nestingStrategy} 
                        onChange={(e) => setNestingStrategy(e.target.value as NestingOptions['sortStrategy'])}
                        className="text-xs px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="area">By Area (largest first)</option>
                        <option value="width">By Width</option>
                        <option value="height">By Height</option>
                        <option value="perimeter">By Perimeter</option>
                        <option value="none">No Sorting</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                {calculation.totalCost > 0 && (
                  <div className="mt-4 flex flex-col space-y-3">
                    <Button
                      onClick={handleSaveAndShare}
                      disabled={calculation.sheetsNeeded === 0 || isSharing}
                      className="w-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm hover:shadow-md"
                      size="lg"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      {isSharing ? 'Generating Link...' : 'Save and Share'}
                    </Button>
                    <Button
                      onClick={handleAddToCart} 
                      disabled={calculation.sheetsNeeded === 0 || isAddingToCart}
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
                      {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
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


