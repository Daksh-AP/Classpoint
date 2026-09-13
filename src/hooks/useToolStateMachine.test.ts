import { renderHook, act } from '@testing-library/react';
import { useToolStateMachine } from './useToolStateMachine';

describe('useToolStateMachine', () => {
  it('initializes with no active tool', () => {
    const { result } = renderHook(() => useToolStateMachine());
    expect(result.current.activeTool).toBeNull();
    expect(result.current.toolPayload).toBeNull();
  });

  it('opens a tool and sets payload', () => {
    const { result } = renderHook(() => useToolStateMachine());
    
    act(() => {
      result.current.openTool('browser', 'https://google.com');
    });

    expect(result.current.activeTool).toBe('browser');
    expect(result.current.toolPayload).toBe('https://google.com');
  });

  it('closes tool and resets payload', () => {
    const { result } = renderHook(() => useToolStateMachine());
    
    act(() => {
      result.current.openTool('whiteboard', undefined);
    });
    
    expect(result.current.activeTool).toBe('whiteboard');

    act(() => {
      result.current.closeTool();
    });

    expect(result.current.activeTool).toBeNull();
    expect(result.current.toolPayload).toBeNull();
  });
});
