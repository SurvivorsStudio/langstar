/**
 * Collaboration Types
 * 
 * Type definitions for real-time collaboration features in LangStar.
 * These types support WebSocket-based multi-user workflow editing with
 * real-time synchronization, conflict prevention, and presence awareness.
 */

// ============================================================================
// Core Collaboration Types
// ============================================================================

/**
 * Represents a user participating in a collaborative workflow session
 */
export interface CollaborationUser {
  /** Unique user identifier */
  userId: string;
  /** Display name of the user */
  userName: string;
  /** Unique color assigned to the user for visual identification */
  color: string;
  /** Current cursor position (null if not available) */
  cursor: {
    x: number;
    y: number;
  } | null;
  /** Current viewport position and zoom level (null if not available) */
  viewport: {
    x: number;
    y: number;
    zoom: number;
  } | null;
  /** Timestamp when the user joined the session */
  joinedAt: number;
  /** Timestamp of the user's last activity */
  lastActivity: number;
}

/**
 * Represents a lock on a workflow node to prevent concurrent editing
 */
export interface NodeLock {
  /** ID of the locked node */
  nodeId: string;
  /** ID of the user who owns the lock */
  ownerId: string;
  /** Display name of the lock owner */
  ownerName: string;
  /** Timestamp when the lock was acquired */
  acquiredAt: number;
  /** Timestamp when the lock will automatically expire */
  expiresAt: number;
}

/**
 * Types of changes that can be made to a workflow
 */
export type WorkflowChangeType =
  | 'node_add'
  | 'node_update'
  | 'node_delete'
  | 'node_move'
  | 'edge_add'
  | 'edge_delete';

/**
 * Represents a change made to a workflow by a user
 */
export interface WorkflowChange {
  /** Unique identifier for this change */
  id: string;
  /** Type of change */
  type: WorkflowChangeType;
  /** ID of the workflow being changed */
  workflowId: string;
  /** ID of the user making the change */
  userId: string;
  /** Timestamp when the change was made */
  timestamp: number;
  /** Change-specific data (structure varies by type) */
  data: any;
}

// ============================================================================
// WebSocket Message Protocol
// ============================================================================

/**
 * Messages sent from client to server
 */
export type ClientMessage =
  | {
      type: 'join';
      workflowId: string;
      userId: string;
      userName: string;
    }
  | {
      type: 'leave';
      workflowId: string;
      userId: string;
    }
  | {
      type: 'cursor_update';
      position: { x: number; y: number };
    }
  | {
      type: 'viewport_update';
      viewport: { x: number; y: number; zoom: number };
    }
  | {
      type: 'lock_request';
      nodeId: string;
    }
  | {
      type: 'lock_release';
      nodeId: string;
    }
  | {
      type: 'change';
      change: WorkflowChange;
    }
  | {
      type: 'ping';
    };

/**
 * Messages sent from server to client
 */
export type ServerMessage =
  | {
      type: 'welcome';
      users: CollaborationUser[];
      locks: NodeLock[];
    }
  | {
      type: 'user_joined';
      user: CollaborationUser;
    }
  | {
      type: 'user_left';
      userId: string;
    }
  | {
      type: 'cursor_moved';
      userId: string;
      position: { x: number; y: number };
    }
  | {
      type: 'viewport_changed';
      userId: string;
      viewport: { x: number; y: number; zoom: number };
    }
  | {
      type: 'lock_acquired';
      nodeId: string;
      lock: NodeLock;
    }
  | {
      type: 'lock_released';
      nodeId: string;
    }
  | {
      type: 'lock_failed';
      nodeId: string;
      reason: string;
    }
  | {
      type: 'change_applied';
      change: WorkflowChange;
    }
  | {
      type: 'sync_required';
      state: any;
    }
  | {
      type: 'error';
      message: string;
    }
  | {
      type: 'pong';
    };

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Error codes for collaboration-related errors
 */
export const ErrorCodes = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  RECONNECTION_FAILED: 'RECONNECTION_FAILED',
  LOCK_ACQUISITION_FAILED: 'LOCK_ACQUISITION_FAILED',
  SYNC_FAILED: 'SYNC_FAILED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Custom error class for collaboration-related errors
 */
export class CollaborationError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'CollaborationError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CollaborationError);
    }
  }
}

// ============================================================================
// State Management Types
// ============================================================================

