# Production Deployment Checklist - Cart Integration

## 🎯 Cart System Overview

The calculator suite uses a **unified cart system** that:
- ✅ **PostMessage method** (embedded): Adds items WITHOUT replacing cart
- ⚠️ **Permalink fallback** (direct): Replaces cart (Shopify limitation)

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  Embedded in Shopify (iframe)                                   │
│  ─────────────────────────────                                  │
│  1. Calculator sends ADD_TO_CART_REQUEST via postMessage        │
│  2. Shopify Liquid handler receives message                     │
│  3. Liquid calls /cart/add.js (same-origin)                     │
│  4. Items ACCUMULATE in cart ✅                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Direct Access (not embedded)                                   │
│  ───────────────────────────                                    │
│  1. Calculator builds permalink URL                             │
│  2. Redirects to /cart/{variant}:{qty}                          │
│  3. Cart is REPLACED ⚠️ (Shopify limitation)                   │
└─────────────────────────────────────────────────────────────────┘
```

## ✅ Pre-Deployment Checklist

### Local Testing
- [ ] Dev server runs without errors
- [ ] All apps load correctly at their URLs
- [ ] PostMessage cart test passes (`/test-postmessage-cart.html`)
- [ ] Multiple items accumulate in simulated cart
- [ ] Console shows correct postMessage logs

### Code Updates
- [ ] All Customizer files use `submitToShopifyCart` utility
- [ ] Import: `import { submitToShopifyCart, isEmbeddedInShopify } from '@/lib/shopify-cart'`
- [ ] No old permalink-only cart code remains

## 🚀 Deployment Steps

### 1. Deploy to Vercel
```bash
# Commit all changes
git add .
git commit -m "Update: Unified cart system with postMessage for cart accumulation"
git push origin main

# Vercel auto-deploys from main branch
# Verify at https://craftons-curves-calculator.vercel.app
```

### 2. Update Shopify Theme (CRITICAL!)

The postMessage cart system requires the Liquid handler. **Without this, cart accumulation won't work.**

1. Go to **Shopify Admin** → **Online Store** → **Themes** → **Edit Code**
2. Find your calculator section (e.g., `curves-calculator.liquid`)
3. **Replace** with contents of `CORRECTED_FULL_SECTION.liquid`
4. **Save**

Key code that must be present:
```javascript
// 🛒 Handle ADD TO CART requests from calculator iframe
if (event.data && 
    event.data.type === 'ADD_TO_CART_REQUEST' && 
    event.data.source === 'craftons-curves-calculator') {
  handleAddToCart(event.data.cartData, event.source, event.origin);
}
```

### 3. Verify Shopify Product Setup

In Shopify Admin:
- [ ] $1 product exists (Variant ID: `45300623343794`)
- [ ] Price set to: **$1.00**
- [ ] Inventory tracking: **Disabled**
- [ ] Product visibility: **Hidden**

## 📊 Production Testing

### Test 1: Cart Accumulation (Embedded)
1. Visit your Shopify product page with embedded calculator
2. Add item from Curves calculator
3. Navigate to another calculator (e.g., Radius Pro)
4. Add another item
5. **Check cart**: Both items should be present

**Expected Result**: ✅ Both items in cart

### Test 2: Direct Access Fallback
1. Visit calculator directly (not via Shopify): `https://craftons-curves-calculator.vercel.app`
2. Add item to cart
3. **Observe**: Redirects to Shopify cart with item

**Expected Result**: ⚠️ Cart contains only the new item (expected behavior)

### Test 3: Multi-App Workflow
1. Add Ripping order → Check cart
2. Add Radius Pro order → Check cart
3. Add Pelmet Pro order → Check cart
4. **All three orders should be in cart**

## 🔧 Troubleshooting

### Cart Still Replacing Items (When Embedded)

**Check 1**: Liquid handler present?
- Open browser console on Shopify page
- Look for: `🛒 Received ADD_TO_CART_REQUEST from calculator iframe`
- If missing, update Liquid file

**Check 2**: Source matching?
- Calculator must send: `source: 'craftons-curves-calculator'`
- Liquid must check for this source

**Check 3**: postMessage being sent?
- Open calculator in iframe, add to cart
- Console should show: `📤 Sending ADD_TO_CART_REQUEST to parent...`

### Cart Working But Wrong Price

**Check**: Quantity encoding
- Price $174 should become quantity 174
- Verify: `quantity = Math.round(totalPrice)`

### 404 Errors in Console

**Expected**: 404 is normal for direct access (Shopify `/cart/add.js` doesn't exist on Vercel)
**Action**: Only matters for embedded context

## ✅ Success Criteria

### Technical
- [ ] Zero CORS errors
- [ ] PostMessage cart works when embedded
- [ ] Permalink fallback works for direct access
- [ ] All order properties preserved

### Business
- [ ] Multiple calculators can be used in one session
- [ ] Orders accumulate correctly
- [ ] Pricing is accurate
- [ ] Customer experience is smooth

## 📝 Apps Updated

All apps now use the unified cart system:

| App | File | Status |
|-----|------|--------|
| Curves | `CurvesCustomizer.tsx` | ✅ Updated |
| Radius Pro | `RadiusProCustomizer.tsx` | ✅ Updated |
| Ripping | `RippingCustomizer.tsx` | ✅ Updated |
| Box Builder | `BoxBuilderCustomizer.tsx` | ✅ Updated |
| Stair Builder | `StairCustomizer.tsx` | ✅ Updated |
| Pelmet Pro | `PelmetProCustomizer.tsx` | ✅ Updated |
| Cut Studio | `CutStudioCustomizer.tsx` | ✅ Updated |

## 🎉 Summary

The cart system is now production-ready with:

1. **PostMessage integration** - Items accumulate when embedded in Shopify
2. **Permalink fallback** - Works for direct access (with cart replacement)
3. **Unified utility** - All apps use `submitToShopifyCart` from `@/lib/shopify-cart.ts`
4. **Complete documentation** - Updated guides reflect new system

**Deploy and update your Shopify theme to enable cart accumulation! 🚀**
