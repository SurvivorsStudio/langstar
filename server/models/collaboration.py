"""
Collaboration models for real-time collaboration feature.
Defines message protocols and data structures for WebSocket communication.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, Literal
from datetime import datetime
import time


# User and Session Models
class UserInfo(BaseModel):
    """Information about a user in a collaboration session"""
    user_id: str
    user_name: str
    color: str
    joined_at: float = Field(default_factory=lambda: time.time())
    last_activity: float = Field(default_factory=lambda: time.time())


class CursorPosition(BaseModel):
    """User cursor position"""
    x: float
    y: float


class ViewportInfo(BaseModel):
    """User viewport information"""
    x: float
    y: float
    zoom: float


class CollaborationUser(BaseModel):
    """Complete user information for collaboration"""
    user_id: str
    user_name: str
    color: str
    cursor: Optional[CursorPosition] = None
    viewport: Optional[ViewportInfo] = None
    joined_at: float
    last_activity: float


# Lock Models
class NodeLock(BaseModel):
    """Node lock information"""
    node_id: str
    owner_id: str
    owner_name: str
    acquired_at: float = Field(default_factory=lambda: time.time())
    expires_at: float = Field(default_factory=lambda: time.time() + 300)  # 5 minutes default


# Workflow Change Models
class WorkflowChange(BaseModel):
    """Workflow change event"""
    id: str
    type: Literal['node_add', 'node_update', 'node_delete', 'node_move', 'edge_add', 'edge_delete']
    workflow_id: str
    user_id: str
    timestamp: float = Field(default_factory=lambda: time.time() * 1000)  # milliseconds
    data: Dict[str, Any]
    
    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        """Validate change type is one of the allowed types"""
        allowed_types = ['node_add', 'node_update', 'node_delete', 'node_move', 'edge_add', 'edge_delete']
        if v not in allowed_types:
            raise ValueError(f'Invalid change type: {v}. Must be one of {allowed_types}')
        return v
    
    @field_validator('timestamp')
    @classmethod
    def validate_timestamp(cls, v):
        """Validate timestamp is not too far in the future"""
        now = time.time() * 1000
        if v > now + 60000:  # Future 1 minute is rejected
            raise ValueError('Timestamp too far in future')
        return v
    
    @field_validator('id')
    @classmethod
    def validate_id(cls, v):
        """Validate change ID is not empty"""
        if not v or not v.strip():
            raise ValueError('Change ID cannot be empty')
        return v
    
    @field_validator('workflow_id')
    @classmethod
    def validate_workflow_id(cls, v):
        """Validate workflow ID is not empty"""
        if not v or not v.strip():
            raise ValueError('Workflow ID cannot be empty')
        return v
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v):
        """Validate user ID is not empty"""
        if not v or not v.strip():
            raise ValueError('User ID cannot be empty')
        return v


# WebSocket Message Protocol - Client to Server
class JoinMessage(BaseModel):
    """Client joins a workflow session"""
    type: Literal['join'] = 'join'
    workflow_id: str
    user_id: str
    user_name: str


class LeaveMessage(BaseModel):
    """Client leaves a workflow session"""
    type: Literal['leave'] = 'leave'
    workflow_id: str
    user_id: str


class CursorUpdateMessage(BaseModel):
    """Client updates cursor position"""
    type: Literal['cursor_update'] = 'cursor_update'
    position: CursorPosition


class ViewportUpdateMessage(BaseModel):
    """Client updates viewport"""
    type: Literal['viewport_update'] = 'viewport_update'
    viewport: ViewportInfo


class LockRequestMessage(BaseModel):
    """Client requests node lock"""
    type: Literal['lock_request'] = 'lock_request'
    node_id: str


class LockReleaseMessage(BaseModel):
    """Client releases node lock"""
    type: Literal['lock_release'] = 'lock_release'
    node_id: str


class ChangeMessage(BaseModel):
    """Client sends workflow change"""
    type: Literal['change'] = 'change'
    change: WorkflowChange


class PingMessage(BaseModel):
    """Client ping"""
    type: Literal['ping'] = 'ping'


# WebSocket Message Protocol - Server to Client
class WelcomeMessage(BaseModel):
    """Server welcomes new user with current state"""
    type: Literal['welcome'] = 'welcome'
    users: list[CollaborationUser]
    locks: list[NodeLock]


class UserJoinedMessage(BaseModel):
    """Server notifies user joined"""
    type: Literal['user_joined'] = 'user_joined'
    user: CollaborationUser


class UserLeftMessage(BaseModel):
    """Server notifies user left"""
    type: Literal['user_left'] = 'user_left'
    user_id: str


class CursorMovedMessage(BaseModel):
    """Server broadcasts cursor movement"""
    type: Literal['cursor_moved'] = 'cursor_moved'
    user_id: str
    position: CursorPosition


class ViewportChangedMessage(BaseModel):
    """Server broadcasts viewport change"""
    type: Literal['viewport_changed'] = 'viewport_changed'
    user_id: str
    viewport: ViewportInfo


class LockAcquiredMessage(BaseModel):
    """Server confirms lock acquisition"""
    type: Literal['lock_acquired'] = 'lock_acquired'
    node_id: str
    lock: NodeLock


class LockReleasedMessage(BaseModel):
    """Server confirms lock release"""
    type: Literal['lock_released'] = 'lock_released'
    node_id: str


class LockFailedMessage(BaseModel):
    """Server notifies lock acquisition failed"""
    type: Literal['lock_failed'] = 'lock_failed'
    node_id: str
    reason: str


class ChangeAppliedMessage(BaseModel):
    """Server broadcasts applied change"""
    type: Literal['change_applied'] = 'change_applied'
    change: WorkflowChange


class SyncRequiredMessage(BaseModel):
    """Server requests client to sync state"""
    type: Literal['sync_required'] = 'sync_required'
    state: Dict[str, Any]


class ErrorMessage(BaseModel):
    """Server sends error message"""
    type: Literal['error'] = 'error'
    message: str
    code: Optional[str] = None


class PongMessage(BaseModel):
    """Server pong response"""
    type: Literal['pong'] = 'pong'


# Session Information
class SessionInfo(BaseModel):
    """Information about a user's WebSocket session"""
    user_id: str
    workflow_id: str
    connected_at: float = Field(default_factory=lambda: time.time())


class WorkflowSession(BaseModel):
    """Information about a workflow collaboration session"""
    workflow_id: str
    users: Dict[str, UserInfo] = Field(default_factory=dict)
    created_at: float = Field(default_factory=lambda: time.time())
    last_activity: float = Field(default_factory=lambda: time.time())
