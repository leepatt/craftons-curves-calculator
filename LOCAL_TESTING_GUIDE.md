# Local Testing Guide for Crafton's Curves Calculator

## 🧪 Local Development Testing

### Environment Setup (Optional)

For testing with a specific Shopify store, create a `.env.local` file:
```env
# Shop domain for cart functionality
NEXT_PUBLIC_SHOP_DOMAIN=your-store.myshopify.com

# App-specific variant IDs (optional - fallback to default)
NEXT_PUBLIC_DOLLAR_VARIANT_ID=45300623343794
```

**Note**: If no environment variables are set, the app defaults to `craftons-au.myshopify.com` for testing.

### App Structure & URLs

The application includes multiple specialized calculators:

| App | URL | Features |
|-----|-----|----------|
| **Main Curves** | `http://localhost:3000/` | Radius curves, angle calculations |
| **Radius Pro** | `http://localhost:3000/apps/radius-pro` | Advanced radius calculations |
| **Ripping** | `http://localhost:3000/apps/ripping` | Sheet ripping calculations |
| **Pelmet Pro** | `http://localhost:3000/apps/pelmet-pro` | C-channel pelmet calculations |
| **Stair Builder** | `http://localhost:3000/apps/stair-builder` | Stair component calculations |
| **Box Builder** | `http://localhost:3000/apps/box-builder` | Custom box calculations |
| **Cut Studio** | `http://localhost:3000/apps/cut-studio` | Cut optimization and nesting |

## 🛒 Cart System Testing

### Understanding the Cart System

The calculator uses a **unified cart utility** (`src/app/lib/shopify-cart.ts`) that works differently based on context:

| Context | Method | Behavior |
|---------|--------|----------|
| **Embedded in Shopify (iframe)** | postMessage | ✅ Items accumulate |
| **Direct access** | Permalink redirect | ⚠️ Cart replaced |

### Test PostMessage Cart Locally

Use the included test page to verify the postMessage cart system:

1. **Start Dev Server**:
   ```bash
   npm run dev
   ```

2. **Open Test Page**: 
   ```
   http://localhost:3000/test-postmessage-cart.html
   ```

3. **Test Multiple Apps**:
   - Add item from **Radius Pro** (left iframe)
   - Add item from **Ripping** (right iframe)
   - Check the simulated cart at the top

4. **Expected Result**:
   - ✅ **PASS**: Both items appear in the cart (accumulated)
   - ❌ **FAIL**: Only the second item appears (replaced)

### Console Logs to Look For

When adding to cart, you should see:
```javascript
🎯 [App Name]: Using unified cart utility
📍 Embedded in Shopify: true/false
🛒 Adding to cart with quantity: [calculated] for price: [price]
📦 Properties: { ... }
📤 Sending ADD_TO_CART_REQUEST to parent...  // If embedded
🔗 Redirected via permalink                   // If direct access
```

## 📱 Testing Individual Apps

### Main Curves Calculator (`/`)
- Radius: 900mm
- Width: 90mm  
- Angle: 90°
- Quantity: 1

### Radius Pro (`/apps/radius-pro`)
- Configure radius, width, angle
- Add multiple parts to list
- Test joiner blocks and engraving options

### Ripping Calculator (`/apps/ripping`)
- Select material (e.g., MDF 15mm)
- Height: 100mm
- Total Length: 2400mm

### Pelmet Pro (`/apps/pelmet-pro`)
- Length: 2400mm
- Height: 100mm
- Depth: 100mm
- Toggle C-channel/L-shaped

### Stair Builder (`/apps/stair-builder`)
- Total Rise: 2400mm
- Step Count: 13
- Tread Depth: 250mm

### Box Builder (`/apps/box-builder`)
- Width: 420mm
- Depth: 400mm
- Height: 400mm
- Select box type and join method

### Cut Studio (`/apps/cut-studio`)
- Add multiple parts with shapes
- Select nesting strategy
- Review sheet optimization

## ✅ Success Criteria

### Technical Success:
- [ ] No CORS errors in browser console
- [ ] PostMessage cart works in test page
- [ ] Multiple items accumulate (don't replace)
- [ ] All apps load without errors

### Cart Integration:
- [ ] PostMessage logs appear when embedded
- [ ] Permalink fallback works for direct access
- [ ] Properties include all order details
- [ ] Price encoded correctly as quantity

## 🔧 Troubleshooting

### PostMessage Not Working
- Check browser console for errors
- Verify iframe is loading correctly
- Ensure source matches `craftons-curves-calculator`

### Cart Replacing Items
- This is expected for **direct access** (not embedded)
- Only embedded context uses postMessage
- Test with `test-postmessage-cart.html` to verify

### CORS Errors
- Should not occur with current implementation
- If seen, check network tab for blocked requests

## 📝 Local Testing Checklist

### General
- [ ] Dev server starts: `npm run dev`
- [ ] All app URLs load correctly
- [ ] No console errors on load

### Cart System
- [ ] Open `test-postmessage-cart.html`
- [ ] Add item from Radius Pro → appears in cart
- [ ] Add item from Ripping → BOTH items in cart
- [ ] Cart shows correct prices and properties

### Individual Apps
- [ ] Main Curves (`/`) - calculations work
- [ ] Radius Pro (`/apps/radius-pro`) - multi-part works
- [ ] Ripping (`/apps/ripping`) - pricing correct
- [ ] Pelmet Pro (`/apps/pelmet-pro`) - options work
- [ ] Stair Builder (`/apps/stair-builder`) - calculations work
- [ ] Box Builder (`/apps/box-builder`) - dimensions work
- [ ] Cut Studio (`/apps/cut-studio`) - nesting works

## 🚀 Next Steps

After local testing passes:
1. Deploy to Vercel
2. Update Shopify theme with `CORRECTED_FULL_SECTION.liquid`
3. Test in production Shopify store
4. Verify cart accumulation works in real environment
