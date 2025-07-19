const assert = require('assert');

const testAddToCartProxy = async () => {
  console.log('🧪 Testing the PROXY "Price as Quantity" add-to-cart flow...');

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

  try {
    console.log(`\n📦 Testing the proxy add-to-cart with URL /api/cart/add and quantity: ${expectedQuantity}`);
    
    const response = await fetch('http://localhost:3000/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testConfiguration)
    });

    console.log(`\n📬 Received response with status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy returned an error response (raw text):', errorText);
    }

    assert.strictEqual(response.ok, true, `Shopify request failed with status ${response.status}`);
    
    const result = await response.json();
    console.log('✅ SUCCESS: Shopify accepted the request via proxy.');
    console.log('🛒 Item added to cart. Response from Shopify:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n\n🎯 Final Result: ✅ TEST PASSED');

  } catch (error) {
    console.error('❌ TEST FAILED with an error:', error.message);
    console.error(error);
    throw new Error('Add to cart proxy test failed.');
  }
};

// Run the test
testAddToCartProxy().catch(e => {
  console.error(e);
  process.exit(1);
}); 