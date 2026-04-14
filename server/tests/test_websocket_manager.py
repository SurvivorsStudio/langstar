"""
Unit tests for WebSocketManager.
Tests connection management, message routing, and broadcasting.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from server.services.websocket_manager import WebSocketManager
from server.models.collaboration import SessionInfo


@pytest.mark.asyncio
async def test_connect():
    """Test WebSocket connection"""
    manager = WebSocketManager()
    websocket = AsyncMock()
    user_id = "user1"
    workflow_id = "workflow1"
    
    await manager.connect(websocket, user_id, workflow_id)
    
    # Verify connection was accepted
    websocket.accept.assert_called_once()
    
    # Verify user is in active connections
    assert user_id in manager.active_connections
    assert manager.active_connections[user_id] == websocket
    
    # Verify session info is stored
    assert user_id in manager.user_sessions
    assert manager.user_sessions[user_id].user_id == user_id
    assert manager.user_sessions[user_id].workflow_id == workflow_id
    
    # Verify connection count
    assert manager.get_connection_count() == 1


@pytest.mark.asyncio
async def test_disconnect():
    """Test WebSocket disconnection"""
    manager = WebSocketManager()
    websocket = AsyncMock()
    user_id = "user1"
    workflow_id = "workflow1"
    
    # Connect first
    await manager.connect(websocket, user_id, workflow_id)
    
    # Disconnect
    await manager.disconnect(user_id)
    
    # Verify connection was closed
    websocket.close.assert_called_once()
    
    # Verify user is removed from active connections
    assert user_id not in manager.active_connections
    assert user_id not in manager.user_sessions
    
    # Verify connection count
    assert manager.get_connection_count() == 0


@pytest.mark.asyncio
async def test_send_personal_message():
    """Test sending message to specific user"""
    manager = WebSocketManager()
    websocket = AsyncMock()
    user_id = "user1"
    workflow_id = "workflow1"
    
    await manager.connect(websocket, user_id, workflow_id)
    
    message = {"type": "test", "data": "hello"}
    await manager.send_personal_message(message, user_id)
    
    # Verify message was sent
    websocket.send_json.assert_called_once_with(message)


@pytest.mark.asyncio
async def test_send_personal_message_to_disconnected_user():
    """Test sending message to disconnected user (should not raise error)"""
    manager = WebSocketManager()
    
    message = {"type": "test", "data": "hello"}
    # Should not raise error
    await manager.send_personal_message(message, "nonexistent_user")


@pytest.mark.asyncio
async def test_broadcast_to_workflow():
    """Test broadcasting message to all users in a workflow"""
    manager = WebSocketManager()
    
    # Connect multiple users to same workflow
    user1_ws = AsyncMock()
    user2_ws = AsyncMock()
    user3_ws = AsyncMock()
    
    await manager.connect(user1_ws, "user1", "workflow1")
    await manager.connect(user2_ws, "user2", "workflow1")
    await manager.connect(user3_ws, "user3", "workflow2")  # Different workflow
    
    message = {"type": "test", "data": "broadcast"}
    
    # Broadcast to workflow1
    await manager.broadcast_to_workflow(message, "workflow1")
    
    # Verify message was sent to users in workflow1
    user1_ws.send_json.assert_called_once_with(message)
    user2_ws.send_json.assert_called_once_with(message)
    
    # Verify message was NOT sent to user in workflow2
    user3_ws.send_json.assert_not_called()


@pytest.mark.asyncio
async def test_broadcast_to_workflow_exclude_user():
    """Test broadcasting with user exclusion"""
    manager = WebSocketManager()
    
    # Connect multiple users to same workflow
    user1_ws = AsyncMock()
    user2_ws = AsyncMock()
    
    await manager.connect(user1_ws, "user1", "workflow1")
    await manager.connect(user2_ws, "user2", "workflow1")
    
    message = {"type": "test", "data": "broadcast"}
    
    # Broadcast to workflow1, excluding user1
    await manager.broadcast_to_workflow(message, "workflow1", exclude_user="user1")
    
    # Verify message was NOT sent to user1
    user1_ws.send_json.assert_not_called()
    
    # Verify message was sent to user2
    user2_ws.send_json.assert_called_once_with(message)


@pytest.mark.asyncio
async def test_get_workflow_users():
    """Test getting all users in a workflow"""
    manager = WebSocketManager()
    
    # Connect users to different workflows
    await manager.connect(AsyncMock(), "user1", "workflow1")
    await manager.connect(AsyncMock(), "user2", "workflow1")
    await manager.connect(AsyncMock(), "user3", "workflow2")
    
    # Get users in workflow1
    users = manager.get_workflow_users("workflow1")
    
    assert len(users) == 2
    assert "user1" in users
    assert "user2" in users
    assert "user3" not in users


@pytest.mark.asyncio
async def test_is_connected():
    """Test checking if user is connected"""
    manager = WebSocketManager()
    
    await manager.connect(AsyncMock(), "user1", "workflow1")
    
    assert manager.is_connected("user1") is True
    assert manager.is_connected("user2") is False


@pytest.mark.asyncio
async def test_get_user_workflow():
    """Test getting workflow ID for a user"""
    manager = WebSocketManager()
    
    await manager.connect(AsyncMock(), "user1", "workflow1")
    
    assert manager.get_user_workflow("user1") == "workflow1"
    assert manager.get_user_workflow("user2") is None


@pytest.mark.asyncio
async def test_multiple_connections_and_disconnections():
    """Test handling multiple connections and disconnections"""
    manager = WebSocketManager()
    
    # Connect multiple users
    for i in range(5):
        await manager.connect(AsyncMock(), f"user{i}", f"workflow{i % 2}")
    
    assert manager.get_connection_count() == 5
    
    # Disconnect some users
    await manager.disconnect("user0")
    await manager.disconnect("user2")
    
    assert manager.get_connection_count() == 3
    assert not manager.is_connected("user0")
    assert not manager.is_connected("user2")
    assert manager.is_connected("user1")
    assert manager.is_connected("user3")
    assert manager.is_connected("user4")
