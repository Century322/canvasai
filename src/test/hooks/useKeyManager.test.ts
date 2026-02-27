import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useKeyManager } from '../../../hooks/useKeyManager';

const STORAGE_KEY = 'gemini_stored_keys';

describe('useKeyManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty keys', () => {
    const { result } = renderHook(() => useKeyManager());
    
    expect(result.current.storedKeys).toEqual([]);
  });

  it('should load keys from localStorage when loadKeys is called', () => {
    const mockKeys = [
      { id: '1', alias: 'Test Key', key: 'test-key', provider: 'google', isEnabled: true, timestamp: Date.now() }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockKeys));
    
    const { result } = renderHook(() => useKeyManager());
    
    act(() => {
      result.current.loadKeys();
    });
    
    expect(result.current.storedKeys).toHaveLength(1);
    expect(result.current.storedKeys[0].alias).toBe('Test Key');
  });

  it('should add a new key', () => {
    const { result } = renderHook(() => useKeyManager());
    
    act(() => {
      result.current.addKey({
        id: '1',
        alias: 'New Key',
        key: 'new-key',
        provider: 'google',
        isEnabled: true,
        timestamp: Date.now()
      });
    });
    
    expect(result.current.storedKeys).toHaveLength(1);
    expect(result.current.storedKeys[0].alias).toBe('New Key');
  });

  it('should toggle key enabled state', () => {
    const { result } = renderHook(() => useKeyManager());
    
    act(() => {
      result.current.addKey({
        id: '1',
        alias: 'Test Key',
        key: 'test-key',
        provider: 'google',
        isEnabled: true,
        timestamp: Date.now()
      });
    });
    
    expect(result.current.storedKeys[0].isEnabled).toBe(true);
    
    act(() => {
      result.current.toggleKey('1');
    });
    
    expect(result.current.storedKeys[0].isEnabled).toBe(false);
  });

  it('should delete a key', () => {
    const { result } = renderHook(() => useKeyManager());
    
    act(() => {
      result.current.addKey({
        id: '1',
        alias: 'Test Key',
        key: 'test-key',
        provider: 'google',
        isEnabled: true,
        timestamp: Date.now()
      });
    });
    
    expect(result.current.storedKeys).toHaveLength(1);
    
    act(() => {
      result.current.deleteKey('1');
    });
    
    expect(result.current.storedKeys).toHaveLength(0);
  });

  it('should get active key', () => {
    const { result } = renderHook(() => useKeyManager());
    
    act(() => {
      result.current.addKey({
        id: '1',
        alias: 'Disabled Key',
        key: 'disabled-key',
        provider: 'google',
        isEnabled: false,
        timestamp: Date.now()
      });
      result.current.addKey({
        id: '2',
        alias: 'Active Key',
        key: 'active-key',
        provider: 'google',
        isEnabled: true,
        timestamp: Date.now()
      });
    });
    
    const activeKey = result.current.getActiveKey();
    expect(activeKey?.alias).toBe('Active Key');
  });

  it('should return undefined when no active key exists', () => {
    const { result } = renderHook(() => useKeyManager());
    
    const activeKey = result.current.getActiveKey();
    expect(activeKey).toBeUndefined();
  });

  it('should sanitize keys with non-ASCII characters when loading', () => {
    const mockKeys = [
      { id: '1', alias: 'Test Key', key: 'test-中文-key', provider: 'google', isEnabled: true, timestamp: Date.now() }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockKeys));
    
    const { result } = renderHook(() => useKeyManager());
    
    act(() => {
      result.current.loadKeys();
    });
    
    expect(result.current.storedKeys[0].key).toBe('test--key');
  });
});
