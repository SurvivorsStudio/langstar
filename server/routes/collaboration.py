"""
Collaboration WebSocket routes.
Handles real-time collaboration WebSocket connections and message routing.
"""

import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from typing import Optional
from pydantic import ValidationError
from server.services.websocket_manager import WebSocketManager
from server.services.session_manager import SessionManager
from server.services.lock_manager import LockManager
from server.services.sync_service import SyncService
from server.services.monitoring_service import monitoring_service
from server.models.collaboration import (
    UserInfo, CollaborationUser,
    JoinMessage, LeaveMessage, CursorUpdateMessage, ViewportUpdateMessage,
    LockRequestMessage, LockReleaseMessage, ChangeMessage, PingMessage,
    WelcomeMessage, UserJoinedMessage, UserLeftMessage,
    CursorMovedMessage, ViewportChangedMessage, PongMessage, ErrorMessage,
    LockAcquiredMessage, LockReleasedMessage, LockFailedMessage,
    ChangeAppliedMessage, SyncRequiredMessage
)
from server.utils.logger import setup_logger
from server.utils.security import (
    authenticate_websocket,
    authorize_workflow_access,
    rate_limiter
)
import random

logger = setup_logger()
router = APIRouter()

# Global instances
websocket_manager = WebSocketManager()
session_manager = SessionManager()
lock_manager = LockManager()
sync_service = SyncService()


def generate_user_color() -> str:
    """Generate a random color for a user"""
    colors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
        "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52B788"
    ]
    return random.choice(colors)


def parse_client_message(data: dict) -> Optional[object]:
    """
    Parse incoming client message based on type with validation.
    
    Args:
        data: Raw message data
        
    Returns:
        Parsed message object or None if invalid
    """
    try:
        msg_type = data.get('type')
        
        if msg_type == 'join':
            return JoinMessage(**data)
        elif msg_type == 'leave':
            return LeaveMessage(**data)
        elif msg_type == 'cursor_update':
            return CursorUpdateMessage(**data)
        elif msg_type == 'viewport_update':
            return ViewportUpdateMessage(**data)
        elif msg_type == 'lock_request':
            return LockRequestMessage(**data)
        elif msg_type == 'lock_release':
            return LockReleaseMessage(**data)
        elif msg_type == 'change':
            return ChangeMessage(**data)
        elif msg_type == 'ping':
            return PingMessage(**data)
        else:
            logger.warning(f"Unknown message type: {msg_type}")
            return None
    
    except ValidationError as e:
        logger.error(f"Message validation failed: {e}, data: {data}")
        return None
    
    except Exception as e:
        logger.error(f"Error parsing message: {e}, data: {data}")
        return None


