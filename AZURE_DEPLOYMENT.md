# Azure Deployment Guide for HMS Backend

## ⚠️ IMMEDIATE FIX for HRESULT: 0x2 Error

If you're seeing "iisnode encountered an error", follow these steps **RIGHT NOW**:

### 1. ✅ Check Application Settings (Most Common Issue)

Go to Azure Portal → Your App Service → Configuration → Application Settings

**Click "Advanced edit" and paste this (replace with your actual values):**
```json
[
  {
    "name": "NODE_ENV",
    "value": "production",
    "slotSetting": false
  },
  {
    "name": "PORT",
    "value": "8080",
    "slotSetting": false
  },
  {
    "name": "MONGODB_URI",
    "value": "your-mongodb-connection-string-here",
    "slotSetting": false
  },
  {
    "name": "JWT_SECRET",
    "value": "your-jwt-secret-here",
    "slotSetting": false
  },
  {
    "name": "JWT_EXPIRE",
    "value": "30d",
    "slotSetting": false
  },
  {
    "name": "FRONTEND_URL",
    "value": "your-frontend-url-here",
    "slotSetting": false
  },
  {
    "name": "WEBSITE_NODE_DEFAULT_VERSION",
    "value": "~18",
    "slotSetting": false
  },
  {
    "name": "SCM_DO_BUILD_DURING_DEPLOYMENT",
    "value": "true",
    "slotSetting": false
  }
]
```

**Click "Save" → "Continue"**

### 2. ✅ Check General Settings

Go to Configuration → General Settings:
```
Stack: Node
Major version: 18 LTS
Minor version: (Latest)
Startup Command: node server.js
```

**Click "Save"**

### 3. ✅ Restart the App

Go to Overview → Click "Restart" → Wait 30 seconds

### 4. ✅ Check Logs

Go to Log stream and watch for errors

---

## Files Added for Azure App Service

### 1. `web.config`
This file configures IIS/iisnode to properly route requests to your Node.js application on Azure App Service.

### 2. `.deployment` & `deploy.sh`
These files configure the deployment process on Azure.

### 3. `package.json` - engines field
Specifies Node.js and npm versions for Azure to use.

## Azure App Service Configuration

### Application Settings (Environment Variables)
In the Azure Portal, go to your App Service → Configuration → Application settings and add:

```
NODE_ENV=production
PORT=8080
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRE=<your-jwt-expiry>
FRONTEND_URL=<your-frontend-url>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-cloudinary-key>
CLOUDINARY_API_SECRET=<your-cloudinary-secret>
EMAIL_HOST=<your-email-host>
EMAIL_PORT=<your-email-port>
EMAIL_USER=<your-email-user>
EMAIL_PASSWORD=<your-email-password>
RAZORPAY_KEY_ID=<your-razorpay-key>
RAZORPAY_KEY_SECRET=<your-razorpay-secret>
```

### General Settings
- **Stack**: Node
- **Node version**: 18 LTS or higher
- **Startup Command**: `node server.js`
- **Always On**: Enabled (recommended for production)

## Deployment Methods

### Option 1: GitHub Actions (Recommended)
Azure provides automatic CI/CD with GitHub:
1. In Azure Portal → Deployment Center
2. Select GitHub as source
3. Authorize and select your repository
4. Azure will create a workflow file automatically

### Option 2: Local Git
```bash
git remote add azure <azure-git-url>
git push azure main
```

### Option 3: Azure CLI
```bash
az webapp up --name <your-app-name> --resource-group <your-resource-group>
```

## Troubleshooting

### Error: "iisnode encountered an error" (HRESULT: 0x2, HTTP 500.1002)

This error typically means Azure cannot start your Node.js application. Follow these steps:

#### **Step 1: Check Azure Configuration**

**A. In Azure Portal → Configuration → General Settings:**
```
Stack: Node
Node version: 18 LTS (or higher)
Startup Command: node server.js
```

**B. In Azure Portal → Configuration → Application Settings:**
Make sure ALL required environment variables are set:
```
NODE_ENV=production
PORT=8080
MONGODB_URI=<your-connection-string>
JWT_SECRET=<your-secret>
JWT_EXPIRE=30d
FRONTEND_URL=<your-frontend-url>
```
⚠️ **Missing ANY required environment variable will cause the app to crash!**

#### **Step 2: Check Dependencies Installation**

In Azure Portal → Deployment Center → Logs:
- Check if `npm install` completed successfully
- Look for any package installation errors

#### **Step 3: View Detailed Logs**

**Option A: Azure Portal**
1. Go to App Service → Log stream
2. Watch for errors when you refresh your app URL

**Option B: Azure CLI**
```bash
az webapp log tail --name <your-app-name> --resource-group <your-resource-group>
```

**Option C: Download logs**
```bash
az webapp log download --name <your-app-name> --resource-group <your-resource-group>
```

#### **Step 4: Check Database Connection**

Most common issue: MongoDB connection fails
- Verify `MONGODB_URI` is correct
- If using MongoDB Atlas:
  - Add Azure IP addresses to Atlas whitelist (or use 0.0.0.0/0 for testing)
  - Check username/password are URL-encoded

#### **Step 5: Force Redeploy**

Sometimes a clean redeploy fixes issues:
```bash
# Option A: Using Azure CLI
az webapp restart --name <your-app-name> --resource-group <your-resource-group>

# Option B: In Azure Portal
Deployment Center → Sync (or Redeploy)
```

### "You do not have permission to view this directory or page"
✅ Fixed by adding `web.config` file

### Check Logs
```bash
az webapp log tail --name <your-app-name> --resource-group <your-resource-group>
```

Or in Azure Portal → App Service → Log stream

### Common Issues
1. **Missing environment variables** - Check Application Settings
2. **Port binding** - Azure assigns port via `process.env.PORT`
3. **Database connection** - Ensure MongoDB connection string is correct
4. **CORS errors** - Update `FRONTEND_URL` in Application Settings

## Health Check
After deployment, verify:
- `https://<your-app-name>.azurewebsites.net/` - Should return API info
- `https://<your-app-name>.azurewebsites.net/api/health` - Should return health status

## Important Notes
- Socket.io will work on Azure App Service (WebSockets are supported)
- Ensure all dependencies are in `dependencies` (not `devDependencies`)
- Azure uses IIS as a reverse proxy, so some logs may differ from local development
