# Coolify Deployment Setup

## 🚨 Critical Issue Resolution

Your site is blank because the React app can't initialize due to missing Supabase environment variables during the build process.

## Required Environment Variables in Coolify

You need to set these environment variables in your Coolify deployment:

### Backend Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://your-actual-project.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# Application Security
JWT_SECRET=your_secure_32_character_jwt_secret_here
```

### Frontend Build Variables (Critical!)
```bash
# These are used during Docker build to compile the frontend
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
VITE_API_URL=https://tarkov.juanis.cool/api
```

## How to Set Variables in Coolify

1. **Go to your Coolify dashboard**
2. **Navigate to your Tarkov Casino application**
3. **Go to Environment Variables section**
4. **Add each variable above with your actual values**

### Example Values (Replace with your actual Supabase project details):
```bash
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
JWT_SECRET=super-secret-jwt-token-32-chars-min
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_API_URL=https://tarkov.juanis.cool/api
```

## Where to Get Your Supabase Values

1. **Go to your Supabase dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Settings > API**
4. **Copy the values:**
   - **Project URL** → use for `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public** key → use for `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → use for `SUPABASE_SERVICE_ROLE_KEY`

## After Setting Variables

1. **Trigger a rebuild** in Coolify (this is critical!)
2. **Wait for the build to complete**
3. **Test the site** - it should now load properly

## Verification

After deployment, run this to verify:
```bash
./scripts/test-production-fix.sh
```

## Why This Happened

The Docker build process needs the `VITE_*` environment variables at **build time** to compile them into the JavaScript bundle. Without them:

1. The frontend build uses placeholder values from `.env.production`
2. The Supabase client fails to initialize
3. React throws "createContext" errors
4. The page appears blank

## Security Notes

- Never commit real environment variables to git
- Use strong, unique JWT secrets
- Rotate keys regularly
- Monitor Supabase usage and quotas

## Need Help?

If you're still having issues:
1. Check Coolify build logs for errors
2. Verify all environment variables are set correctly
3. Ensure your Supabase project is active and accessible
4. Run the validation script after deployment