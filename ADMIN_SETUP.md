# Admin System Setup Guide

## Overview
This document provides a complete setup guide for the secure admin authentication system for the research web application.

## Features
- ✅ **Multiple Admin Roles**: SuperAdmin, Moderator, Viewer
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Role-Based Access Control**: Hierarchical permission system
- ✅ **Password Security**: Bcrypt hashing with salt rounds
- ✅ **Account Security**: Login attempt limiting and account locking
- ✅ **Audit Logging**: Comprehensive activity tracking
- ✅ **Input Validation**: Strict validation for all inputs
- ✅ **Modular Architecture**: Well-organized, scalable codebase

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/research_database
MONGO_URI=mongodb://localhost:27017/research_database

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRES_IN=24h

# Admin System Configuration
INITIAL_SUPER_ADMIN_EMAIL=superadmin@research.com
INITIAL_SUPER_ADMIN_PASSWORD=SuperAdmin123!
INITIAL_SUPER_ADMIN_NAME=System Administrator

# Security Settings
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ADMIN_PANEL_URL=http://localhost:4200
```

## Installation Steps

### 1. Install Dependencies
Make sure all required dependencies are installed:

```bash
cd server
npm install
# Dependencies should include: express, mongoose, bcryptjs, jsonwebtoken, cors, cookie-parser
```

### 2. Database Setup
Ensure MongoDB is running and accessible via the connection string in your `.env` file.

### 3. Initialize Admin System
Add the following to your main server file (`server/server.js` or `server/app.js`):

```javascript
const { initializeAdminSystem, validateAdminConfig } = require('./src/Modules/Admin/utils/adminUtils');

