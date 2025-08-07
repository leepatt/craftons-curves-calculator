# New App Development Guide for Crafton's Curves Calculator Suite

## Overview
This guide is designed for AI assistants (specifically Cursor AI) to develop new customizable building product apps following the established patterns of the Curves and Ripping apps. Each new app should maintain UI/UX consistency while providing unique functionality for specific building products.

## App Types & Examples
Develop apps for customizable building products such as:
- **Stair Builder** - Custom stair calculations with risers, treads, stringers
- **Shape Cutter** - Complex geometric cutting patterns
- **Panel Joiner** - Edge joining and panel assembly
- **Routing App** - Custom routing patterns and depths
- **Drilling App** - Hole patterns and spacing calculations
- **Laminate App** - Lamination patterns and thicknesses

## Core Architecture Pattern

### 1. File Structure (MANDATORY)
```
src/app/apps/[app-name]/
├── page.tsx                    # Main page entry point
├── [AppName]Customizer.tsx     # Main orchestrator component
├── [AppName]BuilderForm.tsx    # Input form component
├── [AppName]Visualizer.tsx     # 2D/3D visualization component
├── materials.json              # App-specific materials (if needed)
├── config.ts                   # App configuration
└── pricing.ts                  # Pricing logic
```

### 2. Component Naming Convention
- **Main Component**: `[AppName]Customizer` (e.g., `StairCustomizer`, `ShapeCustomizer`)
- **Form Component**: `[AppName]BuilderForm` (e.g., `StairBuilderForm`)
- **Visualizer**: `[AppName]Visualizer` (e.g., `StairVisualizer`)
- **File Names**: PascalCase for components, kebab-case for directories

## UI/UX Standards (STRICT REQUIREMENTS)

### Layout Pattern
**MUST follow the exact same layout as Curves/Ripping apps:**
```tsx
<div className="flex flex-col text-foreground overflow-x-hidden">
  <div className="flex flex-1 gap-4 md:flex-row flex-col px-2 md:px-6">
    {/* Visualizer - LEFT SIDE */}
    <main className="w-full md:flex-1 relative rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/70 flex flex-col items-center justify-center h-[400px] md:h-[576px] overflow-hidden order-1 md:order-1">
      {/* Visualizer Component */}
    </main>
    
    {/* Controls - RIGHT SIDE */}
    <aside className="w-full md:w-[28rem] lg:w-[33rem] flex-shrink-0 min-h-0 order-2 md:order-2">
      <ScrollArea className="h-full">
        {/* Configuration Form */}
        {/* Real-time Calculation Summary */}
      </ScrollArea>
    </aside>
  </div>
</div>
```

### Visual Design System
**Colors & Styling (MUST MATCH):**
- **Card styling**: `rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60`
- **Section headers**: `text-lg md:text-xl font-bold text-gray-900`
- **Form inputs**: Use Shadcn UI components with consistent styling
- **Dimensions**: CAD-style with tick marks, professional appearance
- **Background**: `bg-gray-50` for visualizer, `bg-white` for cards

### Responsive Design (MANDATORY)
- **Mobile-first approach**
- **Visualizer stacks on top** on mobile (`order-1`)
- **Controls below** on mobile (`order-2`)
- **Side-by-side layout** on desktop (`md:flex-row`)
- **All inputs must be touch-friendly** on mobile

## Technical Implementation Requirements

### 1. Page Entry Point Template
```tsx
// src/app/apps/[app-name]/page.tsx
'use client';

import React, { Suspense } from 'react';
import { [AppName]Customizer } from './[AppName]Customizer';

export default function [AppName]Page() {
  return (
    <Suspense fallback={<div>Loading [App Name]...</div>}>
      <[AppName]Customizer />
    </Suspense>
  );
}
```

### 2. Main Customizer Component Template
```tsx
// src/app/apps/[app-name]/[AppName]Customizer.tsx
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { [AppName]Visualizer } from './[AppName]Visualizer';
import { [AppName]BuilderForm } from './[AppName]BuilderForm';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import materials from './materials.json'; // Or shared materials

// Define calculation interface
interface [AppName]Calculation {
  // Add specific calculation properties
  materialCost: number;
  manufactureCost: number;
  totalCost: number;
}

export function [AppName]Customizer() {
  const customizerContainerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [selectedMaterial, setSelectedMaterial] = useState(materials[0]?.id || '');
  // Add app-specific state variables
  
  // Iframe height communication (REQUIRED for Shopify embedding)
  const communicateHeightToParent = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const newHeight = Math.ceil(document.body.scrollHeight);
      window.parent.postMessage({ type: 'IFRAME_HEIGHT_UPDATE', height: newHeight }, '*');
    }
  };

  // Real-time calculation logic
  const calculation = useMemo((): [AppName]Calculation => {
    // Implement app-specific calculations
    // MUST include materialCost, manufactureCost, totalCost
  }, [/* dependencies */]);

  // Render following exact layout pattern
  return (
    <div ref={customizerContainerRef} className="flex flex-col text-foreground overflow-x-hidden">
      {/* Layout pattern as shown above */}
    </div>
  );
}
```

