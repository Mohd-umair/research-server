# Coolify Deployment Guide for Research Decode API

## Prerequisites

1. **Coolify Instance**: Ensure you have access to your Coolify dashboard
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)
3. **Domain**: Your domain `prodapi.researchdecode.com` should be configured
4. **MongoDB Atlas**: Your database is already configured

## Step 1: Prepare Your Repository

### 1.1 Commit the New Files
```bash
git add .
git commit -m "Add Coolify deployment configuration"
git push origin main
```

### 1.2 Verify Repository Structure
Your repository should now contain:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `env.production.template`
- `server.js`
- `package.json`
- All your source code

## Step 2: Coolify Dashboard Setup

### 2.1 Create New Application
1. Log into your Coolify dashboard
2. Click "New Application"
3. Select "Docker Compose" or "Dockerfile"
4. Choose your Git repository

### 2.2 Configure Application Settings

#### Basic Settings:
- **Application Name**: `research-decode-api`
- **Repository**: Your Git repository URL
- **Branch**: `main`
- **Build Method**: `Dockerfile`

#### Environment Variables:
Add these environment variables in Coolify:

```env
NODE_ENV=prod
PORT=5002
SOCKET_PORT=5001
MONGODB_PROD=mongodb+srv://shayezkarimcide:Kzf9BToFNc3ZHcHG@researchdecode.09dvtd1.mongodb.net/
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_research_decode_2024
JWT_EXPIRES_IN=24h
JWT_ADMIN_EXPIRES_IN=24h
INITIAL_SUPER_ADMIN_EMAIL=superadmin@research.com
INITIAL_SUPER_ADMIN_PASSWORD=SuperAdmin123!
INITIAL_SUPER_ADMIN_NAME=System Administrator
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15
RAZORPAY_KEY_ID=rzp_test_jLhZZYBPKlMBn9
RAZORPAY_SECRET=zEhFSyPXABeTkMMClwK9LxIn
RAZORPAYX_ACCOUNT_NUMBER=2323230025954705
CLOUDINARY_CLOUD_NAME=dydmzp82t
CLOUDINARY_API_KEY=573256125428726
CLOUDINARY_API_SECRET=ZxVgyMOzXuHjHqwHLbavF94iOf4
BASE_URL=https://prodapi.researchdecode.com
FRONTEND_URL=https://researchdecode.com
ADMIN_PANEL_URL=https://admin.researchdecode.com
CORS_ORIGINS=https://researchdecode.com,https://www.researchdecode.com,https://admin.researchdecode.com
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain
LOG_LEVEL=info
```

#### Port Configuration:
- **Internal Port**: `5002`
- **External Port**: `80` (or your preferred port)

## Step 3: Domain Configuration

### 3.1 Configure Domain
1. In Coolify, go to your application settings
2. Add domain: `prodapi.researchdecode.com`
3. Configure SSL certificate (Let's Encrypt recommended)

### 3.2 DNS Configuration
Ensure your DNS points to your Coolify server:
```
prodapi.researchdecode.com -> [Your Coolify Server IP]
```

## Step 4: Build and Deploy

### 4.1 Initial Deployment
1. Click "Deploy" in Coolify
2. Monitor the build logs for any errors
3. Wait for the build to complete

### 4.2 Verify Deployment
After deployment, test these endpoints:
- `https://prodapi.researchdecode.com/` (Health check)
- `https://prodapi.researchdecode.com/admin` (Admin panel)
- `https://prodapi.researchdecode.com/api` (API endpoints)

## Step 5: Troubleshooting

### 5.1 Common Issues

#### Issue: Build Fails
**Solution**: Check Dockerfile and ensure all dependencies are correct

#### Issue: Application Crashes
**Solution**: 
1. Check logs in Coolify dashboard
2. Verify environment variables are set correctly
3. Ensure MongoDB connection is working

#### Issue: API Not Responding
**Solution**:
1. Check if the application is running
2. Verify port configuration
3. Check firewall settings

### 5.2 Health Check Endpoints
Add these to your application for monitoring:

```javascript
// In your app.js or server.js
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});
```

## Step 6: Monitoring and Maintenance

### 6.1 Set Up Monitoring
1. Configure health checks in Coolify
2. Set up log monitoring
3. Configure alerts for downtime

### 6.2 Regular Maintenance
1. Keep dependencies updated
2. Monitor resource usage
3. Regular security updates

## Step 7: SSL and Security

### 7.1 SSL Configuration
1. Enable Let's Encrypt SSL in Coolify
2. Configure automatic SSL renewal
3. Test HTTPS endpoints

### 7.2 Security Headers
Add security headers to your application:

```javascript
// In your app.js
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['https://researchdecode.com'],
  credentials: true
}));
```

## Step 8: Testing Your Deployment

### 8.1 Test Endpoints
```bash
# Health check
curl https://prodapi.researchdecode.com/health

# API test
curl https://prodapi.researchdecode.com/api/health

# Admin panel
curl https://prodapi.researchdecode.com/admin
```

### 8.2 Database Connection Test
```bash
# Test MongoDB connection
curl -X POST https://prodapi.researchdecode.com/api/test-db
```

## Troubleshooting Checklist

- [ ] Repository is accessible
- [ ] Dockerfile is correct
- [ ] Environment variables are set
- [ ] Domain is configured
- [ ] SSL certificate is valid
- [ ] MongoDB connection is working
- [ ] Application is responding
- [ ] Logs are being generated
- [ ] Health checks are passing

## Support

If you encounter issues:
1. Check Coolify logs
2. Verify environment variables
3. Test database connectivity
4. Review application logs
5. Contact Coolify support if needed 