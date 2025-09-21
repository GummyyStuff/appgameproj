# Coolify Deployment Guide

## Quick Fix for Current Issue

Your login is failing because of CORS and HTTPS configuration. Here's the immediate fix:

### 1. Set Environment Variables in Coolify

In your Coolify dashboard, add these environment variables to your application:

**Required Variables:**
```
NODE_ENV=production
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
JWT_SECRET=your_secure_32_character_jwt_secret
PORT=3000
```

**Build-time Variables (for frontend):**
```
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_API_URL=https://tarkov.juanis.cool/api
```

### 2. Get Supabase Production Credentials

#### Option A: Supabase Cloud (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Settings > API to get your URL and keys
3. Import your database schema:
   ```sql
   -- Run the migration files in order:
   -- packages/backend/src/database/migrations/001_initial_schema.sql
   -- packages/backend/src/database/migrations/002_rpc_functions.sql
   -- etc.
   ```

#### Option B: Self-hosted Supabase
1. Deploy Supabase with Docker and SSL
2. Configure your own domain with HTTPS
3. Use your custom Supabase URL

### 3. Redeploy in Coolify

After setting the environment variables:
1. Trigger a new deployment in Coolify
2. Wait for the build to complete
3. Test the login functionality

## Complete Deployment Configuration

### Environment Variables Reference

**Backend Variables:**
```bash
# Core Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Game Configuration
STARTING_BALANCE=10000
DAILY_BONUS=1000

# Logging Configuration
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_GAME_LOGGING=true
ENABLE_SECURITY_LOGGING=true

# Performance Configuration
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Monitoring Configuration
HEALTH_CHECK_TIMEOUT=5000
METRICS_ENABLED=true
```

**Frontend Build Variables:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://tarkov.juanis.cool/api
```

### Coolify Configuration

**Service Settings:**
- **Build Pack**: Docker
- **Port**: 3000
- **Health Check Path**: `/api/health`
- **Domain**: `tarkov.juanis.cool`
- **SSL**: Enabled (Let's Encrypt)

**Build Configuration:**
- **Dockerfile Path**: `./Dockerfile`
- **Build Context**: `.`
- **Build Arguments**: Include all `VITE_*` variables

### Database Setup

1. **Create Supabase Project**
2. **Run Migrations** (in order):
   ```bash
   # In Supabase SQL Editor, run these files:
   packages/backend/src/database/migrations/001_initial_schema.sql
   packages/backend/src/database/migrations/002_rpc_functions.sql
   packages/backend/src/database/migrations/003_fix_leaderboard.sql
   packages/backend/src/database/migrations/004_realtime_triggers.sql
   ```

3. **Enable Row Level Security**:
   - Go to Authentication > Settings
   - Enable RLS on all tables
   - Policies are included in the migration files

4. **Configure Auth Settings**:
   - Site URL: `https://tarkov.juanis.cool`
   - Redirect URLs: `https://tarkov.juanis.cool/**`

### Testing the Deployment

After deployment, verify:

1. **Health Check**: `https://tarkov.juanis.cool/api/health`
2. **Frontend Loading**: `https://tarkov.juanis.cool`
3. **Authentication**: Try to register/login
4. **API Endpoints**: Check browser network tab for HTTPS requests
5. **WebSocket**: Test real-time features

### Troubleshooting

**Common Issues:**

1. **CORS Errors**:
   - Verify `NODE_ENV=production` is set
   - Check that domain matches in CORS configuration

2. **Mixed Content Errors**:
   - Ensure all URLs use HTTPS in production
   - Check `VITE_SUPABASE_URL` uses HTTPS

3. **Authentication Failures**:
   - Verify Supabase keys are correct
   - Check Supabase auth settings
   - Ensure site URL is configured in Supabase

4. **Build Failures**:
   - Check all required environment variables are set
   - Verify build-time variables (`VITE_*`) are configured

### Security Checklist

- [ ] JWT_SECRET is 32+ characters and secure
- [ ] All URLs use HTTPS in production
- [ ] Supabase RLS policies are enabled
- [ ] Environment variables are not committed to git
- [ ] Rate limiting is configured
- [ ] CORS is properly configured for your domain

### Monitoring

The application includes:
- Health check endpoint at `/api/health`
- Request logging (configurable)
- Error tracking
- Performance metrics

Monitor these in your Coolify logs and consider setting up external monitoring for production use.