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
    
    // Step 5: Test cart API directly
    console.log('🛒 Testing cart API directly...');
    
    const testCartData = {
      items: [{
        id: 45721553469618, // Ripping app variant ID
        quantity: 1000, // $10.00 worth
        properties: {
          '_order_type': 'custom_ripping_test',
          '_total_price': '10.00',
          '_material': 'Test Material',
          '_rip_height': '100mm',
          '_total_length': '1000mm',
          '_sheets_needed': '1',
          '_rips_per_sheet': '10',
          '_turnaround': '1-2 days',
          '_configuration_summary': 'Test ripping: 100mm high rips, 1000mm total length, 1 sheets needed'
        }
      }]
    };
    
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCartData),
    });
    
    console.log('📬 Cart API Response Status:', response.status);
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Cart API Success!', responseData);
      
      // Step 6: Test redirect functionality
      console.log('🔗 Testing redirect...');
      const cartUrl = 'https://craftons-au.myshopify.com/cart';
      console.log('Would redirect to:', cartUrl);
      
      // Don't actually redirect in test
      // window.open(cartUrl, '_blank');
      
    } else {
      const errorData = await response.json();
      console.error('❌ Cart API Failed:', errorData);
    }
    
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
