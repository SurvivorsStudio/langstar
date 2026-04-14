"""
WebSocket Manager for handling WebSocket connections and message routing.
Manages active connections and broadcasts messages to workflow participants.
"""

import json
from typing import Dict, Optional, List
from fastapi import WebSocket
from server.models.collaboration import SessionInfo
from server.utils.logger import setup_logger
from server.services.monitoring_service import monitoring_service

logger = setup_logger()


class WebSocketManager:
    """Manages WebSocket connections and message routing"""
    
    def __init__(self):
        # Map of user_id to WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        # Map of user_id to session information
        self.user_sessions: Dict[str, SessionInfo] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, workflow_id: str):
        """
        Accept a new WebSocket connection.
        
        Args:
            websocket: The WebSocket connection
            user_id: The user ID
            workflow_id: The workflow ID
        """
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_sessions[user_id] = SessionInfo(
            user_id=user_id,
            workflow_id=workflow_id
        )
        
        logger.info(
            f"WebSocket connected: user={user_id}, workflow={workflow_id}, "
            f"total_connections={len(self.active_connections)}"
        )
    
    async def disconnect(self, user_id: str):
        """
        Close and remove a WebSocket connection.
        
        Args:
            user_id: The user ID to disconnect
        """
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.close()
            except Exception as e:
                logger.warning(f"Error closing WebSocket for user {user_id}: {e}")
            
            del self.active_connections[user_id]
        
        if user_id in self.user_sessions:
            workflow_id = self.user_sessions[user_id].workflow_id
            del self.user_sessions[user_id]
            
            logger.info(
                f"WebSocket disconnected: user={user_id}, workflow={workflow_id}, "
                f"remaining_connections={len(self.active_connections)}"
            )
    
    async def send_personal_message(self, message: dict, user_id: str):
        """
        Send a message to a specific user.
        
        Args:
            message: The message to send (will be JSON serialized)
            user_id: The target user ID
        """
        if user_id not in self.active_connections:
            logger.warning(f"Cannot send message to user {user_id}: not connected")
            return
        
        websocket = self.active_connections[user_id]
        workflow_id = self.get_user_workflow(user_id)
        message_type = message.get('type', 'unknown')
        
        try:
            await websocket.send_json(message)
            logger.debug(f"Sent message to user {user_id}: {message_type}")
            
            # Log message sent
            if workflow_id:
                monitoring_service.log_message_sent(
                    message_type=message_type,
                    workflow_id=workflow_id,
                    user_id=user_id,
                    message_size=len(json.dumps(message))
                )
        except Exception as e:
            logger.error(f"Error sending message to user {user_id}: {e}")
            # Log error
            if workflow_id:
                monitoring_service.log_error(
                    error_type='message_send_failed',
                    workflow_id=workflow_id,
                    error_message=str(e),
                    user_id=user_id
                )
            # Connection might be broken, disconnect
            await self.disconnect(user_id)
    
    async def broadcast_to_workflow(
        self, 
        message: dict, 
        workflow_id: str, 
        exclude_user: Optional[str] = None
    ):
        """
        Broadcast a message to all users in a workflow.
        
        Args:
            message: The message to broadcast (will be JSON serialized)
            workflow_id: The workflow ID
            exclude_user: Optional user ID to exclude from broadcast
        """
        # Find all users in this workflow
        target_users = [
            user_id 
            for user_id, session in self.user_sessions.items()
            if session.workflow_id == workflow_id and user_id != exclude_user
        ]
        
        if not target_users:
            logger.debug(f"No users to broadcast to in workflow {workflow_id}")
            return
        
        logger.debug(
            f"Broadcasting message to {len(target_users)} users in workflow {workflow_id}: "
            f"{message.get('type', 'unknown')}"
        )
        
        # Send to all target users
        for user_id in target_users:
            await self.send_personal_message(message, user_id)
    
    def get_workflow_users(self, workflow_id: str) -> List[str]:
        """
        Get all user IDs connected to a workflow.
        
        Args:
            workflow_id: The workflow ID
            
        Returns:
            List of user IDs
        """
        return [
            user_id 
            for user_id, session in self.user_sessions.items()
            if session.workflow_id == workflow_id
        ]
    
    def is_connected(self, user_id: str) -> bool:
        """
        Check if a user is connected.
        
        Args:
            user_id: The user ID
            
        Returns:
            True if connected, False otherwise
        """
        return user_id in self.active_connections
    
    def get_user_workflow(self, user_id: str) -> Optional[str]:
        """
        Get the workflow ID for a connected user.
        
        Args:
            user_id: The user ID
            
        Returns:
            The workflow ID, or None if user is not connected
        """
        session = self.user_sessions.get(user_id)
        return session.workflow_id if session else None
    
    def get_connection_count(self) -> int:
        """Get the total number of active connections"""
        return len(self.active_connections)
