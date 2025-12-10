# Craftons Curves Calculator

A Next.js application for calculating custom curved timber elements with 3D visualization, pricing, and Shopify integration.

## Features

- 🎯 **Advanced Curves Calculator** - Calculate internal/external radius curves with precise measurements
- 🎨 **3D Visualization** - Interactive 3D preview with dimension annotations
- 📊 **Smart Splitting** - Automatic part splitting for oversized pieces
- 💰 **Dynamic Pricing** - Real-time pricing based on materials and complexity
- 🛒 **Shopify Integration** - Direct cart integration with detailed part specifications
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Getting Started

First, install dependencies:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

This application is configured for **Vercel deployment**:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically on every push to main

The app includes:
- ✅ Optimized for Vercel's serverless functions
- ✅ Proper static asset handling
- ✅ Shopify iframe embedding support
- ✅ Custom headers for cross-origin embedding

## Technology Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Three.js** - 3D visualization and rendering
- **React Three Fiber** - React renderer for Three.js
- **Shopify API** - E-commerce integration

## Configuration

The app uses local JSON files for materials and product definitions:
- `/public/api/materials.json` - Material specifications and pricing
- `/public/api/products/curves.json` - Product parameter definitions

## Shopify Integration

Configured as a Shopify embedded app with:
- Custom product variants for pricing ($1 hack)
- **PostMessage cart integration** - items accumulate without replacing
- Detailed order specifications stored in cart properties
- Cross-origin iframe support
- Permalink fallback for direct access

### Cart System

The calculator uses a unified cart utility that:
- **When embedded in Shopify**: Uses postMessage to call `/cart/add.js` (items accumulate)
- **When accessed directly**: Falls back to permalink redirect (cart replaced)

See `SHOPIFY_EMBEDDING_GUIDE.md` for full integration details.
