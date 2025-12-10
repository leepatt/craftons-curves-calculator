/**
 * Shopify Cart Utility
 * 
 * This module provides a unified way to add items to the Shopify cart from
 * calculator apps, whether they're embedded in Shopify via iframe or accessed directly.
 * 
 * When embedded in Shopify:
 *   - Uses postMessage to communicate with the parent Shopify page
 *   - The parent page calls /cart/add.js (same-origin, so it works!)
 *   - Items are ADDED to cart without replacing existing items
 * 
 * When accessed directly (not embedded):
 *   - Falls back to permalink method
 *   - Note: This REPLACES the cart (Shopify limitation)
 * 
 * Usage:
 *   import { submitToShopifyCart } from '@/app/lib/shopify-cart';
 *   
 *   await submitToShopifyCart({
 *     variantId: 45300623343794,
 *     quantity: 174, // $174 using the $1 hack
 *     properties: {
 *       '_order_type': 'custom_curves',
 *       '_total_price': '174.00',
 *       // ... other properties
 *     },
 *     shopDomain: 'craftons-au.myshopify.com'
 *   });
 */

export interface CartItemData {
  variantId: number;
  quantity: number;
  properties: Record<string, string>;
  shopDomain?: string;
  redirectToCart?: boolean;
}

export interface CartResponse {
  success: boolean;
  method: 'postMessage' | 'permalink';
  error?: string;
  item?: any;
}

// Default shop domain
const DEFAULT_SHOP_DOMAIN = 'craftons-au.myshopify.com';

// Timeout for postMessage response (ms)
const POST_MESSAGE_TIMEOUT = 10000;

/**
 * Check if we're embedded in a Shopify store (in an iframe)
 */
export function isEmbeddedInShopify(): boolean {
  try {
    // Check if we're in an iframe
    const inIframe = window.self !== window.top;
    
    if (!inIframe) {
      console.log('🔍 Not in iframe - using permalink fallback');
      return false;
    }
    
    // Check if parent appears to be a Shopify store
    // We can't access parent.location directly due to cross-origin, but we can check referrer
    const referrer = document.referrer;
    const isShopifyReferrer = referrer.includes('myshopify.com') || 
                              referrer.includes('craftons.com.au') ||
                              referrer.includes('.myshopify.com');
    
    console.log('🔍 In iframe, referrer:', referrer, 'isShopify:', isShopifyReferrer);
    
    return inIframe; // Assume embedded if in iframe (postMessage will fail gracefully if not)
  } catch (e) {
    console.log('🔍 Error checking iframe status:', e);
    return false;
  }
}

/**
 * Add item to cart via postMessage to parent Shopify page
 * This method ADDS to cart without replacing existing items
 */
async function addViaPostMessage(cartData: CartItemData): Promise<CartResponse> {
  return new Promise((resolve) => {
    console.log('📤 Sending ADD_TO_CART_REQUEST to parent...');
    
    // Set up response listener
    const responseHandler = (event: MessageEvent) => {
      if (event.data && 
          event.data.type === 'ADD_TO_CART_RESPONSE' && 
          event.data.source === 'shopify-parent') {
        
        // Clean up listener
        window.removeEventListener('message', responseHandler);
        clearTimeout(timeoutId);
        
        console.log('📥 Received ADD_TO_CART_RESPONSE:', event.data);
        
        if (event.data.success) {
          resolve({
            success: true,
            method: 'postMessage',
            item: event.data.item
          });
        } else {
          resolve({
            success: false,
            method: 'postMessage',
            error: event.data.error || 'Unknown error from parent'
          });
        }
      }
    };
    
    window.addEventListener('message', responseHandler);
    
    // Set up timeout - if no response, fall back to permalink
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', responseHandler);
      console.log('⏱️ PostMessage timeout - parent may not support cart messages');
      resolve({
        success: false,
        method: 'postMessage',
        error: 'Timeout waiting for parent response'
      });
    }, POST_MESSAGE_TIMEOUT);
    
    // Send the message to parent
    try {
      const message = {
        type: 'ADD_TO_CART_REQUEST',
        source: 'craftons-curves-calculator',
        cartData: {
          variantId: cartData.variantId,
          quantity: cartData.quantity,
          properties: cartData.properties,
          redirectToCart: cartData.redirectToCart !== false
        }
      };
      
      window.parent.postMessage(message, '*');
      console.log('📤 PostMessage sent:', message);
      
    } catch (error) {
      window.removeEventListener('message', responseHandler);
      clearTimeout(timeoutId);
      console.error('❌ Error sending postMessage:', error);
      resolve({
        success: false,
        method: 'postMessage',
        error: 'Failed to send postMessage to parent'
      });
    }
  });
}

