const testAddToCart = async () => {
  console.log('🧪 Testing the FIXED "Price as Quantity" add-to-cart flow...');
  console.log('🎯 KEY FIX: Using relative URL /cart/add.js instead of absolute URL to avoid CORS issues!');

  const totalPrice = 173.44;
  const expectedQuantity = Math.round(totalPrice * 100);

  const testConfiguration = {
    items: [{
      id: 45300623343794,
      quantity: expectedQuantity,
      properties: {
        '_order_type': 'custom_curves',
        '_total_price': totalPrice.toFixed(2),
        '_parts_count': '1',
        '_total_turnaround': '2 days',
        '_configuration_summary': 'R:900 W:90 A:90° (Qty: 1)',
        '_materials_used': 'Formply: 1 sheet',
        '_timestamp': new Date().toISOString()
      }
    }]
  };

  let finalResult = '🟡 PENDING';

  try {
    console.log(`\n📦 Testing the FIXED add-to-cart with relative URL and quantity: ${expectedQuantity}`);
    
    // Test the new relative URL approach that actually works
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testConfiguration)
    });

    console.log(`\n📬 Received response with status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS: Shopify accepted the request.');
      console.log('🛒 Item added to cart. Response from Shopify:');
      console.log(JSON.stringify(result, null, 2));
      finalResult = '✅ TEST PASSED';
    } else {
      const errorText = await response.text();
      console.error('❌ FAILURE: Shopify rejected the request.');
      console.error('📝 Error details from Shopify:', errorText);
      finalResult = '❌ TEST FAILED';
    }

  } catch (error) {
    console.error('❌ TEST FAILED with a network or application error:', error.message);
    finalResult = '❌ TEST FAILED';
  } finally {
    // Adding a small delay to ensure all logs are flushed before exiting.
    setTimeout(() => {
      console.log(`\n\n🎯 Final Result: ${finalResult}`);
    }, 500);
  }
};

// Run the test
testAddToCart(); 