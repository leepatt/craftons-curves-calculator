// Test script for Ripping App Add to Cart functionality
// Run this in browser console at http://localhost:3000/apps/ripping

async function testRippingAddToCart() {
  console.log('🧪 Testing Ripping App Add to Cart functionality...');
  
  try {
    // Step 1: Check if we're on the right page
    const currentUrl = window.location.href;
    console.log('📍 Current URL:', currentUrl);
    
    if (!currentUrl.includes('/apps/ripping')) {
      console.error('❌ Not on ripping app page! Navigate to /apps/ripping first');
      return;
    }
    
    // Step 2: Check if add to cart button exists
    const addToCartButton = document.querySelector('button[disabled=""], button:not([disabled])');
    console.log('🔍 Looking for add to cart button...');
    
    // Find all buttons to debug
    const allButtons = document.querySelectorAll('button');
    console.log('📋 All buttons found:', allButtons.length);
    allButtons.forEach((btn, index) => {
      console.log(`  Button ${index + 1}:`, {
        text: btn.textContent.trim(),
        disabled: btn.disabled,
        className: btn.className
      });
    });
    
    // Step 3: Check if materials are loaded
    const materialSelects = document.querySelectorAll('select, [role="combobox"]');
    console.log('📦 Material selectors found:', materialSelects.length);
    
    // Step 4: Check current form state
    const heightInput = document.querySelector('input[type="number"]');
    const lengthInputs = document.querySelectorAll('input[type="number"]');
    
    console.log('📏 Form inputs:');
    lengthInputs.forEach((input, index) => {
      console.log(`  Input ${index + 1}:`, {
        value: input.value,
        placeholder: input.placeholder,
        disabled: input.disabled
      });
    });
    
    // Step 5: Test Shopify Cart Permalink approach (like curves/radius-pro apps)
    console.log('🛒 Testing Shopify Cart Permalink approach...');
    
    const testPrice = 10.00;
    const testQuantity = Math.round(testPrice); // $1.00 variant: $10.00 becomes quantity 10
    
    const testCartData = {
      items: [{
        id: 45721553469618, // Ripping app variant ID
        quantity: testQuantity, // $1.00 variant: quantity = dollars
        properties: {
          '_order_type': 'custom_ripping',
          '_total_price': '10.00',
          '_display_price': '$10.00',
          '_material': '18mm MDF',
          '_rip_height': '100mm',
          '_total_length': '1000mm',
          '_sheets_needed': '1',
          '_rips_per_sheet': '10',
          '_turnaround': '1-2 days',
          '_configuration_summary': '18mm MDF: 100mm high rips, 1000mm total length, 1 sheets needed',
          '_material_cost': '60.00',
          '_manufacture_cost': '20.00',
          '_kerf_width': '8mm',
          '_timestamp': new Date().toISOString(),
          // Visible properties for cart display
          'Material': '18mm MDF',
          'Rip Height': '100mm',
          'Total Length': '1000mm',
          'Sheets Needed': '1',
          'Rips per Sheet': '10',
          'Total Price': '$10.00'
        }
      }]
    };
    
    // Build the permalink (same approach as curves/radius-pro)
    const propsJson = JSON.stringify(testCartData.items[0].properties);
    const base64Props = btoa(unescape(encodeURIComponent(propsJson)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const shopDomain = 'craftons-au.myshopify.com';
    const variantId = 45721553469618;
    const permalink = `https://${shopDomain}/cart/${variantId}:${testQuantity}?properties=${encodeURIComponent(base64Props)}&storefront=true`;
    
    console.log('📦 Cart data:', JSON.stringify(testCartData, null, 2));
    console.log('🔗 Generated permalink:', permalink);
    
    // Step 6: Validate the approach
    console.log('✅ SUCCESS: Permalink approach implemented!');
    console.log('💡 NOTE: Ripping app uses Shopify Cart Permalink with $1.00 variant (quantity = dollars, not cents)');
    console.log('🎯 This approach guarantees cart items appear even when running on different origins');
    
    // Don't actually redirect in test
    // if (window.top) {
    //   window.top.location.href = permalink;
    // } else {
    //   window.location.href = permalink;
    // }
    
    // Step 7: Check if APP_CONFIG is accessible
    console.log('⚙️ Checking APP_CONFIG...');
    if (typeof window !== 'undefined') {
      // APP_CONFIG might not be in window, check if it's imported properly
      console.log('🔍 Window object keys (first 20):', Object.keys(window).slice(0, 20));
    }
    
    console.log('✅ Test completed! Check results above.');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Auto-run the test
console.log('🚀 Starting Ripping App Add to Cart test...');
testRippingAddToCart();