/**
 * Add item to cart via permalink (fallback method)
 * Note: This REPLACES the cart (Shopify limitation with permalinks)
 */
function addViaPermalink(cartData: CartItemData): void {
  console.log('🔗 Using permalink fallback (will redirect)...');
  
  const shopDomain = cartData.shopDomain || DEFAULT_SHOP_DOMAIN;
  
  // Base64-URL encode the properties
  const propsJson = JSON.stringify(cartData.properties);
  const base64Props = btoa(unescape(encodeURIComponent(propsJson)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Build the permalink URL
  const permalink = `https://${shopDomain}/cart/${cartData.variantId}:${cartData.quantity}?properties=${encodeURIComponent(base64Props)}&storefront=true`;
  
  console.log('🚀 Redirecting to:', permalink);
  
  // Redirect (target parent if in iframe, otherwise current window)
  if (window.top && window.top !== window.self) {
    window.top.location.href = permalink;
  } else {
    window.location.href = permalink;
  }
}

/**
 * Main function to submit item to Shopify cart
 * 
 * Automatically chooses the best method:
 * 1. If embedded in Shopify → uses postMessage (adds to cart)
 * 2. If not embedded → uses permalink (replaces cart)
 * 
 * @param cartData - The cart item data to submit
 * @returns Promise with the result (only resolves for postMessage method)
 */
export async function submitToShopifyCart(cartData: CartItemData): Promise<CartResponse> {
  console.log('🛒 submitToShopifyCart called with:', {
    variantId: cartData.variantId,
    quantity: cartData.quantity,
    propertiesCount: Object.keys(cartData.properties).length
  });
  
  // Check if embedded in Shopify
  const embedded = isEmbeddedInShopify();
  
  if (embedded) {
    // Try postMessage first
    const result = await addViaPostMessage(cartData);
    
    if (result.success) {
      console.log('✅ Successfully added to cart via postMessage');
      return result;
    }
    
    // If postMessage failed, fall back to permalink
    console.log('⚠️ PostMessage failed, falling back to permalink...');
    console.log('⚠️ Note: Permalink will REPLACE cart contents');
  }
  
  // Use permalink (either not embedded, or postMessage failed)
  addViaPermalink(cartData);
  
  // Permalink redirects, so we return a "pending" response
  return {
    success: true,
    method: 'permalink',
  };
}

/**
 * Helper to build properties object from part configurations
 * Used by curves, radius-pro, and other calculator apps
 */
export function buildCartProperties(config: {
  orderType: string;
  totalPrice: number;
  partsCount: number;
  turnaround?: string;
  configurationSummary: string;
  additionalProperties?: Record<string, string>;
}): Record<string, string> {
  const props: Record<string, string> = {
    '_order_type': config.orderType,
    '_total_price': config.totalPrice.toFixed(2),
    '_parts_count': config.partsCount.toString(),
    '_total_turnaround': config.turnaround || 'TBD',
    '_configuration_summary': config.configurationSummary,
    '_timestamp': new Date().toISOString(),
    ...config.additionalProperties
  };
  
  return props;
}
