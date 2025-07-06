import { useState, useCallback, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { OCRResult } from '../types';

interface OCRJob {
  id: string;
  file: File;
  resolve: (result: OCRResult) => void;
  reject: (error: Error) => void;
}

export function useOCR() {
  const { settings } = useSettings();
  const [isProcessing, setIsProcessing] = useState(false);
  const [queue, setQueue] = useState<OCRJob[]>([]);
  const workersRef = useRef<Worker[]>([]);
  const activeJobsRef = useRef<number>(0);

  // Initialize workers
  const initializeWorkers = useCallback(() => {
    if (workersRef.current.length === 0) {
      for (let i = 0; i < settings.maxParallelOCR; i++) {
        const worker = new Worker(
          new URL('../lib/ocr-worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event) => {
          const { id, result, error } = event.data;
          
          // Find the job and resolve/reject
          setQueue(prev => {
            const job = prev.find(j => j.id === id);
            if (job) {
              if (error) {
                job.reject(new Error(error));
              } else {
                job.resolve(result);
              }
            }
            return prev.filter(j => j.id !== id);
          });

          activeJobsRef.current--;
          processNextJob();
        };

        workersRef.current.push(worker);
      }
    }
  }, [settings.maxParallelOCR]);

  // Process next job in queue
  const processNextJob = useCallback(() => {
    if (activeJobsRef.current >= settings.maxParallelOCR) return;

    setQueue(prev => {
      const nextJob = prev.find(job => {
        // Find a job that hasn't been processed yet
        return true; // Simplified for now
      });

      if (nextJob) {
        activeJobsRef.current++;
        
        // Find an available worker
        const workerIndex = activeJobsRef.current % workersRef.current.length;
        const worker = workersRef.current[workerIndex];

        // Send job to worker
        const reader = new FileReader();
        reader.onload = (e) => {
          worker.postMessage({
            id: nextJob.id,
            imageData: e.target?.result,
            fileName: nextJob.file.name,
          });
        };
        reader.readAsDataURL(nextJob.file);
      }

      return prev;
    });

    // Update processing state
    setIsProcessing(queue.length > 0 || activeJobsRef.current > 0);
  }, [settings.maxParallelOCR, queue.length]);

  // Perform OCR on a single file
  const performOCR = useCallback((file: File): Promise<OCRResult> => {
    initializeWorkers();

    return new Promise((resolve, reject) => {
      const job: OCRJob = {
        id: `ocr-${Date.now()}-${Math.random()}`,
        file,
        resolve,
        reject,
      };

      setQueue(prev => [...prev, job]);
      processNextJob();
    });
  }, [initializeWorkers, processNextJob]);

  // Perform OCR on multiple files
  const performBatchOCR = useCallback(async (files: File[]): Promise<OCRResult[]> => {
    setIsProcessing(true);
    
    try {
      const promises = files.map(file => performOCR(file));
      const results = await Promise.all(promises);
      return results;
    } finally {
      setIsProcessing(false);
    }
  }, [performOCR]);

  // Cleanup
  const cleanup = useCallback(() => {
    workersRef.current.forEach(worker => worker.terminate());
    workersRef.current = [];
    setQueue([]);
    activeJobsRef.current = 0;
    setIsProcessing(false);
  }, []);

  return {
    performOCR,
    performBatchOCR,
    isProcessing,
    cleanup,
  };
}