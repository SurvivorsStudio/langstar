"""
Session Manager for managing collaboration sessions.
Handles workflow-specific session management and user tracking.
"""

import time
from typing import Dict, List, Optional
from server.models.collaboration import UserInfo, WorkflowSession
from server.utils.logger import setup_logger
from server.services.monitoring_service import monitoring_service

logger = setup_logger()


class SessionManager:
    """Manages collaboration sessions for workflows"""
    
    def __init__(self):
        self.sessions: Dict[str, WorkflowSession] = {}
    
    def create_or_join_session(self, workflow_id: str, user_info: UserInfo) -> WorkflowSession:
        """
        Create a new session or join an existing one.
        
        Args:
            workflow_id: The workflow ID
            user_info: Information about the user joining
            
        Returns:
            The workflow session
        """
        if workflow_id not in self.sessions:
            self.sessions[workflow_id] = WorkflowSession(workflow_id=workflow_id)
            logger.info(f"Created new session for workflow {workflow_id}")
        
        session = self.sessions[workflow_id]
        session.users[user_info.user_id] = user_info
        session.last_activity = time.time()
        
        logger.info(
            f"User {user_info.user_id} joined session for workflow {workflow_id}. "
            f"Total users: {len(session.users)}"
        )
        
        # Log session start and update connection count
        monitoring_service.log_session_start(
            workflow_id=workflow_id,
            user_id=user_info.user_id,
            user_name=user_info.user_name
        )
        monitoring_service.update_connection_count(workflow_id, len(session.users))
        
        return session
    
    def leave_session(self, workflow_id: str, user_id: str) -> Optional[WorkflowSession]:
        """
        Remove a user from a session.
        
        Args:
            workflow_id: The workflow ID
            user_id: The user ID leaving
            
        Returns:
            The updated session, or None if session doesn't exist
        """
        if workflow_id not in self.sessions:
            return None
        
        session = self.sessions[workflow_id]
        
        if user_id in session.users:
            del session.users[user_id]
            session.last_activity = time.time()
            
            logger.info(
                f"User {user_id} left session for workflow {workflow_id}. "
                f"Remaining users: {len(session.users)}"
            )
            
            # Log session end and update connection count
            monitoring_service.log_session_end(workflow_id=workflow_id, user_id=user_id)
            monitoring_service.update_connection_count(workflow_id, len(session.users))
        
        # Clean up empty sessions
        if len(session.users) == 0:
            del self.sessions[workflow_id]
            logger.info(f"Removed empty session for workflow {workflow_id}")
            return None
        
        return session
    
    def get_session(self, workflow_id: str) -> Optional[WorkflowSession]:
        """
        Get a session by workflow ID.
        
        Args:
            workflow_id: The workflow ID
            
        Returns:
            The session, or None if it doesn't exist
        """
        return self.sessions.get(workflow_id)
    
    def get_session_users(self, workflow_id: str) -> List[UserInfo]:
        """
        Get all users in a session.
        
        Args:
            workflow_id: The workflow ID
            
        Returns:
            List of users in the session
        """
        session = self.sessions.get(workflow_id)
        if not session:
            return []
        
        return list(session.users.values())
    
    def update_user_activity(self, workflow_id: str, user_id: str):
        """
        Update the last activity timestamp for a user.
        
        Args:
            workflow_id: The workflow ID
            user_id: The user ID
        """
        session = self.sessions.get(workflow_id)
        if session and user_id in session.users:
            session.users[user_id].last_activity = time.time()
            session.last_activity = time.time()
    
    def cleanup_empty_sessions(self):
        """Remove sessions with no users"""
        empty_sessions = [
            workflow_id 
            for workflow_id, session in self.sessions.items() 
            if len(session.users) == 0
        ]
        
        for workflow_id in empty_sessions:
            del self.sessions[workflow_id]
            logger.info(f"Cleaned up empty session for workflow {workflow_id}")
        
        return len(empty_sessions)
    
    def get_all_sessions(self) -> Dict[str, WorkflowSession]:
        """Get all active sessions"""
        return self.sessions.copy()
