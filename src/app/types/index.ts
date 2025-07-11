// Core product and material types
export interface Material {
  id: string;
  name: string;
  type: string;
  thickness_mm: number;
  sheet_price: number; // inc GST (as per Shopify standard)
  sheet_length_mm: number;
  sheet_width_mm: number;
  usable_sheet_length_mm: number;
  usable_sheet_width_mm: number;
}

// Parameter types for form configuration
export interface NumberParameter {
  id: string;
  label: string;
  type: 'number';
  defaultValue: string | number;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface SelectParameter {
  id: string;
  label: string;
  type: 'select';
  optionsSource?: 'materials' | 'static';
  options?: Array<{ value: string; label: string }>;
  defaultValue: string;
  description?: string;
}

export interface ButtonGroupParameter {
  id: string;
  label: string;
  type: 'button-group';
  options: Array<{ value: string; label: string }>;
  defaultValue: string;
  description?: string;
}

export type ProductParameter = NumberParameter | SelectParameter | ButtonGroupParameter;

export interface DerivedParameter {
  id: string;
  label: string;
  description: string;
  formula: string;
}

export interface ProductDefinition {
  id: string;
  name: string;
  description: string;
  parameters: ProductParameter[];
  derivedParameters?: DerivedParameter[];
  constraints?: {
    maxExternalRadius?: number;
    maxWidth?: number;
    maxAngle?: number;
    minAngle?: number;
    maxChordLength?: number;
  };
}

// Configuration types
export interface ProductConfiguration {
  material: string;
  radiusType: 'internal' | 'external';
  specifiedRadius: string | number;
  width: string | number;
  angle: string | number;
  [key: string]: any; // Allow additional dynamic parameters
}

// Parts list item for the order
export interface PartListItem {
  id: string;
  config: ProductConfiguration;
  quantity: number;
  numSplits: number;
  partType: 'curve';
  singlePartAreaM2: number;
  itemIdealEfficiency: number;
  priceDetails: {
    materialCost: number; // inc GST
    manufactureCost: number; // inc GST
    totalIncGST: number; // Total price (all components already inc GST)
  };
  turnaround: number;
} 