### 3. Builder Form Component Template
```tsx
// src/app/apps/[app-name]/[AppName]BuilderForm.tsx
'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Material interface (MUST match materials.json structure)
interface Material {
  id: string;
  name: string;
  price: number;
  sheet_width: number;
  sheet_height: number;
  texture: string;
}

// Props interface
type [AppName]BuilderFormProps = {
  materials: Material[];
  selectedMaterial: string;
  onMaterialChange: (value: string) => void;
  // Add app-specific props
};

export const [AppName]BuilderForm: React.FC<[AppName]BuilderFormProps> = ({
  materials,
  selectedMaterial,
  onMaterialChange,
  // Add app-specific parameters
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validation logic
  const validateInput = (field: string, value: string) => {
    // Implement validation
  };

  return (
    <div className="space-y-4">
      {/* Material Selection - ALWAYS FIRST */}
      <div>
        <Label htmlFor="material-select" className="block mb-1 font-medium text-foreground">Material</Label>
        <Select value={selectedMaterial} onValueChange={onMaterialChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{material.name}</span>
                  <span className="text-sm text-gray-500">
                    {material.sheet_width}×{material.sheet_height}mm - ${material.price}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* App-specific input fields */}
      
    </div>
  );
};
```

### 4. Visualizer Component Template
```tsx
// src/app/apps/[app-name]/[AppName]Visualizer.tsx
'use client';

import React from 'react';

interface [AppName]VisualizerProps {
  // Add app-specific props
  material?: Material;
}

export const [AppName]Visualizer: React.FC<[AppName]VisualizerProps> = ({
  // Props
}) => {
  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      {/* CAD-style visualization with proper dimensions */}
      {/* MUST include:
          - Professional dimension lines with tick marks
          - Material representation
          - Clear visual feedback
          - Responsive scaling
      */}
    </div>
  );
};
```

## Calculation Patterns (MANDATORY)

### Real-time Calculation Structure
```tsx
const calculation = useMemo((): [AppName]Calculation => {
  const materialData = materials.find(m => m.id === selectedMaterial);
  
  if (!materialData || /* invalid inputs */) {
    return {
      // Default/empty values
      materialCost: 0,
      manufactureCost: 0,
      totalCost: 0,
      // App-specific defaults
    };
  }

  // App-specific calculations
  const materialCost = /* calculate based on material usage */;
  const manufactureCost = /* calculate based on complexity/time */;
  const totalCost = materialCost + manufactureCost;

  return {
    materialCost,
    manufactureCost,
    totalCost,
    // App-specific calculated values
  };
}, [/* dependencies */]);
```

### Pricing Summary Display (MANDATORY PATTERN)
```tsx
{/* Real-time Calculation Summary - Always visible */}
<div className="rounded-xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/60 p-3 md:p-4 space-y-4">
  <div className="flex items-center space-x-3 mb-4">
    <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
      <span className="text-slate-700 font-bold text-sm">[Icon]</span>
    </div>
    <h2 className="text-lg md:text-xl font-bold text-gray-900">[App Name] Calculation</h2>
  </div>
  
  <div className="space-y-3 text-sm">
    {calculation.totalCost > 0 ? (
      <>
        {/* App-specific calculation details */}
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
        {/* Helpful message for incomplete inputs */}
      </div>
    )}
  </div>
</div>
```

## Shopify Integration Requirements

### Product Configuration Interface
```tsx
// Each app must define its product configuration
interface [AppName]ProductConfiguration {
  app: '[app-name]';
  material: string;
  // App-specific configuration properties
  totalPrice: number;
  specifications: {
    // Technical specs for manufacturing
  };
}
```

