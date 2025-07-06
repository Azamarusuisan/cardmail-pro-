import axios, { AxiosInstance } from 'axios';
import { storage } from './storage';

class ApiClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await storage.auth.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await storage.auth.clearToken();
          await storage.auth.clearUser();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  auth = {
    getGoogleAuthUrl: () => 
      this.client.get('/api/auth/google'),
    
    googleCallback: (code: string) =>
      this.client.post('/api/auth/google/callback', { code }),
    
    refreshToken: (refreshToken: string) =>
      this.client.post('/api/auth/refresh', { refreshToken }),
  };

  // Upload endpoints
  upload = {
    processCards: (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });
      
      return this.client.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    
    getJobStatus: (jobId: string) =>
      this.client.get(`/api/upload/status/${jobId}`),
  };

  // Send endpoints
  send = {
    sendEmail: (data: {
      recipient: {
        name: string;
        email: string;
        company: string;
        role?: string;
      };
      templateOverrides?: {
        subject?: string;
        body?: string;
      };
    }) => this.client.post('/api/send', data),
    
    sendBatch: (recipients: Array<{
      name: string;
      email: string;
      company: string;
      role?: string;
    }>) => this.client.post('/api/send/batch', { recipients }),
  };

  // Generate email content (for preview)
  generateEmail = async (recipient: {
    name: string;
    email: string;
    company: string;
    role?: string;
  }) => {
    const response = await this.client.post('/api/generate', { recipient });
    return response.data;
  };
}

export const apiClient = new ApiClient();