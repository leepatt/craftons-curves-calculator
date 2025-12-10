// RADIUS PRO MULTIPLE CART TEST
// This simulates adding multiple Radius Pro configurations to test cart accumulation
// Run this in browser console on localhost:3000/apps/radius-pro

console.log('🧪 Testing Radius Pro Multiple Cart Additions...');

// Simulate multiple configurations
const configurations = [
    {
        id: 45701356617906,
        quantity: 1,
        properties: {
            '_order_type': 'radius_pro_custom',
            '_custom_price': '150.00',
            '_parts_count': '1',
            '_configuration_summary': '1. R:800 W:80 A:90 Qty:1 form-17',
            'Part 1': 'R:800 W:80 A:90° Qty:1 form-17',
            '_test_config': 'Config A'
        }
    },
    {
        id: 45701356617906,
        quantity: 1,
        properties: {
            '_order_type': 'radius_pro_custom',
            '_custom_price': '225.00',
            '_parts_count': '1',
            '_configuration_summary': '1. R:1200 W:120 A:180 Qty:1 BC-18',
            'Part 1': 'R:1200 W:120 A:180° Qty:1 BC-18',
            '_test_config': 'Config B'
        }
    },
    {
        id: 45701356617906,
        quantity: 1,
        properties: {
            '_order_type': 'radius_pro_custom',
            '_custom_price': '89.99',
            '_parts_count': '1',
            '_configuration_summary': '1. R:600 W:50 A:45 Qty:1 mdf-16',
            'Part 1': 'R:600 W:50 A:45° Qty:1 mdf-16',
            '_test_config': 'Config C'
        }
    }
];

// Function to add configurations sequentially
async function testMultipleConfigurations() {
    console.log('🚀 Starting multiple configuration test...');
    
    // First, check initial cart state
    try {
        const initialCart = await fetch('/api/cart/get', { credentials: 'include' });
        const initialData = await initialCart.json();
        console.log(`📊 Initial cart items: ${initialData.items?.length || 0}`);
    } catch (e) {
        console.log('⚠️ Could not check initial cart state');
    }
    
    // Add each configuration
    for (let i = 0; i < configurations.length; i++) {
        const config = configurations[i];
        console.log(`\n📤 Adding configuration ${i + 1}/3: ${config.properties._test_config}`);
        
        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(config),
                credentials: 'include'
            });
            
            console.log(`📡 Response status: ${response.status}`);
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Config ${i + 1} added successfully!`);
                
                // Check cart after each addition
                const cartCheck = await fetch('/api/cart/get', { credentials: 'include' });
                const cartData = await cartCheck.json();
                const itemCount = cartData.items?.length || 0;
                
                console.log(`🛒 Cart now has ${itemCount} items`);
                
                // Verify this specific config is in cart
                const hasThisConfig = cartData.items?.some(item => 
                    item.properties?._test_config === config.properties._test_config
                );
                
                if (hasThisConfig) {
                    console.log(`✅ Config ${config.properties._test_config} confirmed in cart`);
                } else {
                    console.log(`❌ Config ${config.properties._test_config} NOT found in cart!`);
                }
                
            } else {
                const error = await response.text();
                console.log(`❌ Failed to add config ${i + 1}:`, error);
                break; // Stop if one fails
            }
            
            // Wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.log(`💥 Exception adding config ${i + 1}:`, error);
            break;
        }
    }
    
    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    try {
        const finalCart = await fetch('/api/cart/get', { credentials: 'include' });
        const finalData = await finalCart.json();
        const finalCount = finalData.items?.length || 0;
        
        console.log(`📊 Final cart item count: ${finalCount}`);
        
        if (finalCount >= 3) {
            console.log('🎉 SUCCESS! Multiple items accumulated without replacement!');
            
            // Check each config
            configurations.forEach((config, idx) => {
                const found = finalData.items?.some(item => 
                    item.properties?._test_config === config.properties._test_config
                );
                console.log(`  ${found ? '✅' : '❌'} Config ${config.properties._test_config}: ${found ? 'FOUND' : 'MISSING'}`);
            });
            
        } else {
            console.log('❌ FAILURE! Cart replacement still occurring!');
            console.log('Expected: 3+ items, Actual:', finalCount);
        }
        
        console.log('\n📋 Full cart contents:');
        finalData.items?.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.properties?._test_config || 'Unknown'} - $${item.properties?._custom_price || 'N/A'}`);
        });
        
    } catch (error) {
        console.log('💥 Final verification failed:', error);
    }
}

// Run the test
testMultipleConfigurations();

console.log(`
🧪 RADIUS PRO MULTI-CONFIG TEST

This test will:
1. Add 3 different Radius Pro configurations
2. Verify each is added without replacing previous items
3. Confirm cart accumulation is working properly

Watch the console for results...
`);







