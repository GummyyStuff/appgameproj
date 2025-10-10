import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';
import { randomUUID } from 'crypto';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { asyncHandler } from '../middleware/error';
import { logSecurityEvent } from '../middleware/logger';
import { authRateLimit } from '../middleware/rate-limit';
import { 
  handleOAuthCallback, 
  validateSession,
  logout as appwriteLogout,
  BACKEND_CALLBACK_URL,
  FRONTEND_URL,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  OAuthSession
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

// Discord OAuth login - Initiates the OAuth flow with Appwrite
authRoutes.get('/discord', 
  authRateLimit,
  asyncHandler(async (c: Context) => {
    try {
      const state = randomUUID();
      
      console.log('=== Starting OAuth Flow ===');
      console.log('Generated state:', state);
      
      // Store state in secure, HTTP-only cookie for CSRF protection
      const isProduction = process.env.NODE_ENV === 'production' || FRONTEND_URL.startsWith('https://');
      
      setCookie(c, 'oauth_state', state, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'Lax',
        maxAge: 600, // 10 minutes
        path: '/',
        // Don't set domain - host-only cookie
      });

      // Build Appwrite OAuth URL
      const appwriteEndpoint = process.env.APPWRITE_ENDPOINT!;
      const projectId = process.env.APPWRITE_PROJECT_ID!;
      
      // The success callback is our backend callback endpoint (where Appwrite redirects after Discord auth)
      const successUrl = BACKEND_CALLBACK_URL;
      const failureUrl = `${FRONTEND_URL}/login?error=oauth_failed`;
      
      // Construct the Appwrite OAuth initiation URL
      // Note: APPWRITE_ENDPOINT already includes /v1, so don't add it again
      const oauthUrl = new URL(`${appwriteEndpoint}/account/sessions/oauth2/discord`);
      oauthUrl.searchParams.set('project', projectId);
      oauthUrl.searchParams.set('success', `${successUrl}?state=${state}`);
      oauthUrl.searchParams.set('failure', failureUrl);

      console.log('Redirecting to Appwrite OAuth URL:', oauthUrl.toString());
      console.log('Success callback:', successUrl);
      console.log('===========================');

      return c.redirect(oauthUrl.toString());
    } catch (error) {
      console.error('❌ OAuth initialization error:', error);
      return c.redirect(`${FRONTEND_URL}/login?error=oauth_init_failed`);
    }
  })
);