### Add to Cart Integration
```tsx
// MUST integrate with existing cart system
const handleAddToCart = async () => {
  const configuration: [AppName]ProductConfiguration = {
    app: '[app-name]',
    material: selectedMaterial,
    // Build configuration object
    totalPrice: calculation.totalCost,
    specifications: {
      // Add manufacturing specifications
    }
  };

  // Use existing cart API
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: '[SHOPIFY_PRODUCT_ID]', // Unique per app
        variantId: '[SHOPIFY_VARIANT_ID]', // Unique per app
        quantity: 1,
        properties: configuration
      })
    });
    // Handle response
  } catch (error) {
    // Error handling
  }
};
```

## Development Workflow

### 1. Initial Setup with Placeholders
When starting a new app development, follow this collaborative workflow:

#### Phase 1: App Name & Placeholder Creation
1. **Developer provides app name** (e.g., "stair-builder", "panel-joiner")
2. **AI creates placeholder structure** with:
   - Basic directory structure
   - Template files with placeholder fields
   - Minimal functional UI following layout patterns
   - Basic state management with placeholder inputs
   - Simple placeholder calculations

#### Phase 2: Detailed Requirements
1. **Developer provides detailed specification** including:
   - All input fields and their types/validation
   - Specific calculation formulas
   - Visualizer requirements and representation
   - Material requirements (shared vs. app-specific)
   - Any special functionality or constraints

#### Phase 3: Full Implementation
1. **AI implements complete functionality** based on specifications
2. **Replace all placeholders** with real implementation
3. **Add comprehensive calculations and visualizer**
4. **Integrate with Shopify cart system**

### 2. Placeholder Structure Guidelines

When creating initial placeholder apps, include:

```tsx
// Placeholder input fields
const [dimension1, setDimension1] = useState(100); // TODO: Replace with actual field
const [dimension2, setDimension2] = useState(200); // TODO: Replace with actual field
const [quantity, setQuantity] = useState(1);       // TODO: Replace with actual field

// Placeholder calculation
const calculation = useMemo((): AppCalculation => {
  // TODO: Implement actual calculation logic
  const materialCost = dimension1 * dimension2 * 0.01; // Placeholder formula
  const manufactureCost = 50; // Placeholder value
  const totalCost = materialCost + manufactureCost;
  
  return {
    materialCost,
    manufactureCost,
    totalCost,
    // TODO: Add app-specific calculated values
  };
}, [dimension1, dimension2]);
```

```tsx
// Placeholder form inputs
<div>
  <Label htmlFor="dimension1">Dimension 1 (mm)</Label>
  <Input
    id="dimension1"
    type="number"
    value={dimension1}
    onChange={(e) => setDimension1(parseFloat(e.target.value) || 0)}
    placeholder="Enter dimension 1"
  />
  {/* TODO: Replace with actual field based on app requirements */}
</div>

<div>
  <Label htmlFor="dimension2">Dimension 2 (mm)</Label>
  <Input
    id="dimension2"
    type="number"
    value={dimension2}
    onChange={(e) => setDimension2(parseFloat(e.target.value) || 0)}
    placeholder="Enter dimension 2"
  />
  {/* TODO: Replace with actual field based on app requirements */}
</div>
```

```tsx
// Placeholder visualizer
export const [AppName]Visualizer: React.FC<[AppName]VisualizerProps> = ({
  dimension1 = 100,
  dimension2 = 200,
  material
}) => {
  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      <div className="absolute inset-4 border-2 border-gray-400 bg-white rounded flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="text-2xl font-bold mb-2">[App Name] Preview</div>
          <div className="text-sm">
            {dimension1} × {dimension2} mm
          </div>
          <div className="text-xs mt-2 text-gray-500">
            TODO: Implement actual visualization
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3. Setup Checklist
- [ ] Create directory structure in `src/app/apps/[app-name]/`
- [ ] Copy and modify template files
- [ ] Update app-specific naming throughout
- [ ] Create materials.json (if app-specific materials needed)
- [ ] Set up Shopify product and variant IDs

### 4. Development Process
1. **Start with placeholder structure** - Get basic layout and naming correct
2. **Gather detailed requirements** - Wait for developer specifications
3. **Implement real functionality** - Replace all placeholders
4. **Build visualizer** - 2D/3D representation with CAD-style dimensions
5. **Add Shopify integration** - Cart functionality and product configuration
6. **Test responsiveness** - Mobile and desktop layouts
7. **Validate with build** - `npm run build` must pass

### 3. Testing Requirements
```bash
# MUST pass all these checks
npm run build          # Build must succeed
npm run dev           # Development server
# Test on multiple screen sizes
# Test all input validation
# Test cart integration
```

### 4. Quality Checklist
- [ ] Layout matches Curves/Ripping pattern exactly
- [ ] Mobile responsive (test on phone)
- [ ] All inputs have validation and error handling
- [ ] Real-time calculations work correctly
- [ ] Visualizer shows accurate representation
- [ ] CAD-style dimensions with tick marks
- [ ] Shopify integration functional
- [ ] No TypeScript/build errors
- [ ] Consistent styling with existing apps

## Shared Components & Resources

### Available Shared UI Components
```tsx
// Import from @/components/ui/
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
```

### Shared Utilities
```tsx
// Available utility functions
import { cn } from '@/lib/utils';           // Class name utility
import { /* shopify functions */ } from '@/lib/shopify';  // Shopify helpers
```

### Material Management
- Each app can have its own `materials.json` OR
- Reference shared materials from a central location
- **Decision point**: Determine per app whether to use shared or specific materials

## Common Patterns & Best Practices

### State Management Pattern
```tsx
// Use local state for form inputs
const [inputValue, setInputValue] = useState(defaultValue);

