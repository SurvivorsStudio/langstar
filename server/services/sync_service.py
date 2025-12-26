"""
Sync Service for real-time collaboration.
Handles state synchronization, conflict resolution, and workflow persistence.
"""

from typing import Dict, Any, List, Optional
from pymongo.database import Database
from pymongo.collection import Collection
import time
import logging

from models.collaboration import WorkflowChange, CollaborationUser, NodeLock
from config.database import get_database, get_workflows_collection

logger = logging.getLogger(__name__)


class SyncService:
    """
    Service for synchronizing workflow state across collaboration sessions.
    Handles conflict resolution using last-write-wins strategy based on timestamps.
    """
    
    def __init__(self, db_client: Optional[Database] = None):
        """
        Initialize SyncService with database client.
        
        Args:
            db_client: MongoDB database instance. If None, uses default connection.
        """
        self.db = db_client if db_client is not None else get_database()
        self.workflows_collection = get_workflows_collection() if self.db is not None else None
    
    async def sync_workflow_state(self, workflow_id: str, user_id: str) -> Dict[str, Any]:
        """
        Synchronize workflow state for a user joining a session.
        
        Args:
            workflow_id: ID of the workflow to sync
            user_id: ID of the user requesting sync
            
        Returns:
            Dictionary containing current workflow state
            
        Raises:
            ValueError: If workflow not found
        """
        if self.workflows_collection is None:
            logger.warning("MongoDB not connected, returning empty state")
            return {"nodes": [], "edges": [], "users": [], "locks": []}
        
        try:
            workflow = self.workflows_collection.find_one({"projectId": workflow_id})
            
            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            # Extract relevant state
            state = {
                "nodes": workflow.get("nodes", []),
                "edges": workflow.get("edges", []),
                "viewport": workflow.get("viewport", {"x": 0, "y": 0, "zoom": 1}),
                "lastModified": workflow.get("lastModified", time.time() * 1000)
            }
            
            logger.info(f"Synced workflow state for {workflow_id}, user {user_id}")
            return state
            
        except Exception as e:
            logger.error(f"Error syncing workflow state: {e}")
            raise
    
    async def apply_change(self, workflow_id: str, change: WorkflowChange) -> bool:
        """
        Apply a workflow change to the database.
        
        Args:
            workflow_id: ID of the workflow
            change: WorkflowChange object containing the change details
            
        Returns:
            True if change was applied successfully, False otherwise
        """
        if self.workflows_collection is None:
            logger.warning("MongoDB not connected, change not persisted")
            return False
        
        try:
            workflow = self.workflows_collection.find_one({"projectId": workflow_id})
            
            if not workflow:
                logger.error(f"Workflow {workflow_id} not found")
                return False
            
            # Apply change based on type
            update_result = None
            
            if change.type == "node_add":
                # Add new node
                update_result = self.workflows_collection.update_one(
                    {"projectId": workflow_id},
                    {
                        "$push": {"nodes": change.data},
                        "$set": {"lastModified": change.timestamp}
                    }
                )
            
            elif change.type == "node_update":
                # Update existing node
                node_id = change.data.get("id")
                update_result = self.workflows_collection.update_one(
                    {"projectId": workflow_id, "nodes.id": node_id},
                    {
                        "$set": {
                            "nodes.$": change.data,
                            "lastModified": change.timestamp
                        }
                    }
                )
            
            elif change.type == "node_delete":
                # Delete node
                node_id = change.data.get("id")
                update_result = self.workflows_collection.update_one(
                    {"projectId": workflow_id},
                    {
                        "$pull": {"nodes": {"id": node_id}},
                        "$set": {"lastModified": change.timestamp}
                    }
                )
            
            elif change.type == "node_move":
                # Update node position
                node_id = change.data.get("id")
                position = change.data.get("position", {})
                update_result = self.workflows_collection.update_one(
                    {"projectId": workflow_id, "nodes.id": node_id},
                    {
                        "$set": {
                            "nodes.$.position": position,
                            "lastModified": change.timestamp
                        }
                    }
                )
            
            elif change.type == "edge_add":
                # Add new edge
                update_result = self.workflows_collection.update_one(
                    {"projectId": workflow_id},
                    {
                        "$push": {"edges": change.data},
                        "$set": {"lastModified": change.timestamp}
                    }
                )
            
            elif change.type == "edge_delete":
                # Delete edge
                edge_id = change.data.get("id")
                update_result = self.workflows_collection.update_one(
                    {"projectId": workflow_id},
                    {
                        "$pull": {"edges": {"id": edge_id}},
                        "$set": {"lastModified": change.timestamp}
                    }
                )
            
            if update_result and update_result.modified_count > 0:
                logger.info(f"Applied change {change.id} to workflow {workflow_id}")
                return True
            else:
                logger.warning(f"Change {change.id} did not modify workflow {workflow_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error applying change: {e}")
            return False
    
    async def resolve_conflict(self, workflow_id: str, changes: List[WorkflowChange]) -> WorkflowChange:
        """
        Resolve conflicts between multiple changes using last-write-wins strategy.
        
        Args:
            workflow_id: ID of the workflow
            changes: List of conflicting WorkflowChange objects
            
        Returns:
            The winning WorkflowChange (most recent timestamp)
            
        Raises:
            ValueError: If changes list is empty
        """
        if not changes:
            raise ValueError("No changes to resolve")
        
        # Sort by timestamp (descending) and select the most recent
        sorted_changes = sorted(changes, key=lambda c: c.timestamp, reverse=True)
        winner = sorted_changes[0]
        
        logger.info(
            f"Conflict resolved for workflow {workflow_id}: "
            f"{len(changes)} changes, winner: {winner.id} "
            f"(timestamp: {winner.timestamp})"
        )
        
        return winner
    
    async def save_workflow_state(self, workflow_id: str, state: Dict[str, Any]) -> bool:
        """
        Save complete workflow state to database.
        
        Args:
            workflow_id: ID of the workflow
            state: Complete workflow state dictionary
            
        Returns:
            True if saved successfully, False otherwise
        """
        if self.workflows_collection is None:
            logger.warning("MongoDB not connected, state not saved")
            return False
        
        try:
            # Update workflow with new state
            update_result = self.workflows_collection.update_one(
                {"projectId": workflow_id},
                {
                    "$set": {
                        "nodes": state.get("nodes", []),
                        "edges": state.get("edges", []),
                        "viewport": state.get("viewport", {"x": 0, "y": 0, "zoom": 1}),
                        "lastModified": time.time() * 1000
                    }
                }
            )
            
            if update_result.modified_count > 0:
                logger.info(f"Saved workflow state for {workflow_id}")
                return True
            else:
                logger.warning(f"Workflow state not modified for {workflow_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error saving workflow state: {e}")
            return False
    
    async def load_collaboration_state(
        self, 
        workflow_id: str, 
        active_users: List[CollaborationUser],
        active_locks: List[NodeLock]
    ) -> Dict[str, Any]:
        """
        Load workflow state including collaboration information.
        
        Args:
            workflow_id: ID of the workflow
            active_users: List of currently active users
            active_locks: List of currently active locks
            
        Returns:
            Dictionary containing workflow state and collaboration info
            
        Raises:
            ValueError: If workflow not found
        """
        if self.workflows_collection is None:
            logger.warning("MongoDB not connected, returning minimal state")
            return {
                "nodes": [],
                "edges": [],
                "users": [user.model_dump() for user in active_users],
                "locks": [lock.model_dump() for lock in active_locks]
            }
        
        try:
            workflow = self.workflows_collection.find_one({"projectId": workflow_id})
            
            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            # Combine workflow state with collaboration state
            state = {
                "nodes": workflow.get("nodes", []),
                "edges": workflow.get("edges", []),
                "viewport": workflow.get("viewport", {"x": 0, "y": 0, "zoom": 1}),
                "lastModified": workflow.get("lastModified", time.time() * 1000),
                "users": [user.model_dump() for user in active_users],
                "locks": [lock.model_dump() for lock in active_locks]
            }
            
            logger.info(
                f"Loaded collaboration state for {workflow_id}: "
                f"{len(active_users)} users, {len(active_locks)} locks"
            )
            return state
            
        except Exception as e:
            logger.error(f"Error loading collaboration state: {e}")
            raise