// OAuth callback handler
authRoutes.get('/callback', 
  authRateLimit,
  asyncHandler(async (c: Context) => {
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');
    const state = searchParams.get('state');
    const storedState = getCookie(c, 'oauth_state');
    const ip = c.req.header('cf-connecting-ip') || c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    // DEBUG: Log all callback parameters
    console.log('=== OAuth Callback Debug ===');
    console.log('Full URL:', c.req.url);
    console.log('Query params:', { userId, secret: secret ? 'present' : 'missing', state });
    console.log('Cookie state:', storedState);
    console.log('All query params:', Object.fromEntries(searchParams));
    console.log('IP:', ip);
    console.log('===========================');
    
    // Validate state to prevent CSRF
    if (!state || state !== storedState) {
      console.error('❌ State mismatch!', { received: state, expected: storedState });
      logSecurityEvent(`oauth_invalid_state: ip=${ip}, userAgent=${userAgent}, state=${state}, cookieState=${storedState}`);
      return c.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
    }
    
    // Clear the state cookie
    deleteCookie(c, 'oauth_state', {
      path: '/'
      // Don't set domain - must match the setCookie call
    });

    if (!userId || !secret) {
      console.error('❌ Missing OAuth parameters!', { 
        userId: userId ? 'present' : 'MISSING', 
        secret: secret ? 'present' : 'MISSING',
        allParams: Object.fromEntries(searchParams)
      });
      logSecurityEvent(`oauth_missing_params: ip=${ip}, userAgent=${userAgent}`);
      return c.redirect(`${FRONTEND_URL}/login?error=invalid_request`);
    }

    try {
      // Create session using the OAuth callback credentials
      const session = await handleOAuthCallback(userId, secret);
      
      // Log successful authentication
      logSecurityEvent(`oauth_success: userId=${session.userId}, provider=${session.provider}, ip=${ip}`);
      
      // Set secure, HTTP-only cookie with session SECRET (as per Appwrite SSR docs)
      const frontendDomain = new URL(FRONTEND_URL).hostname;
      const sessionCookieName = `a_session_${process.env.APPWRITE_PROJECT_ID}`;
      
      // IMPORTANT: Don't set domain explicitly to allow same-origin cookie sharing
      // When domain is set to 'tarkov.juanis.cool', it becomes a domain cookie
      // Leave it undefined to make it a host-only cookie (more secure and works better)
      const isProduction = process.env.NODE_ENV === 'production' || FRONTEND_URL.startsWith('https://');
      
      setCookie(c, sessionCookieName, session.secret, { // Use session.secret, not session.$id!
        httpOnly: true,
        secure: isProduction, // Use secure cookies on HTTPS (production)
        sameSite: 'Lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
        // Don't set domain - let it default to current host
        // This makes the cookie available to the same origin (protocol + domain + port)
      });
      
      console.log('🍪 Set session cookie:', { 
        name: sessionCookieName, 
        secure: isProduction,
        sameSite: 'Lax',
        httpOnly: true
      });

      return c.redirect(`${FRONTEND_URL}/`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logSecurityEvent(`oauth_failure: error=${errorMessage}, ip=${ip}`);
      return c.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }
  })
);

// Get current user session
// Get current user session - supports both client-side and server-side sessions
authRoutes.get('/me',
  authRateLimit,
  asyncHandler(async (c: Context) => {
    console.log('🔍 Checking user session...');
    
    // Try Appwrite client session first (from frontend SDK)
    const appwriteUserId = c.req.header('X-Appwrite-User-Id');
    
    if (appwriteUserId) {
      console.log('📱 Found Appwrite client user ID:', appwriteUserId);
      try {
        const { UserService } = await import('../services/user-service');
        const { Users } = await import('node-appwrite');
        const { appwriteClient } = await import('../config/appwrite');
        
        let profile = await UserService.getUserProfile(appwriteUserId);
        
        // Get user info from Appwrite to get email/name
        const users = new Users(appwriteClient);
        const appwriteUser = await users.get(appwriteUserId);
        
        if (!profile) {
          console.log('📝 No profile found, creating new user profile...');
          
          // Create new user profile with default values
          profile = await UserService.createUserProfile(appwriteUserId, {
            username: appwriteUser.name || `user_${appwriteUserId.substring(0, 8)}`,
            displayName: appwriteUser.name,
            email: appwriteUser.email,
            balance: parseInt(process.env.STARTING_BALANCE || '10000'),
          });
          
          console.log('✅ User profile created successfully');
        } else {
          console.log('✅ User profile found');
        }
        
        return c.json({
          id: appwriteUserId,
          email: appwriteUser.email || '',
          name: profile.displayName || profile.username,
          username: profile.username,
          balance: profile.balance,
        });
      } catch (error) {
        console.error('❌ Error with Appwrite user profile:', error);
        throw new HTTPException(401, { message: 'Failed to fetch/create user profile' });
      }
    }
    
    // Fallback to backend session cookie
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);
    
    if (!sessionId) {
      console.log('❌ No session found');
      throw new HTTPException(401, { message: 'Not authenticated' });
    }
    
    console.log('🍪 Found backend session cookie');
    const user = await validateSession(sessionId);
    if (!user) {
      console.log('❌ Invalid session');
      throw new HTTPException(401, { message: 'Invalid or expired session' });
    }
    
    console.log('✅ Session valid');
    return c.json(user);
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
