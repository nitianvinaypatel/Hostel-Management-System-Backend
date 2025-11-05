// Simple diagnostic script for Azure deployment
console.log('=== Azure Deployment Diagnostics ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current directory:', __dirname);
console.log('');

console.log('=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('');

console.log('=== Checking Dependencies ===');
const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✓ node_modules directory exists');
  
  const criticalModules = ['express', 'mongoose', 'dotenv', 'cors'];
  criticalModules.forEach(mod => {
    const modPath = path.join(nodeModulesPath, mod);
    if (fs.existsSync(modPath)) {
      console.log(`✓ ${mod} installed`);
    } else {
      console.log(`✗ ${mod} NOT FOUND`);
    }
  });
} else {
  console.log('✗ node_modules directory NOT FOUND');
}
console.log('');

console.log('=== Testing Module Imports ===');
try {
  require('express');
  console.log('✓ express can be loaded');
} catch (err) {
  console.log('✗ express failed:', err.message);
}

try {
  require('mongoose');
  console.log('✓ mongoose can be loaded');
} catch (err) {
  console.log('✗ mongoose failed:', err.message);
}

try {
  require('dotenv');
  console.log('✓ dotenv can be loaded');
} catch (err) {
  console.log('✗ dotenv failed:', err.message);
}

console.log('');
console.log('=== Testing App Load ===');
try {
  const app = require('./src/app');
  console.log('✓ App loaded successfully');
  console.log('App type:', typeof app);
} catch (err) {
  console.log('✗ App failed to load:', err.message);
  console.log('Stack:', err.stack);
}

console.log('');
console.log('=== Diagnostics Complete ===');
