'use client';

import React, { useRef, useEffect, useState } from 'react';

interface Material {
  id: string;
  name: string;
  price: number;
  thickness: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

interface RippingVisualizerProps {
  height: number;
  material?: Material;
  ripsPerSheet: number;
  kerfWidth: number;
}

export const RippingVisualizer: React.FC<RippingVisualizerProps> = ({ 
  height, 
  material, 
  ripsPerSheet,
  kerfWidth 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  const sheetWidth = material?.sheet_width || 2400; // mm
  const sheetHeight = material?.sheet_height || 1200; // mm
  
  // Consistent padding to prevent label cutoff
  const containerPadding = 120; // pixels for dimensions and labels
  
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
  
  const showRips = height > 0 && height <= sheetHeight;  // Show rips immediately when height is entered
  const showCalculatedRips = showRips && ripsPerSheet > 0 && Number.isFinite(ripsPerSheet);

  // Calculate sheet dimensions maintaining 1:2 ratio (2400:1200)
  // Make fully responsive to actual container size
  const availableWidth = Math.max(0, containerSize.width - (containerPadding * 2));
  const availableHeight = Math.max(0, containerSize.height - (containerPadding * 2));
  
  // Maintain 2:1 ratio (width:height) for the sheet
  const sheetRatio = sheetWidth / sheetHeight; // 2400/1200 = 2
  let displayWidth, displayHeight;
  
  if (availableWidth / availableHeight > sheetRatio) {
    // Height-constrained
    displayHeight = availableHeight;
    displayWidth = displayHeight * sheetRatio;
  } else {
    // Width-constrained
    displayWidth = availableWidth;
    displayHeight = displayWidth / sheetRatio;
  }
  
  // Center the sheet
  const sheetLeft = containerPadding + (availableWidth - displayWidth) / 2;
  const sheetTop = containerPadding + (availableHeight - displayHeight) / 2;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-50 overflow-hidden" style={{minHeight: '600px'}}>
      {/* Sheet representation - maintaining 1:2 ratio */}
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
        
        {/* Multiple rip lines with kerf visualization */}
        {showCalculatedRips && Array.from({ length: ripsPerSheet }, (_, index) => {
          // Calculate position from bottom including kerf spacing
          // Each rip line appears at the TOP of each piece (between pieces)
          // First rip at: height, second rip at: height + kerf + height, etc.
          const ripPositionFromBottom = (index + 1) * height + index * kerfWidth; // mm from bottom
          const ripPositionPercent = sheetHeight > 0 ? (ripPositionFromBottom / sheetHeight) * 100 : 0;
          
          return (
            <div key={`rip-${index}`}>
              {/* Main rip cut line */}
              <div
                className="absolute left-0 right-0 border-t-2 border-gray-600"
                style={{
                  bottom: `${Math.min(Math.max(ripPositionPercent, 0), 100)}%`
                }}
              >
                {/* Rip line with slight glow effect */}
                <div className="absolute inset-x-0 -top-px h-0.5 bg-gray-500 opacity-60"></div>
              </div>
              
              {/* Kerf gap visualization (except after last rip) */}
              {index < ripsPerSheet - 1 && (
                <div
                  className="absolute left-0 right-0 bg-gray-400 opacity-40"
                  style={{
                    bottom: `${Math.min(Math.max(ripPositionPercent, 0), 100)}%`,
                    height: `${(kerfWidth / sheetHeight) * 100}%`,
                    maxHeight: '100%'
                  }}
                  title={`Kerf gap: ${kerfWidth}mm`}
                >
                  {/* Kerf pattern to show material removal */}
                  <div className="absolute inset-0 opacity-50" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
                  }}></div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Single rip line preview when height entered but no total length */}
        {showRips && ripsPerSheet === 0 && (
          <div
            className="absolute left-0 right-0 border-t-2 border-gray-600 opacity-60"
            style={{
              bottom: `${sheetHeight > 0 ? (height / sheetHeight) * 100 : 0}%`
            }}
            title={`Preview rip at ${height}mm height`}
          >
            <div className="absolute inset-x-0 -top-px h-0.5 bg-gray-500 opacity-60"></div>
          </div>
        )}
        
        {/* Offcut area visualization - grey to show it's waste */}
        {showCalculatedRips && (
          <div
            className="absolute left-0 right-0 bg-gray-300 opacity-30"
            style={{
              top: '0',
              height: `${sheetHeight > 0 ? ((sheetHeight - (ripsPerSheet * height + (ripsPerSheet - 1) * kerfWidth)) / sheetHeight) * 100 : 0}%`,
              maxHeight: '100%'
            }}
            title={`Offcut: ${sheetHeight - (ripsPerSheet * height + (ripsPerSheet - 1) * kerfWidth)}mm`}
          >
            {/* Waste pattern */}
            <div className="absolute inset-0 opacity-40" style={{
              backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 6px)'
            }}></div>
            
            {/* Offcut label with value */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-mono text-gray-800 bg-white px-2 py-1 border border-gray-300 rounded shadow-sm z-50" style={{ backgroundColor: 'white' }}>
              Offcut: {sheetHeight - (ripsPerSheet * height + (ripsPerSheet - 1) * kerfWidth)}mm
            </div>
          </div>
        )}
      </div>

      {/* CAD-style dimension lines and labels */}
      {material && (
        <>
          {/* Bottom dimension line (width) - matches sheet exactly */}
          <div 
            className="absolute border-b border-gray-700"
            style={{
              left: `${sheetLeft}px`,
              width: `${displayWidth}px`,
              top: `${sheetTop + displayHeight + 30}px`,
            }}
          >
            {/* Tick marks */}
            <div className="absolute left-0 w-px h-4 bg-gray-700 -top-4"></div>
            <div className="absolute right-0 w-px h-4 bg-gray-700 -top-4"></div>
            
            {/* Dimension label */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-xs font-mono text-gray-800 bg-white px-2 py-1 border border-gray-300 rounded shadow-sm" style={{ top: '14px' }}>
              {sheetWidth}mm
            </div>
          </div>

          {/* Left dimension line (height) - matches sheet exactly */}
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
              {sheetHeight}mm
            </div>
          </div>

          {/* Right dimension lines for rip heights */}
          {showCalculatedRips && (
            <div className="absolute" style={{ 
              left: `${sheetLeft + displayWidth + 30}px`,
              top: `${sheetTop}px`, 
              height: `${displayHeight}px`,
              width: '100px'
            }}>
              {/* Rip height dimensions */}
              {Array.from({ length: Math.min(ripsPerSheet, 10) }, (_, index) => {
                // Match the exact calculation used for rip line positioning (including kerf)
                // Each piece starts at: index * (height + kerf) and ends at: (index + 1) * height + index * kerf
                const bottomPositionMm = (index + 1) * height + index * kerfWidth; // Top of this piece (where the rip line is)
                const topPositionMm = index * (height + kerfWidth); // Bottom of this piece
                
                const bottomPercent = sheetHeight > 0 ? (bottomPositionMm / sheetHeight) * 100 : 0;
                const topPercent = sheetHeight > 0 ? (topPositionMm / sheetHeight) * 100 : 0;
                
                // Clamp percentages to valid range
                const clampedBottomPercent = Math.min(Math.max(bottomPercent, 0), 100);
                const clampedTopPercent = Math.min(Math.max(topPercent, 0), 100);
                
                return (
                  <div 
                    key={index}
                    className="absolute left-0 border-l border-blue-600"
                    style={{
                      bottom: `${clampedTopPercent}%`,
                      top: `${100 - clampedBottomPercent}%`,
                    }}
                  >
                    {/* Tick marks */}
                    <div className="absolute top-0 w-3 h-px bg-blue-600 -left-3"></div>
                    <div className="absolute bottom-0 w-3 h-px bg-blue-600 -left-3"></div>
                    
                    {/* Height label */}
                    <div 
                      className="absolute top-1/2 left-4 text-xs font-mono text-blue-800 bg-white px-2 py-1 border border-blue-300 rounded shadow-sm whitespace-nowrap"
                      style={{ transform: 'translateY(-50%)' }}
                    >
                      {height}mm
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Material name label */}
          <div className="absolute top-4 left-4 text-sm font-medium text-gray-800 bg-white px-3 py-1 border border-gray-300 rounded shadow-sm">
            {material.name}
          </div>

          {/* Rips info */}
          {showCalculatedRips && (
            <div className="absolute top-4 right-4 text-sm text-blue-800 bg-blue-50 px-3 py-1 border border-blue-300 rounded shadow-sm">
              {ripsPerSheet} rip{ripsPerSheet !== 1 ? 's' : ''} per sheet
            </div>
          )}
        </>
      )}
    </div>
  );
};
