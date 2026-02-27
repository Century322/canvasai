import { useState, useCallback } from 'react';
import { StoredKey } from '../types';

const STORAGE_KEY = 'gemini_stored_keys';

const sanitizeKey = (str: string): string => {
  return (str || "").replace(/[\u0080-\uFFFF]/g, "").trim();
};

export const useKeyManager = () => {
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);

  const loadKeys = useCallback(() => {
    const localKeys = localStorage.getItem(STORAGE_KEY);
    if (localKeys) {
      try {
        const parsedKeys: StoredKey[] = JSON.parse(localKeys);
        const sanitizedKeys = parsedKeys.map(k => ({
          ...k,
          key: sanitizeKey(k.key),
          baseUrl: sanitizeKey(k.baseUrl || "")
        }));
        setStoredKeys(sanitizedKeys);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedKeys));
        return sanitizedKeys;
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  const addKey = useCallback((key: StoredKey) => {
    setStoredKeys(prev => {
      const next = [...prev, key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleKey = useCallback((id: string) => {
    setStoredKeys(prev => {
      const next = prev.map(k => k.id === id ? { ...k, isEnabled: !k.isEnabled } : k);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteKey = useCallback((id: string) => {
    setStoredKeys(prev => {
      const next = prev.filter(k => k.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateKey = useCallback((id: string, updates: Partial<StoredKey>) => {
    setStoredKeys(prev => {
      const next = prev.map(k => k.id === id ? { ...k, ...updates } : k);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getActiveKey = useCallback(() => {
    return storedKeys.find(k => k.isEnabled);
  }, [storedKeys]);

  return {
    storedKeys,
    setStoredKeys,
    loadKeys,
    addKey,
    toggleKey,
    deleteKey,
    updateKey,
    getActiveKey
  };
};
