import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, set, entries } from 'idb-keyval';
import { MailHistory, ProcessingJob } from '../types';

const HISTORY_KEY_PREFIX = 'mail_history_';
const MAX_HISTORY_ITEMS = 100;

export function useMailHistory() {
  const queryClient = useQueryClient();

  // Fetch all history items
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['mailHistory'],
    queryFn: async () => {
      const allEntries = await entries();
      const historyEntries = allEntries
        .filter(([key]) => key.toString().startsWith(HISTORY_KEY_PREFIX))
        .map(([, value]) => value as MailHistory)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, MAX_HISTORY_ITEMS);
      
      return historyEntries;
    },
  });

  // Add new history item
  const addHistoryMutation = useMutation({
    mutationFn: async (newHistory: MailHistory) => {
      const key = `${HISTORY_KEY_PREFIX}${newHistory.id}`;
      await set(key, newHistory);
      
      // Clean up old entries
      const allEntries = await entries();
      const historyKeys = allEntries
        .filter(([key]) => key.toString().startsWith(HISTORY_KEY_PREFIX))
        .map(([key]) => key.toString())
        .sort()
        .reverse();
      
      // Remove entries beyond limit
      if (historyKeys.length > MAX_HISTORY_ITEMS) {
        const keysToRemove = historyKeys.slice(MAX_HISTORY_ITEMS);
        for (const key of keysToRemove) {
          await set(key, undefined);
        }
      }
      
      return newHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mailHistory'] });
    },
  });

  // Update existing history item
  const updateHistoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MailHistory> }) => {
      const key = `${HISTORY_KEY_PREFIX}${id}`;
      const existing = await get(key) as MailHistory | undefined;
      
      if (!existing) {
        throw new Error('History item not found');
      }
      
      const updated = { ...existing, ...updates };
      await set(key, updated);
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mailHistory'] });
    },
  });

  // Get history item by ID
  const getHistoryById = useCallback(async (id: string): Promise<MailHistory | null> => {
    const key = `${HISTORY_KEY_PREFIX}${id}`;
    const item = await get(key) as MailHistory | undefined;
    return item || null;
  }, []);

  // Create new batch
  const createBatch = useCallback(async (jobs: ProcessingJob[]): Promise<MailHistory> => {
    const newHistory: MailHistory = {
      id: `batch_${Date.now()}`,
      createdAt: new Date(),
      totalCount: jobs.length,
      successCount: 0,
      failedCount: 0,
      jobs,
    };
    
    await addHistoryMutation.mutateAsync(newHistory);
    return newHistory;
  }, [addHistoryMutation]);

  // Update job status
  const updateJobStatus = useCallback(async (
    historyId: string,
    jobId: string,
    updates: Partial<ProcessingJob>
  ) => {
    const history = await getHistoryById(historyId);
    if (!history) return;
    
    const jobIndex = history.jobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;
    
    history.jobs[jobIndex] = { ...history.jobs[jobIndex], ...updates };
    
    // Recalculate counts
    history.successCount = history.jobs.filter(j => j.status === 'sent').length;
    history.failedCount = history.jobs.filter(j => j.status === 'failed').length;
    
    await updateHistoryMutation.mutateAsync({
      id: historyId,
      updates: history,
    });
  }, [getHistoryById, updateHistoryMutation]);

  // Calculate statistics
  const stats = {
    total: history.reduce((sum, h) => sum + h.totalCount, 0),
    sent: history.reduce((sum, h) => sum + h.successCount, 0),
    failed: history.reduce((sum, h) => sum + h.failedCount, 0),
  };

  return {
    history,
    isLoading,
    stats,
    createBatch,
    updateJobStatus,
    getHistoryById,
  };
}