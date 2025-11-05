# Azure Deployment Guide for HMS Backend

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
