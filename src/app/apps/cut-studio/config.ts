export const CUT_STUDIO_CONFIG = {
  app: 'cut-studio',
  displayName: 'Cut Studio',
  shopify: {
    // $1.00 variant ID for price encoding (quantity = dollars)
    dollarVariantId: Number(
      process.env.NEXT_PUBLIC_CUT_STUDIO_DOLLAR_VARIANT_ID ||
      process.env.NEXT_PUBLIC_SHOPIFY_DOLLAR_VARIANT_ID ||
      '45300623343794' // Fallback to default
    ),
    shopDomain: 
      process.env.NEXT_PUBLIC_CUT_STUDIO_SHOP_DOMAIN ||
      process.env.NEXT_PUBLIC_SHOP_DOMAIN ||
      'craftons-au.myshopify.com',
  },
};




