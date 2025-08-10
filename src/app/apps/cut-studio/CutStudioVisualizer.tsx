'use client';

import React, { useRef, useState, useEffect } from 'react';
import { NestingEngine, createNestingParts, type NestingResult } from './nesting';

type ShapeType = 'rectangle' | 'circle' | 'donut' | 'triangle';

interface Material {
  id: string;
  name: string;
  price: number;
  thickness: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

interface CutStudioVisualizerProps {
  shapeType: ShapeType;
  widthMm?: number;
  heightMm?: number;
  diameterMm?: number;
  outerDiameterMm?: number;
  innerDiameterMm?: number;
  material?: Material;
  edgeMarginMm?: number;
  spacingMm?: number;
  quantity?: number;
  parts?: { shape: 'rectangle' | 'circle'; w: number; h: number; qty: number }[];
  pendingPart?: { shape: 'rectangle' | 'circle'; w: number; h: number; qty: number } | null;
  nestingStrategy?: 'area' | 'width' | 'height' | 'perimeter' | 'none';
}

export const CutStudioVisualizer: React.FC<CutStudioVisualizerProps> = ({
  shapeType,
  widthMm = 100,
  heightMm = 100,
  diameterMm = 100,
  outerDiameterMm = 150,
  innerDiameterMm = 50,
  material,
  edgeMarginMm = 10,
  spacingMm = 10,
  quantity = 1,
  parts = [],
  pendingPart = null,
  nestingStrategy = 'area',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  const sheetW = material?.sheet_width ?? 2400;
  const sheetH = material?.sheet_height ?? 1200;
  const usableW = Math.max(0, sheetW - 2 * edgeMarginMm);
  const usableH = Math.max(0, sheetH - 2 * edgeMarginMm);

  // Simple padding for dimensions
  const horizontalPadding = 150; // pixels for left/right dimensions and labels
  const verticalPadding = 80; // top/bottom padding
  const sheetSpacing = 60; // minimal space between multiple sheets

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Use advanced nesting algorithm
  const nestingParts = createNestingParts(parts, pendingPart);
  
  // Initialize nesting engine with current parameters
  const nestingEngine = new NestingEngine({
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    margin: edgeMarginMm,
    spacing: spacingMm,
    allowRotation: true,
    sortStrategy: nestingStrategy
  });

  // Perform nesting
  const nestingResult: NestingResult = nestingEngine.nest(nestingParts);

  // Convert nesting result to the format expected by the visualizer
  const sheets = nestingResult.sheets.map(sheet => ({
    placements: sheet.placements.map(placement => ({
      left: placement.x,
      top: placement.y,
      w: placement.w,
      h: placement.h,
      shape: placement.shape,
      isPreview: placement.isPreview,
      rotated: placement.rotated
    })),
    efficiency: sheet.efficiency,
    wastedArea: sheet.wastedArea
  }));

  // If no sheets with parts, show empty sheet for reference
  const sheetsToShow = sheets.length > 0 ? sheets : [{ placements: [], efficiency: 0, wastedArea: 0 }];
  const remainingPieces = nestingResult.unplacedParts;

  // Calculate sheet dimensions maintaining 2:1 ratio (2400:1200) for single sheet sizing
  const availableWidth = Math.max(0, containerSize.width - (horizontalPadding * 2));
  
  // For single sheet sizing, use container height minus padding
  const availableHeight = Math.max(0, containerSize.height - (verticalPadding * 2));
  
  // Maintain 2:1 ratio (width:height) for the sheet
  const sheetRatio = sheetW / sheetH; // 2400/1200 = 2
  let displayWidth, displayHeight;
  
  // Size based on single sheet fit, then stack multiple sheets
  const widthConstrainedHeight = availableWidth / sheetRatio;
  const heightConstrainedWidth = availableHeight * sheetRatio;
  
  if (widthConstrainedHeight <= availableHeight) {
    // Width-constrained - use full width
    displayWidth = availableWidth;
    displayHeight = widthConstrainedHeight;
  } else {
    // Height-constrained - use available height
    displayHeight = availableHeight;
    displayWidth = heightConstrainedWidth;
  }
  
  // Center horizontally
  const sheetLeft = horizontalPadding + (availableWidth - displayWidth) / 2;

  // Calculate total height needed for all sheets (stack them vertically)
  const totalSheetsToShow = Math.max(1, sheetsToShow.length);
  const totalNeededHeight = verticalPadding * 2 + 
                            (totalSheetsToShow * (displayHeight + 60)) + // 60px for dimension labels
                            ((totalSheetsToShow - 1) * sheetSpacing);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-gray-50 overflow-auto" 
      style={{
        minHeight: '500px',
        height: totalNeededHeight > containerSize.height ? `${totalNeededHeight}px` : '100%'
      }}
    >
      {/* Multiple sheets */}
      {sheetsToShow.map((sheet, sheetIndex) => {
        const sheetTop = verticalPadding + sheetIndex * (displayHeight + 60 + sheetSpacing); // Include space for dimension labels
        
        return (
          <div key={sheetIndex} className="relative">
            {/* Sheet Number Label */}
            {sheetsToShow.length > 1 && (
              <div 
                className="absolute text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded border shadow-sm z-10"
                style={{ 
                  left: `${sheetLeft}px`, 
                  top: `${sheetTop - 25}px` 
                }}
              >
                Sheet {sheetIndex + 1}
              </div>
            )}

            {/* Sheet representation - maintaining 2:1 ratio */}
            <div 
              className="absolute border-2 border-gray-800 shadow-lg"
              style={{
                left: `${sheetLeft}px`,
                top: `${sheetTop}px`,
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                backgroundImage: material?.texture ? `url(${material.texture})` : 'linear-gradient(to bottom right, #fef3c7, #fbbf24)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Subtle overlay to ensure text readability */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.5)'
                }}
              />

              {/* Usable area dashed border */}
              <div 
                className="absolute border border-dashed border-gray-400" 
                style={{ 
                  left: `${(edgeMarginMm / sheetW) * 100}%`, 
                  top: `${(edgeMarginMm / sheetH) * 100}%`, 
                  right: `${(edgeMarginMm / sheetW) * 100}%`, 
                  bottom: `${(edgeMarginMm / sheetH) * 100}%` 
                }} 
              />

              {/* Parts on this sheet */}
              {sheet.placements.map((p, i) => {
                const leftPercent = ((edgeMarginMm + p.left) / sheetW) * 100;
                const topPercent = ((edgeMarginMm + p.top) / sheetH) * 100;
                const widthPercent = (p.w / sheetW) * 100;
                const heightPercent = (p.h / sheetH) * 100;
                
                const isCircle = (p as any).shape === 'circle';
                
                return (
                  <div 
                    key={i}
                    className="absolute"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      background: p.isPreview ? 'rgba(251, 191, 36, 0.8)' : '#e5e7eb',
                      border: `2px solid ${p.isPreview ? '#f59e0b' : '#6b7280'}`,
                      borderRadius: isCircle ? '50%' : '4px',
                      opacity: p.isPreview ? 0.9 : 1,
                    }}
                  >
                    {/* Part dimension label with rotation indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs font-mono bg-white px-1 py-0.5 border border-gray-300 rounded shadow-sm">
                        {isCircle ? `⌀${p.w}mm` : `${p.w}×${p.h}mm${(p as any).rotated ? ' ↻' : ''}`}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Sheet efficiency display */}
              {(sheet as any).efficiency !== undefined && (
                <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs font-semibold text-gray-700 border shadow-sm">
                  {((sheet as any).efficiency * 100).toFixed(1)}% efficient
                </div>
              )}
            </div>

            {/* CAD-style dimension lines and labels */}
            {material && (
              <>
                {/* Bottom dimension line (width) */}
                <div 
                  className="absolute border-b border-gray-700"
                  style={{
                    left: `${sheetLeft}px`,
                    width: `${displayWidth}px`,
                    top: `${sheetTop + displayHeight + 20}px`,
                  }}
                >
                  {/* Tick marks */}
                  <div className="absolute left-0 w-px h-4 bg-gray-700 -top-4"></div>
                  <div className="absolute right-0 w-px h-4 bg-gray-700 -top-4"></div>
                  
                  {/* Dimension label */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 text-xs font-mono text-gray-800 bg-white px-2 py-1 border border-gray-300 rounded shadow-sm" style={{ top: '14px' }}>
                    {sheetW}mm
                  </div>
                </div>

                {/* Left dimension line (height) */}
                <div 
                  className="absolute border-l border-gray-700"
                  style={{
                    top: `${sheetTop}px`,
                    height: `${displayHeight}px`,
                    left: `${sheetLeft - 30}px`,
                  }}
                >
                  {/* Tick marks */}
                  <div className="absolute top-0 w-4 h-px bg-gray-700 -right-4"></div>
                  <div className="absolute bottom-0 w-4 h-px bg-gray-700 -right-4"></div>
                  
                  {/* Dimension label - rotated */}
                  <div 
                    className="absolute top-1/2 text-xs font-mono text-gray-800 bg-white px-2 py-1 border border-gray-300 rounded shadow-sm"
                    style={{
                      left: '-60px',
                      transform: 'translateY(-50%) rotate(-90deg)',
                      transformOrigin: 'center',
                    }}
                  >
                    {sheetH}mm
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
      
      {/* Remaining pieces indicator */}
      {remainingPieces.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-orange-100 border border-orange-300 rounded px-3 py-2 text-sm text-orange-800 z-20">
          ⚠️ {remainingPieces.length} piece{remainingPieces.length !== 1 ? 's' : ''} could not fit on any sheet
        </div>
      )}
    </div>
  );
};


