export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface OCRResult {
  name: string;
  email: string;
  company: string;
  role?: string;
  confidence: number;
}

export interface ProcessingJob {
  id: string;
  fileName: string;
  file: File;
  status: 'queued' | 'processing' | 'ocr' | 'generating' | 'sending' | 'sent' | 'failed';
  progress: number;
  ocrResult?: OCRResult;
  emailContent?: EmailContent;
  emailId?: string;
  error?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface EmailContent {
  subject: string;
  body: string;
}

export interface MailHistory {
  id: string;
  createdAt: Date;
  totalCount: number;
  successCount: number;
  failedCount: number;
  jobs: ProcessingJob[];
}

export interface Settings {
  gptModel: 'gpt-4-turbo-preview' | 'gpt-4' | 'gpt-3.5-turbo';
  emailLength: 'short' | 'medium' | 'long';
  language: 'ja' | 'en';
  autoSend: boolean;
  autoSendWithoutReview: boolean; // 新機能
  maxParallelOCR: number;
  useGoogleVision: boolean; // 新機能
  visionDailyQuota: number; // 新機能
  visionUsageToday: number; // 新機能
}

// Google Cloud Vision API関連
export interface VisionAPIResponse {
  textAnnotations: Array<{
    description: string;
    boundingPoly: {
      vertices: Array<{
        x: number;
        y: number;
      }>;
    };
  }>;
}

// 新しいビジネスカード型
export interface BusinessCardData {
  id: string;
  fileName: string;
  thumbnailUrl?: string;
  rawText: string;
  extractedData: {
    name: string;
    company: string;
    role: string;
    email: string;
    phone: string;
    confidence: number;
  };
  emailContent?: {
    subject: string;
    body: string;
    tone: 'professional' | 'friendly' | 'casual';
    language: 'ja' | 'en';
  };
  status: 'pending' | 'reviewing' | 'generating' | 'ready' | 'sending' | 'sent' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}