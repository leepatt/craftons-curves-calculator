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
import { EDGE_MARGIN_MM, PART_SPACING_MM, ROTATIONS_ALLOWED, calculateManufacturingCost, getSheetPrice, MaterialForPricing, MIN_PART_SIZE_MM, MIN_HOLE_DIAMETER_MM } from '@/apps/cut-studio/pricing';

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
  const [widthMm, setWidthMm] = useState<number>(0);
  const [heightMm, setHeightMm] = useState<number>(0);
  const [diameterMm, setDiameterMm] = useState<number>(0);
  const [outerDiameterMm, setOuterDiameterMm] = useState<number>(0);
  const [innerDiameterMm, setInnerDiameterMm] = useState<number>(0);
  const [rectCornerRadiusMm, setRectCornerRadiusMm] = useState<number>(0); // unused for now
  const [quantity, setQuantity] = useState<number>(0);
  const [parts, setParts] = useState<PartSpec[]>([]);
  
  // States for cart and sharing functionality
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // State for editing functionality
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

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

    if (!materialData) {
      return {
        sheetsNeeded: 0,
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
      };
    }

    const usableWidth = Math.max(0, materialData.sheet_width - 2 * EDGE_MARGIN_MM);
    const usableHeight = Math.max(0, materialData.sheet_height - 2 * EDGE_MARGIN_MM);

    // compute sheets needed for all parts using simple per-part capacity
    const capacityFor = (w: number, h: number) => {
      const cols = Math.max(0, Math.floor((usableWidth + PART_SPACING_MM) / (w + PART_SPACING_MM)));
      const rows = Math.max(0, Math.floor((usableHeight + PART_SPACING_MM) / (h + PART_SPACING_MM)));
      return { cols, rows, capacity: cols * rows };
    };

    let totalSheets = 0;
    let totalParts = 0;
    for (const p of parts) {
      const c0 = capacityFor(p.w, p.h);
      const c90 = capacityFor(p.h, p.w);
      const cap = Math.max(c0.capacity, c90.capacity);
      if (cap === 0) {
        // this part does not fit a sheet at all; treat as zero-cost here
        continue;
      }
      totalSheets += Math.ceil(p.qty / cap);
      totalParts += p.qty;
    }

    const materialCost = totalSheets * getSheetPrice(materialData);
    const manufactureCost = calculateManufacturingCost(totalSheets, totalParts);
    const totalCost = materialCost + manufactureCost;

    return { sheetsNeeded: totalSheets, materialCost, manufactureCost, totalCost };
  }, [selectedMaterial, parts]);

  const handleAddPart = () => {
    // Validate inputs by shape and push to parts list
    if (shapeType === 'rectangle') {
      if (widthMm < MIN_PART_SIZE_MM || heightMm < MIN_PART_SIZE_MM) return;
      setParts(prev => [...prev, { id: `p-${Date.now()}`, shape: 'rectangle', w: widthMm, h: heightMm, qty: quantity }]);
    } else if (shapeType === 'circle') {
      if (diameterMm < MIN_PART_SIZE_MM) return;
      setParts(prev => [...prev, { id: `p-${Date.now()}`, shape: 'circle', w: diameterMm, h: diameterMm, qty: quantity }]);
    }
    
    // Reset form to zero values after adding part
    resetForm();
  };

  const resetForm = () => {
    setShapeType(null);
    setWidthMm(0);
    setHeightMm(0);
    setDiameterMm(0);
    setQuantity(0);
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
      if (diameterMm < MIN_PART_SIZE_MM) return;
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

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
      // TODO: Implement add to cart functionality
      console.log('Add to cart functionality to be implemented');
    } catch (error) {
      console.error('Error adding to cart:', error);
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
              pendingPart={shapeType ? (shapeType === 'rectangle' ? { shape: 'rectangle', w: widthMm, h: heightMm, qty: quantity } : { shape: 'circle', w: diameterMm, h: diameterMm, qty: quantity }) : null}
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
                          {`${index + 1}. ${p.shape.charAt(0).toUpperCase() + p.shape.slice(1)} ${p.w}×${p.h}mm (Qty: ${p.qty})`}
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


