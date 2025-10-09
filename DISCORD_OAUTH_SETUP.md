# Discord OAuth Setup Guide for Appwrite

This guide will help you configure Discord OAuth authentication in your self-hosted Appwrite instance.

## Prerequisites
- Self-hosted Appwrite instance running and accessible
- Discord Developer account
- Admin access to your Appwrite console

## Step 1: Create Discord OAuth Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Tarkov Casino")
4. Navigate to the "OAuth2" section in the left sidebar

### Configure OAuth2 Settings

1. **Add Redirect URIs**:
   ```
   https://your-appwrite-domain.com/v1/account/sessions/oauth2/callback/discord/redirect
   ```
   Replace `your-appwrite-domain.com` with your actual Appwrite instance domain

2. **OAuth2 Scopes** (will be requested by the app):
   - `identify` - Required to get user ID and username
   - `email` - Required to get user email

3. **Copy your credentials**:
   - Client ID
   - Client Secret

## Step 2: Configure Discord OAuth in Appwrite Console

1. Open your Appwrite console at `https://your-appwrite-domain.com`
2. Navigate to your project (or create one with ID: `tarkovcas`)
3. Go to **Auth** → **Settings**
4. Scroll down to **OAuth2 Providers**
5. Find **Discord** in the list
6. Enable Discord OAuth
7. Enter your Discord credentials:
   - **App ID**: Your Discord Client ID
   - **App Secret**: Your Discord Client Secret

## Step 3: Configure Environment Variables

### Frontend (.env)
Create `/packages/frontend/.env`:
```env
VITE_APPWRITE_ENDPOINT=https://your-appwrite-domain.com/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
Create `/packages/backend/.env`:
```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://your-appwrite-domain.com/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=your-api-key
APPWRITE_DISCORD_REDIRECT_URI=https://your-appwrite-domain.com/v1/account/sessions/oauth2/callback/discord/redirect

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration (Supabase still used for data storage)
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### How to get Appwrite API Key:
1. In Appwrite Console, go to **Overview**
2. Scroll to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Backend Server")
5. Set scopes:
   - `sessions.read`
   - `sessions.write`
   - `sessions.delete`
   - `users.read`
   - `users.write`
6. Copy the API Key (it will only be shown once!)

## Step 4: Test the Configuration

1. Start your backend server:
   ```bash
   cd packages/backend
   bun run dev
   ```

2. Start your frontend:
   ```bash
   cd packages/frontend
   bun run dev
   ```

3. Navigate to `http://localhost:3000/login`
4. Click "Login with Discord"
5. You should be redirected to Discord OAuth consent screen
6. After authorizing, you should be redirected back to `/dashboard`

## Troubleshooting

### "Invalid Redirect URI" Error
- Make sure the redirect URI in Discord Developer Portal exactly matches:
  `https://your-appwrite-domain.com/v1/account/sessions/oauth2/callback/discord/redirect`
- Check for trailing slashes or typos

### "Project Not Found" Error
- Verify your `APPWRITE_PROJECT_ID` matches your Appwrite project ID
- Check that the project exists in your Appwrite instance

### "Invalid API Key" Error
- Generate a new API key with proper scopes
- Make sure the API key hasn't expired
- Check that you copied it correctly

### Session Not Persisting
- Check that cookies are enabled in your browser
- Verify CORS settings in your Appwrite instance
- Make sure `FRONTEND_URL` in backend matches your actual frontend URL

## Production Deployment

When deploying to production:

1. Update Discord OAuth redirect URI:
   ```
   https://your-production-domain.com/v1/account/sessions/oauth2/callback/discord/redirect
   ```

2. Add production domain to Appwrite **Platforms**:
   - Go to **Settings** → **Platforms**
   - Add **Web Platform**
   - Enter your production domain

3. Update environment variables with production values

4. Enable HTTPS for all endpoints

5. Set secure cookie flags in production (already configured in code)

## Security Best Practices

1. **Never commit** `.env` files to version control
2. Use different Discord OAuth apps for development and production
3. Rotate API keys regularly
4. Set appropriate session expiration times
5. Monitor authentication logs in Appwrite console

## Next Steps

After successful OAuth configuration:
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Verify session persistence
- [ ] Test protected routes
- [ ] Configure user profile synchronization
- [ ] Set up user migration from Supabase to Appwrite

