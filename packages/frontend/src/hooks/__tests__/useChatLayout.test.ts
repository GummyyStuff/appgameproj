import { renderHook, act } from '@testing-library/react';
import { useChatLayout } from '../useChatLayout';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useChatLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('initializes with default state when no localStorage data exists', () => {
    const { result } = renderHook(() => useChatLayout());

    expect(result.current.chatState).toEqual({
      isCollapsed: false,
      isVisible: true,
      position: 'right',
    });
    expect(result.current.isCollapsed).toBe(false);
    expect(result.current.isVisible).toBe(true);
    expect(result.current.position).toBe('right');
  });

  it('loads initial state from localStorage when available', () => {
    const savedState = {
      isCollapsed: true,
      isVisible: false,
      position: 'left',
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

    const { result } = renderHook(() => useChatLayout());

    expect(result.current.chatState).toEqual(savedState);
    expect(result.current.isCollapsed).toBe(true);
    expect(result.current.isVisible).toBe(false);
    expect(result.current.position).toBe('left');
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');
    console.warn = jest.fn(); // Mock console.warn

    const { result } = renderHook(() => useChatLayout());

    expect(result.current.chatState).toEqual({
      isCollapsed: false,
      isVisible: true,
      position: 'right',
    });
    expect(console.warn).toHaveBeenCalledWith('Failed to load chat layout state:', expect.any(Error));
  });

  it('toggles chat collapsed state', () => {
    const { result } = renderHook(() => useChatLayout());

    act(() => {
      result.current.toggleChat();
    });

    expect(result.current.isCollapsed).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tarkov-casino-chat-layout',
      JSON.stringify({
        isCollapsed: true,
        isVisible: true,
        position: 'right',
      })
    );

    act(() => {
      result.current.toggleChat();
    });

    expect(result.current.isCollapsed).toBe(false);
  });

  it('hides chat', () => {
    const { result } = renderHook(() => useChatLayout());

    act(() => {
      result.current.hideChat();
    });

    expect(result.current.isVisible).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tarkov-casino-chat-layout',
      JSON.stringify({
        isCollapsed: false,
        isVisible: false,
        position: 'right',
      })
    );
  });

  it('shows chat', () => {
    const { result } = renderHook(() => useChatLayout());

    // First hide it
    act(() => {
      result.current.hideChat();
    });

    // Then show it
    act(() => {
      result.current.showChat();
    });

    expect(result.current.isVisible).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      'tarkov-casino-chat-layout',
      JSON.stringify({
        isCollapsed: false,
        isVisible: true,
        position: 'right',
      })
    );
  });

  it('sets chat position', () => {
    const { result } = renderHook(() => useChatLayout());

    act(() => {
      result.current.setPosition('left');
    });

    expect(result.current.position).toBe('left');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tarkov-casino-chat-layout',
      JSON.stringify({
        isCollapsed: false,
        isVisible: true,
        position: 'left',
      })
    );
  });

  it('persists state changes to localStorage', () => {
    const { result } = renderHook(() => useChatLayout());

    act(() => {
      result.current.toggleChat();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tarkov-casino-chat-layout',
      expect.stringContaining('"isCollapsed":true')
    );

    act(() => {
      result.current.setPosition('left');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tarkov-casino-chat-layout',
      expect.stringContaining('"position":"left"')
    );
  });

  it('handles localStorage write errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    console.warn = jest.fn(); // Mock console.warn

    const { result } = renderHook(() => useChatLayout());

    act(() => {
      result.current.toggleChat();
    });

    expect(console.warn).toHaveBeenCalledWith('Failed to save chat layout state:', expect.any(Error));
    // State should still update even if localStorage fails
    expect(result.current.isCollapsed).toBe(true);
  });

  it('provides correct convenience properties', () => {
    const { result } = renderHook(() => useChatLayout());

    expect(result.current.isCollapsed).toBe(result.current.chatState.isCollapsed);
    expect(result.current.isVisible).toBe(result.current.chatState.isVisible);
    expect(result.current.position).toBe(result.current.chatState.position);

    act(() => {
      result.current.toggleChat();
    });

    expect(result.current.isCollapsed).toBe(result.current.chatState.isCollapsed);
  });
});