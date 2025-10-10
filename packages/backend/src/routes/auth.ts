import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import { asyncHandler } from '../middleware/error';
import { authRateLimit } from '../middleware/rate-limit';
import { 
  validateSession,
  logout as appwriteLogout,
  SESSION_COOKIE_NAME,
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
  c.header('Content-Security-Policy', "default-src 'self'");
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
    const appwriteUserId = c.req.header('X-Appwrite-User-Id');
    
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
          username: appwriteUser.name || `user_${appwriteUserId.substring(0, 8)}`,
          displayName: appwriteUser.name,
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
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);
    
    if (!sessionId) {
      return c.json({ success: true });
    }
    
    try {
      deleteCookie(c, SESSION_COOKIE_NAME, {
        path: '/'
        // Don't set domain - must match the setCookie call
      });
      
      const success = await appwriteLogout(sessionId);
      
      if (!success) {
        console.error('Failed to invalidate session on server:', sessionId);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    return c.json({ success: true })
  })
)