@router.websocket("/ws/collaboration/{workflow_id}")
async def collaboration_websocket(
    websocket: WebSocket,
    workflow_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...),
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time collaboration with authentication.
    
    Args:
        websocket: The WebSocket connection
        workflow_id: The workflow ID to collaborate on
        user_id: The user ID (from query parameter)
        user_name: The user name (from query parameter)
        token: Optional JWT token for authentication
    """
    # Authentication (optional for now, can be made required in production)
    if token:
        token_data = await authenticate_websocket(token)
        if token_data is None:
            logger.warning(f"Authentication failed for user {user_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
            return
        
        # Verify user_id matches token
        if token_data.user_id != user_id:
            logger.warning(f"User ID mismatch: token={token_data.user_id}, provided={user_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User ID mismatch")
            return
    
    # Authorization - check if user has access to this workflow
    has_access = await authorize_workflow_access(user_id, workflow_id)
    if not has_access:
        logger.warning(f"Authorization failed: user={user_id}, workflow={workflow_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Access denied")
        return
    
    # Connect the WebSocket
    await websocket_manager.connect(websocket, user_id, workflow_id)
    
    # Generate user color
    user_color = generate_user_color()
    
    # Create user info
    user_info = UserInfo(
        user_id=user_id,
        user_name=user_name,
        color=user_color
    )
    
    # Join or create session
    session = session_manager.create_or_join_session(workflow_id, user_info)
    
    try:
        # Send welcome message with current state
        existing_users = [
            CollaborationUser(
                user_id=u.user_id,
                user_name=u.user_name,
                color=u.color,
                cursor=None,
                viewport=None,
                joined_at=u.joined_at,
                last_activity=u.last_activity
            )
            for u in session_manager.get_session_users(workflow_id)
            if u.user_id != user_id  # Exclude the joining user
        ]
        
        # Get current locks for this workflow
        current_locks = lock_manager.get_workflow_locks(workflow_id)
        
        welcome_msg = WelcomeMessage(
            type='welcome',
            users=existing_users,
            locks=current_locks
        )
        await websocket_manager.send_personal_message(welcome_msg.dict(), user_id)
        
        # Notify other users about the new user
        new_user = CollaborationUser(
            user_id=user_info.user_id,
            user_name=user_info.user_name,
            color=user_info.color,
            cursor=None,
            viewport=None,
            joined_at=user_info.joined_at,
            last_activity=user_info.last_activity
        )
        
        user_joined_msg = UserJoinedMessage(
            type='user_joined',
            user=new_user
        )
        await websocket_manager.broadcast_to_workflow(
            user_joined_msg.dict(),
            workflow_id,
            exclude_user=user_id
        )
        
        # Message handling loop
        while True:
            # Receive message
            data = await websocket.receive_json()
            
            # Generate unique message ID for tracking
            message_id = str(uuid.uuid4())
            
            # Rate limiting check
            if not rate_limiter.check_rate_limit(user_id):
                error_msg = ErrorMessage(
                    type='error',
                    message='Rate limit exceeded. Please slow down.',
                    code='RATE_LIMIT_EXCEEDED'
                )
                await websocket_manager.send_personal_message(error_msg.dict(), user_id)
                continue
            
            # Parse message with validation
            message = parse_client_message(data)
            
            if message is None:
                error_msg = ErrorMessage(
                    type='error',
                    message='Invalid message format or validation failed',
                    code='INVALID_MESSAGE'
                )
                await websocket_manager.send_personal_message(error_msg.dict(), user_id)
                
                # Log error
                monitoring_service.log_error(
                    error_type='invalid_message',
                    workflow_id=workflow_id,
                    error_message='Message validation failed',
                    user_id=user_id
                )
                continue
            
            # Log message received
            message_type = data.get('type', 'unknown')
            monitoring_service.log_message_received(
                message_type=message_type,
                workflow_id=workflow_id,
                user_id=user_id,
                message_size=len(json.dumps(data))
            )
            
            # Start tracking message processing time
            monitoring_service.start_message_processing(message_id)
            
            # Update user activity
            session_manager.update_user_activity(workflow_id, user_id)
            
            # Handle different message types
            if isinstance(message, PingMessage):
                # Respond with pong
                pong_msg = PongMessage(type='pong')
                await websocket_manager.send_personal_message(pong_msg.dict(), user_id)
                
                # End message processing tracking
                monitoring_service.end_message_processing(message_id, 'ping', workflow_id)
            
            elif isinstance(message, CursorUpdateMessage):
                # Broadcast cursor update to other users
                cursor_msg = CursorMovedMessage(
                    type='cursor_moved',
                    user_id=user_id,
                    position=message.position
                )
                await websocket_manager.broadcast_to_workflow(
                    cursor_msg.dict(),
                    workflow_id,
                    exclude_user=user_id
                )
                
                # End message processing tracking
                monitoring_service.end_message_processing(message_id, 'cursor_update', workflow_id)
            
            elif isinstance(message, ViewportUpdateMessage):
                # Broadcast viewport update to other users
                viewport_msg = ViewportChangedMessage(
                    type='viewport_changed',
                    user_id=user_id,
                    viewport=message.viewport
                )
                await websocket_manager.broadcast_to_workflow(
                    viewport_msg.dict(),
                    workflow_id,
                    exclude_user=user_id
                )
                
                # End message processing tracking
                monitoring_service.end_message_processing(message_id, 'viewport_update', workflow_id)
            
            elif isinstance(message, LockRequestMessage):
                # Handle lock request
                success = await lock_manager.acquire_lock(
                    workflow_id,
                    message.node_id,
                    user_id,
                    user_name
                )
                
                if success:
                    # Lock acquired successfully
                    lock = lock_manager.get_lock(workflow_id, message.node_id)
                    lock_acquired_msg = LockAcquiredMessage(
                        type='lock_acquired',
                        node_id=message.node_id,
                        lock=lock
                    )
                    # Broadcast to all users in the workflow
                    await websocket_manager.broadcast_to_workflow(
                        lock_acquired_msg.dict(),
                        workflow_id
                    )
                    logger.info(f"Lock acquired for node {message.node_id} by user {user_id}")
                else:
                    # Lock acquisition failed
                    lock_owner = lock_manager.get_lock_owner(workflow_id, message.node_id)
                    lock_failed_msg = LockFailedMessage(
                        type='lock_failed',
                        node_id=message.node_id,
                        reason=f'Node is already locked by user {lock_owner}'
                    )
                    await websocket_manager.send_personal_message(lock_failed_msg.dict(), user_id)
                    logger.warning(
                        f"Lock acquisition failed for node {message.node_id} by user {user_id}: "
                        f"already locked by {lock_owner}"
                    )
                
                # End message processing tracking
                monitoring_service.end_message_processing(message_id, 'lock_request', workflow_id)
            
            elif isinstance(message, LockReleaseMessage):
                # Handle lock release
                success = await lock_manager.release_lock(
                    workflow_id,
                    message.node_id,
                    user_id
                )
                
                if success:
                    # Lock released successfully
                    lock_released_msg = LockReleasedMessage(
                        type='lock_released',
                        node_id=message.node_id
                    )
                    # Broadcast to all users in the workflow
                    await websocket_manager.broadcast_to_workflow(
                        lock_released_msg.dict(),
                        workflow_id
                    )
                    logger.info(f"Lock released for node {message.node_id} by user {user_id}")
                else:
                    # Lock release failed (shouldn't happen normally)
                    error_msg = ErrorMessage(
                        type='error',
                        message='Failed to release lock',
                        code='LOCK_RELEASE_FAILED'
                    )
                    await websocket_manager.send_personal_message(error_msg.dict(), user_id)
                    logger.warning(f"Lock release failed for node {message.node_id} by user {user_id}")
                
                # End message processing tracking
                monitoring_service.end_message_processing(message_id, 'lock_release', workflow_id)
            
            elif isinstance(message, ChangeMessage):
                # Handle workflow change
                logger.info(
                    f"Change received: type={message.change.type}, "
                    f"workflow={workflow_id}, user={user_id}"
                )
                
                try:
                    # Apply the change to the database
                    success = await sync_service.apply_change(workflow_id, message.change)
                    
                    if success:
                        # Broadcast the change to all users
                        change_applied_msg = ChangeAppliedMessage(
                            type='change_applied',
                            change=message.change
                        )
                        await websocket_manager.broadcast_to_workflow(
                            change_applied_msg.dict(),
                            workflow_id
                        )
                        logger.info(f"Change {message.change.id} applied and broadcasted")
                    else:
                        # Change application failed
                        error_msg = ErrorMessage(
                            type='error',
                            message='Failed to apply change',
                            code='CHANGE_APPLY_FAILED'
                        )
                        await websocket_manager.send_personal_message(error_msg.dict(), user_id)
                        logger.error(f"Failed to apply change {message.change.id}")
                
                except Exception as e:
                    logger.error(f"Error handling change: {e}", exc_info=True)
                    error_msg = ErrorMessage(
                        type='error',
                        message=f'Error processing change: {str(e)}',
                        code='CHANGE_ERROR'
                    )
                    await websocket_manager.send_personal_message(error_msg.dict(), user_id)
                    
                    # Log error
                    monitoring_service.log_error(
                        error_type='change_processing_error',
                        workflow_id=workflow_id,
                        error_message=str(e),
                        user_id=user_id,
                        exc_info=e
                    )
                
                # End message processing tracking
                monitoring_service.end_message_processing(message_id, 'change', workflow_id)
            
            elif isinstance(message, LeaveMessage):
                # User is leaving
                break
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}, workflow={workflow_id}")
    
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}", exc_info=True)
    
    finally:
        # Clean up
        await websocket_manager.disconnect(user_id)
        session_manager.leave_session(workflow_id, user_id)
        
        # Reset rate limiter for this user
        rate_limiter.reset_user(user_id)
        
        # Release all locks held by this user
        released_locks = await lock_manager.release_user_locks(workflow_id, user_id)
        if released_locks > 0:
            logger.info(f"Released {released_locks} locks for user {user_id}")
            # Notify other users about released locks
            # Note: We could send individual lock_released messages for each lock,
            # but for simplicity, other users will discover released locks when they try to acquire them
        
        # Notify other users
        user_left_msg = UserLeftMessage(
            type='user_left',
            user_id=user_id
        )
        await websocket_manager.broadcast_to_workflow(
            user_left_msg.dict(),
            workflow_id
        )
        
        logger.info(f"User {user_id} left workflow {workflow_id}")
