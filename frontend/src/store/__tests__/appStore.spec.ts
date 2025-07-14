import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../appStore';
import { describe, it, expect } from 'vitest';

describe('appStore', () => {
  it('sets current view', () => {
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setCurrentView('players');
    });
    expect(result.current.currentView).toBe('players');
  });
});
