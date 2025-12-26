/**
 * Unit tests for CollaborationProvider
 * 
 * Tests the CollaborationProvider component including:
 * - State initialization
 * - Message handling and state updates
 * - WebSocket connection management
 * - User actions (lock, unlock, cursor updates)
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  CollaborationProvider,
  useCollaborationContext,
} from '../contexts/CollaborationContext';
import { ServerMessage, CollaborationUser, NodeLock } from '../types/collaboration';

// Mock the CollaborationWebSocket
vi.mock('../services/collaborationWebSocket', () => {
  let mockInstance: any = null;

  class MockCollaborationWebSocket {
    private handlers: any = {};
    private connected = false;
    public sentMessages: any[] = [];

    constructor(config: any, handlers: any) {
      this.handlers = handlers;
      mockInstance = this;
    }

    async connect(): Promise<void> {
      this.connected = true;
      this.handlers.onStatusChange?.('connecting');
      // Simulate async connection
      await new Promise(resolve => setTimeout(resolve, 10));
      this.handlers.onStatusChange?.('connected');
      this.handlers.onConnect?.();
    }

    disconnect(): void {
      this.connected = false;
      this.handlers.onStatusChange?.('disconnected');
      this.handlers.onDisconnect?.();
    }

    send(message: any): void {
      this.sentMessages.push(message);
    }

    isConnected(): boolean {
      return this.connected;
    }

    getStatus(): string {
      return this.connected ? 'connected' : 'disconnected';
    }

    // Helper method to simulate receiving a message
    simulateMessage(message: ServerMessage): void {
      this.handlers.onMessage?.(message);
    }

    // Helper method to simulate an error
    simulateError(error: any): void {
      this.handlers.onError?.(error);
    }
  }

  return {
    CollaborationWebSocket: MockCollaborationWebSocket,
    createCollaborationWebSocket: (config: any, handlers: any) => {
      return new MockCollaborationWebSocket(config, handlers);
    },
    getMockInstance: () => mockInstance,
  };
});

// Import after mocking
const { getMockInstance } = await import('../services/collaborationWebSocket');

describe('CollaborationProvider', () => {
  const defaultProps = {
    workflowId: 'workflow-123',
    userId: 'user-1',
    userName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.activeUsers).toEqual([]);
      expect(result.current.lockedNodes.size).toBe(0);
      expect(result.current.cursors.size).toBe(0);
    });

    it('should send join message on connection', async () => {
      renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        const mockWs = getMockInstance();
        expect(mockWs).toBeDefined();
      });

      const mockWs = getMockInstance();
      
      // Should have sent join message
      await waitFor(() => {
        const joinMessage = mockWs.sentMessages.find((msg: any) => msg.type === 'join');
        expect(joinMessage).toBeDefined();
        expect(joinMessage).toEqual({
          type: 'join',
          workflowId: defaultProps.workflowId,
          userId: defaultProps.userId,
          userName: defaultProps.userName,
        });
      });
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useCollaborationContext());
      }).toThrow('useCollaborationContext must be used within a CollaborationProvider');

      console.error = originalError;
    });
  });

  describe('Message Handling - Welcome', () => {
    it('should handle welcome message with users and locks', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      const users: CollaborationUser[] = [
        {
          userId: 'user-2',
          userName: 'User 2',
          color: '#ff0000',
          cursor: { x: 100, y: 200 },
          viewport: { x: 0, y: 0, zoom: 1 },
          joinedAt: Date.now(),
          lastActivity: Date.now(),
        },
        {
          userId: 'user-3',
          userName: 'User 3',
          color: '#00ff00',
          cursor: null,
          viewport: null,
          joinedAt: Date.now(),
          lastActivity: Date.now(),
        },
      ];

      const locks: NodeLock[] = [
        {
          nodeId: 'node-1',
          ownerId: 'user-2',
          ownerName: 'User 2',
          acquiredAt: Date.now(),
          expiresAt: Date.now() + 300000,
        },
      ];

      act(() => {
        mockWs.simulateMessage({
          type: 'welcome',
          users,
          locks,
        });
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(2);
        expect(result.current.lockedNodes.size).toBe(1);
      });

      expect(result.current.activeUsers).toEqual(users);
      expect(result.current.lockedNodes.get('node-1')).toEqual(locks[0]);
    });
  });

  describe('Message Handling - User Events', () => {
    it('should handle user_joined message', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      const newUser: CollaborationUser = {
        userId: 'user-2',
        userName: 'User 2',
        color: '#ff0000',
        cursor: null,
        viewport: null,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
      };

      act(() => {
        mockWs.simulateMessage({
          type: 'user_joined',
          user: newUser,
        });
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(1);
      });

      expect(result.current.activeUsers[0]).toEqual(newUser);
    });

    it('should not add duplicate users on user_joined', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      const newUser: CollaborationUser = {
        userId: 'user-2',
        userName: 'User 2',
        color: '#ff0000',
        cursor: null,
        viewport: null,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
      };

      act(() => {
        mockWs.simulateMessage({
          type: 'user_joined',
          user: newUser,
        });
        mockWs.simulateMessage({
          type: 'user_joined',
          user: newUser,
        });
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(1);
      });
    });

    it('should handle user_left message', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      // Add users first
      const users: CollaborationUser[] = [
        {
          userId: 'user-2',
          userName: 'User 2',
          color: '#ff0000',
          cursor: { x: 100, y: 200 },
          viewport: null,
          joinedAt: Date.now(),
          lastActivity: Date.now(),
        },
        {
          userId: 'user-3',
          userName: 'User 3',
          color: '#00ff00',
          cursor: null,
          viewport: null,
          joinedAt: Date.now(),
          lastActivity: Date.now(),
        },
      ];

      act(() => {
        mockWs.simulateMessage({
          type: 'welcome',
          users,
          locks: [],
        });
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(2);
      });

      // Remove one user
      act(() => {
        mockWs.simulateMessage({
          type: 'user_left',
          userId: 'user-2',
        });
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(1);
      });

      expect(result.current.activeUsers[0].userId).toBe('user-3');
      expect(result.current.cursors.has('user-2')).toBe(false);
    });
  });

  describe('Message Handling - Cursor and Viewport', () => {
    it('should handle cursor_moved message', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      // Add a user first
      const user: CollaborationUser = {
        userId: 'user-2',
        userName: 'User 2',
        color: '#ff0000',
        cursor: null,
        viewport: null,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
      };

      act(() => {
        mockWs.simulateMessage({
          type: 'welcome',
          users: [user],
          locks: [],
        });
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(1);
      });

      // Update cursor
      const newPosition = { x: 150, y: 250 };

      act(() => {
        mockWs.simulateMessage({
          type: 'cursor_moved',
          userId: 'user-2',
          position: newPosition,
        });
      });

      await waitFor(() => {
        expect(result.current.cursors.get('user-2')).toEqual(newPosition);
      });

      // Check that user's cursor and lastActivity were updated
      const updatedUser = result.current.activeUsers.find(u => u.userId === 'user-2');
      expect(updatedUser?.cursor).toEqual(newPosition);
      expect(updatedUser?.lastActivity).toBeGreaterThan(user.lastActivity);
    });

    it('should handle viewport_changed message', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      // Add a user first
      const user: CollaborationUser = {
        userId: 'user-2',
        userName: 'User 2',
        color: '#ff0000',
        cursor: null,
        viewport: null,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
      };

      act(() => {
        mockWs.simulateMessage({
          type: 'welcome',
          users: [user],
          locks: [],
        });
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toHaveLength(1);
      });

      // Update viewport
      const newViewport = { x: 100, y: 200, zoom: 1.5 };

      act(() => {
        mockWs.simulateMessage({
          type: 'viewport_changed',
          userId: 'user-2',
          viewport: newViewport,
        });
      });

      await waitFor(() => {
        const updatedUser = result.current.activeUsers.find(u => u.userId === 'user-2');
        expect(updatedUser?.viewport).toEqual(newViewport);
      });
    });
  });

  describe('Message Handling - Locks', () => {
    it('should handle lock_acquired message', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      const lock: NodeLock = {
        nodeId: 'node-1',
        ownerId: 'user-2',
        ownerName: 'User 2',
        acquiredAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      act(() => {
        mockWs.simulateMessage({
          type: 'lock_acquired',
          nodeId: 'node-1',
          lock,
        });
      });

      await waitFor(() => {
        expect(result.current.lockedNodes.size).toBe(1);
      });

      expect(result.current.lockedNodes.get('node-1')).toEqual(lock);
      expect(result.current.isNodeLocked('node-1')).toBe(true);
      expect(result.current.getNodeLockOwner('node-1')).toBe('user-2');
    });

    it('should handle lock_released message', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      // Add a lock first
      const lock: NodeLock = {
        nodeId: 'node-1',
        ownerId: 'user-2',
        ownerName: 'User 2',
        acquiredAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      act(() => {
        mockWs.simulateMessage({
          type: 'lock_acquired',
          nodeId: 'node-1',
          lock,
        });
      });

      await waitFor(() => {
        expect(result.current.lockedNodes.size).toBe(1);
      });

      // Release the lock
      act(() => {
        mockWs.simulateMessage({
          type: 'lock_released',
          nodeId: 'node-1',
        });
      });

      await waitFor(() => {
        expect(result.current.lockedNodes.size).toBe(0);
      });

      expect(result.current.isNodeLocked('node-1')).toBe(false);
      expect(result.current.getNodeLockOwner('node-1')).toBe(null);
    });
  });

  describe('User Actions', () => {
    it('should send lock request', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      act(() => {
        result.current.lockNode('node-1');
      });

      await waitFor(() => {
        const lockRequest = mockWs.sentMessages.find((msg: any) => msg.type === 'lock_request');
        expect(lockRequest).toBeDefined();
      });

      const lockRequest = mockWs.sentMessages.find((msg: any) => msg.type === 'lock_request');
      expect(lockRequest).toEqual({
        type: 'lock_request',
        nodeId: 'node-1',
      });
    });

    it('should send unlock request', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      act(() => {
        result.current.unlockNode('node-1');
      });

      await waitFor(() => {
        const unlockRequest = mockWs.sentMessages.find((msg: any) => msg.type === 'lock_release');
        expect(unlockRequest).toBeDefined();
      });

      const unlockRequest = mockWs.sentMessages.find((msg: any) => msg.type === 'lock_release');
      expect(unlockRequest).toEqual({
        type: 'lock_release',
        nodeId: 'node-1',
      });
    });

    it('should send cursor update', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      const position = { x: 100, y: 200 };

      act(() => {
        result.current.updateCursor(position);
      });

      await waitFor(() => {
        const cursorUpdate = mockWs.sentMessages.find((msg: any) => msg.type === 'cursor_update');
        expect(cursorUpdate).toBeDefined();
      });

      const cursorUpdate = mockWs.sentMessages.find((msg: any) => msg.type === 'cursor_update');
      expect(cursorUpdate).toEqual({
        type: 'cursor_update',
        position,
      });
    });

    it('should send viewport update', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      const viewport = { x: 100, y: 200, zoom: 1.5 };

      act(() => {
        result.current.updateViewport(viewport);
      });

      await waitFor(() => {
        const viewportUpdate = mockWs.sentMessages.find((msg: any) => msg.type === 'viewport_update');
        expect(viewportUpdate).toBeDefined();
      });

      const viewportUpdate = mockWs.sentMessages.find((msg: any) => msg.type === 'viewport_update');
      expect(viewportUpdate).toEqual({
        type: 'viewport_update',
        viewport,
      });
    });

    it('should broadcast workflow change', async () => {
      const { result } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWs = getMockInstance();

      const change = {
        id: 'change-1',
        type: 'node_add' as const,
        workflowId: 'workflow-123',
        userId: 'user-1',
        timestamp: Date.now(),
        data: { nodeId: 'node-1' },
      };

      act(() => {
        result.current.broadcastChange(change);
      });

      await waitFor(() => {
        const changeMessage = mockWs.sentMessages.find((msg: any) => msg.type === 'change');
        expect(changeMessage).toBeDefined();
      });

      const changeMessage = mockWs.sentMessages.find((msg: any) => msg.type === 'change');
      expect(changeMessage).toEqual({
        type: 'change',
        change,
      });
    });
  });

  describe('Cleanup', () => {
    it('should send leave message on unmount', async () => {
      const { unmount } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        const mockWs = getMockInstance();
        expect(mockWs).toBeDefined();
      });

      const mockWs = getMockInstance();

      unmount();

      await waitFor(() => {
        const leaveMessage = mockWs.sentMessages.find((msg: any) => msg.type === 'leave');
        expect(leaveMessage).toBeDefined();
      });

      const leaveMessage = mockWs.sentMessages.find((msg: any) => msg.type === 'leave');
      expect(leaveMessage).toEqual({
        type: 'leave',
        workflowId: defaultProps.workflowId,
        userId: defaultProps.userId,
      });
    });

    it('should disconnect WebSocket on unmount', async () => {
      const { unmount } = renderHook(() => useCollaborationContext(), {
        wrapper: ({ children }) => (
          <CollaborationProvider {...defaultProps}>
            {children}
          </CollaborationProvider>
        ),
      });

      await waitFor(() => {
        const mockWs = getMockInstance();
        expect(mockWs.isConnected()).toBe(true);
      });

      const mockWs = getMockInstance();

      unmount();

      await waitFor(() => {
        expect(mockWs.isConnected()).toBe(false);
      });
    });
  });
});
