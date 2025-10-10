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

// Create a custom fetch with timeout
const timeoutFetch = (timeout: number = 10000) => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };
};

// Initialize Appwrite client with production settings
export const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const appwriteAccount = new Account(appwriteClient);

// OAuth configuration
// This is YOUR backend callback URL, not Appwrite's OAuth callback
export const BACKEND_CALLBACK_URL = process.env.BACKEND_CALLBACK_URL || 'http://localhost:3001/api/auth/callback';
export const FRONTEND_URL = process.env.FRONTEND_URL!;

// Session configuration
export const SESSION_COOKIE_NAME = 'appwrite-session';
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
  try {
    console.log('🔐 Creating Appwrite session...', { userId, secret: secret ? 'present' : 'missing' });
    
    const session = await appwriteAccount.createSession(userId, secret);
    
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
    console.error('❌ Failed to create OAuth session:', error);
    throw new Error('Authentication failed: Could not create session');
  }
};

/**
 * Validates a session and returns the user information
 * Requires both session ID and user ID (from cookies)
 */
export const validateSession = async (sessionId: string, userId?: string) => {
  try {
    if (!userId) {
      console.error('User ID required for session validation');
      return null;
    }
    
    // Use direct HTTP to avoid SDK connection issues
    const { getUser, getSession } = await import('./appwrite-http');
    
    // Validate the session exists
    const session = await getSession(userId, sessionId);
    if (!session || !session.current) {
      console.error('Invalid or expired session');
      return null;
    }
    
    // Get user details
    const user = await getUser(userId);
    if (!user) {
      console.error('User not found');
      return null;
    }
    
    return {
      id: user.$id,
      email: user.email,
      name: user.name,
      avatar: `https://avatars.${new URL(process.env.APPWRITE_ENDPOINT!).hostname}/avatars/initials?name=${encodeURIComponent(user.name || user.email)}`,
      sessionId: sessionId,
      emailVerified: user.emailVerification,
      createdAt: user.$createdAt,
      updatedAt: user.$updatedAt
    };
  } catch (error) {
    console.error('Session validation failed:', error);
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