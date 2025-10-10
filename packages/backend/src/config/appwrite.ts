import { Client, Account, Models } from 'node-appwrite';

// Validate required environment variables
const requiredEnvVars = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'FRONTEND_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize Appwrite client with production settings
// Note: node-appwrite doesn't support custom fetch in the same way browser SDK does
// We'll rely on Node's built-in HTTP agent configuration
export const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

// Log client configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Appwrite Client Config:', {
    endpoint: process.env.APPWRITE_ENDPOINT,
    project: process.env.APPWRITE_PROJECT_ID,
    hasApiKey: !!process.env.APPWRITE_API_KEY
  });
}

export const appwriteAccount = new Account(appwriteClient);

// OAuth configuration
// This is YOUR backend callback URL, not Appwrite's OAuth callback
export const BACKEND_CALLBACK_URL = process.env.BACKEND_CALLBACK_URL || 'http://localhost:3001/api/auth/callback';
export const FRONTEND_URL = process.env.FRONTEND_URL!;

// Session configuration
export const SESSION_COOKIE_NAME = `a_session_${process.env.APPWRITE_PROJECT_ID}`;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface OAuthSession {
  $id: string;
  $createdAt: string;
  userId: string;
  expire: string;
  provider: string;
  secret: string;
  current: boolean;
  factors: string[];
  mfaUpdatedAt: string;
  [key: string]: any; // For any additional properties
}

/**
 * Handles the OAuth callback by creating a session with the provided credentials
 */
export const handleOAuthCallback = async (userId: string, secret: string): Promise<OAuthSession> => {
  const { retryAppwriteOperation } = await import('../utils/appwrite-retry');
  
  try {
    console.log('🔐 Creating Appwrite session...', { userId, secret: secret ? 'present' : 'missing' });
    
    const session = await retryAppwriteOperation(
      () => appwriteAccount.createSession(userId, secret),
      { maxRetries: 3, delayMs: 500 }
    );
    
    console.log('✅ Session created successfully:', {
      sessionId: session.$id,
      userId: session.userId,
      provider: session.provider
    });
    
    // Create a new session object with only the properties we need
    const oauthSession: OAuthSession = {
      $id: session.$id,
      $createdAt: session.$createdAt,
      userId: session.userId,
      expire: session.expire,
      provider: 'discord', // Default provider
      secret: session.secret,
      current: session.current,
      factors: session.factors || [],
      mfaUpdatedAt: session.mfaUpdatedAt || '',
    };

    // Add provider information if available
    if (session.provider) {
      oauthSession.provider = session.provider;
    }
    
    return oauthSession;
  } catch (error) {
    console.error('❌ Failed to create OAuth session after retries:', error);
    throw new Error('Authentication failed: Could not create session');
  }
};

/**
 * Validates a session and returns the user information
 * Creates a session client with the session secret from cookie
 */
export const validateSession = async (sessionSecret: string) => {
  const { retryAppwriteOperation } = await import('../utils/appwrite-retry');
  
  try {
    return await retryAppwriteOperation(async () => {
      // Create a new session client for this request
      const sessionClient = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT!)
        .setProject(process.env.APPWRITE_PROJECT_ID!)
        .setSession(sessionSecret); // Use the session secret from cookie
      
      const { Account } = await import('node-appwrite');
      const account = new Account(sessionClient);
      
      // Get the current user's account info
      const user = await account.get();
      
      return {
        id: user.$id,
        email: user.email,
        name: user.name,
        avatar: `https://avatars.${new URL(process.env.APPWRITE_ENDPOINT!).hostname}/avatars/initials?name=${encodeURIComponent(user.name || user.email)}`,
        sessionId: sessionSecret,
        emailVerified: user.emailVerification,
        createdAt: user.$createdAt,
        updatedAt: user.$updatedAt
      };
    }, { maxRetries: 3, delayMs: 500 });
  } catch (error) {
    console.error('Session validation failed after retries:', error);
    return null;
  }
};

/**
 * Logs out the current session
 */
export const logout = async (sessionId: string) => {
  try {
    await appwriteAccount.deleteSession(sessionId);
    return true;
  } catch (error) {
    console.error('Failed to log out:', error);
    return false;
  }
};