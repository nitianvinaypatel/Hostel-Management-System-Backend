#!/bin/bash

# Deployment script for Azure App Service

echo "Starting deployment..."

# Navigate to deployment target
cd $DEPLOYMENT_TARGET

# Install dependencies
echo "Installing Node.js dependencies..."
npm install --production

# Check if installation was successful
if [ $? -ne 0 ]; then
  echo "npm install failed"
  exit 1
fi

echo "Deployment completed successfully!"
exit 0
