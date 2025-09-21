# Production CORS and HTTPS Fix

## Current Issue
Your website at `tarkov.juanis.cool` (HTTPS) is trying to connect to `http://192.168.0.69:8001` (HTTP), which causes:
1. **Mixed Content Error**: HTTPS sites cannot make requests to HTTP endpoints
2. **CORS Error**: Backend is not configured to allow requests from your production domain

## Immediate Fix Steps

### Step 1: Update Your Production Environment Variables

You need to set these environment variables in your Coolify deployment:

```bash
# Backend Environment Variables
SUPABASE_URL=https://your-supabase-project-url.supabase.co
SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_key
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret_32_chars_minimum
PORT=3000

# Frontend Environment Variables (if building frontend separately)
VITE_SUPABASE_URL=https://your-supabase-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_API_URL=https://tarkov.juanis.cool/api
```

### Step 2: Set Up Production Supabase

You have two options:

#### Option A: Use Supabase Cloud (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API
4. Import your database schema from `packages/backend/src/database/migrations/`

#### Option B: Deploy Your Own Supabase Instance
1. Deploy Supabase using Docker on a separate server with HTTPS
2. Configure SSL certificates
3. Update the SUPABASE_URL to use HTTPS

### Step 3: Update Coolify Deployment

In your Coolify dashboard:
1. Go to your application settings
2. Add the environment variables listed in Step 1
3. Make sure `NODE_ENV=production`
4. Redeploy your application

### Step 4: Verify the Fix

After redeployment, check:
1. Browser console should not show CORS errors
2. Login should work without "NetworkError when attempting to fetch resource"
3. All API calls should use HTTPS

## Files Updated

The following files have been updated to fix the CORS issue:
- `packages/backend/src/index.ts` - Updated CORS origin to include `tarkov.juanis.cool`
- `.env.production` - Template for production environment variables
- `packages/frontend/.env.production` - Template for frontend production variables
- `scripts/setup-production-env.sh` - Script to validate production setup

## Testing Locally

To test the production configuration locally:
1. Copy `.env.production` to `.env`
2. Update the values with your actual Supabase credentials
3. Run `bun run dev` to test

## Security Notes

- Never commit real API keys to version control
- Use strong JWT secrets (32+ characters)
- Always use HTTPS in production
- Enable Row Level Security (RLS) in Supabase