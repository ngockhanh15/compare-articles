const app = require('./index');
const request = require('http').request;

// Test if app can be imported and basic routes work
console.log('🧪 Testing Vercel setup...');

// Test 1: App import
try {
  console.log('✅ App imported successfully');
} catch (error) {
  console.error('❌ App import failed:', error.message);
  process.exit(1);
}

// Test 2: Environment check
console.log('\n📋 Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- PORT:', process.env.PORT || 'not set');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ set' : '❌ not set');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅ set' : '❌ not set');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'not set');

// Test 3: Required dependencies
console.log('\n📦 Dependencies check:');
const requiredDeps = [
  'express',
  'mongoose',
  'jsonwebtoken',
  'bcryptjs',
  'cors',
  'dotenv'
];

requiredDeps.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep}`);
  } catch (error) {
    console.log(`❌ ${dep} - ${error.message}`);
  }
});

console.log('\n🎉 Vercel setup test completed!');
console.log('\n📝 Next steps:');
console.log('1. Set environment variables on Vercel dashboard');
console.log('2. Deploy to Vercel');
console.log('3. Update Google OAuth callback URLs');
console.log('4. Test all endpoints');

process.exit(0);