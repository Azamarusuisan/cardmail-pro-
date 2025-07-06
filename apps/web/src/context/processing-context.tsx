import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ProcessingJob, OCRResult, EmailContent } from '../types';
import { useOCR } from '../hooks/useOCR';
import { useMailHistory } from '../hooks/useMailHistory';
import { useSettings } from './SettingsContext';
import { apiClient } from '../lib/api-client';
import { createThumbnail, generateId } from '../lib/utils';
import { useSnackbar } from 'notistack';

interface ProcessingContextType {
  jobs: ProcessingJob[];
  isProcessing: boolean;
  addFiles: (files: File[]) => Promise<void>;
  removeJob: (jobId: string) => void;
  retryJob: (jobId: string) => Promise<void>;
  clearCompleted: () => void;
  clearAll: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { performOCR } = useOCR();
  const { createBatch, updateJobStatus } = useMailHistory();
  const { settings } = useSettings();
  const { enqueueSnackbar } = useSnackbar();

  // Update job status
  const updateJob = useCallback((jobId: string, updates: Partial<ProcessingJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  }, []);

  // Generate email content
  const generateEmailContent = async (ocrResult: OCRResult): Promise<EmailContent> => {
    try {
      const response = await apiClient.generateEmail({
        name: ocrResult.name,
        email: ocrResult.email,
        company: ocrResult.company,
        role: ocrResult.role,
      });
      return response;
    } catch (error) {
      console.error('Email generation failed:', error);
      // Fallback template
      return {
        subject: `${ocrResult.company} ${ocrResult.name}様 - ご挨拶`,
        body: `${ocrResult.name}様

先日はお時間をいただきありがとうございました。
${ocrResult.company}様の事業について大変興味深く拝聴いたしました。

ぜひ一度、詳しくお話をお聞かせいただければ幸いです。
ご都合のよろしい日時をお知らせください。

ご返信お待ちしております。`,
      };
    }
  };

  // Send email
  const sendEmail = async (job: ProcessingJob): Promise<string> => {
    if (!job.ocrResult || !job.emailContent) {
      throw new Error('OCR result or email content missing');
    }

    const response = await apiClient.send.sendEmail({
      recipient: job.ocrResult,
      templateOverrides: job.emailContent,
    });

    return response.data.messageId;
  };

  // Process single job
  const processJob = async (job: ProcessingJob) => {
    try {
      // Step 1: OCR
      updateJob(job.id, { status: 'ocr', progress: 10 });
      
      const ocrResult = await performOCR(job.file);
      updateJob(job.id, { 
        ocrResult, 
        progress: 40,
        status: 'generating' 
      });

      // Step 2: Generate email
      const emailContent = await generateEmailContent(ocrResult);
      updateJob(job.id, { 
        emailContent, 
        progress: 70,
        status: settings.autoSend ? 'sending' : 'generated'
      });

      // Step 3: Send email (if auto-send enabled)
      if (settings.autoSend) {
        const emailId = await sendEmail(job);
        updateJob(job.id, {
          emailId,
          status: 'sent',
          progress: 100,
          completedAt: new Date(),
        });
        
        enqueueSnackbar(`${ocrResult.name}様にメールを送信しました`, { variant: 'success' });
      } else {
        updateJob(job.id, {
          status: 'generated',
          progress: 100,
          completedAt: new Date(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateJob(job.id, {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      });
      
      enqueueSnackbar(`処理に失敗しました: ${errorMessage}`, { variant: 'error' });
    }
  };

  // Add files for processing
  const addFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      // Create jobs
      const newJobs: ProcessingJob[] = [];
      
      for (const file of files) {
        const thumbnail = await createThumbnail(file);
        const job: ProcessingJob = {
          id: generateId(),
          fileName: file.name,
          file,
          status: 'queued',
          progress: 0,
          thumbnailUrl: thumbnail,
          createdAt: new Date(),
        };
        newJobs.push(job);
      }
      
      setJobs(prev => [...prev, ...newJobs]);
      
      // Create history batch
      await createBatch(newJobs);
      
      // Process jobs
      const promises = newJobs.map(job => processJob(job));
      await Promise.allSettled(promises);
      
    } catch (error) {
      enqueueSnackbar('ファイル処理の開始に失敗しました', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [createBatch, settings.autoSend, enqueueSnackbar]);

  // Remove job
  const removeJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  // Retry failed job
  const retryJob = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    updateJob(jobId, {
      status: 'queued',
      progress: 0,
      error: undefined,
      completedAt: undefined,
    });
    
    await processJob(job);
  }, [jobs]);

  // Clear completed jobs
  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => 
      job.status !== 'sent' && job.status !== 'failed'
    ));
  }, []);

  // Clear all jobs
  const clearAll = useCallback(() => {
    setJobs([]);
  }, []);

  return (
    <ProcessingContext.Provider
      value={{
        jobs,
        isProcessing,
        addFiles,
        removeJob,
        retryJob,
        clearCompleted,
        clearAll,
      }}
    >
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (context === undefined) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
}