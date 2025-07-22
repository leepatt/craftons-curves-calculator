# Material Textures Guide

This directory should contain high-resolution texture files for each material type. The texture system supports both diffuse (color) textures and normal maps for enhanced realism.

## Required Texture Files

### Formply (form-17)
- `formply.jpg` - Diffuse texture showing formply wood grain and surface
- `formply_normal.jpg` - Normal map for surface detail (optional)

### MDF (mdf-18) 
- `mdf.jpg` - Diffuse texture showing smooth MDF surface
- `mdf_normal.jpg` - Normal map for subtle surface texture (optional)

### CD Structural Plywood (CD-19)
- `plywood.jpg` - Diffuse texture showing plywood layers and grain
- `plywood_normal.jpg` - Normal map for wood grain detail (optional)

### Default Fallback
- `default.jpg` - Generic wood/material texture for fallback cases

## Texture Requirements

- **Resolution**: 1024x1024 or higher for crisp detail
- **Format**: JPG or PNG (JPG preferred for smaller file sizes)
- **Seamless**: Textures should tile seamlessly for large surfaces
- **Realistic**: Should accurately represent the actual material appearance

## Texture Scale

The texture scale is configured in `materials.json`:
- `[4, 4]` for formply - repeats 4x in each direction
- `[2, 2]` for MDF - repeats 2x in each direction  
- `[3, 3]` for plywood - repeats 3x in each direction

## Normal Maps (Optional)

Normal maps add surface detail without additional geometry:
- Should be in tangent space (blue-tinted appearance)
- Same resolution as diffuse textures
- Follow naming convention: `{material}_normal.jpg`

## Testing

Once textures are added:
1. Select a material in the customizer
2. Input dimensions to see the textured visualization
3. Check that textures tile properly and look realistic
4. Verify that active states still show visual feedback (brightness changes)

## Fallback Behavior

If texture files are missing:
- The system will log a warning to console
- Fall back to solid color materials
- Maintain all interactive functionality 