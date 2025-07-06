import { get, set, del, entries, clear } from 'idb-keyval';
import { MailHistory, Settings, AuthTokens, ProcessingJob } from '../types';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  GOOGLE_TOKENS: 'google_tokens',
  SETTINGS: 'app_settings',
  HISTORY_PREFIX: 'mail_history_',
  JOB_PREFIX: 'job_',
  OCR_CACHE_PREFIX: 'ocr_cache_',
} as const;

// Storage utilities
export const storage = {
  // Auth
  auth: {
    async getToken(): Promise<string | null> {
      return await get(STORAGE_KEYS.AUTH_TOKEN);
    },
    
    async setToken(token: string): Promise<void> {
      await set(STORAGE_KEYS.AUTH_TOKEN, token);
    },
    
    async clearToken(): Promise<void> {
      await del(STORAGE_KEYS.AUTH_TOKEN);
    },
    
    async getUser() {
      return await get(STORAGE_KEYS.AUTH_USER);
    },
    
    async setUser(user: any): Promise<void> {
      await set(STORAGE_KEYS.AUTH_USER, user);
    },
    
    async clearUser(): Promise<void> {
      await del(STORAGE_KEYS.AUTH_USER);
    },
  },

  // Google OAuth tokens
  google: {
    async getTokens(): Promise<AuthTokens | null> {
      return await get(STORAGE_KEYS.GOOGLE_TOKENS);
    },
    
    async setTokens(tokens: AuthTokens): Promise<void> {
      await set(STORAGE_KEYS.GOOGLE_TOKENS, tokens);
    },
    
    async clearTokens(): Promise<void> {
      await del(STORAGE_KEYS.GOOGLE_TOKENS);
    },
  },

  // Settings
  settings: {
    async get(): Promise<Settings | null> {
      return await get(STORAGE_KEYS.SETTINGS);
    },
    
    async set(settings: Settings): Promise<void> {
      await set(STORAGE_KEYS.SETTINGS, settings);
    },
  },

  // Mail history
  history: {
    async getAll(): Promise<MailHistory[]> {
      const allEntries = await entries();
      const historyEntries = allEntries
        .filter(([key]) => key.toString().startsWith(STORAGE_KEYS.HISTORY_PREFIX))
        .map(([, value]) => value as MailHistory)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return historyEntries;
    },
    
    async get(id: string): Promise<MailHistory | null> {
      return await get(`${STORAGE_KEYS.HISTORY_PREFIX}${id}`);
    },
    
    async set(history: MailHistory): Promise<void> {
      await set(`${STORAGE_KEYS.HISTORY_PREFIX}${history.id}`, history);
    },
    
    async delete(id: string): Promise<void> {
      await del(`${STORAGE_KEYS.HISTORY_PREFIX}${id}`);
    },
    
    async cleanup(maxItems: number = 100): Promise<void> {
      const all = await this.getAll();
      if (all.length > maxItems) {
        const toDelete = all.slice(maxItems);
        for (const item of toDelete) {
          await this.delete(item.id);
        }
      }
    },
  },

  // OCR cache (24 hour expiry)
  ocrCache: {
    async get(fileHash: string): Promise<any | null> {
      const key = `${STORAGE_KEYS.OCR_CACHE_PREFIX}${fileHash}`;
      const cached = await get(key);
      
      if (cached) {
        const { data, timestamp } = cached;
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (now - timestamp < twentyFourHours) {
          return data;
        } else {
          await del(key);
        }
      }
      
      return null;
    },
    
    async set(fileHash: string, data: any): Promise<void> {
      const key = `${STORAGE_KEYS.OCR_CACHE_PREFIX}${fileHash}`;
      await set(key, {
        data,
        timestamp: Date.now(),
      });
    },
    
    async cleanup(): Promise<void> {
      const allEntries = await entries();
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      for (const [key, value] of allEntries) {
        if (key.toString().startsWith(STORAGE_KEYS.OCR_CACHE_PREFIX)) {
          const { timestamp } = value as any;
          if (now - timestamp > twentyFourHours) {
            await del(key);
          }
        }
      }
    },
  },

  // Clear all data
  async clearAll(): Promise<void> {
    await clear();
  },
};

// Calculate file hash for OCR caching
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}