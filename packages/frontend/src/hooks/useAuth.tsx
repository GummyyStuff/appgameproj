import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

// User type from backend
interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing Appwrite session
    const checkSession = async () => {
      try {
        // First check if there's an Appwrite session
        const { account } = await import('../lib/appwrite');
        
        try {
          // Try to get current Appwrite session
          const appwriteUser = await account.get();
          
          // If we have an Appwrite session, get full user info from backend
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'X-Appwrite-User-Id': appwriteUser.$id, // Send Appwrite user ID
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Backend doesn't recognize user, might need to create profile
            setUser({
              id: appwriteUser.$id,
              email: appwriteUser.email,
              name: appwriteUser.name,
            });
            setIsAuthenticated(true);
          }
        } catch (appwriteError) {
          // No Appwrite session, try backend session
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      // Logout from Appwrite (client-side session)
      const { account } = await import('../lib/appwrite');
      try {
        await account.deleteSession('current');
      } catch (e) {
        console.log('Appwrite logout failed (might not have session):', e);
      }
      
      // Also call backend logout endpoint to clear any backend session
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });
      } catch (e) {
        console.log('Backend logout failed:', e);
      }
      
      setUser(null);
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
      
      // Use Appwrite client SDK to initiate OAuth (client-side flow)
      const { account } = await import('../lib/appwrite');
      
      // Appwrite will handle the entire OAuth flow and create the session
      // Then redirect back to the success URL (frontend)
      await account.createOAuth2Session(
        'discord' as any, // Provider name
        `${window.location.origin}/`, // Success URL - redirect to home after login
        `${window.location.origin}/login?error=oauth_failed` // Failure URL
      );
      
      // The page will redirect to Discord, so this code won't execute
    } catch (error) {
      console.error('Discord OAuth error:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
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
