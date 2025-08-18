// Test script to check cart contents in development
// Run this in browser console on localhost:3000

fetch('/api/cart/get', {
  method: 'GET',
  credentials: 'include'
})
.then(response => response.json())
.then(data => {
  console.log('🛒 Current cart contents:', data);
  console.log('📊 Total items:', data.items?.length || 0);
  data.items?.forEach((item, index) => {
    console.log(`Item ${index + 1}:`, {
      id: item.id,
      quantity: item.quantity,
      properties: item.properties
    });
  });
})
.catch(error => console.error('❌ Error fetching cart:', error));
