# Local Testing Guide for Add to Cart Fix

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
```

**Note**: If no environment variables are set, the app defaults to `craftons-au.myshopify.com` for testing.

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

2. **Open Browser**: http://localhost:3000

3. **Configure a Test Curve**:
   - Radius: 900mm
   - Width: 90mm  
   - Angle: 90°
   - Quantity: 1

4. **Click "Add to Cart"**

5. **Check Browser Console** for:
   ```javascript
   🛒 Adding to cart with quantity: 17344 for price: 173.44
   📦 Cart data: { items: [{ id: 45300623343794, quantity: 17344, properties: {...} }] }
   📬 Response received. Status: 404  // Expected in local dev
   ```

## ✅ Success Criteria for Local Testing

1. **No CORS Errors**: The relative URL `/cart/add.js` should not trigger CORS
2. **Proper Data Formation**: Cart data should include all properties
3. **1-Cent Hack Working**: Price $173.44 becomes quantity 17344
4. **Error Handling**: 404 error should be handled gracefully

## 🚀 Production Testing Requirements

To test the FULL functionality, you need:

1. **Deployed App**: On Vercel with your domain
2. **Shopify Product**: 1-cent product with variant ID 45300623343794
3. **Embedded Context**: Test both:
   - Direct access to your app
   - Embedded in Shopify product page iframe

## 🔧 Troubleshooting Local Issues

### If you see CORS errors:
- Check if you accidentally used absolute URL instead of relative
- Verify the fetch call uses `/cart/add.js` not `https://domain.com/cart/add.js`

### If you see different errors:
- Network errors are expected (no Shopify endpoints locally)
- TypeError in cart drawer functions is normal (no Shopify theme JS)
- Focus on: Does the main function run without CORS issues?

## 📝 Local Testing Checklist

- [ ] Dev server starts without errors
- [ ] App loads at http://localhost:3000
- [ ] Can configure curves (form validation works)
- [ ] Add to cart button becomes active with valid curves
- [ ] Clicking add to cart shows quantity calculation in console
- [ ] Cart data formation logged correctly
- [ ] No CORS errors in browser console
- [ ] Graceful error handling for 404 response
- [ ] User sees appropriate error message (not technical details)

## 🎯 What This Proves

Local testing proves the **CORS fix works** - the most critical issue that blocked previous developers. The 404 error in local dev is expected and confirms the request is being made correctly.

For full end-to-end testing, deploy to production and test with actual Shopify integration. 