/**
 * Connection status for the WebSocket connection
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Cursor position for a user
 */
export interface CursorPosition {
  x: number;
  y: number;
}

/**
 * Viewport information for a user
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Overall collaboration state
 */
export interface CollaborationState {
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** List of users currently in the session */
  activeUsers: CollaborationUser[];
  /** Map of node IDs to their lock information */
  lockedNodes: Map<string, NodeLock>;
  /** Map of user IDs to their cursor positions */
  cursors: Map<string, CursorPosition>;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for CollaborationProvider component
 */
export interface CollaborationProviderProps {
  /** ID of the workflow being collaborated on */
  workflowId: string;
  /** ID of the current user */
  userId: string;
  /** Display name of the current user */
  userName: string;
  /** Child components */
  children: React.ReactNode;
}

/**
 * Props for ActiveUsersList component
 */
export interface ActiveUsersListProps {
  /** List of active users */
  users: CollaborationUser[];
  /** Callback when a user is clicked */
  onUserClick: (userId: string) => void;
}

/**
 * Props for UserCursor component
 */
export interface UserCursorProps {
  /** ID of the user */
  userId: string;
  /** Display name of the user */
  userName: string;
  /** Current cursor position */
  position: { x: number; y: number };
  /** Color assigned to the user */
  color: string;
}

/**
 * Props for NodeLockIndicator component
 */
export interface NodeLockIndicatorProps {
  /** ID of the locked node */
  nodeId: string;
  /** Name of the user who owns the lock */
  lockOwner: string;
  /** Color of the lock owner */
  lockOwnerColor: string;
}

/**
 * Props for ConnectionStatusBadge component
 */
export interface ConnectionStatusBadgeProps {
  /** Current connection status */
  status: ConnectionStatus;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useCollaboration hook
 */
export interface UseCollaborationReturn {
  // State
  /** Whether the WebSocket is connected */
  isConnected: boolean;
  /** List of active users in the session */
  activeUsers: CollaborationUser[];
  /** Map of locked nodes */
  lockedNodes: Map<string, NodeLock>;
  
  // Actions
  /** Request a lock on a node */
  lockNode: (nodeId: string) => Promise<boolean>;
  /** Release a lock on a node */
  unlockNode: (nodeId: string) => Promise<void>;
  /** Update the current user's cursor position */
  updateCursor: (position: { x: number; y: number }) => void;
  /** Broadcast a workflow change to other users */
  broadcastChange: (change: WorkflowChange) => void;
  
  // Utilities
  /** Check if a node is currently locked */
  isNodeLocked: (nodeId: string) => boolean;
  /** Get the owner of a node's lock (null if not locked) */
  getNodeLockOwner: (nodeId: string) => string | null;
}

// ============================================================================
// Optimistic Update Types
// ============================================================================

/**
 * Represents an optimistic update that may need to be rolled back
 */
export interface OptimisticUpdate {
  /** Unique identifier for the update */
  id: string;
  /** Type of change */
  type: WorkflowChangeType;
  /** State before the change was applied */
  localState: any;
  /** Timestamp when the update was applied */
  appliedAt: number;
}

// ============================================================================
// FlowStore Extension Types
// ============================================================================

/**
 * Extension to FlowStore for collaboration features
 */
export interface CollaborationFlowStore {
  // Collaboration state
  /** Whether collaboration is enabled for this workflow */
  collaborationEnabled: boolean;
  /** Current collaboration state */
  collaborationState: CollaborationState;
  
  // Collaboration actions
  /** Handle a node being added by another user */
  handleRemoteNodeAdd: (node: any) => void;
  /** Handle a node being updated by another user */
  handleRemoteNodeUpdate: (nodeId: string, changes: Partial<any>) => void;
  /** Handle a node being deleted by another user */
  handleRemoteNodeDelete: (nodeId: string) => void;
  /** Handle an edge being added by another user */
  handleRemoteEdgeAdd: (edge: any) => void;
  /** Handle an edge being deleted by another user */
  handleRemoteEdgeDelete: (edgeId: string) => void;
  
  // Lock management
  /** Check if the current user can edit a node */
  canEditNode: (nodeId: string) => boolean;
  /** Request a lock on a node */
  requestNodeLock: (nodeId: string) => Promise<boolean>;
  /** Release a lock on a node */
  releaseNodeLock: (nodeId: string) => Promise<void>;
}
