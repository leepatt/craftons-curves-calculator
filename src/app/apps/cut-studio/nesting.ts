/**
 * Advanced nesting algorithms for CNC cutting optimization
 * Implements Bottom-Left Fill (BLF) with enhancements for minimal waste
 */

export interface NestingPart {
  id: string;
  w: number; // width in mm
  h: number; // height in mm
  shape: 'rectangle' | 'circle'; // shape type
  isPreview?: boolean;
  originalIndex?: number;
}

export interface PlacedPart extends NestingPart {
  x: number; // position from left edge
  y: number; // position from top edge
  rotated: boolean; // whether part was rotated 90°
}

export interface NestingSheet {
  placements: PlacedPart[];
  efficiency: number; // 0-1, material utilization percentage
  wastedArea: number; // mm²
}

export interface NestingResult {
  sheets: NestingSheet[];
  totalEfficiency: number;
  totalWastedArea: number;
  unplacedParts: NestingPart[];
}

export interface NestingOptions {
  sheetWidth: number; // mm
  sheetHeight: number; // mm
  margin: number; // edge margin in mm
  spacing: number; // spacing between parts in mm
  allowRotation: boolean;
  sortStrategy: 'area' | 'width' | 'height' | 'perimeter' | 'none';
}

/**
 * Represents an occupied space on the sheet for collision detection
 */
interface OccupiedSpace {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Bottom-Left Fill nesting algorithm with optimizations
 */
export class NestingEngine {
  private options: NestingOptions;
  private usableWidth: number;
  private usableHeight: number;

  constructor(options: NestingOptions) {
    this.options = options;
    this.usableWidth = options.sheetWidth - 2 * options.margin;
    this.usableHeight = options.sheetHeight - 2 * options.margin;
  }

  /**
   * Main nesting function
   */
  nest(parts: NestingPart[]): NestingResult {
    // Sort parts for better nesting efficiency
    const sortedParts = this.sortParts([...parts]);
    
    const sheets: NestingSheet[] = [];
    const unplacedParts: NestingPart[] = [];
    let remainingParts = [...sortedParts];

    while (remainingParts.length > 0) {
      const sheetResult = this.nestSingleSheet(remainingParts);
      
      if (sheetResult.placements.length === 0) {
        // No parts could be placed, add remaining to unplaced
        unplacedParts.push(...remainingParts);
        break;
      }

      sheets.push(sheetResult);
      
      // Remove placed parts from remaining parts
      const placedIds = new Set(sheetResult.placements.map(p => p.id));
      remainingParts = remainingParts.filter(p => !placedIds.has(p.id));
    }

    return this.calculateNestingMetrics(sheets, unplacedParts);
  }

  /**
   * Nest parts on a single sheet using Bottom-Left Fill algorithm with local optimization
   */
  private nestSingleSheet(parts: NestingPart[]): NestingSheet {
    const placements: PlacedPart[] = [];
    const occupiedSpaces: OccupiedSpace[] = [];
    const candidates = [...parts];

    while (candidates.length > 0) {
      let bestPlacement: PlacedPart | null = null;
      let bestIndex = -1;
      let bestScore = -1;

      // Find the best position for any remaining part
      for (let i = 0; i < candidates.length; i++) {
        const part = candidates[i];
        const orientations = this.getOrientations(part);

        for (const orientation of orientations) {
          const positions = this.findAllValidPositions(orientation, occupiedSpaces);
          
          for (const position of positions) {
            if (this.canPlace(orientation, position.x, position.y)) {
              const placement: PlacedPart = {
                ...orientation,
                x: position.x,
                y: position.y,
                rotated: orientation.w !== part.w
              };

              // Calculate placement score (prefer bottom-left, minimize gaps)
              const score = this.calculatePlacementScore(placement, occupiedSpaces);
              
              if (score > bestScore) {
                bestPlacement = placement;
                bestIndex = i;
                bestScore = score;
              }
            }
          }
        }
      }

      if (bestPlacement) {
        placements.push(bestPlacement);
        occupiedSpaces.push({
          x: bestPlacement.x,
          y: bestPlacement.y,
          w: bestPlacement.w + this.options.spacing,
          h: bestPlacement.h + this.options.spacing
        });
        candidates.splice(bestIndex, 1);
      } else {
        // No more parts can be placed
        break;
      }
    }

    // Apply local optimization to improve the layout
    const optimizedPlacements = this.localOptimization(placements);
    
    return this.calculateSheetMetrics(optimizedPlacements);
  }

  /**
   * Get possible orientations for a part (original and rotated)
   */
  private getOrientations(part: NestingPart): NestingPart[] {
    const orientations = [part];
    
    // Circles don't need rotation since they're symmetrical
    if (this.options.allowRotation && part.shape !== 'circle' && part.w !== part.h) {
      orientations.push({
        ...part,
        w: part.h,
        h: part.w
      });
    }
    
    return orientations;
  }

  /**
   * Find all valid positions for a part, prioritizing bottom-left
   */
  private findAllValidPositions(
    part: NestingPart, 
    occupiedSpaces: OccupiedSpace[]
  ): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const stepSize = Math.min(10, Math.max(1, Math.min(part.w, part.h) / 10)); // Adaptive step size
    
