// src/app/apps/ripping/config.ts
// Configuration specific to the Ripping Calculator

export const rippingConfig = {
  product: {
    id: "ripping",
    name: "Sheet Ripping Calculator",
    description: "Calculate costs for ripping down full sheets.",
  },
  // Shopify $1.00 variant used for whole-dollar rounding (inc GST)
  // Supports multiple environment variable names for flexibility
  shopifyDollarVariantId: Number(
    process.env.NEXT_PUBLIC_RIPPING_DOLLAR_VARIANT_ID ||
    process.env.NEXT_PUBLIC_DOLLAR_VARIANT_ID ||
    process.env.RIPPING_DOLLAR_VARIANT_ID ||
    45721553469618  // Default fallback variant ID
  ),
  
  // Shop domain configuration (supports multiple env var names)
  shopDomain: 
    process.env.NEXT_PUBLIC_RIPPING_SHOP_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOP_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN ||
    process.env.SHOPIFY_STORE_DOMAIN ||
    'craftons-au.myshopify.com', // Default fallback
};
