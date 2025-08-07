// Simple test - run this in browser console at http://localhost:3000/apps/ripping
// This tests the core logic

console.log('🧪 Simple Ripping App Test');

// Test calculation requirements:
console.log('📋 To enable "Add to Cart", you need:');
console.log('1. ✅ Height > 0 (e.g., 100mm)');
console.log('2. ✅ Height <= sheet height (1200mm for most materials)');
console.log('3. ✅ Total length > 0 (e.g., 1000mm)');
console.log('4. ✅ Must result in sheetsNeeded > 0');

console.log('\n🎯 Try these test values:');
console.log('- Material: Any (default should work)');
console.log('- Rip Height: 100mm');
console.log('- Total Length: 1000mm');
console.log('- Unit: mm');

console.log('\n❌ Button will be DISABLED if:');
console.log('- Height is 0 or empty');
console.log('- Total length is 0 or empty');
console.log('- Height is > 1200mm (too big for sheet)');
console.log('- No rips can fit on the sheet');

console.log('\n🔍 Current form values:');
try {
  const inputs = document.querySelectorAll('input[type="number"]');
  inputs.forEach((input, i) => {
    console.log(`Input ${i + 1}: ${input.placeholder || 'Unknown'} = "${input.value}"`);
  });
  
  const button = document.querySelector('button');
  console.log(`Add to Cart button exists: ${!!button}`);
  if (button) {
    console.log(`Button disabled: ${button.disabled}`);
    console.log(`Button text: "${button.textContent.trim()}"`);
  }
} catch (e) {
  console.log('Could not analyze form:', e.message);
}

console.log('\n✅ Manual test: Fill in height=100, length=1000, then check if button enables');
