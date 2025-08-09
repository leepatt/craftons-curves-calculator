'use client';

import React from 'react';

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
}) => {
  const sheetW = material?.sheet_width ?? 2400;
  const sheetH = material?.sheet_height ?? 1200;
  const usableW = Math.max(0, sheetW - 2 * edgeMarginMm);
  const usableH = Math.max(0, sheetH - 2 * edgeMarginMm);

  // Build complete piece list
  const pieces: { w: number; h: number; isPreview?: boolean }[] = [];
  for (const p of parts) {
    for (let i = 0; i < p.qty; i++) pieces.push({ w: p.w, h: p.h });
  }
  if (pendingPart && pendingPart.qty > 0) {
    for (let i = 0; i < pendingPart.qty; i++) pieces.push({ w: pendingPart.w, h: pendingPart.h, isPreview: true });
  }

  // Multi-sheet packing algorithm
  const sheets: { placements: { left: number; top: number; w: number; h: number; isPreview?: boolean }[] }[] = [];
  const remainingPieces = [...pieces];
  
  while (remainingPieces.length > 0) {
    const placements: { left: number; top: number; w: number; h: number; isPreview?: boolean }[] = [];
    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    let packedCount = 0;
    
    for (let i = 0; i < remainingPieces.length; i++) {
      const piece = remainingPieces[i];
      const tryOrientations = [piece, { w: piece.h, h: piece.w, isPreview: piece.isPreview }];
      let placed = false;
      
      for (const opt of tryOrientations) {
        // Try current row
        if (cursorX + opt.w <= usableW && cursorY + opt.h <= usableH) {
          placements.push({ 
            left: cursorX, 
            top: cursorY, 
            w: opt.w, 
            h: opt.h,
            isPreview: opt.isPreview 
          });
          cursorX += opt.w + spacingMm;
          rowHeight = Math.max(rowHeight, opt.h);
          remainingPieces.splice(i, 1);
          i--; // Adjust index after removal
          placed = true;
          packedCount++;
          break;
        }
      }
      
      if (!placed) {
        // Try new row
        const newRowY = cursorY + rowHeight + spacingMm;
        for (const opt of tryOrientations) {
          if (opt.w <= usableW && newRowY + opt.h <= usableH) {
            placements.push({ 
              left: 0, 
              top: newRowY, 
              w: opt.w, 
              h: opt.h,
              isPreview: opt.isPreview 
            });
            cursorX = opt.w + spacingMm;
            cursorY = newRowY;
            rowHeight = opt.h;
            remainingPieces.splice(i, 1);
            i--; // Adjust index after removal
            placed = true;
            packedCount++;
            break;
          }
        }
      }
    }
    
    sheets.push({ placements });
    
    // Safety break if no pieces were packed in this iteration
    if (packedCount === 0) break;
  }

  // Increased padding and spacing
  const containerPadding = 32; // increased from 16
  const sheetSpacing = 40; // space between sheets
  const measurementPadding = 24; // increased measurement padding
  
  // Calculate dynamic height based on number of sheets
  const singleSheetHeight = 300; // base height per sheet
  const totalHeight = Math.max(400, sheets.length * (singleSheetHeight + sheetSpacing) + containerPadding);
  
  const pctX = (mm: number, sheetWidth: number) => `${(mm / sheetWidth) * 100}%`;
  const pctY = (mm: number, sheetHeight: number) => `${(mm / sheetHeight) * 100}%`;

  return (
    <div 
      className="relative w-full bg-gray-50 overflow-auto" 
      style={{ height: `${totalHeight}px`, minHeight: '400px' }}
    >
      {sheets.map((sheet, sheetIndex) => {
        const sheetTop = sheetIndex * (singleSheetHeight + sheetSpacing) + containerPadding;
        
        return (
          <div key={sheetIndex} className="relative mb-8">
            {/* Sheet Number Label */}
            {sheets.length > 1 && (
              <div 
                className="absolute text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded border shadow-sm z-10"
                style={{ 
                  left: `${containerPadding}px`, 
                  top: `${sheetTop - 25}px` 
                }}
              >
                Sheet {sheetIndex + 1}
              </div>
            )}
            
            {/* Sheet Container */}
            <div 
              className="absolute border-2 border-gray-800 bg-white shadow-lg"
              style={{
                left: `${containerPadding}px`,
                top: `${sheetTop}px`,
                width: `calc(100% - ${containerPadding * 2}px)`,
                height: `${singleSheetHeight}px`,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Usable area dashed border */}
              <div 
                className="absolute border border-dashed border-gray-400" 
                style={{ 
                  left: pctX(edgeMarginMm, sheetW), 
                  top: pctY(edgeMarginMm, sheetH), 
                  right: pctX(edgeMarginMm, sheetW), 
                  bottom: pctY(edgeMarginMm, sheetH) 
                }} 
              />

              {/* Parts on this sheet */}
              {sheet.placements.map((p, i) => {
                const left = edgeMarginMm + p.left;
                const top = edgeMarginMm + p.top;
                const style: React.CSSProperties = {
                  position: 'absolute',
                  left: pctX(left, sheetW),
                  top: pctY(top, sheetH),
                  width: pctX(p.w, sheetW),
                  height: pctY(p.h, sheetH),
                  background: p.isPreview ? '#fbbf24' : '#d1d5db',
                  border: `1px solid ${p.isPreview ? '#f59e0b' : '#9ca3af'}`,
                  opacity: p.isPreview ? 0.7 : 1,
                };
                
                return (
                  <div key={i} style={style}>
                    {/* Width dimension with increased padding */}
                    <div className="absolute left-0 right-0 border-t border-gray-700" style={{ top: `-${measurementPadding}px` }}>
                      <div className="absolute left-0 w-px bg-gray-700" style={{ height: `${measurementPadding - 6}px`, top: '-4px' }}></div>
                      <div className="absolute right-0 w-px bg-gray-700" style={{ height: `${measurementPadding - 6}px`, top: '-4px' }}></div>
                      <div 
                        className="absolute left-1/2 -translate-x-1/2 text-xs font-mono bg-white px-2 py-1 border border-gray-300 rounded shadow-sm" 
                        style={{ top: `-${measurementPadding}px` }}
                      >
                        {p.w}mm
                      </div>
                    </div>
                    
                    {/* Height dimension with increased padding */}
                    <div className="absolute top-0 bottom-0 border-l border-gray-700" style={{ left: `-${measurementPadding}px` }}>
                      <div className="absolute top-0 h-px bg-gray-700" style={{ width: `${measurementPadding - 6}px`, left: '4px' }}></div>
                      <div className="absolute bottom-0 h-px bg-gray-700" style={{ width: `${measurementPadding - 6}px`, left: '4px' }}></div>
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 text-xs font-mono bg-white px-2 py-1 border border-gray-300 rounded shadow-sm rotate-[-90deg]" 
                        style={{ left: `-${measurementPadding + 12}px` }}
                      >
                        {p.h}mm
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sheet dimensions with increased padding */}
            <div 
              className="absolute pointer-events-none"
              style={{
                left: `${containerPadding}px`,
                top: `${sheetTop}px`,
                width: `calc(100% - ${containerPadding * 2}px)`,
                height: `${singleSheetHeight}px`
              }}
            >
              {/* Bottom width dimension */}
              <div className="absolute border-b border-gray-700 text-sm" style={{ left: 0, right: 0, bottom: `-${measurementPadding + 8}px` }}>
                <div className="absolute left-4 w-px h-4 bg-gray-700" style={{ top: '-4px' }}></div>
                <div className="absolute right-4 w-px h-4 bg-gray-700" style={{ top: '-4px' }}></div>
                <div className="absolute left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 border border-gray-300 rounded shadow-md font-mono font-semibold">
                  {sheetW}mm
                </div>
              </div>
              
              {/* Left height dimension */}
              <div className="absolute border-l border-gray-700 text-sm" style={{ top: 0, bottom: 0, left: `-${measurementPadding + 8}px` }}>
                <div className="absolute top-4 w-4 h-px bg-gray-700" style={{ right: '4px' }}></div>
                <div className="absolute bottom-4 w-4 h-px bg-gray-700" style={{ right: '4px' }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 bg-white px-3 py-1.5 border border-gray-300 rounded shadow-md rotate-[-90deg] font-mono font-semibold" style={{ left: `-${measurementPadding + 20}px` }}>
                  {sheetH}mm
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Remaining pieces indicator */}
      {remainingPieces.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-orange-100 border border-orange-300 rounded px-3 py-2 text-sm text-orange-800">
          ⚠️ {remainingPieces.length} piece{remainingPieces.length !== 1 ? 's' : ''} could not fit on any sheet
        </div>
      )}
    </div>
  );
};


