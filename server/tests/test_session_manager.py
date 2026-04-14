"""
Unit tests for SessionManager.
Tests session creation, joining, leaving, and cleanup.
"""

import pytest
import time
from server.services.session_manager import SessionManager
from server.models.collaboration import UserInfo


def test_create_or_join_session_new():
    """Test creating a new session"""
    manager = SessionManager()
    
    user_info = UserInfo(
        user_id="user1",
        user_name="User One",
        color="#FF0000"
    )
    
    session = manager.create_or_join_session("workflow1", user_info)
    
    # Verify session was created
    assert session.workflow_id == "workflow1"
    assert "user1" in session.users
    assert session.users["user1"].user_name == "User One"
    
    # Verify session is stored
    assert "workflow1" in manager.sessions


def test_create_or_join_session_existing():
    """Test joining an existing session"""
    manager = SessionManager()
    
    # Create session with first user
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    manager.create_or_join_session("workflow1", user1)
    
    # Join with second user
    user2 = UserInfo(user_id="user2", user_name="User Two", color="#00FF00")
    session = manager.create_or_join_session("workflow1", user2)
    
    # Verify both users are in session
    assert len(session.users) == 2
    assert "user1" in session.users
    assert "user2" in session.users


def test_leave_session():
    """Test leaving a session"""
    manager = SessionManager()
    
    # Create session with two users
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    user2 = UserInfo(user_id="user2", user_name="User Two", color="#00FF00")
    
    manager.create_or_join_session("workflow1", user1)
    manager.create_or_join_session("workflow1", user2)
    
    # User1 leaves
    session = manager.leave_session("workflow1", "user1")
    
    # Verify user1 is removed
    assert session is not None
    assert "user1" not in session.users
    assert "user2" in session.users
    assert len(session.users) == 1


def test_leave_session_last_user():
    """Test leaving session when last user leaves (session should be removed)"""
    manager = SessionManager()
    
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    manager.create_or_join_session("workflow1", user1)
    
    # Last user leaves
    session = manager.leave_session("workflow1", "user1")
    
    # Verify session is removed
    assert session is None
    assert "workflow1" not in manager.sessions


def test_leave_session_nonexistent():
    """Test leaving a session that doesn't exist"""
    manager = SessionManager()
    
    session = manager.leave_session("nonexistent", "user1")
    
    # Should return None without error
    assert session is None


def test_get_session():
    """Test getting a session"""
    manager = SessionManager()
    
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    manager.create_or_join_session("workflow1", user1)
    
    # Get existing session
    session = manager.get_session("workflow1")
    assert session is not None
    assert session.workflow_id == "workflow1"
    
    # Get nonexistent session
    session = manager.get_session("nonexistent")
    assert session is None


def test_get_session_users():
    """Test getting all users in a session"""
    manager = SessionManager()
    
    # Create session with multiple users
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    user2 = UserInfo(user_id="user2", user_name="User Two", color="#00FF00")
    user3 = UserInfo(user_id="user3", user_name="User Three", color="#0000FF")
    
    manager.create_or_join_session("workflow1", user1)
    manager.create_or_join_session("workflow1", user2)
    manager.create_or_join_session("workflow1", user3)
    
    users = manager.get_session_users("workflow1")
    
    assert len(users) == 3
    user_ids = [u.user_id for u in users]
    assert "user1" in user_ids
    assert "user2" in user_ids
    assert "user3" in user_ids


def test_get_session_users_empty():
    """Test getting users from nonexistent session"""
    manager = SessionManager()
    
    users = manager.get_session_users("nonexistent")
    
    assert users == []


def test_update_user_activity():
    """Test updating user activity timestamp"""
    manager = SessionManager()
    
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    manager.create_or_join_session("workflow1", user1)
    
    # Get initial timestamp
    initial_activity = manager.sessions["workflow1"].users["user1"].last_activity
    
    # Wait a bit
    time.sleep(0.01)
    
    # Update activity
    manager.update_user_activity("workflow1", "user1")
    
    # Verify timestamp was updated
    updated_activity = manager.sessions["workflow1"].users["user1"].last_activity
    assert updated_activity > initial_activity


def test_update_user_activity_nonexistent():
    """Test updating activity for nonexistent user (should not raise error)"""
    manager = SessionManager()
    
    # Should not raise error
    manager.update_user_activity("nonexistent", "user1")


def test_cleanup_empty_sessions():
    """Test cleaning up empty sessions"""
    manager = SessionManager()
    
    # Create sessions
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    user2 = UserInfo(user_id="user2", user_name="User Two", color="#00FF00")
    
    manager.create_or_join_session("workflow1", user1)
    manager.create_or_join_session("workflow2", user2)
    
    # Manually empty one session
    manager.sessions["workflow1"].users.clear()
    
    # Cleanup
    cleaned = manager.cleanup_empty_sessions()
    
    # Verify empty session was removed
    assert cleaned == 1
    assert "workflow1" not in manager.sessions
    assert "workflow2" in manager.sessions


def test_get_all_sessions():
    """Test getting all active sessions"""
    manager = SessionManager()
    
    user1 = UserInfo(user_id="user1", user_name="User One", color="#FF0000")
    user2 = UserInfo(user_id="user2", user_name="User Two", color="#00FF00")
    
    manager.create_or_join_session("workflow1", user1)
    manager.create_or_join_session("workflow2", user2)
    
    sessions = manager.get_all_sessions()
    
    assert len(sessions) == 2
    assert "workflow1" in sessions
    assert "workflow2" in sessions


def test_multiple_workflows():
    """Test managing multiple workflows simultaneously"""
    manager = SessionManager()
    
    # Create users in different workflows
    for i in range(3):
        for j in range(2):
            user = UserInfo(
                user_id=f"user{i}_{j}",
                user_name=f"User {i}_{j}",
                color="#FF0000"
            )
            manager.create_or_join_session(f"workflow{i}", user)
    
    # Verify all sessions exist
    assert len(manager.sessions) == 3
    
    # Verify each session has 2 users
    for i in range(3):
        users = manager.get_session_users(f"workflow{i}")
        assert len(users) == 2