// Add this after database connection
async function startServer() {
  try {
    // Validate admin configuration
    validateAdminConfig();
    
    // Initialize admin system
    await initializeAdminSystem();
    
    // Start your server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

## API Endpoints

### Authentication Routes

#### POST `/api/admin/auth/login`
Admin login endpoint.

**Request Body:**
```json
{
  "email": "superadmin@research.com",
  "password": "SuperAdmin123!",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "_id": "...",
      "email": "superadmin@research.com",
      "fullName": "System Administrator",
      "role": "SuperAdmin",
      "permissions": ["*"],
      "isActive": true,
      "lastLogin": "2024-01-01T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET `/api/admin/auth/me`
Get current admin profile.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST `/api/admin/auth/logout`
Admin logout.

#### POST `/api/admin/auth/change-password`
Change admin password.

### Admin Management Routes

#### POST `/api/admin/users/create`
Create new admin (SuperAdmin only).

**Request Body:**
```json
{
  "email": "newadmin@research.com",
  "password": "NewAdmin123!",
  "fullName": "New Administrator",
  "role": "Moderator"
}
```

#### GET `/api/admin/users`
Get all admins with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `role`: Filter by role (SuperAdmin, Moderator, Viewer)
- `isActive`: Filter by active status (true/false)
- `search`: Search by name or email
- `sortBy`: Sort field (createdAt, updatedAt, fullName, email, role, lastLogin)
- `sortOrder`: Sort direction (asc, desc)

#### GET `/api/admin/users/:id`
Get specific admin by ID.

#### PATCH `/api/admin/users/:id`
Update admin user.

#### DELETE `/api/admin/users/:id`
Delete/deactivate admin user.

#### GET `/api/admin/users/stats`
Get admin statistics.

#### POST `/api/admin/users/bulk`
Bulk operations on admin users (SuperAdmin only).

### System Routes

#### GET `/api/admin/health`
System health check (public).

#### GET `/api/admin/status`
Get admin system status.

#### GET `/api/admin/dashboard`
Get admin dashboard data.

## Role Hierarchy

### SuperAdmin
- **Permissions**: Full system access (`*` wildcard)
- **Can access**: Everything
- **Can modify**: All admins
- **Can create**: Any role including other SuperAdmins

### Moderator
- **Permissions**: Limited administrative access
  - `view_users`, `view_reports`, `view_logs`, `manage_content`
- **Can access**: Viewer accounts and own profile
- **Can modify**: Viewer accounts and own profile
- **Can create**: Nothing (only SuperAdmins can create accounts)

### Viewer
- **Permissions**: Read-only access
  - `view_dashboard`, `view_own_profile`
- **Can access**: Own profile only
- **Can modify**: Own profile only
- **Can create**: Nothing

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character (@$!%*?&)

### Account Security
- Maximum 5 login attempts before account lock
- Account locked for 15 minutes after max attempts
- Automatic password hashing with bcrypt
- Secure JWT token generation

### Audit Logging
All admin actions are logged with:
- Timestamp
- Admin details (email, role)
- Action performed
- IP address
- User agent

## Testing the System

### 1. Start the Server
```bash
cd server
npm start
```

### 2. Test Initial Login
Use the default SuperAdmin credentials:
- **Email**: `superadmin@research.com`
- **Password**: `SuperAdmin123!`

### 3. Create Additional Admins
Use the SuperAdmin account to create Moderator and Viewer accounts.

### 4. Test Role Permissions
Verify that each role can only access appropriate resources.

## Development Features

### Seed Development Accounts
For development/testing, you can seed additional accounts:

```javascript
const { seedAdminAccounts } = require('./src/Modules/Admin/utils/adminUtils');

// Seed default dev accounts
await seedAdminAccounts();

// Or seed custom accounts
await seedAdminAccounts([
  {
    email: 'dev@research.com',
    password: 'DevAdmin123!',
    fullName: 'Development Admin',
    role: 'Moderator'
  }
]);
```

### Cleanup Inactive Accounts
For maintenance, you can clean up inactive accounts:

```javascript
const { cleanupInactiveAdmins } = require('./src/Modules/Admin/utils/adminUtils');

// Clean up accounts inactive for 90 days
const result = await cleanupInactiveAdmins(90);
console.log(`Cleaned up ${result.deactivated} accounts`);
```

## Production Deployment

### 1. Environment Variables
- Change `JWT_SECRET` to a strong, randomly generated secret
- Change default admin credentials
- Set `NODE_ENV=production`
- Use production database URL

### 2. Security Considerations
- Use HTTPS in production
- Configure proper CORS settings
- Set up rate limiting
- Monitor logs for suspicious activity
- Regular security audits

### 3. Monitoring
- Set up log monitoring
- Monitor failed login attempts
- Track admin activity
- Set up alerts for suspicious activity

## Troubleshooting

### Common Issues

1. **"Admin not found" error**
   - Ensure the admin system is initialized
   - Check database connection
   - Verify admin exists and is active

2. **JWT token errors**
   - Check JWT_SECRET is set correctly
   - Verify token hasn't expired
   - Ensure proper token format in Authorization header

3. **Permission denied errors**
   - Verify admin role and permissions
   - Check role hierarchy rules
   - Ensure admin account is active

4. **Database connection issues**
   - Verify MongoDB is running
   - Check connection string in .env
   - Ensure database exists

### Logs
Check server logs for detailed error information. All admin actions and errors are logged with timestamps and context.

## File Structure

```
server/src/Modules/Admin/
├── models/
│   └── Admin.js                 # Admin Mongoose schema
├── controllers/
│   ├── authController.js        # Authentication logic
│   └── adminController.js       # Admin management logic
├── middleware/
│   ├── verifyAdminToken.js      # JWT verification
│   └── requireRole.js           # Role-based access control
├── routes/
│   └── adminRoutes.js           # API routes
├── utils/
│   └── adminUtils.js            # Utility functions
└── validators/
    └── adminValidators.js       # Input validation

server/src/validators/
└── adminValidators.js           # Validation middleware
```

## Support

For issues or questions regarding the admin system:
1. Check the logs for error details
2. Verify environment configuration
3. Ensure all dependencies are installed
4. Check MongoDB connection and data

The system is designed to be secure, scalable, and maintainable. Follow security best practices and keep dependencies updated. 