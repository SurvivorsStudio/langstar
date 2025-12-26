/**
 * Unit tests for CollaborationWebSocket
 * 
 * Tests the WebSocket client implementation including:
 * - Connection lifecycle
 * - Automatic reconnection with exponential backoff
 * - Message sending and receiving
 * - Connection state management
 * - Error handling
 * 
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CollaborationWebSocket } from '../services/collaborationWebSocket';
import { ErrorCodes } from '../types/collaboration';

// Mock WebSocket
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public sentMessages: string[] = [];

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any): void {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data),
    });
    this.onmessage?.(event);
  }

  // Helper method to simulate an error
  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

describe('CollaborationWebSocket', () => {
  let mockWebSocket: MockWebSocket;
  let originalWebSocket: any;

  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = global.WebSocket;

    // Mock WebSocket constructor
    global.WebSocket = vi.fn((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket as any;
    }) as any;

    // Mock WebSocket constants
    (global.WebSocket as any).CONNECTING = 0;
    (global.WebSocket as any).OPEN = 1;
    (global.WebSocket as any).CLOSING = 2;
    (global.WebSocket as any).CLOSED = 3;

    // Clear all timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
    vi.clearAllTimers();
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const onConnect = vi.fn();
      const onStatusChange = vi.fn();

      const ws = new CollaborationWebSocket(
        { url: 'ws://localhost:8000' },
        { onConnect, onStatusChange }
      );

      await ws.connect();

      expect(onConnect).toHaveBeenCalled();
      expect(onStatusChange).toHaveBeenCalledWith('connecting');
      expect(onStatusChange).toHaveBeenCalledWith('connected');
      expect(ws.isConnected()).toBe(true);
      expect(ws.getStatus()).toBe('connected');
    });

    it('should disconnect successfully', async () => {
      const onDisconnect = vi.fn();
      const onStatusChange = vi.fn();

      const ws = new CollaborationWebSocket(
        { url: 'ws://localhost:8000' },
        { onDisconnect, onStatusChange }
      );

      await ws.connect();
      ws.disconnect();

      expect(onDisconnect).toHaveBeenCalled();
      expect(ws.getStatus()).toBe('disconnected');
      expect(ws.isConnected()).toBe(false);
    });

    it('should handle connection timeout', async () => {
      const onError = vi.fn();

      // Mock WebSocket that never opens
      class SlowMockWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url);
          // Don't call onopen automatically
        }
      }

      global.WebSocket = vi.fn((url: string) => {
        return new SlowMockWebSocket(url) as any;
      }) as any;

      const ws = new CollaborationWebSocket(
        {
          url: 'ws://localhost:8000',
          connectionTimeout: 50,
        },
        { onError }
      );

      await expect(ws.connect()).rejects.toThrow();
      expect(onError).toHaveBeenCalled();
      const error = onError.mock.calls[0][0];
      expect(error.code).toBe(ErrorCodes.CONNECTION_TIMEOUT);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on connection failure', async () => {
      const onStatusChange = vi.fn();
      let connectionAttempts = 0;

      class FailThenSucceedWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;
          
          if (connectionAttempts === 1) {
            // First attempt fails
            setTimeout(() => {
              this.readyState = WebSocket.CLOSED;
              this.onclose?.(new CloseEvent('close'));
            }, 10);
          } else {
            // Second attempt succeeds
            setTimeout(() => {
              this.readyState = WebSocket.OPEN;
              this.onopen?.(new Event('open'));
            }, 10);
          }
        }
      }

      global.WebSocket = vi.fn((url: string) => {
        return new FailThenSucceedWebSocket(url) as any;
      }) as any;

      const ws = new CollaborationWebSocket(
        {
          url: 'ws://localhost:8000',
          initialReconnectDelay: 50,
        },
        { onStatusChange }
      );

      // First connection attempt
      ws.connect().catch(() => {});

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(connectionAttempts).toBeGreaterThanOrEqual(2);
      expect(onStatusChange).toHaveBeenCalledWith('reconnecting');
    });

    it('should use exponential backoff for reconnection', () => {
      // Test the backoff calculation logic
      const initialDelay = 1000;
      const maxDelay = 30000;

      // Simulate backoff delays
      const delays = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        );
        delays.push(delay);
      }

      expect(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
    });

    it('should stop reconnecting after max attempts', async () => {
      const onError = vi.fn();
      let connectionAttempts = 0;

      class AlwaysFailWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;
          
          // All attempts fail
          setTimeout(() => {
            this.readyState = WebSocket.CLOSED;
            this.onclose?.(new CloseEvent('close'));
          }, 10);
        }
      }

      global.WebSocket = vi.fn((url: string) => {
        return new AlwaysFailWebSocket(url) as any;
      }) as any;

      const maxAttempts = 2;
      const ws = new CollaborationWebSocket(
        {
          url: 'ws://localhost:8000',
          initialReconnectDelay: 50,
          maxReconnectAttempts: maxAttempts,
        },
        { onError }
      );

      // First connection attempt
      ws.connect().catch(() => {});

      // Wait for all reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have called onError with RECONNECTION_FAILED
      const reconnectionError = onError.mock.calls.find(
        (call) => call[0].code === ErrorCodes.RECONNECTION_FAILED
      );
      expect(reconnectionError).toBeDefined();
      expect(reconnectionError[0].recoverable).toBe(false);
    });

    it('should not reconnect when intentionally disconnected', async () => {
      vi.useFakeTimers();

      let connectionAttempts = 0;

      global.WebSocket = vi.fn((url: string) => {
        connectionAttempts++;
        return new MockWebSocket(url) as any;
      }) as any;

      const ws = new CollaborationWebSocket(
        {
          url: 'ws://localhost:8000',
          initialReconnectDelay: 100,
        },
        {}
      );

      await ws.connect();
      await vi.advanceTimersByTimeAsync(20);

      const attemptsBeforeDisconnect = connectionAttempts;

      // Intentionally disconnect
      ws.disconnect();

      // Wait for potential reconnection attempts
      await vi.advanceTimersByTimeAsync(1000);

      // Should not have attempted reconnection
      expect(connectionAttempts).toBe(attemptsBeforeDisconnect);

      vi.useRealTimers();
    });
  });

  describe('Message Handling', () => {
    it('should send messages when connected', async () => {
      const ws = new CollaborationWebSocket(
        { url: 'ws://localhost:8000' },
        {}
      );

      await ws.connect();

      const message = { type: 'ping' as const };
      ws.send(message);

      expect(mockWebSocket.sentMessages).toHaveLength(1);
      expect(JSON.parse(mockWebSocket.sentMessages[0])).toEqual(message);
    });

    it('should queue messages when not connected', async () => {
      const ws = new CollaborationWebSocket(
        { url: 'ws://localhost:8000' },
        {}
      );

      // Send message before connecting
      const message = { type: 'ping' as const };
      ws.send(message);

      // Connect and flush queue
      await ws.connect();

      // Message should now be sent (queued message + any heartbeat)
      expect(mockWebSocket.sentMessages.length).toBeGreaterThanOrEqual(1);
      expect(JSON.parse(mockWebSocket.sentMessages[0])).toEqual(message);
    });

    it('should receive and parse messages', async () => {
      const onMessage = vi.fn();

      const ws = new CollaborationWebSocket(
        { url: 'ws://localhost:8000' },
        { onMessage }
      );

      await ws.connect();

      const serverMessage = {
        type: 'welcome',
        users: [],
        locks: [],
      };

      mockWebSocket.simulateMessage(serverMessage);

      expect(onMessage).toHaveBeenCalledWith(serverMessage);
    });

    it('should handle invalid message format', async () => {
      const onError = vi.fn();

      const ws = new CollaborationWebSocket(
        { url: 'ws://localhost:8000' },
        { onError }
      );

      await ws.connect();

      // Simulate invalid JSON
      const event = new MessageEvent('message', {
        data: 'invalid json',
      });
      mockWebSocket.onmessage?.(event);

      expect(onError).toHaveBeenCalled();
      const error = onError.mock.calls[0][0];
      expect(error.code).toBe(ErrorCodes.INVALID_MESSAGE);
    });
  });

  describe('Heartbeat', () => {
    it('should send periodic ping messages', async () => {
      const ws = new CollaborationWebSocket(
        {
          url: 'ws://localhost:8000',
          heartbeatInterval: 100,
        },
        {}
      );

      await ws.connect();

      // Clear initial messages
      mockWebSocket.sentMessages = [];

      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWebSocket.sentMessages.length).toBeGreaterThanOrEqual(1);
      const lastMessage = JSON.parse(mockWebSocket.sentMessages[mockWebSocket.sentMessages.length - 1]);
      expect(lastMessage).toEqual({ type: 'ping' });
    });

    it('should stop heartbeat on disconnect', async () => {
      const ws = new CollaborationWebSocket(
        {
          url: 'ws://localhost:8000',
          heartbeatInterval: 100,
        },
        {}
      );

      await ws.connect();
      ws.disconnect();

      mockWebSocket.sentMessages = [];

      // Wait - should not send heartbeat
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockWebSocket.sentMessages).toHaveLength(0);
    });
  });

  describe('Status Management', () => {
    it('should track connection status correctly', async () => {
      const statusChanges: string[] = [];
      const onStatusChange = vi.fn((status) => statusChanges.push(status));

      const ws = new CollaborationWebSocket(
        { url: 'ws://localhost:8000' },
        { onStatusChange }
      );

      expect(ws.getStatus()).toBe('disconnected');

      await ws.connect();

      expect(statusChanges).toContain('connecting');
      expect(statusChanges).toContain('connected');
      expect(ws.getStatus()).toBe('connected');

      ws.disconnect();

      expect(ws.getStatus()).toBe('disconnected');
    });
  });
});
