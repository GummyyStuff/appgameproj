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
    // Check for existing session via backend API
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include', // Include HTTP-only cookies
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // No active session
          setUser(null);
          setIsAuthenticated(false);
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
      
      // Call backend logout endpoint
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include HTTP-only cookies
        headers: {
          'Accept': 'application/json',
        },
      });
      
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
      // Redirect to backend OAuth endpoint which will handle the Discord OAuth flow
      // The backend will create the session and redirect back to the frontend
      window.location.href = `${API_URL}/auth/discord`;
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
