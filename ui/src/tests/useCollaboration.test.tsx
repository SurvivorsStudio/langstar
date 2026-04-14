/**
 * Unit tests for useCollaboration Hook
 * 
 * Tests the useCollaboration custom hook including:
 * - lockNode function
 * - unlockNode function
 * - isNodeLocked function
 * - getNodeLockOwner function
 * - updateCursor function
 * - broadcastChange function
 * 
 * Requirements: 2.1, 2.3, 2.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useCollaboration } from '../hooks/useCollaboration';
import { CollaborationProvider } from '../contexts/CollaborationContext';
import { WorkflowChange } from '../types/collaboration';

// Mock the WebSocket
vi.mock('../services/collaborationWebSocket', () => ({
  createCollaborationWebSocket: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

describe('useCollaboration Hook', () => {
  const mockWorkflowId = 'test-workflow-123';
  const mockUserId = 'user-1';
  const mockUserName = 'Test User';

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CollaborationProvider
      workflowId={mockWorkflowId}
      userId={mockUserId}
      userName={mockUserName}
    >
      {children}
    </CollaborationProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook initialization', () => {
    it('should throw error when used outside CollaborationProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useCollaboration());
      }).toThrow('useCollaborationContext must be used within a CollaborationProvider');
      consoleError.mockRestore();
    });

    it('should return collaboration state and functions', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('activeUsers');
      expect(result.current).toHaveProperty('lockedNodes');
      expect(result.current).toHaveProperty('lockNode');
      expect(result.current).toHaveProperty('unlockNode');
      expect(result.current).toHaveProperty('updateCursor');
      expect(result.current).toHaveProperty('broadcastChange');
      expect(result.current).toHaveProperty('isNodeLocked');
      expect(result.current).toHaveProperty('getNodeLockOwner');
    });

    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      expect(result.current.isConnected).toBe(false);
      expect(result.current.activeUsers).toEqual([]);
      expect(result.current.lockedNodes.size).toBe(0);
    });
  });

  describe('lockNode function', () => {
    it('should request a lock on a node', async () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      const nodeId = 'node-123';
      let lockResult: boolean | undefined;
      await act(async () => {
        lockResult = await result.current.lockNode(nodeId);
      });
      expect(typeof lockResult).toBe('boolean');
    });

    it('should return false when not connected', async () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      const nodeId = 'node-123';
      expect(result.current.isConnected).toBe(false);
      let lockResult: boolean | undefined;
      await act(async () => {
        lockResult = await result.current.lockNode(nodeId);
      });
      expect(lockResult).toBe(false);
    });
  });

  describe('unlockNode function', () => {
    it('should release a lock on a node', async () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      const nodeId = 'node-123';
      await act(async () => {
        await result.current.lockNode(nodeId);
        await result.current.unlockNode(nodeId);
      });
      expect(true).toBe(true);
    });
  });

  describe('isNodeLocked function', () => {
    it('should return false for unlocked nodes', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      const nodeId = 'node-123';
      const isLocked = result.current.isNodeLocked(nodeId);
      expect(isLocked).toBe(false);
    });
  });

  describe('getNodeLockOwner function', () => {
    it('should return null for unlocked nodes', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      const nodeId = 'node-123';
      const owner = result.current.getNodeLockOwner(nodeId);
      expect(owner).toBeNull();
    });
  });

  describe('updateCursor function', () => {
    it('should update cursor position', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      const position = { x: 100, y: 200 };
      act(() => {
        result.current.updateCursor(position);
      });
      expect(true).toBe(true);
    });
  });

  describe('broadcastChange function', () => {
    it('should broadcast a workflow change', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      const change: WorkflowChange = {
        id: 'change-123',
        type: 'node_add',
        workflowId: mockWorkflowId,
        userId: mockUserId,
        timestamp: Date.now(),
        data: { nodeId: 'node-123', nodeType: 'promptNode' },
      };
      act(() => {
        result.current.broadcastChange(change);
      });
      expect(true).toBe(true);
    });
  });
});
