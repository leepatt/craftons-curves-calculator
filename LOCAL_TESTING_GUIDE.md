# Local Testing Guide for Crafton's Curves Calculator

## 🧪 Local Development Testing

### Environment Setup (Optional)

For testing with a specific Shopify store, create a `.env.local` file:
```env
# Shop domain for cart functionality (choose one)
NEXT_PUBLIC_SHOP_DOMAIN=your-store.myshopify.com
# OR
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com

# Admin API access (if using product management features)  
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_your_admin_access_token

# App-specific variant IDs (optional - fallback to default)
NEXT_PUBLIC_DOLLAR_VARIANT_ID=45721553469618
NEXT_PUBLIC_RIPPING_DOLLAR_VARIANT_ID=45721553469618
NEXT_PUBLIC_PELMET_PRO_DOLLAR_VARIANT_ID=45721553469618
NEXT_PUBLIC_STAIR_BUILDER_DOLLAR_VARIANT_ID=45721553469618
NEXT_PUBLIC_BOX_BUILDER_DOLLAR_VARIANT_ID=45721553469618
```

**Note**: If no environment variables are set, the app defaults to `craftons-au.myshopify.com` for testing.

### App Structure & URLs

The application now includes multiple specialized calculators:

1. **Main Curves Calculator** (Original)
   - URL: `http://localhost:3000/`
   - Features: Radius curves, angle calculations, material selection

2. **Ripping Calculator**
   - URL: `http://localhost:3000/apps/ripping`
   - Features: Sheet ripping calculations, cut optimization

3. **Pelmet Pro**
   - URL: `http://localhost:3000/apps/pelmet-pro`
   - Features: C-channel pelmet calculations, end caps, ceiling deductions

4. **Stair Builder**
   - URL: `http://localhost:3000/apps/stair-builder`
   - Features: Stair calculations with risers, treads, stringers

5. **Box Builder**
   - URL: `http://localhost:3000/apps/box-builder`
   - Features: Custom box calculations, join types, dimension options

6. **Radius Pro**
   - URL: `http://localhost:3000/apps/radius-pro`
   - Features: Advanced radius calculations with professional geometry

7. **Cut Studio**
   - URL: `http://localhost:3000/apps/cut-studio`
   - Features: Cut optimization and nesting calculations

### Expected Behavior in Local Dev
- ✅ **Function Execution**: Add to cart function runs without CORS errors
- ✅ **Data Preparation**: All cart data is properly formatted and logged
- ❌ **Cart API Call**: Will fail with 404 (Shopify's `/cart/add.js` doesn't exist locally)
- ✅ **Error Handling**: Should show user-friendly error message

### Testing Steps

1. **Start Dev Server**:
   ```bash
   npm run dev
   ```

2. **Open Browser**: http://localhost:3000 (check console for actual port)

3. **Test Each App**:

   **Main Curves Calculator (`/`)**:
   - Radius: 900mm
   - Width: 90mm  
   - Angle: 90°
   - Quantity: 1

   **Ripping Calculator (`/apps/ripping`)**:
   - Select material (e.g., MDF 15mm)
   - Configure cut dimensions
   - Set quantity

   **Pelmet Pro (`/apps/pelmet-pro`)**:
   - Length: 2400mm
   - Height: 100mm
   - Depth: 100mm
   - Toggle C-channel options

   **Stair Builder (`/apps/stair-builder`)**:
   - Total Rise: 2400mm
   - Step Count: 13
   - Tread Depth: 250mm

   **Box Builder (`/apps/box-builder`)**:
   - Width: 420mm
   - Depth: 400mm
   - Height: 400mm
   - Select box type and join method

   **Radius Pro (`/apps/radius-pro`)**:
   - Configure advanced radius calculations
   - Test professional geometry features

   **Cut Studio (`/apps/cut-studio`)**:
   - Set up cut optimization parameters
   - Test nesting calculations

4. **Click "Add to Cart"** on any app

5. **Check Browser Console** for:
   ```javascript
   🛒 Adding to cart with quantity: [calculated] for price: [price]
   📦 Cart data: { items: [{ id: [variant_id], quantity: [quantity], properties: {...} }] }
   📬 Response received. Status: 404  // Expected in local dev
   ```

## ✅ Success Criteria for Local Testing

1. **No CORS Errors**: The relative URL `/cart/add.js` should not trigger CORS
2. **Proper Data Formation**: Cart data should include all properties and app-specific configurations
3. **Dollar Pricing Working**: Each app uses $1.00 variant with quantity representing price (e.g., $173.44 becomes quantity 17344)
4. **Error Handling**: 404 error should be handled gracefully across all apps
5. **App Isolation**: Each app maintains its own configuration and pricing logic

## 🚀 Production Testing Requirements

To test the FULL functionality, you need:

1. **Deployed App**: On Vercel with your domain
2. **Shopify Products**: $1.00 products with appropriate variant IDs for each app
3. **Embedded Context**: Test both:
   - Direct access to your app URLs
   - Embedded in Shopify product page iframes
4. **Multi-App Testing**: Verify each app works independently and maintains separate configurations

## 🔧 Troubleshooting Local Issues

### If you see CORS errors:
- Check if you accidentally used absolute URL instead of relative
- Verify the fetch call uses `/cart/add.js` not `https://domain.com/cart/add.js`

### If you see different errors:
- Network errors are expected (no Shopify endpoints locally)
- TypeError in cart drawer functions is normal (no Shopify theme JS)
- Focus on: Does the main function run without CORS issues?

## 📝 Local Testing Checklist

### General Functionality
- [ ] Dev server starts without errors
- [ ] Main app loads at http://localhost:3000
- [ ] No CORS errors in browser console
- [ ] Graceful error handling for 404 response
- [ ] User sees appropriate error message (not technical details)

### Individual App Testing
- [ ] **Main Curves Calculator** (`/`) - Radius, width, angle calculations work
- [ ] **Ripping Calculator** (`/apps/ripping`) - Sheet cutting calculations work  
- [ ] **Pelmet Pro** (`/apps/pelmet-pro`) - C-channel calculations with options work
- [ ] **Stair Builder** (`/apps/stair-builder`) - Stair component calculations work
- [ ] **Box Builder** (`/apps/box-builder`) - Box dimension and join calculations work
- [ ] **Radius Pro** (`/apps/radius-pro`) - Advanced radius calculations work
- [ ] **Cut Studio** (`/apps/cut-studio`) - Cut optimization calculations work

### Add to Cart Testing (Each App)
- [ ] Form validation works for each app's specific inputs
- [ ] Add to cart button becomes active with valid configuration
- [ ] Clicking add to cart shows quantity calculation in console
- [ ] Cart data formation logged correctly with app-specific properties
- [ ] Pricing calculations reflect each app's unique logic

## 🎯 What This Proves

Local testing proves the **CORS fix works** across all apps - the most critical issue that blocked previous developers. The 404 error in local dev is expected and confirms the request is being made correctly.

### Multi-App Architecture Benefits
- **App Isolation**: Each calculator maintains its own configuration and pricing logic
- **Scalable Structure**: Easy to add new calculators without affecting existing ones  
- **Consistent Experience**: All apps use the same cart integration approach
- **Flexible Environment**: Individual apps can have specific environment variables

For full end-to-end testing, deploy to production and test with actual Shopify integration for each individual app. 