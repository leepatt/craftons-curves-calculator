# Shopify Product Page Embedding Guide

This guide explains how to embed the Craftons Curves Calculator directly into your Shopify product page using a custom section.

## Overview

The calculator is configured as a **private custom app** that embeds directly into your product pages via iframe. No App Store submission required.

## 📋 Prerequisites

- ✅ Shopify store with theme customization access
- ✅ Calculator deployed to: `https://craftons-curves-calculator.vercel.app`
- ✅ 1-cent hack product created in Shopify (Variant ID: `45300623343794`)

## 🛠️ Step 1: Create Custom Section

### 1.1 Access Theme Code
1. Go to **Online Store** → **Themes**
2. Click **Actions** → **Edit code** on your current theme
3. In the **Sections** folder, click **Add a new section**
4. Name it: `curves-calculator.liquid`

### 1.2 Add Section Code

```liquid
{% comment %}
  Craftons Curves Calculator Custom Section
  Embeds the calculator directly into product pages
{% endcomment %}

<div class="curves-calculator-section" style="margin: {{ section.settings.margin_top }}px 0 {{ section.settings.margin_bottom }}px;">
  {% if section.settings.show_title %}
    <h2 class="curves-calculator-title" style="text-align: {{ section.settings.title_alignment }}; margin-bottom: 20px;">
      {{ section.settings.title }}
    </h2>
  {% endif %}
  
  {% if section.settings.show_description %}
    <div class="curves-calculator-description" style="text-align: {{ section.settings.description_alignment }}; margin-bottom: 20px;">
      {{ section.settings.description }}
    </div>
  {% endif %}

  <div class="curves-calculator-container" style="position: relative; width: 100%; height: {{ section.settings.height }}px; border: {{ section.settings.border_width }}px solid {{ section.settings.border_color }}; border-radius: {{ section.settings.border_radius }}px; overflow: hidden;">
    <iframe 
      src="https://craftons-curves-calculator.vercel.app"
      style="width: 100%; height: 100%; border: none; display: block;"
      frameborder="0"
      allowfullscreen
      loading="lazy"
      title="Craftons Curves Calculator">
    </iframe>
  </div>
  
  {% if section.settings.show_note %}
    <div class="curves-calculator-note" style="margin-top: 15px; font-size: 0.9em; color: #666; text-align: {{ section.settings.note_alignment }};">
      {{ section.settings.note }}
    </div>
  {% endif %}
</div>

<style>
  .curves-calculator-section {
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
  
  .curves-calculator-container {
    background: #f9f9f9;
  }
  
  @media (max-width: 768px) {
    .curves-calculator-container {
      height: {{ section.settings.mobile_height }}px !important;
    }
  }
</style>

{% schema %}
{
  "name": "Curves Calculator",
  "tag": "section",
  "class": "curves-calculator-section",
  "settings": [
    {
      "type": "header",
      "content": "Title Settings"
    },
    {
      "type": "checkbox",
      "id": "show_title",
      "label": "Show title",
      "default": true
    },
    {
      "type": "text",
      "id": "title",
      "label": "Title",
      "default": "Custom Curves Calculator"
    },
    {
      "type": "select",
      "id": "title_alignment",
      "label": "Title alignment",
      "options": [
        { "value": "left", "label": "Left" },
        { "value": "center", "label": "Center" },
        { "value": "right", "label": "Right" }
      ],
      "default": "center"
    },
    {
      "type": "header",
      "content": "Description Settings"
    },
    {
      "type": "checkbox",
      "id": "show_description",
      "label": "Show description",
      "default": true
    },
    {
      "type": "richtext",
      "id": "description",
      "label": "Description",
      "default": "<p>Calculate custom curved timber elements with real-time 3D visualization and instant pricing.</p>"
    },
    {
      "type": "select",
      "id": "description_alignment",
      "label": "Description alignment",
      "options": [
        { "value": "left", "label": "Left" },
        { "value": "center", "label": "Center" },
        { "value": "right", "label": "Right" }
      ],
      "default": "center"
    },
    {
      "type": "header",
      "content": "Calculator Settings"
    },
    {
      "type": "range",
      "id": "height",
      "label": "Desktop height (px)",
      "min": 400,
      "max": 1200,
      "step": 50,
      "default": 800
    },
    {
      "type": "range",
      "id": "mobile_height",
      "label": "Mobile height (px)",
      "min": 300,
      "max": 800,
      "step": 50,
      "default": 600
    },
    {
      "type": "header",
      "content": "Styling"
    },
    {
      "type": "range",
      "id": "border_width",
      "label": "Border width (px)",
      "min": 0,
      "max": 5,
      "step": 1,
      "default": 1
    },
    {
      "type": "color",
      "id": "border_color",
      "label": "Border color",
      "default": "#e0e0e0"
    },
    {
      "type": "range",
      "id": "border_radius",
      "label": "Border radius (px)",
      "min": 0,
      "max": 20,
      "step": 2,
      "default": 8
    },
    {
      "type": "header",
      "content": "Spacing"
    },
    {
      "type": "range",
      "id": "margin_top",
      "label": "Top margin (px)",
      "min": 0,
      "max": 100,
      "step": 5,
      "default": 20
    },
    {
      "type": "range",
      "id": "margin_bottom",
      "label": "Bottom margin (px)",
      "min": 0,
      "max": 100,
      "step": 5,
      "default": 20
    },
    {
      "type": "header",
      "content": "Footer Note"
    },
    {
      "type": "checkbox",
      "id": "show_note",
      "label": "Show footer note",
      "default": true
    },
    {
      "type": "text",
      "id": "note",
      "label": "Footer note",
      "default": "All prices include GST. Click 'Checkout' to add to cart with calculated pricing."
    },
    {
      "type": "select",
      "id": "note_alignment",
      "label": "Note alignment",
      "options": [
        { "value": "left", "label": "Left" },
        { "value": "center", "label": "Center" },
        { "value": "right", "label": "Right" }
      ],
      "default": "center"
    }
  ],
  "presets": [
    {
      "name": "Curves Calculator",
      "settings": {
        "title": "Custom Curves Calculator",
        "show_title": true,
        "show_description": true,
        "height": 800,
        "mobile_height": 600
      }
    }
  ]
}
{% endschema %}
```

