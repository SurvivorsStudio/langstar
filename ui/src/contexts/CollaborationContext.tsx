/**
 * CollaborationContext
 * 
 * React Context Provider for real-time collaboration features.
 * Manages WebSocket connection, collaboration state, and provides
 * collaboration functionality to child components.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  CollaborationProviderProps,
  CollaborationState,
  CollaborationUser,
  NodeLock,
  CursorPosition,
  ServerMessage,
  CollaborationError,
  ConnectionStatus,
  WorkflowChange,
} from '../types/collaboration';
import {
  CollaborationWebSocket,
  createCollaborationWebSocket,
  WebSocketConfig,
} from '../services/collaborationWebSocket';

/**
 * Context value interface
 */
interface CollaborationContextValue extends CollaborationState {
  // Actions
  lockNode: (nodeId: string) => Promise<boolean>;
  unlockNode: (nodeId: string) => Promise<void>;
  updateCursor: (position: { x: number; y: number }) => void;
  updateViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  broadcastChange: (change: WorkflowChange) => void;
  
  // Utilities
  isNodeLocked: (nodeId: string) => boolean;
  getNodeLockOwner: (nodeId: string) => string | null;
  
  // Connection management
  reconnect: () => Promise<void>;
}

/**
 * Collaboration Context
 */
const CollaborationContext = createContext<CollaborationContextValue | null>(null);

/**
 * CollaborationProvider Component
 * 
 * Provides real-time collaboration functionality to child components.
 * Manages WebSocket connection, handles server messages, and maintains
 * collaboration state (active users, locked nodes, cursors).
 */