    // Start with bottom-left corner
    if (this.isPositionValid(part, 0, 0, occupiedSpaces)) {
      positions.push({ x: 0, y: 0 });
    }
    
    // Add positions along edges of existing parts
    for (const space of occupiedSpaces) {
      const candidatePositions = [
        { x: space.x + space.w, y: space.y }, // Right edge
        { x: space.x, y: space.y + space.h }, // Bottom edge
        { x: space.x + space.w, y: space.y + space.h }, // Bottom-right corner
      ];
      
      for (const pos of candidatePositions) {
        if (pos.x + part.w <= this.usableWidth && 
            pos.y + part.h <= this.usableHeight &&
            this.isPositionValid(part, pos.x, pos.y, occupiedSpaces)) {
          positions.push(pos);
        }
      }
    }
    
    // Add systematic grid positions if no edge positions found
    if (positions.length <= 1) {
      for (let y = 0; y <= this.usableHeight - part.h; y += stepSize) {
        for (let x = 0; x <= this.usableWidth - part.w; x += stepSize) {
          if (this.isPositionValid(part, x, y, occupiedSpaces)) {
            positions.push({ x, y });
          }
        }
      }
    }
    
    return positions;
  }

  /**
   * Calculate a score for a placement position (higher is better)
   */
  private calculatePlacementScore(
    placement: PlacedPart,
    occupiedSpaces: OccupiedSpace[]
  ): number {
    let score = 0;
    
    // Prefer bottom-left positions
    score += (this.usableHeight - placement.y) * 10; // Bottom preference
    score += (this.usableWidth - placement.x) * 5;   // Left preference
    
    // Prefer positions that create less fragmentation
    const adjacentEdges = this.countAdjacentEdges(placement, occupiedSpaces);
    score += adjacentEdges * 50; // High bonus for adjacent placement
    
    // Penalize positions that create small unusable gaps
    const gapPenalty = this.calculateGapPenalty(placement, occupiedSpaces);
    score -= gapPenalty;
    
    return score;
  }

