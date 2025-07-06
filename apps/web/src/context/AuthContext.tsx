import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { get, set, del } from 'idb-keyval';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load auth state from IndexedDB
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const savedToken = await get('auth_token');
        const savedUser = await get('auth_user');
        
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
          setIsAuthenticated(true);
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = async (code: string) => {
    try {
      const response = await axios.post('/api/auth/google/callback', { code });
      const { token: authToken, user: authUser } = response.data;

      // Save to state
      setToken(authToken);
      setUser(authUser);
      setIsAuthenticated(true);

      // Save to IndexedDB
      await set('auth_token', authToken);
      await set('auth_user', authUser);

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      // Clear IndexedDB
      await del('auth_token');
      await del('auth_user');

      // Clear axios header
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshToken = async () => {
    try {
      // This would call the refresh endpoint
      // For now, just revalidate the current token
      console.log('Refreshing token...');
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
    }
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        token, 
        login, 
        logout, 
        refreshToken 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}