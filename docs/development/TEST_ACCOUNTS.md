# Test Accounts for Local Development

This guide explains how to create and use test accounts for local development without needing Discord OAuth.

## Overview

Test accounts allow you to:
- Develop and test locally without Discord OAuth callbacks
- Create multiple test users for testing different scenarios
- Speed up your development workflow

**⚠️ Important:** Test accounts only work in development mode and are disabled in production for security.

## Creating a Test Account

### Option 1: Using the Script (Recommended)

Run the test account creation script from the project root:

```bash
# Create account with default credentials (test@example.com / testpassword123)
bun run scripts/create-test-account.ts

# Create account with custom credentials
bun run scripts/create-test-account.ts your@email.com yourpassword123 "Your Name"
```

The script will:
1. Validate your environment is configured correctly
2. Create an Appwrite user with email/password authentication
3. Display the login credentials

### Option 2: Using Appwrite Console

1. Open your [Appwrite Console](https://cloud.appwrite.io/)
2. Navigate to your project → **Auth** → **Users**
3. Click **Create User**
4. Fill in:
   - **Email**: test@example.com
   - **Password**: testpassword123 (min 8 characters)
   - **Name**: Test User
5. Click **Create**

## Logging In with Test Account

1. **Build frontend in dev mode** (first time or after frontend changes):
   ```bash
   # From project root
   bun run build:frontend:dev
   
   # Or from packages/frontend
   cd packages/frontend
   bun run build:dev
   ```

2. **Start your development server:**
   ```bash
   # From project root (recommended - builds frontend automatically)
   bun run dev
   
   # Or from packages/backend
   cd packages/backend
   bun run dev
   ```

3. Open http://localhost:3000/login in your browser

4. You'll see two login options:
   - **Login with Discord** (for production OAuth)
   - **Test Login Form** (only visible in dev mode)

5. Use the test login form:
   - Enter your test email
   - Enter your test password
   - Click "Test Login"

6. You'll be automatically logged in and redirected to the home page!

## How It Works

### Backend (Development Only)

The backend has a special `/api/auth/test-login` endpoint that:
- Only works when `NODE_ENV !== 'production'`
- Creates an Appwrite email/password session
- Sets the session cookie
- Returns a 404 in production for security

See: `packages/backend/src/routes/auth.ts`

### Frontend (Development Only)

The login page conditionally shows a test login form when:
- `import.meta.env.DEV === true`
- Allows email/password input
- Calls the test login endpoint
- Refreshes user state on success

See: `packages/frontend/src/pages/LoginPage.tsx`

### Auth Middleware

The auth middleware allows test accounts in development:
- Checks for Discord OR email identity providers
- In production: Only Discord is allowed
- In development: Both Discord and email are allowed

See: `packages/backend/src/routes/auth.ts` (lines 68-89)

## Multiple Test Accounts

You can create as many test accounts as you need for testing:

```bash
# Create different users
bun run scripts/create-test-account.ts player1@test.com pass123 "Player One"
bun run scripts/create-test-account.ts player2@test.com pass123 "Player Two"
bun run scripts/create-test-account.ts admin@test.com pass123 "Admin User"
```

This is useful for:
- Testing multiplayer features
- Testing different user roles
- Testing social features (friends, chat, etc.)

## Troubleshooting

### "Missing required environment variables"

Make sure you have these in `packages/backend/.env`:
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
```

### "Account already exists"

The email is already registered. Either:
- Use those credentials to log in
- Create a new account with a different email

### "Test Login form not visible"

The test login form only appears when the frontend is built in **development mode**. 

**Solution:**
```bash
# Rebuild frontend in dev mode
cd packages/frontend
NODE_ENV=development bun run build

# Or use the convenient script
bun run build:dev

# Then restart your server
cd ../backend
bun run dev
```

**Why?** The build script sets `import.meta.env.DEV` based on `NODE_ENV`:
- `NODE_ENV=development` → `import.meta.env.DEV = true` → Test login visible ✅
- `NODE_ENV=production` or not set → `import.meta.env.DEV = false` → Test login hidden ❌

**Tip:** Use `bun run dev` from the project root - it automatically builds the frontend in dev mode!

### "Invalid email or password"

Double-check your credentials match what you created:
- Email must be exact match
- Password is case-sensitive
- Minimum 8 characters

### "Login failed after success"

The backend might not be able to create the user profile. Check:
1. Backend server is running
2. Database is accessible
3. Check backend logs for errors

## Security Notes

🔒 **Production Safety:**
- Test login endpoint returns 404 in production
- Email/password authentication is rejected in production auth middleware
- Only Discord OAuth works in production

🔧 **Development Only:**
- Test accounts are for local development
- Do not use test accounts in production databases
- Test credentials should be simple and obvious (not secure passwords)

## Next Steps

After logging in with a test account:
- Your user profile will be automatically created in the database
- You'll receive the default starting balance
- You can use all features just like a Discord-authenticated user

## API Reference

### Test Login Endpoint

**POST** `/api/auth/test-login`

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "testpassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid credentials
- `404`: Endpoint not available (production mode)
- `500`: Server error

## Related Files

- Script: `scripts/create-test-account.ts`
- Backend endpoint: `packages/backend/src/routes/auth.ts`
- Frontend UI: `packages/frontend/src/pages/LoginPage.tsx`
- Auth middleware: `packages/backend/src/routes/auth.ts`
- Auth hook: `packages/frontend/src/hooks/useAuth.tsx`

