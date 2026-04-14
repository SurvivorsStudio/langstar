"""
Lock Manager for managing node locks in collaboration sessions.
Handles lock acquisition, release, timeout, and automatic cleanup.
"""

import time
from typing import Dict, Optional, List
from server.models.collaboration import NodeLock
from server.utils.logger import setup_logger
from server.services.monitoring_service import monitoring_service

logger = setup_logger()


class LockManager:
    """Manages node locks for collaborative editing"""
    
    def __init__(self, default_lock_duration: int = 300):
        """
        Initialize the LockManager.
        
        Args:
            default_lock_duration: Default lock duration in seconds (default: 300 = 5 minutes)
        """
        # Map of "workflow_id:node_id" to NodeLock
        self.locks: Dict[str, NodeLock] = {}
        self.default_lock_duration = default_lock_duration
    
    def _get_lock_key(self, workflow_id: str, node_id: str) -> str:
        """Generate a unique key for a lock"""
        return f"{workflow_id}:{node_id}"
    
    async def acquire_lock(
        self, 
        workflow_id: str, 
        node_id: str, 
        user_id: str,
        user_name: str,
        duration: Optional[int] = None
    ) -> bool:
        """
        Attempt to acquire a lock on a node.
        
        Args:
            workflow_id: The workflow ID
            node_id: The node ID to lock
            user_id: The user ID requesting the lock
            user_name: The user name requesting the lock
            duration: Optional lock duration in seconds (uses default if not specified)
            
        Returns:
            True if lock was acquired, False if node is already locked by another user
        """
        lock_key = self._get_lock_key(workflow_id, node_id)
        
        # Clean up expired locks first
        await self._cleanup_expired_locks()
        
        # Check if node is already locked
        if lock_key in self.locks:
            existing_lock = self.locks[lock_key]
            
            # If locked by the same user, refresh the lock
            if existing_lock.owner_id == user_id:
                lock_duration = duration or self.default_lock_duration
                existing_lock.acquired_at = time.time()
                existing_lock.expires_at = time.time() + lock_duration
                
                logger.info(
                    f"Refreshed lock for node {node_id} in workflow {workflow_id} "
                    f"by user {user_id}"
                )
                return True
            
            # Locked by another user
            logger.warning(
                f"Lock acquisition failed for node {node_id} in workflow {workflow_id}: "
                f"already locked by user {existing_lock.owner_id}"
            )
            
            # Log failed lock acquisition
            monitoring_service.log_lock_acquisition(
                workflow_id=workflow_id,
                node_id=node_id,
                user_id=user_id,
                success=False
            )
            
            return False
        
        # Acquire new lock
        lock_duration = duration or self.default_lock_duration
        lock = NodeLock(
            node_id=node_id,
            owner_id=user_id,
            owner_name=user_name,
            acquired_at=time.time(),
            expires_at=time.time() + lock_duration
        )
        
        self.locks[lock_key] = lock
        
        logger.info(
            f"Lock acquired for node {node_id} in workflow {workflow_id} "
            f"by user {user_id} ({user_name})"
        )
        
        # Log lock acquisition
        monitoring_service.log_lock_acquisition(
            workflow_id=workflow_id,
            node_id=node_id,
            user_id=user_id,
            success=True
        )
        
        return True
    
    async def release_lock(
        self, 
        workflow_id: str, 
        node_id: str, 
        user_id: str
    ) -> bool:
        """
        Release a lock on a node.
        
        Args:
            workflow_id: The workflow ID
            node_id: The node ID to unlock
            user_id: The user ID releasing the lock
            
        Returns:
            True if lock was released, False if lock doesn't exist or user doesn't own it
        """
        lock_key = self._get_lock_key(workflow_id, node_id)
        
        if lock_key not in self.locks:
            logger.warning(
                f"Lock release failed for node {node_id} in workflow {workflow_id}: "
                f"no lock exists"
            )
            return False
        
        lock = self.locks[lock_key]
        
        # Verify the user owns the lock
        if lock.owner_id != user_id:
            logger.warning(
                f"Lock release failed for node {node_id} in workflow {workflow_id}: "
                f"user {user_id} does not own the lock (owned by {lock.owner_id})"
            )
            return False
        
        # Release the lock
        del self.locks[lock_key]
        
        logger.info(
            f"Lock released for node {node_id} in workflow {workflow_id} "
            f"by user {user_id}"
        )
        
        # Log lock release
        monitoring_service.log_lock_release(
            workflow_id=workflow_id,
            node_id=node_id,
            user_id=user_id
        )
        
        return True
    
    async def release_user_locks(self, workflow_id: str, user_id: str) -> int:
        """
        Release all locks held by a user in a workflow.
        This is typically called when a user disconnects.
        
        Args:
            workflow_id: The workflow ID
            user_id: The user ID
            
        Returns:
            Number of locks released
        """
        locks_to_release = []
        
        # Find all locks owned by this user in this workflow
        for lock_key, lock in self.locks.items():
            if lock_key.startswith(f"{workflow_id}:") and lock.owner_id == user_id:
                locks_to_release.append(lock_key)
        
        # Release the locks
        for lock_key in locks_to_release:
            del self.locks[lock_key]
        
        if locks_to_release:
            logger.info(
                f"Released {len(locks_to_release)} locks for user {user_id} "
                f"in workflow {workflow_id}"
            )
        
        return len(locks_to_release)
    
    def is_locked(self, workflow_id: str, node_id: str) -> bool:
        """
        Check if a node is currently locked.
        
        Args:
            workflow_id: The workflow ID
            node_id: The node ID
            
        Returns:
            True if the node is locked, False otherwise
        """
        lock_key = self._get_lock_key(workflow_id, node_id)
        
        if lock_key not in self.locks:
            return False
        
        # Check if lock has expired
        lock = self.locks[lock_key]
        if time.time() > lock.expires_at:
            # Lock has expired, remove it
            del self.locks[lock_key]
            logger.info(f"Removed expired lock for node {node_id} in workflow {workflow_id}")
            return False
        
        return True
    
    def get_lock_owner(self, workflow_id: str, node_id: str) -> Optional[str]:
        """
        Get the owner of a lock.
        
        Args:
            workflow_id: The workflow ID
            node_id: The node ID
            
        Returns:
            The user ID of the lock owner, or None if not locked
        """
        if not self.is_locked(workflow_id, node_id):
            return None
        
        lock_key = self._get_lock_key(workflow_id, node_id)
        return self.locks[lock_key].owner_id
    
    def get_lock(self, workflow_id: str, node_id: str) -> Optional[NodeLock]:
        """
        Get the lock information for a node.
        
        Args:
            workflow_id: The workflow ID
            node_id: The node ID
            
        Returns:
            The NodeLock object, or None if not locked
        """
        if not self.is_locked(workflow_id, node_id):
            return None
        
        lock_key = self._get_lock_key(workflow_id, node_id)
        return self.locks[lock_key]
    
    def get_workflow_locks(self, workflow_id: str) -> List[NodeLock]:
        """
        Get all locks for a workflow.
        
        Args:
            workflow_id: The workflow ID
            
        Returns:
            List of NodeLock objects
        """
        workflow_locks = []
        
        for lock_key, lock in self.locks.items():
            if lock_key.startswith(f"{workflow_id}:"):
                # Check if lock is still valid
                if time.time() <= lock.expires_at:
                    workflow_locks.append(lock)
        
        return workflow_locks
    
    async def _cleanup_expired_locks(self):
        """Remove all expired locks"""
        current_time = time.time()
        expired_locks = []
        
        for lock_key, lock in self.locks.items():
            if current_time > lock.expires_at:
                expired_locks.append(lock_key)
        
        for lock_key in expired_locks:
            del self.locks[lock_key]
        
        if expired_locks:
            logger.info(f"Cleaned up {len(expired_locks)} expired locks")
    
    async def cleanup_expired_locks(self):
        """Public method to trigger expired lock cleanup"""
        await self._cleanup_expired_locks()
    
    def get_lock_count(self) -> int:
        """Get the total number of active locks"""
        return len(self.locks)
