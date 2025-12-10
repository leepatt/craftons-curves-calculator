'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { RippingVisualizer } from './RippingVisualizer';
import { RippingBuilderForm, InputMode } from './RippingBuilderForm';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from '@/components/ui/button';
import { Share2, Copy, ExternalLink, X as XIcon } from 'lucide-react';
import { rippingConfig } from './config';
import materials from './materials.json'; // We'll use the app-specific materials
import { SharedConfiguration } from '@/lib/shareStorage';
// Import the unified Shopify cart utility
import { submitToShopifyCart, isEmbeddedInShopify } from '@/lib/shopify-cart';

// Interface for ripping calculation results
interface RippingCalculation {
  ripsPerSheet: number;
  lengthPerSheet: number;
  sheetsNeeded: number;
  totalLength: number;
  offcutSize: number;
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
  kerfWidth: number;
  totalHeightWithKerf: number;
  cutterSize: number;
  ripsNeeded: number;
  totalRipsProvided: number;
  excessRips: number;
}

interface RippingCustomizerProps {
  defaultMaterial?: string;
  initialData?: SharedConfiguration;
}

// This is the main component for the Ripping app.
// Real-time calculation with immediate summary display.
export function RippingCustomizer({ defaultMaterial, initialData }: RippingCustomizerProps = {}) {
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize state from initialData if provided, otherwise use defaults
  const [selectedMaterial, setSelectedMaterial] = useState(() => {
    if (initialData && (initialData as any).selectedMaterial) {
      return (initialData as any).selectedMaterial;
    }
    return defaultMaterial || materials[0]?.id || '';
  });
  
  const [height, setHeight] = useState(() => {
    if (initialData && (initialData as any).height) {
      return (initialData as any).height;
    }
    return 0;
  });
  
  const [totalLength, setTotalLength] = useState(() => {
    if (initialData && (initialData as any).totalLength) {
      return (initialData as any).totalLength;
    }
    return 0;
  });
  
  const [lengthUnit, setLengthUnit] = useState<'mm' | 'm'>(() => {
    if (initialData && (initialData as any).lengthUnit) {
      return (initialData as any).lengthUnit;
    }
    return 'mm';
  });

  const [inputMode, setInputMode] = useState<InputMode>(() => {
    if (initialData && (initialData as any).inputMode) {
      return (initialData as any).inputMode;
    }
    return 'length';
  });

  const [ripsQuantity, setRipsQuantity] = useState(() => {
    if (initialData && (initialData as any).ripsQuantity) {
      return (initialData as any).ripsQuantity;
    }
    return 0;
  });

  // Share and Cart states
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Communicate height to parent for iframe embedding
  const communicateHeightToParent = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const newHeight = Math.ceil(document.body.scrollHeight);
      
      if (newHeight < 200) {
        console.warn(`📏 Iframe Height: Calculated height (${newHeight}px) is too small. Not sending update.`);
        return;
      }
      
      try {
        window.parent.postMessage({
          type: 'IFRAME_HEIGHT_CHANGE',
          height: newHeight,
          source: 'craftons-ripping-calculator'
        }, '*');
      } catch (error) {
        console.warn('❌ Iframe Height: Could not communicate with parent window:', error);
      }
    }
  };

  // Set up iframe height communication
  useEffect(() => {
    const container = customizerContainerRef.current;
    if (!container) return;

    let debounceTimeout: NodeJS.Timeout;

    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(communicateHeightToParent, 100);
    });
    observer.observe(container);

    const intervalId = setInterval(communicateHeightToParent, 500);
    const initialTimeout = setTimeout(communicateHeightToParent, 300);

    return () => {
      clearTimeout(debounceTimeout);
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      observer.disconnect();
    };
  }, []);

  // Real-time calculation logic with kerf consideration
  const calculation = useMemo((): RippingCalculation => {
    const materialData = materials.find(m => m.id === selectedMaterial);
    
    // Convert total length to mm for calculations (only used when inputMode is 'length')
    const totalLengthMm = lengthUnit === 'm' ? totalLength * 1000 : totalLength;
    
    // Determine cutter size and kerf width based on material thickness
    const materialThickness = materialData?.thickness || 15; // Default fallback
    
    const cutterSize = materialThickness <= 10 ? 4 : 8; // mm diameter
    const kerfWidth = cutterSize; // Kerf width equals cutter diameter
    
    // Determine if we have valid input based on input mode
    const hasValidInput = inputMode === 'length' 
      ? (totalLengthMm > 0)
      : (ripsQuantity > 0);
    
    // Default values for invalid inputs
    if (!materialData || height <= 0 || !hasValidInput) {
      return {
        ripsPerSheet: 0,
        lengthPerSheet: 0,
        sheetsNeeded: 0,
        totalLength: inputMode === 'length' ? totalLengthMm : 0,
        offcutSize: 0,
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
        kerfWidth,
        totalHeightWithKerf: 0,
        cutterSize,
        ripsNeeded: 0,
        totalRipsProvided: 0,
        excessRips: 0
      };
    }

    // Calculate how many rips fit on one sheet WITH kerf consideration
    const sheetLength = materialData.sheet_width; // Length direction for ripping (2400mm)
    const sheetHeight = materialData.sheet_height; // Width direction (1200mm)
    
    // Calculate total height needed including kerfs
    // For n rips, we need (n-1) kerfs between them
    const calculateTotalHeightWithKerf = (numRips: number) => {
      return numRips * height + (numRips - 1) * kerfWidth;
    };
    
    // Find maximum number of rips that fit with kerf
    let ripsPerSheet = 0;
    for (let testRips = 1; testRips <= 20; testRips++) {
      const totalHeightNeeded = calculateTotalHeightWithKerf(testRips);
      if (totalHeightNeeded <= sheetHeight) {
        ripsPerSheet = testRips;
      } else {
        break;
      }
    }
    
    const totalHeightWithKerf = calculateTotalHeightWithKerf(ripsPerSheet);
    
    // Check if even one rip fits
    if (ripsPerSheet === 0 || height > sheetHeight) {
      return {
        ripsPerSheet: 0,
        lengthPerSheet: 0,
        sheetsNeeded: 0,
        totalLength: inputMode === 'length' ? totalLengthMm : ripsQuantity * sheetLength,
        offcutSize: sheetHeight,
        materialCost: 0,
        manufactureCost: 0,
        totalCost: 0,
        kerfWidth,
        totalHeightWithKerf: height,
        cutterSize,
        ripsNeeded: 0,
        totalRipsProvided: 0,
        excessRips: 0
      };
    }

    const lengthPerSheet = ripsPerSheet * sheetLength;
    
    // Calculate how many individual rips are actually needed based on input mode
    let ripsNeeded: number;
    let calculatedTotalLength: number;
    
    if (inputMode === 'quantity') {
      // User specified number of rips directly
      ripsNeeded = ripsQuantity;
      calculatedTotalLength = ripsQuantity * sheetLength;
    } else {
      // User specified total length - calculate rips needed
      ripsNeeded = Math.ceil(totalLengthMm / sheetLength);
      calculatedTotalLength = totalLengthMm;
    }
    
    // Calculate sheets needed to provide enough rips
    const sheetsNeeded = Math.ceil(ripsNeeded / ripsPerSheet);
    
    // Calculate total rips provided and excess
    const totalRipsProvided = sheetsNeeded * ripsPerSheet;
    const excessRips = totalRipsProvided - ripsNeeded;
    
    // Calculate offcut - the waste strip at the top of the sheet
    const offcutSize = sheetHeight - totalHeightWithKerf;

    // Calculate costs with new pricing structure
    const materialCost = sheetsNeeded * materialData.price;
    
    // Manufacturing cost: first rip is $20, all other rips are $10 each
    const totalRips = ripsPerSheet * sheetsNeeded;
    let manufactureCost = 0;
    
    if (totalRips > 0) {
      // First rip costs $20
      manufactureCost += 20;
      // All additional rips cost $10 each
      if (totalRips > 1) {
        manufactureCost += (totalRips - 1) * 10;
      }
    }
    
    const totalCost = materialCost + manufactureCost;

    return {
      ripsPerSheet,
      lengthPerSheet,
      sheetsNeeded,
      totalLength: calculatedTotalLength,
      offcutSize,
      materialCost,
      manufactureCost,
      totalCost,
      kerfWidth,
      totalHeightWithKerf,
      cutterSize,
      ripsNeeded,
      totalRipsProvided,
      excessRips
    };
  }, [selectedMaterial, height, totalLength, lengthUnit, inputMode, ripsQuantity]);

  // Rounded-up total for $1.00 variant flow (GST-inclusive store)
  const roundedTotalDollars = useMemo(() => {
    return Math.ceil(calculation.totalCost || 0);
  }, [calculation.totalCost]);

  // Handler functions for Save and Share
  const handleSaveAndShare = useCallback(async () => {
    if (calculation.sheetsNeeded === 0) {
      const message = inputMode === 'quantity' 
        ? "Please enter valid rip height and number of rips to share!"
        : "Please enter valid rip height and total length to share!";
      alert(message);
      return;
    }

    setIsSharing(true);
    try {
      const shareData = {
        selectedMaterial,
        height,
        totalLength,
        lengthUnit,
        inputMode,
        ripsQuantity,
        calculation,
        timestamp: new Date().toISOString(),
        appType: 'ripping'
      };

      const response = await fetch('/api/share/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      const result = await response.json();

      if (response.ok && result.shareUrl) {
        setShareUrl(result.shareUrl);
        setShowShareModal(true);
      } else {
        throw new Error(result.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [selectedMaterial, height, totalLength, lengthUnit, inputMode, ripsQuantity, calculation]);

  // 🎯 UNIFIED ADD TO CART FUNCTION
  // Uses postMessage when embedded in Shopify (adds to cart without replacing)
  // Falls back to permalink when accessed directly (replaces cart - Shopify limitation)
  const handleAddToCart = useCallback(async () => {
    if (!calculation || calculation.sheetsNeeded === 0) {
      const message = inputMode === 'quantity'
        ? "Please enter valid rip height and number of rips to add to cart!"
        : "Please enter valid rip height and total length to add to cart!";
      alert(message);
      return;
    }

    console.log('🎯 Ripping: Using unified cart utility');
    const isEmbedded = isEmbeddedInShopify();
    console.log('📍 Embedded in Shopify:', isEmbedded);

    setIsAddingToCart(true);
    
    try {
      // Calculate quantity for $1.00 variant (whole dollar pricing)
      const quantity = Math.round(roundedTotalDollars);
      const materialData = materials.find(m => m.id === selectedMaterial);

      if (!rippingConfig.shopifyDollarVariantId) {
        alert('Ripping $1 variant ID is not configured. Check rippingConfig.shopifyDollarVariantId');
        throw new Error('Missing rippingConfig.shopifyDollarVariantId');
      }

      // Build all properties
      const specifiedQuantity = inputMode === 'quantity' 
        ? `${ripsQuantity} rips` 
        : `${totalLength}${lengthUnit}`;
      
      const properties: Record<string, string> = {
        '_order_type': 'custom_ripping',
        '_total_price': roundedTotalDollars.toFixed(2),
        '_display_price': `$${roundedTotalDollars.toFixed(2)}`,
        '_material': materialData?.name || selectedMaterial,
        '_rip_height': `${height}mm`,
        '_input_mode': inputMode,
        '_total_length': `${calculation.totalLength}mm`,
        '_rips_needed': String(calculation.ripsNeeded),
        '_sheets_needed': String(calculation.sheetsNeeded),
        '_rips_per_sheet': String(calculation.ripsPerSheet),
        '_turnaround': '1-2 days',
        '_configuration_summary': `${materialData?.name || selectedMaterial}: ${height}mm high rips, ${specifiedQuantity}, ${calculation.sheetsNeeded} sheets needed`,
        '_material_cost': calculation.materialCost.toFixed(2),
        '_manufacture_cost': calculation.manufactureCost.toFixed(2),
        '_kerf_width': `${calculation.kerfWidth}mm`,
        '_cutter_size': `${calculation.cutterSize}mm`,
        '_offcut_size': `${calculation.offcutSize}mm`,
        '_timestamp': new Date().toISOString(),
        // Visible properties for cart display
        'Material': materialData?.name || selectedMaterial,
        'Rip Height': `${height}mm`,
        'Rips Needed': String(calculation.ripsNeeded),
        'Total Length': `${(calculation.totalLength / 1000).toFixed(1)}m`,
        'Sheets Needed': String(calculation.sheetsNeeded),
        'Rips per Sheet': String(calculation.ripsPerSheet),
        'Total Price': `$${roundedTotalDollars.toFixed(2)}`
      };

      console.log('🛒 Adding to cart with quantity:', quantity, 'for price:', roundedTotalDollars.toFixed(2));
      console.log('📦 Properties:', properties);

      // Use the unified cart utility
      const result = await submitToShopifyCart({
        variantId: rippingConfig.shopifyDollarVariantId,
        quantity: quantity,
        properties: properties,
        shopDomain: rippingConfig.shopDomain,
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
          errorMessage += '\n\n🔧 Note: This app needs to be embedded in your Shopify store for cart functionality to work.';
        }
      } else {
        errorMessage += 'An unknown error occurred.';
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsAddingToCart(false);
    }
  }, [
    calculation, roundedTotalDollars, materials, selectedMaterial,
    height, totalLength, lengthUnit, inputMode, ripsQuantity
  ]);

  // Share modal handlers
  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
    setShareUrl(null);
  }, []);

  const handleCopyShareUrl = useCallback(async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      } catch {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Share link copied to clipboard!');
      }
    }
  }, [shareUrl]);

  return (
    <div ref={customizerContainerRef} className="flex flex-col text-foreground overflow-x-hidden"> 
      <div className="flex flex-1 gap-4 md:flex-row flex-col px-2 md:px-6"> 
        {/* Visualizer - comes first for mobile-first approach */}
        <main className="w-full md:flex-1 relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 flex flex-col items-center justify-center h-[600px] md:h-[650px] overflow-hidden order-1 md:order-1" style={{flexShrink: 0}}>
          <div className="w-full h-full">
            <RippingVisualizer 
              height={height} 
              material={materials.find(m => m.id === selectedMaterial)}
              ripsPerSheet={calculation.ripsPerSheet}
              kerfWidth={calculation.kerfWidth}
            />
          </div>
        </main>

        {/* Customizer - comes second */}
        <aside className="w-full md:w-[28rem] lg:w-[33rem] flex-shrink-0 min-h-0 order-2 md:order-2"> 
          <ScrollArea className="h-full">
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-5 space-y-4"> 
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">
                      Configure Ripping
                    </h2>
                  </div>
                </div>
                
                <RippingBuilderForm
                  materials={materials}
                  selectedMaterial={selectedMaterial}
                  onMaterialChange={setSelectedMaterial}
                  height={height}
                  onHeightChange={setHeight}
                  totalLength={totalLength}
                  onTotalLengthChange={setTotalLength}
                  lengthUnit={lengthUnit}
                  onLengthUnitChange={setLengthUnit}
                  inputMode={inputMode}
                  onInputModeChange={setInputMode}
                  ripsQuantity={ripsQuantity}
                  onRipsQuantityChange={setRipsQuantity}
                />
              </div>

              {/* Real-time Calculation Summary - Always visible */}
              <div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-4 space-y-4"> 
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                    <span className="text-slate-700 font-bold text-sm">📐</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Ripping Calculation</h2>
                </div>
                
                <div className="space-y-1.5 text-sm">
                  {calculation.sheetsNeeded > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total length needed:</span>
                        <span className="font-semibold text-gray-900">{calculation.totalLength.toLocaleString()}mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Rips needed:</span>
                        <span className="font-semibold text-gray-900">{calculation.ripsNeeded}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sheets required:</span>
                        <span className="font-semibold text-gray-900">{calculation.sheetsNeeded}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cutter / Kerf size:</span>
                        <span className="font-medium text-gray-400">{calculation.kerfWidth}mm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Offcut size:</span>
                        <span className="font-medium text-gray-400">{calculation.offcutSize}mm</span>
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
                        <span className="text-xl font-bold text-gray-900">${roundedTotalDollars.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Estimated Turnaround:</span>
                        <span className="font-semibold text-gray-900">1-2 Days</span>
                      </div>
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
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      {height <= 0 && (inputMode === 'length' ? totalLength <= 0 : ripsQuantity <= 0) ? (
                        inputMode === 'quantity' 
                          ? "Enter rip height and number of rips to see calculations"
                          : "Enter rip height and total length to see calculations"
                      ) : height <= 0 ? (
                        "Enter rip height to see calculations"
                      ) : (inputMode === 'length' ? totalLength <= 0 : ripsQuantity <= 0) ? (
                        inputMode === 'quantity'
                          ? "Enter number of rips to see calculations"
                          : "Enter total length needed to see calculations"
                      ) : (
                        "Rip height exceeds sheet dimensions"
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
      
      {/* Share Modal */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Your Ripping Configuration</h3>
              <button
                onClick={handleCloseShareModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Share this link with others so they can view your ripping configuration and complete the checkout:
              </p>
              
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
                />
                <button
                  onClick={handleCopyShareUrl}
                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCloseShareModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.open(shareUrl, '_blank')}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


