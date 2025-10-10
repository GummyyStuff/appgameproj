import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { account } from '../lib/appwrite';
import { OAuthProvider } from 'appwrite';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has Appwrite session
    const checkSession = async () => {
      try {
        // Check Appwrite session first
        const appwriteUser = await account.get();
        
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
        } else {
          // Backend couldn't find profile, trigger creation
          setUser({
            id: appwriteUser.$id,
            email: appwriteUser.email,
            name: appwriteUser.name,
          });
        }
      } catch (error) {
        // No session
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
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
      // Delete Appwrite session
      await account.deleteSession('current');
      
      // Also notify backend (optional, for cleanup)
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {}); // Ignore errors
      
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      signInWithDiscord,
      signOut,
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
