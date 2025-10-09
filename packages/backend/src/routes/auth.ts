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
      
      // Store state in secure, HTTP-only cookie for CSRF protection
      setCookie(c, 'oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 600, // 10 minutes
        path: '/',
        domain: new URL(FRONTEND_URL).hostname
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

      return c.redirect(oauthUrl.toString());
    } catch (error) {
      console.error('OAuth initialization error:', error);
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
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    // Validate state to prevent CSRF
    if (!state || state !== storedState) {
      logSecurityEvent(`oauth_invalid_state: ip=${ip}, userAgent=${userAgent}`);
      return c.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
    }
    
    // Clear the state cookie
    deleteCookie(c, 'oauth_state', {
      path: '/',
      domain: new URL(FRONTEND_URL).hostname
    });

    if (!userId || !secret) {
      logSecurityEvent(`oauth_missing_params: ip=${ip}, userAgent=${userAgent}`);
      return c.redirect(`${FRONTEND_URL}/login?error=invalid_request`);
    }

    try {
      // Create session using the OAuth callback credentials
      const session = await handleOAuthCallback(userId, secret);
      
      // Log successful authentication
      logSecurityEvent(`oauth_success: userId=${session.userId}, provider=${session.provider}, ip=${ip}`);
      
      // Set secure, HTTP-only cookie with session ID
      setCookie(c, SESSION_COOKIE_NAME, session.$id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
        domain: new URL(FRONTEND_URL).hostname
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
authRoutes.get('/me',
  authRateLimit,
  asyncHandler(async (c: Context) => {
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);
    
    if (!sessionId) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }
    
    const user = await validateSession(sessionId);
    if (!user) {
      throw new HTTPException(401, { message: 'Invalid or expired session' });
    }
    
    return c.json(user);
  })
);

// Logout
authRoutes.post('/logout', 
  authRateLimit,
  asyncHandler(async (c: Context) => {
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);
    
    if (!sessionId) {
      // No session to log out from
      return c.json({ success: true });
    }
    
    try {
      // Clear the session cookie first to prevent any race conditions
      deleteCookie(c, SESSION_COOKIE_NAME, {
        path: '/',
        domain: new URL(FRONTEND_URL).hostname
      });
      
      // Then invalidate the session on the server
      const success = await appwriteLogout(sessionId);
      
      if (!success) {
        console.error('Failed to invalidate session on server:', sessionId);
        // We still return success since we've cleared the client-side session
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we consider the logout successful from the client's perspective
    }
    
    return c.json({ success: true })
  })
)

// Get current user session
authRoutes.get('/me',
  authRateLimit,
  asyncHandler(async (c: Context) => {
    const sessionId = c.req.header('X-Session-ID')
    
    if (!sessionId) {
      throw new HTTPException(401, { message: 'Not authenticated' })
    }
    
    const session = await getCurrentUser(sessionId)
    
    if (!session) {
      throw new HTTPException(401, { message: 'Invalid or expired session' })
    }
    
    return c.json({
      id: session.userId,
      email: session.email,
      name: session.name,
      avatar: session.picture
    })
  })
)
