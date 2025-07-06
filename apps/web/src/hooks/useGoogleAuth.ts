import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthTokens } from '../types';
import { get, set } from 'idb-keyval';

const GOOGLE_AUTH_URL = '/api/auth/google';
const GOOGLE_CALLBACK_URL = '/api/auth/google/callback';
const TOKEN_REFRESH_URL = '/api/auth/refresh';

export function useGoogleAuth() {
  const { login, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have valid tokens
  const checkAuthStatus = useCallback(async () => {
    try {
      const tokens = await get('google_tokens') as AuthTokens | undefined;
      
      if (!tokens) {
        return false;
      }

      // Check if token is expired
      const now = Date.now();
      if (tokens.expiresAt <= now) {
        // Try to refresh
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        if (refreshed) {
          await saveTokens(refreshed);
          return true;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }, []);

  // Save tokens to IndexedDB
  const saveTokens = async (tokens: AuthTokens) => {
    await set('google_tokens', tokens);
  };

  // Refresh access token
  const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens | null> => {
    try {
      const response = await fetch(TOKEN_REFRESH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      return {
        accessToken: data.accessToken,
        refreshToken: refreshToken,
        expiresAt: Date.now() + (3600 * 1000), // 1 hour
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  };

  // Initiate Google OAuth flow
  const initiateGoogleAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(GOOGLE_AUTH_URL);
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsLoading(false);
    }
  }, []);

  // Handle OAuth callback
  const handleCallback = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(GOOGLE_CALLBACK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Callback failed');
      }

      const data = await response.json();
      
      // Save tokens
      const tokens: AuthTokens = {
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        expiresAt: Date.now() + (data.tokens.expires_in * 1000),
      };
      
      await saveTokens(tokens);
      
      // Login to app
      await login(data.token);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  // Get current access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const tokens = await get('google_tokens') as AuthTokens | undefined;
      
      if (!tokens) {
        return null;
      }

      // Check if expired
      const now = Date.now();
      if (tokens.expiresAt <= now) {
        // Refresh token
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        if (refreshed) {
          await saveTokens(refreshed);
          return refreshed.accessToken;
        }
        return null;
      }

      return tokens.accessToken;
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  }, []);

  // Logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      await set('google_tokens', null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout]);

  return {
    initiateGoogleAuth,
    handleCallback,
    checkAuthStatus,
    getAccessToken,
    logout: handleLogout,
    isLoading,
    error,
  };
}