// Use useMemo for expensive calculations
const calculation = useMemo(() => {
  // Calculation logic
}, [dependencies]);

// Use useRef for DOM references
const containerRef = useRef<HTMLDivElement>(null);
```

### Error Handling Pattern
```tsx
const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

const validateInput = (field: string, value: string) => {
  const errors = { ...validationErrors };
  
  if (/* validation condition */) {
    errors[field] = 'Error message';
  } else {
    delete errors[field];
  }
  
  setValidationErrors(errors);
};
```

### Responsive Design Pattern
```tsx
// Mobile-first classes
className="w-full md:w-auto"              // Full width mobile, auto desktop
className="flex-col md:flex-row"          // Stack mobile, side-by-side desktop
className="text-sm md:text-base"          // Smaller text mobile
className="p-3 md:p-5"                    // Less padding mobile
className="order-1 md:order-2"            // Control stacking order
```

## Performance Considerations

### Optimization Requirements
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Implement proper dependency arrays
- Minimize re-renders with careful state structure
- Lazy load heavy visualizer components if needed

### Build Optimization
- Keep bundle size reasonable
- Use dynamic imports for heavy libraries
- Optimize images and textures
- Follow Next.js best practices

## Troubleshooting Guide

### Common Issues & Solutions

**Build Errors:**
- Check TypeScript interfaces match exactly
- Ensure all imports are correct
- Verify component naming consistency

**Layout Issues:**
- Copy exact CSS classes from working apps
- Test mobile responsiveness thoroughly
- Verify ScrollArea usage

**Calculation Issues:**
- Check for division by zero
- Validate all numeric inputs
- Ensure proper default values

**Shopify Integration:**
- Verify product/variant IDs are correct
- Test cart API responses
- Check configuration object structure

## Final Validation

Before considering an app complete, verify:

1. **Visual Consistency**: Side-by-side comparison with Curves/Ripping apps
2. **Functional Completeness**: All calculations work and update in real-time
3. **Technical Standards**: Clean build, no errors, proper TypeScript
4. **User Experience**: Intuitive workflow, helpful error messages
5. **Integration**: Shopify cart functionality works end-to-end

---

## Summary for AI Assistant

When developing a new app:

### Initial Setup (Phase 1)
1. **Wait for app name** - Developer will provide the specific app name
2. **Create placeholder structure** - Build basic functional app with placeholder fields
3. **Follow templates exactly** - Don't deviate from the established patterns
4. **Copy the layout from Curves/Ripping** - Visual consistency is critical

### Full Implementation (Phase 3)
1. **Wait for detailed specifications** - Developer will provide all fields and functionality requirements
2. **Replace all placeholders** - Implement real calculations and functionality
3. **Implement real-time calculations** - No job-based systems, immediate feedback
4. **Use CAD-style visualizers** - Professional appearance with proper dimensions
5. **Integrate with Shopify** - Each app needs unique product/variant IDs
6. **Test thoroughly** - Build, responsiveness, functionality
7. **Maintain quality** - Code standards, performance, user experience

### Key Workflow Points
- **Never assume requirements** - Always use placeholders until specifications are provided
- **Build incrementally** - Placeholder → Specifications → Full implementation
- **Maintain consistency** - Every app should look and feel like the existing suite
- **TODO comments** - Mark all placeholder code clearly for future replacement

This guide ensures every new app maintains the high standards and consistency of the existing suite while providing unique functionality for different building products.