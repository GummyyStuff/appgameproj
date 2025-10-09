import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Models } from 'appwrite';
import { account } from '../lib/appwrite';

// Define types for Appwrite user and session
interface AppwriteUser extends Models.User<Models.Preferences> {}
interface AppwriteSession extends Models.Session {}

interface AuthContextType {
  user: AppwriteUser | null;
  session: AppwriteSession | null;
  loading: boolean;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [session, setSession] = useState<AppwriteSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const session = await account.getSession('current');
        if (session) {
          const user = await account.get();
          setSession(session);
          setUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // No active session
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await account.deleteSession('current');
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithDiscord = useCallback(async () => {
    try {
      setLoading(true);
      // This will redirect to Discord for OAuth
      await account.createOAuth2Session(
        'discord',
        `${window.location.origin}/dashboard`,
        `${window.location.origin}/login`,
        ['identify', 'email']
      );
      // The page will redirect, so we don't need to handle the response here
    } catch (error) {
      console.error('Discord OAuth error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated,
    signInWithDiscord,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
