export interface MaterialForPricing {
  price?: number; // legacy
  sheet_price?: number; // preferred per-sheet rate
  sheet_width: number; // mm
  sheet_height: number; // mm
}

export const EDGE_MARGIN_MM = 10; // border around the sheet
export const PART_SPACING_MM = 10; // spacing between parts
export const ROTATIONS_ALLOWED = true; // 0° / 90°
export const MIN_HOLE_DIAMETER_MM = 3; // manufacturing constraint
export const MIN_PART_SIZE_MM = 100; // both width and height minimum

export const MANUFACTURE_BASE_PER_SHEET = 50; // $/sheet
export const MANUFACTURE_PER_PART = 5; // $/part

export function getSheetPrice(material: MaterialForPricing): number {
  return material.sheet_price ?? material.price ?? 0;
}

export function calculateManufacturingCost(sheets: number, parts: number): number {
  return sheets * MANUFACTURE_BASE_PER_SHEET + parts * MANUFACTURE_PER_PART;
}