  /**
   * Count how many edges of the placement are adjacent to existing parts or sheet edges
   */
  private countAdjacentEdges(
    placement: PlacedPart,
    occupiedSpaces: OccupiedSpace[]
  ): number {
    let count = 0;
    
    // Check sheet edges
    if (placement.x === 0) count++; // Left edge
    if (placement.y === 0) count++; // Top edge
    if (placement.x + placement.w === this.usableWidth) count++; // Right edge
    if (placement.y + placement.h === this.usableHeight) count++; // Bottom edge
    
    // Check adjacent to existing parts
    for (const space of occupiedSpaces) {
      if (this.areAdjacent(placement, space)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Check if two rectangles are adjacent (share an edge)
   */
  private areAdjacent(
    rect1: { x: number; y: number; w: number; h: number },
    rect2: { x: number; y: number; w: number; h: number }
  ): boolean {
    const tolerance = this.options.spacing;
    
    // Horizontal adjacency
    if (Math.abs(rect1.x + rect1.w - rect2.x) <= tolerance || 
        Math.abs(rect2.x + rect2.w - rect1.x) <= tolerance) {
      return !(rect1.y + rect1.h <= rect2.y || rect2.y + rect2.h <= rect1.y);
    }
    
    // Vertical adjacency
    if (Math.abs(rect1.y + rect1.h - rect2.y) <= tolerance || 
        Math.abs(rect2.y + rect2.h - rect1.y) <= tolerance) {
      return !(rect1.x + rect1.w <= rect2.x || rect2.x + rect2.w <= rect1.x);
    }
    
    return false;
  }

  /**
   * Calculate penalty for creating small unusable gaps
   */
  private calculateGapPenalty(
    placement: PlacedPart,
    occupiedSpaces: OccupiedSpace[]
  ): number {
    let penalty = 0;
    const minUsefulGap = 100; // Minimum gap size to be useful (100mm)
    
    // Check gaps to the right and below
    const rightGap = this.calculateGapSize(
      placement.x + placement.w, placement.y,
      this.usableWidth - (placement.x + placement.w), placement.h,
      occupiedSpaces
    );
    
    const bottomGap = this.calculateGapSize(
      placement.x, placement.y + placement.h,
      placement.w, this.usableHeight - (placement.y + placement.h),
      occupiedSpaces
    );
    
    if (rightGap > 0 && rightGap < minUsefulGap) penalty += 100;
    if (bottomGap > 0 && bottomGap < minUsefulGap) penalty += 100;
    
    return penalty;
  }

  /**
   * Calculate the size of a gap in a given rectangle
   */
  private calculateGapSize(
    x: number, y: number, w: number, h: number,
    occupiedSpaces: OccupiedSpace[]
  ): number {
    if (w <= 0 || h <= 0) return 0;
    
    // Check if the gap area is blocked by existing parts
    for (const space of occupiedSpaces) {
      if (this.rectanglesOverlap(
        { x1: x, y1: y, x2: x + w, y2: y + h },
        { x1: space.x, y1: space.y, x2: space.x + space.w, y2: space.y + space.h }
      )) {
        return 0; // Gap is blocked
      }
    }
    
    return Math.min(w, h); // Return the smaller dimension as gap size
  }

  /**
   * Apply local optimization to improve placement efficiency
   */
  private localOptimization(placements: PlacedPart[]): PlacedPart[] {
    // For now, return the original placements
    // This could be enhanced with techniques like:
    // - 2-opt swapping
    // - Sliding parts to reduce gaps
    // - Compaction algorithms
    return placements;
  }

  /**
   * Check if a position is valid (no collisions and within bounds)
   */
  private isPositionValid(
    part: NestingPart,
    x: number,
    y: number,
    occupiedSpaces: OccupiedSpace[]
  ): boolean {
    // Check bounds
    if (x < 0 || y < 0 || 
        x + part.w > this.usableWidth || 
        y + part.h > this.usableHeight) {
      return false;
    }

    // Check collisions with existing parts
    const partRect = {
      x1: x,
      y1: y,
      x2: x + part.w + this.options.spacing,
      y2: y + part.h + this.options.spacing
    };

    return !occupiedSpaces.some(space => 
      this.rectanglesOverlap(partRect, {
        x1: space.x,
        y1: space.y,
        x2: space.x + space.w,
        y2: space.y + space.h
      })
    );
  }

  /**
   * Check if two rectangles overlap
   */
  private rectanglesOverlap(
    rect1: { x1: number; y1: number; x2: number; y2: number },
    rect2: { x1: number; y1: number; x2: number; y2: number }
  ): boolean {
    return !(rect1.x2 <= rect2.x1 || 
             rect2.x2 <= rect1.x1 || 
             rect1.y2 <= rect2.y1 || 
             rect2.y2 <= rect1.y1);
  }

  /**
   * Check if a part can be placed at the given position
   */
  private canPlace(part: NestingPart, x: number, y: number): boolean {
    return x >= 0 && y >= 0 && 
           x + part.w <= this.usableWidth && 
           y + part.h <= this.usableHeight;
  }

  /**
   * Sort parts according to the specified strategy
   */
  private sortParts(parts: NestingPart[]): NestingPart[] {
    switch (this.options.sortStrategy) {
      case 'area':
        return parts.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      case 'width':
        return parts.sort((a, b) => b.w - a.w);
      case 'height':
        return parts.sort((a, b) => b.h - a.h);
      case 'perimeter':
        return parts.sort((a, b) => (2 * (b.w + b.h)) - (2 * (a.w + a.h)));
      case 'none':
      default:
        return parts;
    }
  }

  /**
   * Calculate metrics for a single sheet
   */
  private calculateSheetMetrics(placements: PlacedPart[]): NestingSheet {
    const totalSheetArea = this.usableWidth * this.usableHeight;
    const usedArea = placements.reduce((sum, p) => sum + (p.w * p.h), 0);
    const efficiency = totalSheetArea > 0 ? usedArea / totalSheetArea : 0;
    const wastedArea = totalSheetArea - usedArea;

    return {
      placements,
      efficiency,
      wastedArea
    };
  }

  /**
   * Calculate overall nesting metrics
   */
  private calculateNestingMetrics(
    sheets: NestingSheet[], 
    unplacedParts: NestingPart[]
  ): NestingResult {
    const totalUsedArea = sheets.reduce((sum, sheet) => 
      sum + sheet.placements.reduce((sheetSum, p) => sheetSum + (p.w * p.h), 0), 0
    );
    const totalSheetArea = sheets.length * (this.usableWidth * this.usableHeight);
    const totalEfficiency = totalSheetArea > 0 ? totalUsedArea / totalSheetArea : 0;
    const totalWastedArea = totalSheetArea - totalUsedArea;

    return {
      sheets,
      totalEfficiency,
      totalWastedArea,
      unplacedParts
    };
  }
}

/**
 * Helper function to create nesting parts from the existing part format
 */
export function createNestingParts(
  parts: { shape: 'rectangle' | 'circle'; w: number; h: number; qty: number }[],
  pendingPart: { shape: 'rectangle' | 'circle'; w: number; h: number; qty: number } | null = null
): NestingPart[] {
  const nestingParts: NestingPart[] = [];
  
  // Add existing parts
  parts.forEach(part => {
    for (let i = 0; i < part.qty; i++) {
      nestingParts.push({
        id: `part-${part.shape}-${part.w}x${part.h}-${i}`,
        w: part.w,
        h: part.h,
        shape: part.shape,
        isPreview: false
      });
    }
  });

  // Add pending part if valid
  if (pendingPart && pendingPart.qty > 0 && pendingPart.w > 0 && pendingPart.h > 0) {
    for (let i = 0; i < pendingPart.qty; i++) {
      nestingParts.push({
        id: `pending-${pendingPart.shape}-${pendingPart.w}x${pendingPart.h}-${i}`,
        w: pendingPart.w,
        h: pendingPart.h,
        shape: pendingPart.shape,
        isPreview: true
      });
    }
  }

  return nestingParts;
}