export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  workflowId,
  userId,
  userName,
  children,
}) => {
  // WebSocket instance
  const wsRef = useRef<CollaborationWebSocket | null>(null);
  
  // Collaboration state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [lockedNodes, setLockedNodes] = useState<Map<string, NodeLock>>(new Map());
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());

  /**
   * Handle incoming server messages
   */
  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'welcome':
        // Initial state when joining a session
        setActiveUsers(message.users);
        setLockedNodes(new Map(message.locks.map(lock => [lock.nodeId, lock])));
        break;

      case 'user_joined':
        // Add new user to active users list
        setActiveUsers(prev => {
          // Avoid duplicates
          if (prev.some(u => u.userId === message.user.userId)) {
            return prev;
          }
          return [...prev, message.user];
        });
        break;

      case 'user_left':
        // Remove user from active users list
        setActiveUsers(prev => prev.filter(u => u.userId !== message.userId));
        // Remove user's cursor
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(message.userId);
          return newCursors;
        });
        break;

      case 'cursor_moved':
        // Update user's cursor position
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(message.userId, message.position);
          return newCursors;
        });
        // Update user's last activity
        setActiveUsers(prev =>
          prev.map(u =>
            u.userId === message.userId
              ? { ...u, cursor: message.position, lastActivity: Date.now() }
              : u
          )
        );
        break;

      case 'viewport_changed':
        // Update user's viewport
        setActiveUsers(prev =>
          prev.map(u =>
            u.userId === message.userId
              ? { ...u, viewport: message.viewport, lastActivity: Date.now() }
              : u
          )
        );
        break;

      case 'lock_acquired':
        // Add node lock
        setLockedNodes(prev => {
          const newLocks = new Map(prev);
          newLocks.set(message.nodeId, message.lock);
          return newLocks;
        });
        break;

      case 'lock_released':
        // Remove node lock
        setLockedNodes(prev => {
          const newLocks = new Map(prev);
          newLocks.delete(message.nodeId);
          return newLocks;
        });
        break;

      case 'lock_failed':
        // Lock acquisition failed - could show notification
        console.warn(`Lock failed for node ${message.nodeId}: ${message.reason}`);
        break;

      case 'change_applied':
        // Workflow change was applied - handled by FlowStore integration
        // This is just for acknowledgment
        break;

      case 'sync_required':
        // Server requests full state sync
        // This would trigger a full state reload
        console.log('Sync required, state:', message.state);
        break;

      case 'error':
        // Server error
        console.error('Collaboration error:', message.message);
        break;

      case 'pong':
        // Heartbeat response - connection is alive
        break;

      default:
        console.warn('Unknown message type:', (message as any).type);
    }
  }, []);

  /**
   * Handle connection status changes
   */
  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    setIsConnected(status === 'connected');
  }, []);

  /**
   * Handle WebSocket errors
   */
  const handleError = useCallback((error: CollaborationError) => {
    console.error('Collaboration error:', error.message, error.code);
    // Could show user notification here
  }, []);

  /**
   * Handle successful connection
   */
  const handleConnect = useCallback(() => {
    // Send join message
    if (wsRef.current) {
      wsRef.current.send({
        type: 'join',
        workflowId,
        userId,
        userName,
      });
    }
  }, [workflowId, userId, userName]);

  /**
   * Handle disconnection
   */
  const handleDisconnect = useCallback(() => {
    // Clean up state on disconnect
    setActiveUsers([]);
    setLockedNodes(new Map());
    setCursors(new Map());
  }, []);

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    // Get WebSocket URL from environment or use default
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/collaboration';
    const fullUrl = `${wsUrl}/${workflowId}`;

    const config: WebSocketConfig = {
      url: fullUrl,
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      connectionTimeout: 30000,
      heartbeatInterval: 30000,
    };

    const ws = createCollaborationWebSocket(config, {
      onMessage: handleMessage,
      onStatusChange: handleStatusChange,
      onError: handleError,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
    });

    wsRef.current = ws;

    // Connect to WebSocket
    ws.connect().catch((error) => {
      console.error('Failed to connect:', error);
    });

    // Cleanup on unmount
    return () => {
      // Send leave message before disconnecting
      if (ws.isConnected()) {
        ws.send({
          type: 'leave',
          workflowId,
          userId,
        });
      }
      ws.disconnect();
      wsRef.current = null;
    };
  }, [workflowId, userId, userName, handleMessage, handleStatusChange, handleError, handleConnect, handleDisconnect]);

  /**
   * Request a lock on a node
   */
  const lockNode = useCallback(async (nodeId: string): Promise<boolean> => {
    if (!wsRef.current?.isConnected()) {
      return false;
    }

    return new Promise((resolve) => {
      // Send lock request
      wsRef.current!.send({
        type: 'lock_request',
        nodeId,
      });

      // Wait for lock_acquired or lock_failed message
      // In a real implementation, we'd use a promise-based message handler
      // For now, we'll resolve optimistically
      // The actual lock state will be updated via handleMessage
      setTimeout(() => {
        resolve(lockedNodes.has(nodeId) && lockedNodes.get(nodeId)?.ownerId === userId);
      }, 100);
    });
  }, [lockedNodes, userId]);

  /**
   * Release a lock on a node
   */
  const unlockNode = useCallback(async (nodeId: string): Promise<void> => {
    if (!wsRef.current?.isConnected()) {
      return;
    }

    wsRef.current.send({
      type: 'lock_release',
      nodeId,
    });
  }, []);

  /**
   * Update cursor position
   */
  const updateCursor = useCallback((position: { x: number; y: number }) => {
    if (!wsRef.current?.isConnected()) {
      return;
    }

    wsRef.current.send({
      type: 'cursor_update',
      position,
    });
  }, []);

  /**
   * Update viewport
   */
  const updateViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    if (!wsRef.current?.isConnected()) {
      return;
    }

    wsRef.current.send({
      type: 'viewport_update',
      viewport,
    });
  }, []);

  /**
   * Broadcast a workflow change
   */
  const broadcastChange = useCallback((change: WorkflowChange) => {
    if (!wsRef.current?.isConnected()) {
      return;
    }

    wsRef.current.send({
      type: 'change',
      change,
    });
  }, []);

  /**
   * Check if a node is locked
   */
  const isNodeLocked = useCallback((nodeId: string): boolean => {
    return lockedNodes.has(nodeId);
  }, [lockedNodes]);

  /**
   * Get the owner of a node's lock
   */
  const getNodeLockOwner = useCallback((nodeId: string): string | null => {
    const lock = lockedNodes.get(nodeId);
    return lock ? lock.ownerId : null;
  }, [lockedNodes]);

  /**
   * Manually reconnect
   */
  const reconnect = useCallback(async (): Promise<void> => {
    if (wsRef.current) {
      await wsRef.current.connect();
    }
  }, []);

  // Context value
  const value: CollaborationContextValue = {
    // State
    isConnected,
    connectionStatus,
    activeUsers,
    lockedNodes,
    cursors,
    
    // Actions
    lockNode,
    unlockNode,
    updateCursor,
    updateViewport,
    broadcastChange,
    
    // Utilities
    isNodeLocked,
    getNodeLockOwner,
    
    // Connection management
    reconnect,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

/**
 * Hook to access collaboration context
 * 
 * @throws Error if used outside of CollaborationProvider
 */
export const useCollaborationContext = (): CollaborationContextValue => {
  const context = useContext(CollaborationContext);
  
  if (!context) {
    throw new Error('useCollaborationContext must be used within a CollaborationProvider');
  }
  
  return context;
};

/**
 * Export context for testing purposes
 */
export { CollaborationContext };
