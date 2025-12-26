/**
 * useCollaboration Hook
 * 
 * Custom React hook that provides access to real-time collaboration features.
 * This hook wraps the CollaborationContext and provides a clean interface for
 * components to interact with collaboration functionality.
 * 
 * Requirements: 2.1, 2.3, 2.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useCollaborationContext } from '../contexts/CollaborationContext';
import { UseCollaborationReturn } from '../types/collaboration';

/**
 * Hook to access collaboration features
 * 
 * Provides access to:
 * - Connection state (isConnected, activeUsers, lockedNodes)
 * - Node locking actions (lockNode, unlockNode)
 * - Cursor and viewport updates (updateCursor)
 * - Change broadcasting (broadcastChange)
 * - Utility functions (isNodeLocked, getNodeLockOwner)
 * 
 * @throws Error if used outside of CollaborationProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     isConnected,
 *     activeUsers,
 *     lockNode,
 *     unlockNode,
 *     isNodeLocked,
 *     broadcastChange
 *   } = useCollaboration();
 * 
 *   const handleNodeClick = async (nodeId: string) => {
 *     if (isNodeLocked(nodeId)) {
 *       console.log('Node is locked by another user');
 *       return;
 *     }
 *     
 *     const locked = await lockNode(nodeId);
 *     if (locked) {
 *       // Edit the node
 *       // ...
 *       await unlockNode(nodeId);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
 *       <p>Active users: {activeUsers.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCollaboration(): UseCollaborationReturn {
  const context = useCollaborationContext();

  // Return a clean interface with only the necessary properties
  return {
    // State
    isConnected: context.isConnected,
    activeUsers: context.activeUsers,
    lockedNodes: context.lockedNodes,

    // Actions
    lockNode: context.lockNode,
    unlockNode: context.unlockNode,
    updateCursor: context.updateCursor,
    broadcastChange: context.broadcastChange,

    // Utilities
    isNodeLocked: context.isNodeLocked,
    getNodeLockOwner: context.getNodeLockOwner,
  };
}

/**
 * Export the hook as default for convenience
 */
export default useCollaboration;
