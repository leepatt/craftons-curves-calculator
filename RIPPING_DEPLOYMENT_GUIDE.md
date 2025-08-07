# Ripping Calculator Deployment Guide

This guide explains how to deploy the Craftons Ripping Calculator to Shopify product pages.

## 📋 Prerequisites

- ✅ Shopify store with theme customization access
- ✅ Calculator deployed to: `https://craftons-curves-calculator.vercel.app`
- ✅ 1-cent hack product created in Shopify (Variant ID: `45721553469618`)

## 🛠️ Step 1: Create Custom Section

### 1.1 Access Theme Code
1. Go to **Online Store** → **Themes**
2. Click **Actions** → **Edit code** on your current theme
3. In the **Sections** folder, click **Add a new section**
4. Name it: `ripping-calculator.liquid`

### 1.2 Add Section Code
Copy the entire contents of `ripping-calculator.liquid` from the project root into your new Shopify section.

## 🎨 Step 2: Add to Product Template

### For JSON templates (Shopify 2.0):
```json
{
  "type": "ripping-calculator",
  "settings": {
    "title": "Custom Sheet Ripping Calculator",
    "show_title": true,
    "show_description": true,
    "description": "<p>Calculate costs for ripping down full sheets into custom strips with real-time visualization and instant pricing.</p>"
  }
}
```

### For Liquid templates:
```liquid
{% section 'ripping-calculator' %}
```

## 🛒 Step 3: Product Setup

### 3.1 Verify the 1-Cent Product
- Ensure you have the product with variant ID: `45721553469618`
- If not, create a new product:
  1. Go to **Products** → **Add product**
  2. Set title: "Custom Manufacturing Services"
  3. Set price: **$0.01**
  4. Create variant with ID: `45721553469618`
  5. Set inventory tracking: **Don't track quantity**
  6. Save the product

## ⚙️ Step 4: App URLs

The ripping calculator is accessible at:
- **Direct URL**: `https://craftons-curves-calculator.vercel.app/apps/ripping`
- **Embedded URL**: Same as above (iframe will adjust automatically)

## 🏗️ Step 5: Material Configuration

The ripping calculator includes these materials:
- 4mm Bendy Ply Film Faced - $60.00
- 9mm Bendy Ply Film Faced - $80.00
- 17mm Formply - $90.00
- 18mm BC Structural Plywood - $120.00
- 18mm MDF - $60.00

Materials are configured in: `src/app/apps/ripping/materials.json`

## 💰 Step 6: Pricing Structure

The app uses this pricing:
- **Material Cost**: Number of sheets × material price per sheet
- **Manufacturing Cost**: 
  - First rip: $20
  - Additional rips: $10 each
- **Total Cost**: Material cost + Manufacturing cost

## 📱 Step 7: Testing

### 7.1 Test Embedding
1. Visit your product page where you added the section
2. Verify calculator loads at `/apps/ripping`
3. Test responsiveness on mobile

### 7.2 Test Functionality
1. Select a material (should show correct texture)
2. Enter rip height and total length
3. Verify calculations are correct
4. Test "Add to Cart" functionality

### 7.3 Test Cart Integration
1. Configure a ripping job
2. Click "Add to Cart"
3. Verify item appears in cart with:
   - Correct total price
   - Material details
   - Rip specifications
   - Sheet requirements

## 🎯 Key Differences from Curves Calculator

1. **URL Path**: `/apps/ripping` instead of root
2. **Materials**: Different set of materials with thickness values
3. **Pricing**: Linear pricing model (not efficiency-based)
4. **Visualization**: Sheet ripping visualization instead of 3D curves
5. **Section Name**: `ripping-calculator.liquid` 

## 🔧 Customization

The section includes these customizable settings:
- Title and description text
- Border styling
- Spacing and margins
- Optional note section
- Text alignment options

## 📞 Support

For technical issues or customization requests, contact the development team.

---

*This calculator is part of the Craftons modular app ecosystem.*
