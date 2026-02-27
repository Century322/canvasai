import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setResolvedTheme(isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const isDark = theme === 'system' ? mediaQuery.matches : theme === 'dark';
    applyTheme(isDark);

    if (theme === 'system') {
      const handleChange = () => {
        applyTheme(mediaQuery.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  const setThemeWithStorage = useCallback((newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeWithStorage,
    toggleTheme,
  };
};
