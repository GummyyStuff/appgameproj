import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getCookie, deleteCookie, setCookie } from 'hono/cookie';
import { asyncHandler } from '../middleware/error';
import { authRateLimit } from '../middleware/rate-limit';
import { 
  validateSession,
  logout as appwriteLogout,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from '../config/appwrite';

// Extend Hono types for our custom context
type Variables = {
  sessionId?: string;
};

type Env = {
  Variables: Variables;
};

export const authRoutes = new Hono<{ Variables: Variables }>();

// Security headers middleware
authRoutes.use('*', async (c, next) => {
  await next();
  
  // Security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Content-Security-Policy', "default-src 'self'; connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 https:");
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

// Get current user session
// Get current user session - supports both client-side and server-side sessions
authRoutes.get('/me',
  authRateLimit,
  asyncHandler(async (c: Context) => {
    console.log('🔍 Checking user session...');
    
    // Get Appwrite user ID from header (sent by frontend)
    let appwriteUserId = c.req.header('X-Appwrite-User-Id');
    let sessionProvider: string | undefined;
    
    // If no header, try to get from session cookie (test login)
    if (!appwriteUserId) {
      // Debug: Log all cookies
      console.log('📝 No X-Appwrite-User-Id header, checking cookies...');
      console.log('All cookies:', c.req.header('Cookie'));
      
      // Try both legacy and modern cookie names
      let sessionSecret = getCookie(c, SESSION_COOKIE_NAME);
      console.log(`Cookie '${SESSION_COOKIE_NAME}':`, sessionSecret ? 'found' : 'not found');
      
      if (!sessionSecret) {
        sessionSecret = getCookie(c, `${SESSION_COOKIE_NAME}_legacy`);
        console.log(`Cookie '${SESSION_COOKIE_NAME}_legacy':`, sessionSecret ? 'found' : 'not found');
      }
      
      if (sessionSecret) {
        console.log('📝 Session cookie found, validating...');
        
        // Check if it's the legacy format (JSON with id and secret)
        try {
          const parsed = JSON.parse(sessionSecret);
          if (parsed.secret) {
            console.log('📝 Parsed legacy cookie format');
            sessionSecret = parsed.secret;
          }
        } catch {
          // Not JSON, use as-is
          console.log('📝 Using cookie value as-is');
        }
        
        const sessionData = await validateSession(sessionSecret);
        
        if (sessionData) {
          appwriteUserId = sessionData.id;
          sessionProvider = sessionData.provider;
          console.log('✅ Session cookie valid for user:', appwriteUserId, 'provider:', sessionProvider);
        } else {
          console.log('❌ Session validation failed');
        }
      } else {
        console.log('❌ No session cookie found');
      }
    }
    
    if (!appwriteUserId) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }
    
    try {
      const { UserService } = await import('../services/user-service');
      const { Users } = await import('node-appwrite');
      const { appwriteClient } = await import('../config/appwrite');
      const { retryAppwriteOperation } = await import('../utils/appwrite-retry');
      
      // Get user profile from database
      let profile = await UserService.getUserProfile(appwriteUserId);
      
      // Get Appwrite user info (includes Discord data)
      const users = new Users(appwriteClient);
      const appwriteUser = await retryAppwriteOperation(
        () => users.get(appwriteUserId),
        { maxRetries: 5, delayMs: 500 }
      );
      
      // Verify auth provider - use session provider (works with local Appwrite)
      // In development mode, allow email/password test accounts
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const provider = sessionProvider || 'discord';
      
      if (!isDevelopment && provider !== 'discord') {
        console.log('❌ User does not have valid identity');
        throw new HTTPException(403, { 
          message: 'Invalid authentication provider. Please log in with Discord.' 
        });
      }
      
      // If no profile exists, create it (first login)
      if (!profile) {
        console.log('📝 No profile found, creating new user profile...');
        
        // Extract Discord avatar from OAuth data
        // Discord avatar format: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
        let avatarUrl = 'defaults/default-avatar.svg';
        
        // Try to get avatar from user prefs (Appwrite might store it there)
        if (appwriteUser.prefs?.avatar) {
          avatarUrl = appwriteUser.prefs.avatar;
        }
        
        profile = await UserService.createUserProfile(appwriteUserId, {
          username: (appwriteUser.name && appwriteUser.name.trim()) || `user_${appwriteUserId.substring(0, 8)}`,
          displayName: (appwriteUser.name && appwriteUser.name.trim()) || `user_${appwriteUserId.substring(0, 8)}`,
          email: appwriteUser.email,
          balance: parseInt(process.env.STARTING_BALANCE || '10000'),
          avatarUrl: avatarUrl,
        });
        
        console.log('✅ User profile created successfully');
      }
      
      return c.json({
        id: appwriteUserId,
        email: appwriteUser.email || '',
        name: profile.displayName || profile.username,
        username: profile.username,
        balance: profile.balance,
        avatar: profile.avatarPath,
      });
    } catch (error) {
      console.error('❌ Error with user profile:', error);
      throw new HTTPException(401, { message: 'Failed to fetch/create user profile' });
    }
  })
);

// Logout
authRoutes.post('/logout',
  authRateLimit,
  asyncHandler(async (c: Context) => {
    // Get user ID from header (sent by frontend for OAuth sessions)
    const userId = c.req.header('X-Appwrite-User-Id');

    if (userId) {
      // Delete ALL Appwrite sessions for this user (covers both OAuth and test login)
      const success = await appwriteLogout(userId);
      if (!success) {
        console.error('Failed to invalidate sessions on server for user:', userId);
      }
    }

    // Always delete backend session cookie
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
    deleteCookie(c, `${SESSION_COOKIE_NAME}_legacy`, { path: '/' });

    return c.json({ success: true })
  })
)

// Test account login (DEVELOPMENT ONLY)
// This endpoint allows email/password authentication for local testing
// without needing Discord OAuth
authRoutes.post('/test-login',
  authRateLimit,
  asyncHandler(async (c: Context) => {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      throw new HTTPException(404, { message: 'Not found' });
    }

    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' });
    }

    try {
      const { Client, Account } = await import('node-appwrite');
      const { retryAppwriteOperation } = await import('../utils/appwrite-retry');
      
      // Create a new client for this login attempt
      const testClient = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT!)
        .setProject(process.env.APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_API_KEY!);
      
      const account = new Account(testClient);
      
      console.log('🔐 Test login attempt:', email);
      
      // Create email session
      const session = await retryAppwriteOperation(
        () => account.createEmailPasswordSession({ email, password }),
        { maxRetries: 3, delayMs: 500 }
      );
      
      console.log('✅ Test session created:', session.$id);
      console.log('📝 Full session object:', JSON.stringify(session, null, 2));
      console.log('📝 Session keys:', Object.keys(session));
      console.log('📝 Session secret length:', session.secret?.length || 0);
      
      // Set session cookie
      setCookie(c, SESSION_COOKIE_NAME, session.secret, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: SESSION_MAX_AGE,
      });
      
      console.log('✅ Session cookie set successfully');
      console.log('📝 Cookie name:', SESSION_COOKIE_NAME);
      console.log('📝 Cookie value length:', session.secret.length);
      
      // Return success with session info
      // The frontend will call /auth/me to get full user profile
      return c.json({
        success: true,
        user: {
          id: session.userId,
          sessionId: session.$id,
        }
      });
    } catch (error: any) {
      console.error('❌ Test login failed:', error);
      
      // Check for specific Appwrite errors
      if (error.code === 401) {
        throw new HTTPException(401, { message: 'Invalid email or password' });
      }
      
      throw new HTTPException(500, { message: 'Login failed. Please try again.' });
    }
  })
)
