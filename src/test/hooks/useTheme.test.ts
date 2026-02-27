import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTheme } from '../../../hooks/useTheme';

describe('useTheme', () => {
  const originalMatchMedia = window.matchMedia;
  
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('should initialize with system theme', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('should apply dark theme when system prefers dark', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should toggle theme between light and dark', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should persist theme to localStorage', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should load theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('dark');
  });
});
