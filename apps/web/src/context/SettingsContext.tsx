import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { get, set } from 'idb-keyval';

interface Settings {
  gptModel: 'gpt-4-turbo-preview' | 'gpt-4' | 'gpt-3.5-turbo';
  emailLength: 'short' | 'medium' | 'long';
  language: 'ja' | 'en';
  autoSend: boolean;
  maxParallelOCR: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

const defaultSettings: Settings = {
  gptModel: 'gpt-4-turbo-preview',
  emailLength: 'medium',
  language: 'ja',
  autoSend: true,
  maxParallelOCR: 4,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Load settings from IndexedDB
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await get('app_settings');
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...savedSettings });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await set('app_settings', updated);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}