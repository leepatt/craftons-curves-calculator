# Shopify Product Page Embedding Guide

This guide explains how to embed the Craftons Curves Calculator directly into your Shopify product page using a custom section.

## Overview

The calculator is configured as a **private custom app** that embeds directly into your product pages via iframe. No App Store submission required.

## 📋 Prerequisites

- ✅ Shopify store with theme customization access
- ✅ Calculator deployed to: `https://craftons-curves-calculator.vercel.app`
- ✅ $1 product created in Shopify (Variant ID: `45300623343794`)

## 🛒 Cart Integration System

The calculator uses a **postMessage-based cart system** that allows multiple items to be added to the cart WITHOUT replacing existing items.

### How It Works:

```
┌─────────────────────────────────────────────────────────────────┐
│  When EMBEDDED in Shopify (iframe):                             │
│                                                                 │
│  1. Calculator detects it's in an iframe                        │
│  2. Sends ADD_TO_CART_REQUEST via postMessage to parent         │
│  3. Shopify page (Liquid) receives message                      │
│  4. Liquid calls /cart/add.js (same-origin = works!)            │
│  5. Items ADDED to cart WITHOUT replacing ✅                    │
│  6. Redirects to /cart                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  When NOT embedded (direct access):                             │
│                                                                 │
│  1. Calculator detects it's not in an iframe                    │
│  2. Falls back to permalink method                              │
│  3. Redirects to /cart/{variant}:{qty}?properties=...           │
│  4. Cart is REPLACED (Shopify limitation)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Pricing System ($1 Hack):

The calculator encodes the price as quantity:
- **$174.00 order** → quantity = 174 × $1 variant
- All order details stored in cart line item properties

## 🛠️ Step 1: Create Custom Section

### 1.1 Access Theme Code
1. Go to **Online Store** → **Themes**
2. Click **Actions** → **Edit code** on your current theme
3. In the **Sections** folder, click **Add a new section**
4. Name it: `curves-calculator.liquid`

### 1.2 Add Section Code (IMPORTANT: Use CORRECTED_FULL_SECTION.liquid)

Copy the contents of `CORRECTED_FULL_SECTION.liquid` from your project. This file includes:

1. **Iframe embedding** with dynamic height adjustment
2. **Product context communication** (sends material info to calculator)
3. **🛒 ADD_TO_CART_REQUEST handler** (the key feature!)

The critical cart handler in the Liquid file:

```javascript
// 🛒 Handle ADD TO CART requests from calculator iframe
if (event.data && 
    event.data.type === 'ADD_TO_CART_REQUEST' && 
    event.data.source === 'craftons-curves-calculator') {
  
  handleAddToCart(event.data.cartData, event.source, event.origin);
}

// Add to cart via Shopify's /cart/add.js (same-origin, so it works!)
async function handleAddToCart(cartData, eventSource, eventOrigin) {
  const response = await fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: cartData.variantId,
      quantity: cartData.quantity,
      properties: cartData.properties
    }),
    credentials: 'same-origin'
  });
  // ... sends response back to iframe
}
```

## 🎨 Step 2: Add to Product Template

### For JSON templates (Shopify 2.0):
```json
{
  "type": "curves-calculator",
  "settings": {
    "title": "Configure Your Custom Curves",
    "show_title": false,
    "show_description": false,
    "height": 800,
    "mobile_height": 600
  }
}
```

### For Liquid templates:
```liquid
{% section 'curves-calculator' %}
```

## 🛒 Step 3: Product Setup

### 3.1 Create the $1 Product
1. Go to **Products** → **Add product**
2. Set title: "Custom Calculator Item"
3. Set price: **$1.00**
4. Create variant with ID: `45300623343794`
5. Set inventory tracking: **Don't track quantity**
6. Save the product

### 3.2 Configure Product Visibility
- Set to **Hidden** (not visible in catalog)
- Only accessible via the calculator's checkout process

## ⚙️ Step 4: Configuration Settings

Your app is already configured with:

### ✅ Shopify Settings
- **Store**: `craftons-au.myshopify.com`
- **Variant ID**: `45300623343794`

### ✅ Cart Integration
- **PostMessage method**: Adds to cart without replacing (when embedded)
- **Permalink fallback**: For direct access (replaces cart)
- **$1 hack**: Price encoded as quantity

### ✅ Security Headers
- **X-Frame-Options**: `ALLOWALL`
- **CSP**: Allows embedding from Shopify domains
- **CORS**: Configured for cross-origin requests

## 📱 Step 5: Testing

### 5.1 Test Cart Accumulation
1. Add item from Curves calculator
2. Add item from Ripping calculator (or another app)
3. Check cart - **BOTH items should be there**
4. ✅ If both items appear → postMessage cart works!

### 5.2 Test Checkout
1. Configure a curve in calculator
2. Click "Add to Cart"
3. Verify cart shows correct pricing ($1 × quantity)
4. Complete checkout

## 🔧 Troubleshooting

### Calculator Not Loading
- Check iframe src URL is correct
- Verify CORS headers are working
- Test direct URL access

### Cart Replacing Items (Not Accumulating)
- **Check Liquid file**: Ensure `ADD_TO_CART_REQUEST` handler is present
- **Check console**: Look for postMessage logs
- **Fallback behavior**: Direct access always replaces (Shopify limitation)

### Checkout Issues
- Confirm variant ID `45300623343794` exists
- Check product is set to $1.00
- Verify $1 product isn't deleted

## 📞 Support

The calculator is now ready for production use on your Shopify store! The embedding is optimized for:

- ✅ Fast loading via iframe
- ✅ Mobile responsiveness  
- ✅ Secure cross-origin embedding
- ✅ **Cart accumulation** (multiple items, no replacement)
- ✅ Custom styling options

Your private custom app is fully configured and ready to serve customers directly from your product pages.
