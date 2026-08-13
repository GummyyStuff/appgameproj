import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { account } from '../lib/appwrite';
import { OAuthProvider } from 'appwrite';
import { setUserContext, clearUserContext } from '../lib/sentry';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  balance?: number;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has Appwrite session and refresh if needed
    const checkAndRefreshSession = async () => {
      try {
        // Check Appwrite session first
        const appwriteUser = await account.get();

        // Check if session needs refresh (within 1 day of expiry)
        try {
          const session = await account.getSession('current');
          const expiry = new Date(session.expire);
          const now = new Date();
          const timeUntilExpiry = expiry.getTime() - now.getTime();
          const oneDayInMs = 86400000; // 24 hours

          // Refresh if expiring within 1 day
          if (timeUntilExpiry < oneDayInMs && timeUntilExpiry > 0) {
            console.log('🔄 Refreshing OAuth session (expires soon)');
            await account.updateSession('current');
            console.log('✅ Session refreshed successfully');
          }
        } catch (refreshError) {
          // Session refresh failed, but user is still authenticated
          // This is non-critical, log and continue
          console.warn('⚠️ Session refresh failed:', refreshError);
        }

        // Get full user profile from backend (includes balance, stats, etc.)
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
          headers: {
            'X-Appwrite-User-Id': appwriteUser.$id,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);

          // Set user context in Sentry
          setUserContext(userData.id, {
            email: userData.email,
            username: userData.username || userData.name
          });
        } else {
          // Backend couldn't find profile, trigger creation
          const newUser = {
            id: appwriteUser.$id,
            email: appwriteUser.email,
            name: appwriteUser.name,
          };
          setUser(newUser);

          // Set user context in Sentry
          setUserContext(newUser.id, {
            email: newUser.email,
            username: newUser.name
          });
        }
      } catch (error) {
        // Appwrite SDK has no session (or can't reach Appwrite directly due to cert issues)
        // Fall back to backend session cookie (test login / server-side session)
        try {
          const backendResponse = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
          });

          if (backendResponse.ok) {
            const userData = await backendResponse.json();
            setUser(userData);
            setUserContext(userData.id, {
              email: userData.email,
              username: userData.username || userData.name,
            });
          } else {
            setUser(null);
            clearUserContext();
          }
        } catch (backendError) {
          setUser(null);
          clearUserContext();
        }
      } finally {
        setLoading(false);
      }
    };

    checkAndRefreshSession();
    
    // Set up periodic session refresh check (every 30 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        const session = await account.getSession('current');
        const expiry = new Date(session.expire);
        const now = new Date();
        const timeUntilExpiry = expiry.getTime() - now.getTime();
        const oneDayInMs = 86400000;
        
        if (timeUntilExpiry < oneDayInMs && timeUntilExpiry > 0) {
          console.log('🔄 Periodic session refresh');
          await account.updateSession('current');
          console.log('✅ Session refreshed');
        }
      } catch (error) {
        console.warn('⚠️ Periodic session refresh failed:', error);
      }
    }, 30 * 60 * 1000); // Every 30 minutes
    
    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const signInWithDiscord = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use Appwrite Client SDK for OAuth (recommended for SPAs)
      await account.createOAuth2Session(
        OAuthProvider.Discord,
        `${window.location.origin}/`, // Success URL
        `${window.location.origin}/login?error=oauth_failed` // Failure URL
      );
      
      // User will be redirected to Discord
    } catch (error) {
      console.error('Discord OAuth error:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Get current user ID before clearing state
      const currentUserId = user?.id;

      // Delete ALL Appwrite sessions for the user
      try {
        await account.deleteSessions();
      } catch (sessionError) {
        console.warn('Appwrite session deletion failed:', sessionError);
      }

      // Notify backend to delete all sessions and clear cookie
      // Use currentUserId since user state may be cleared
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
        if (currentUserId) {
          headers['X-Appwrite-User-Id'] = currentUserId;
        }
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers,
        });
      } catch (backendError) {
        console.warn('Backend logout failed:', backendError);
      }

      // Explicitly clear Appwrite session cookie as fallback
      // Cookie name format: a_session_<projectId>
      const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
      if (projectId) {
        const cookieName = `a_session_${projectId}`;
        document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        document.cookie = `${cookieName}_legacy=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      }

      // Clear user context from Sentry
      clearUserContext();

      // Clear all stored user data
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      setUser(null);

      // Small delay to ensure cookies are cleared before redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } catch (error) {
      console.error('Logout failed:', error);
      clearUserContext();
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      window.location.href = '/login';
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      // Try to get Appwrite user first
      let appwriteUserId: string;
      try {
        const appwriteUser = await account.get();
        appwriteUserId = appwriteUser.$id;
      } catch (appwriteError) {
        // If Appwrite session check fails, try to get user from backend
        // This handles server-side session cookies from test login
        console.log('Appwrite session check failed, trying backend session...');
        const backendResponse = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        });
        
        if (!backendResponse.ok) {
          throw new Error('No valid session found');
        }
        
        const userData = await backendResponse.json();
        setUser(userData);
        return;
      }
      
      // Get full user profile from backend
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
        headers: {
          'X-Appwrite-User-Id': appwriteUserId,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Backend couldn't find profile - use basic Appwrite data
        const appwriteUser = await account.get();
        setUser({
          id: appwriteUser.$id,
          email: appwriteUser.email,
          name: appwriteUser.name,
        });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      signInWithDiscord,
      signOut,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
