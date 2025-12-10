// PRODUCTION CART TEST
// This tests the actual Shopify cart API directly 
// Run this in your browser console on craftons-au.myshopify.com

console.log('🧪 Testing Production Cart API...');

// Test item data
const testCartItem = {
    id: 45701356617906,
    quantity: 1,
    properties: {
        '_order_type': 'production_test',
        '_custom_price': '199.99',
        '_test_time': new Date().toISOString(),
        'Production Test': 'Testing real Shopify cart API'
    }
};

// Function to test cart API
async function testProductionCart() {
    try {
        console.log('📤 Adding item to production cart...');
        
        const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(testCartItem),
            credentials: 'include'
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCCESS! Item added to production cart:', result);
            
            // Now check cart contents
            const cartResponse = await fetch('/cart.js', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            
            if (cartResponse.ok) {
                const cart = await cartResponse.json();
                console.log('🛒 Current cart contents:', cart);
                console.log(`📊 Total items: ${cart.items.length}`);
                
                const testItem = cart.items.find(item => 
                    item.properties && item.properties._order_type === 'production_test'
                );
                
                if (testItem) {
                    console.log('🎉 TEST PASSED! Item found in cart with properties:', testItem.properties);
                } else {
                    console.log('❌ TEST FAILED! Item not found in cart');
                }
            }
            
        } else {
            const error = await response.text();
            console.log('❌ FAILED! Error:', error);
            
            if (response.status === 422) {
                console.log('💡 This likely means the variant ID is wrong or product is not available');
            }
        }
        
    } catch (error) {
        console.log('💥 Exception occurred:', error);
        
        if (error.message.includes('CORS')) {
            console.log('💡 CORS error means you need to run this on the actual Shopify domain');
        }
    }
}

// Run the test
testProductionCart();

console.log(`
🧪 PRODUCTION CART TEST INSTRUCTIONS:

1. Open your browser to: https://craftons-au.myshopify.com
2. Open developer console (F12)
3. Paste this entire script and run it
4. Check the console output for results

Expected Results:
✅ Response status: 200
✅ Item added to production cart
✅ Test item found in cart with properties
`);







