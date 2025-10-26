// Debug endpoint to check what's failing
module.exports = async (req, res) => {
  const results = {
    success: true,
    checks: {}
  };

  try {
    // Check 1: Basic response
    results.checks.basicResponse = 'OK';

    // Check 2: Environment variables
    results.checks.env = {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET
    };

    // Check 3: Can require dotenv
    try {
      require('dotenv');
      results.checks.dotenv = 'OK';
    } catch (e) {
      results.checks.dotenv = `ERROR: ${e.message}`;
    }

    // Check 4: Can require express
    try {
      require('express');
      results.checks.express = 'OK';
    } catch (e) {
      results.checks.express = `ERROR: ${e.message}`;
    }

    // Check 5: Can require mongoose
    try {
      require('mongoose');
      results.checks.mongoose = 'OK';
    } catch (e) {
      results.checks.mongoose = `ERROR: ${e.message}`;
    }

    // Check 6: Can load app
    try {
      const app = require('../src/app');
      results.checks.app = 'OK';
    } catch (e) {
      results.checks.app = `ERROR: ${e.message}`;
      results.checks.appStack = e.stack;
    }

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