## 🎨 Step 2: Add to Product Template

### 2.1 Edit Product Template
1. In **Templates**, find your product template (usually `product.liquid` or `product.json`)
2. Add the calculator section where you want it to appear

### For JSON templates (Shopify 2.0):
```json
{
  "type": "curves-calculator",
  "settings": {
    "title": "Configure Your Custom Curves",
    "show_title": true,
    "show_description": true,
    "description": "<p>Use our calculator to design and price your custom curved timber elements.</p>",
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

### 3.1 Create the 1-Cent Product
1. Go to **Products** → **Add product**
2. Set title: "Custom Curves Calculator"
3. Set price: **$0.01**
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
- **Embedded**: `false` (direct iframe embedding)
- **Scopes**: None required (private app)

### ✅ Security Headers
- **X-Frame-Options**: `ALLOWALL`
- **CSP**: Allows embedding from Shopify domains
- **CORS**: Configured for cross-origin requests

### ✅ Checkout Flow
- Uses 1-cent hack for custom pricing
- **Smart Cart Integration**: Automatically detects and triggers cart drawers
- Falls back to cart page redirect if drawer unavailable
- Includes detailed order information

## 📱 Step 5: Testing

### 5.1 Test Embedding
1. Visit your product page
2. Verify calculator loads in iframe
3. Test responsiveness on mobile

### 5.2 Test Checkout
1. Configure a curve in calculator
2. Click "Add to Cart"
3. Verify cart drawer opens or cart page loads with correct pricing

## 🛒 Cart Drawer Compatibility

### ✅ Supported Cart Drawer Events
The calculator automatically detects and triggers common cart drawer events:
- `cart:open`
- `cart-drawer:open`
- `drawer:open`
- `cartDrawer:open`
- `theme:cart:open`
- `cart:toggle`
- `cart:refresh`

### ✅ Supported Cart Drawer Functions
Also attempts to call common cart drawer functions:
- `openCartDrawer()`
- `toggleCartDrawer()`
- `showCartDrawer()`
- `CartDrawer.open()`
- `theme.CartDrawer.open()`

### 🔧 Theme Compatibility
**Works with popular Shopify themes:**
- Dawn (Shopify's default theme)
- Debut, Brooklyn, Narrative
- Most themes with ajax cart functionality
- Custom themes with cart drawer implementations

### 🔄 Fallback Behavior
If cart drawer events fail:
1. **Iframe context**: Redirects parent window to `/cart`
2. **Cross-origin restrictions**: Opens cart in new window
3. **Direct access**: Normal cart page redirect
4. Confirm order details are included

## 🚀 Step 6: Customization Options

### Section Settings Available:
- **Title & Description**: Customizable text and alignment
- **Height**: Desktop and mobile heights
- **Styling**: Border, colors, radius
- **Spacing**: Margins and padding
- **Footer Notes**: Additional information

### Advanced Customizations:
- Add custom CSS in theme's `assets/theme.css`
- Modify section schema for additional options
- Create multiple calculator sections for different products

## 🔧 Troubleshooting

### Calculator Not Loading
- Check iframe src URL is correct
- Verify CORS headers are working
- Test direct URL access

### Checkout Issues
- Confirm variant ID `45300623343794` exists
- Check product is set to $0.01
- Verify 1-cent product isn't deleted

### Mobile Display Problems
- Adjust `mobile_height` setting
- Test on various devices
- Consider responsive breakpoints

## 📞 Support

The calculator is now ready for production use on your Shopify store! The embedding is optimized for:

- ✅ Fast loading via iframe
- ✅ Mobile responsiveness  
- ✅ Secure cross-origin embedding
- ✅ Seamless checkout integration
- ✅ Custom styling options

Your private custom app is fully configured and ready to serve customers directly from your product pages. 