"""
Unit tests for message parsing.
Tests parsing of client messages and validation.
"""

import pytest
from server.routes.collaboration import parse_client_message
from server.models.collaboration import (
    JoinMessage, LeaveMessage, CursorUpdateMessage, ViewportUpdateMessage,
    LockRequestMessage, LockReleaseMessage, ChangeMessage, PingMessage,
    WorkflowChange
)


def test_parse_join_message():
    """Test parsing join message"""
    data = {
        "type": "join",
        "workflow_id": "workflow1",
        "user_id": "user1",
        "user_name": "User One"
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, JoinMessage)
    assert message.type == "join"
    assert message.workflow_id == "workflow1"
    assert message.user_id == "user1"
    assert message.user_name == "User One"


def test_parse_leave_message():
    """Test parsing leave message"""
    data = {
        "type": "leave",
        "workflow_id": "workflow1",
        "user_id": "user1"
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, LeaveMessage)
    assert message.type == "leave"
    assert message.workflow_id == "workflow1"
    assert message.user_id == "user1"


def test_parse_cursor_update_message():
    """Test parsing cursor update message"""
    data = {
        "type": "cursor_update",
        "position": {
            "x": 100.5,
            "y": 200.3
        }
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, CursorUpdateMessage)
    assert message.type == "cursor_update"
    assert message.position.x == 100.5
    assert message.position.y == 200.3


def test_parse_viewport_update_message():
    """Test parsing viewport update message"""
    data = {
        "type": "viewport_update",
        "viewport": {
            "x": 50.0,
            "y": 75.0,
            "zoom": 1.5
        }
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, ViewportUpdateMessage)
    assert message.type == "viewport_update"
    assert message.viewport.x == 50.0
    assert message.viewport.y == 75.0
    assert message.viewport.zoom == 1.5


def test_parse_lock_request_message():
    """Test parsing lock request message"""
    data = {
        "type": "lock_request",
        "node_id": "node1"
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, LockRequestMessage)
    assert message.type == "lock_request"
    assert message.node_id == "node1"


def test_parse_lock_release_message():
    """Test parsing lock release message"""
    data = {
        "type": "lock_release",
        "node_id": "node1"
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, LockReleaseMessage)
    assert message.type == "lock_release"
    assert message.node_id == "node1"


def test_parse_change_message():
    """Test parsing change message"""
    data = {
        "type": "change",
        "change": {
            "id": "change1",
            "type": "node_add",
            "workflow_id": "workflow1",
            "user_id": "user1",
            "timestamp": 1234567890000,
            "data": {
                "node_id": "node1",
                "node_type": "prompt"
            }
        }
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, ChangeMessage)
    assert message.type == "change"
    assert isinstance(message.change, WorkflowChange)
    assert message.change.id == "change1"
    assert message.change.type == "node_add"
    assert message.change.workflow_id == "workflow1"
    assert message.change.user_id == "user1"


def test_parse_ping_message():
    """Test parsing ping message"""
    data = {
        "type": "ping"
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, PingMessage)
    assert message.type == "ping"


def test_parse_unknown_message_type():
    """Test parsing unknown message type"""
    data = {
        "type": "unknown_type",
        "some_field": "some_value"
    }
    
    message = parse_client_message(data)
    
    # Should return None for unknown types
    assert message is None


def test_parse_invalid_message_structure():
    """Test parsing message with invalid structure"""
    data = {
        "type": "join",
        # Missing required fields
    }
    
    message = parse_client_message(data)
    
    # Should return None for invalid structure
    assert message is None


def test_parse_message_with_extra_fields():
    """Test parsing message with extra fields (should be ignored)"""
    data = {
        "type": "ping",
        "extra_field": "should be ignored"
    }
    
    message = parse_client_message(data)
    
    assert isinstance(message, PingMessage)
    assert message.type == "ping"


def test_parse_change_message_with_different_types():
    """Test parsing change messages with different change types"""
    change_types = ['node_add', 'node_update', 'node_delete', 'node_move', 'edge_add', 'edge_delete']
    
    for change_type in change_types:
        data = {
            "type": "change",
            "change": {
                "id": f"change_{change_type}",
                "type": change_type,
                "workflow_id": "workflow1",
                "user_id": "user1",
                "timestamp": 1234567890000,
                "data": {}
            }
        }
        
        message = parse_client_message(data)
        
        assert isinstance(message, ChangeMessage)
        assert message.change.type == change_type


def test_parse_message_missing_type():
    """Test parsing message without type field"""
    data = {
        "workflow_id": "workflow1",
        "user_id": "user1"
    }
    
    message = parse_client_message(data)
    
    # Should return None when type is missing
    assert message is None


def test_workflow_change_timestamp_validation():
    """Test that future timestamps are rejected"""
    import time
    
    # Create a timestamp far in the future
    future_timestamp = (time.time() + 120) * 1000  # 2 minutes in future
    
    with pytest.raises(ValueError):
        WorkflowChange(
            id="change1",
            type="node_add",
            workflow_id="workflow1",
            user_id="user1",
            timestamp=future_timestamp,
            data={}
        )


def test_workflow_change_valid_timestamp():
    """Test that current timestamps are accepted"""
    import time
    
    current_timestamp = time.time() * 1000
    
    change = WorkflowChange(
        id="change1",
        type="node_add",
        workflow_id="workflow1",
        user_id="user1",
        timestamp=current_timestamp,
        data={}
    )
    
    assert change.timestamp == current_timestamp
