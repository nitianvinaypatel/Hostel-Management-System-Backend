#!/bin/bash

# Azure App Service startup script
# This script ensures the app starts correctly on Azure

echo "=== Azure App Service Startup ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "ERROR: node_modules directory not found!"
    echo "Running npm install..."
    npm install --production
fi

# Check required environment variables
echo "Checking environment variables..."
REQUIRED_VARS=("MONGODB_URI" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "ERROR: Missing required environment variables: ${MISSING_VARS[*]}"
    echo "Please set these in Azure Portal → Configuration → Application Settings"
fi

# Start the application
echo "Starting Node.js application..."
node server.js
