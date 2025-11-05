# Azure Deployment Fix Guide

## Steps to Fix Your Deployment

### 1. Set Environment Variables in Azure Portal

Go to Azure Portal → Your App Service → Configuration → Application Settings and add:

**Required Variables:**
- `MONGODB_URI` = your MongoDB connection string
- `JWT_SECRET` = your JWT secret key
- `NODE_ENV` = production
- `PORT` = 8080 (or leave empty, Azure sets this automatically)

**Optional but Recommended:**
- `FRONTEND_URL` = your frontend URL
- `RATE_LIMIT_WINDOW_MS` = 900000
- `RATE_LIMIT_MAX_REQUESTS` = 100

Click **Save** after adding variables, then **Restart** your app.

### 2. Ensure Build Happens on Deployment

The `.deployment` file has been updated to ensure npm install runs during deployment.

### 3. Run Diagnostics

Use the diagnostic script to check your deployment:

**Via Azure Portal (Kudu Console):**
1. Go to Azure Portal → Your App Service → **Advanced Tools** → **Go**
2. Click **Debug console** → **CMD**
3. Navigate to `D:\home\site\wwwroot`
4. Run: `node diagnose.js`

This will show you exactly what's missing or failing.

### 4. Check Logs

After restarting, check logs in Azure Portal:
- Go to **Monitoring** → **Log stream**
- Or use Azure CLI: `az webapp log tail --name <your-app-name> --resource-group <your-resource-group>`
- Check IISNode logs in Kudu: `D:\home\site\wwwroot\iisnode\*.log`

### 5. Verify Node Version

In Azure Portal → Configuration → General Settings:
- Set **Node version** to 18 or higher (matches your package.json engines)
- Or set environment variable: `WEBSITE_NODE_DEFAULT_VERSION` = `18-lts` or `~18`

### 5. Enable Better Logging

The web.config now includes `logDirectory="iisnode"` which creates logs in the `iisnode` folder.

To view these logs:
- Use Azure Portal → Advanced Tools (Kudu) → Debug console
- Navigate to `D:\home\site\wwwroot\iisnode`
- Check the log files for detailed error messages

### 6. Test Locally with Production Settings

Before deploying, test locally:
```bash
set NODE_ENV=production
set PORT=8080
node server.js
```

Visit http://localhost:8080 to verify it works.

### Common Issues:

**Issue: "Cannot find module"**
- Solution: Ensure all dependencies are in `dependencies` (not `devDependencies`)
- Run: `npm install --production` to test

**Issue: MongoDB connection fails**
- Solution: Check MONGODB_URI is set correctly in Azure
- Ensure MongoDB allows connections from Azure IPs

**Issue: App crashes immediately**
- Solution: Check for missing environment variables
- Review logs in Kudu console

### Quick Verification Checklist:
- [ ] All environment variables set in Azure Portal
- [ ] Node version set to 18+ in Azure
- [ ] App restarted after configuration changes
- [ ] MongoDB connection string is correct
- [ ] MongoDB allows Azure IP addresses
- [ ] No syntax errors in code (test locally first)
