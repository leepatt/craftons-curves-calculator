#!/usr/bin/env node

// Test script for automatic material selection functionality
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Automatic Material Selection for Craftons Curves Calculator\n');

// Function to check if server is running
function isServerRunning(port = 3000) {
  try {
    execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}`, { 
      stdio: 'pipe',
      timeout: 5000 
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to check if files exist
function checkFiles() {
  console.log('📁 Checking required files...');
  
  const requiredFiles = [
    'CORRECTED_FULL_SECTION.liquid',
    'public/communication-test.html',
    'public/test-product-pages/formply.html',
    'public/test-product-pages/mdf.html',
    'public/test-product-pages/plywood.html',
    'src/app/components/curves/CurvesCustomizer.tsx'
  ];
  
  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    console.error('❌ Missing files:', missing);
    return false;
  }
  
  console.log('✅ All required files present');
  return true;
}

// Function to verify material mappings
function verifyMaterialMappings() {
  console.log('🔍 Verifying material mappings...');
  
  const liquidContent = fs.readFileSync('CORRECTED_FULL_SECTION.liquid', 'utf8');
  const mappings = {
    'craftons-radius-pro-formply': 'form-17',
    'craftons-radius-pro-mdf': 'mdf-18',
    'craftons-radius-pro-plywood': 'CD-19'
  };
  
  let allMappingsCorrect = true;
  
  for (const [handle, expectedMaterial] of Object.entries(mappings)) {
    const regex = new RegExp(`when '${handle}'[\\s\\S]*?"${expectedMaterial}"`);
    if (!regex.test(liquidContent)) {
      console.error(`❌ Incorrect mapping for ${handle}, expected ${expectedMaterial}`);
      allMappingsCorrect = false;
    } else {
      console.log(`✅ ${handle} → ${expectedMaterial}`);
    }
  }
  
  return allMappingsCorrect;
}

// Function to check materials.json
function verifyMaterials() {
  console.log('📋 Verifying materials.json...');
  
  try {
    const materials = JSON.parse(fs.readFileSync('public/api/materials.json', 'utf8'));
    const expectedMaterials = ['form-17', 'mdf-18', 'CD-19'];
    
    const foundMaterials = materials.map(m => m.id);
    const missingMaterials = expectedMaterials.filter(id => !foundMaterials.includes(id));
    
    if (missingMaterials.length > 0) {
      console.error('❌ Missing materials:', missingMaterials);
      return false;
    }
    
    materials.forEach(material => {
      console.log(`✅ ${material.id}: ${material.name} (${material.thickness_mm}mm)`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error reading materials.json:', error.message);
    return false;
  }
}

// Function to run tests
async function runTests() {
  console.log('🚀 Starting automatic material selection tests...\n');
  
  // Check files
  if (!checkFiles()) {
    process.exit(1);
  }
  
  // Verify material mappings
  if (!verifyMaterialMappings()) {
    console.error('\n❌ Material mapping verification failed');
    process.exit(1);
  }
  
  // Verify materials
  if (!verifyMaterials()) {
    console.error('\n❌ Materials verification failed');
    process.exit(1);
  }
  
  // Check if dev server is running
  console.log('\n🌐 Checking development server...');
  if (!isServerRunning()) {
    console.log('⚠️ Development server not running. Start it with: npm run dev');
    console.log('💡 You can then test the automatic material selection at:');
    console.log('   • http://localhost:3000 (main calculator)');
    console.log('   • http://localhost:3000/communication-test.html (debugging)');
    console.log('   • http://localhost:3000/test-product-pages/formply.html');
    console.log('   • http://localhost:3000/test-product-pages/mdf.html');
    console.log('   • http://localhost:3000/test-product-pages/plywood.html');
  } else {
    console.log('✅ Development server is running');
    console.log('\n🧪 Test URLs available:');
    console.log('   • http://localhost:3000/communication-test.html (debugging)');
    console.log('   • http://localhost:3000/test-product-pages/formply.html (should auto-select Formply)');
    console.log('   • http://localhost:3000/test-product-pages/mdf.html (should auto-select MDF)');
    console.log('   • http://localhost:3000/test-product-pages/plywood.html (should auto-select CD Plywood)');
  }
  
  console.log('\n✅ All checks passed! Material selection should now work correctly.');
  console.log('\n📝 To test manually:');
  console.log('1. Open one of the test URLs above');
  console.log('2. Check browser console for communication logs');
  console.log('3. Verify the correct material is auto-selected in the dropdown');
  console.log('4. Deploy the updated CORRECTED_FULL_SECTION.liquid to Shopify');
}

// Production deployment instructions
function showDeploymentInstructions() {
  console.log('\n🚀 DEPLOYMENT INSTRUCTIONS:');
  console.log('================================');
  console.log('1. Copy the content of CORRECTED_FULL_SECTION.liquid');
  console.log('2. In Shopify Admin, go to: Online Store → Themes → Actions → Edit code');
  console.log('3. Navigate to Sections → Create new section called "curves-calculator"');
  console.log('4. Paste the liquid code and save');
  console.log('5. Test on your actual product pages:');
  console.log('   • https://craftons.com.au/products/craftons-radius-pro-formply');
  console.log('   • https://craftons.com.au/products/craftons-radius-pro-mdf');
  console.log('   • https://craftons.com.au/products/craftons-radius-pro-plywood');
  console.log('\n🔧 DEBUGGING TIPS:');
  console.log('• Open browser dev tools and check console for communication logs');
  console.log('• Look for messages starting with 📱, 📥, 📤 for communication flow');
  console.log('• Use the communication-test.html for debugging if needed');
}

// Run the tests
runTests().then(() => {
  showDeploymentInstructions();
}).catch(error => {
  console.error('\n❌ Test execution failed:', error.message);
  process.exit(1);
}); 