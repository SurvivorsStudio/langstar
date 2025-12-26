"""
Property-based tests for collaboration features.
Tests universal properties that should hold across all valid executions.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
import json
import asyncio
from typing import List, Dict, Any
import time

from server.services.websocket_manager import WebSocketManager
from server.services.session_manager import SessionManager
from server.services.lock_manager import LockManager
from server.models.collaboration import (
    UserInfo, CollaborationUser, WorkflowChange,
    JoinMessage, WelcomeMessage
)


# Strategies for generating test data
@st.composite
def user_info_strategy(draw):
    """Generate random UserInfo"""
    user_id = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_characters='\x00')))
    user_name = draw(st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_characters='\x00')))
    color = draw(st.sampled_from([
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
        "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52B788"
    ]))
    return UserInfo(user_id=user_id, user_name=user_name, color=color)


@st.composite
def workflow_id_strategy(draw):
    """Generate random workflow ID"""
    return draw(st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_characters='\x00')))


class TestCollaborationProperties:
    """Property-based tests for collaboration features"""
    
    def setup_method(self):
        """Setup before each test method"""
        # Create fresh instances for each test
        self.session_manager = SessionManager()
        self.lock_manager = LockManager()
        self.websocket_manager = WebSocketManager()
    
    def teardown_method(self):
        """Cleanup after each test method"""
        # Clear all state
        if hasattr(self, 'session_manager'):
            self.session_manager.sessions.clear()
        if hasattr(self, 'lock_manager'):
            self.lock_manager.locks.clear()
        if hasattr(self, 'websocket_manager'):
            self.websocket_manager.active_connections.clear()
            self.websocket_manager.user_sessions.clear()
    
    @given(
        workflow_id=workflow_id_strategy(),
        users=st.lists(user_info_strategy(), min_size=2, max_size=10, unique_by=lambda u: u.user_id)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_1_session_join_provides_existing_users(self, workflow_id: str, users: List[UserInfo]):
        """
        Feature: realtime-collaboration, Property 1: 세션 참여 시 기존 사용자 목록 제공
        
        임의의 워크플로우와 사용자 집합에 대해, 새 사용자가 세션에 참여할 때 
        반환되는 사용자 목록은 이미 접속한 모든 사용자를 포함해야 합니다.
        
        Validates: Requirements 1.1
        """
        # Create a fresh session manager for this test run to avoid state leakage
        session_manager = SessionManager()
        
        # Split users into existing users and new user
        existing_users = users[:-1]
        new_user = users[-1]
        
        # Add existing users to the session
        for user in existing_users:
            session_manager.create_or_join_session(workflow_id, user)
        
        # Get the session users before the new user joins
        users_before = session_manager.get_session_users(workflow_id)
        expected_count = len(users_before)
        
        # Verify that existing users are in the session
        assert len(users_before) == len(existing_users), \
            f"Expected {len(existing_users)} users before join, got {len(users_before)}"
        
        # Simulate new user joining
        session = session_manager.create_or_join_session(workflow_id, new_user)
        
        # Get all users in the session (including the new user)
        all_users = session_manager.get_session_users(workflow_id)
        
        # The welcome message should contain all existing users (excluding the joining user)
        # This simulates what the WebSocket endpoint does
        existing_users_for_welcome = [
            u for u in all_users if u.user_id != new_user.user_id
        ]
        
        # Property: The number of existing users shown to the new user should equal
        # the number of users that were in the session before they joined
        assert len(existing_users_for_welcome) == expected_count, \
            f"Expected {expected_count} existing users in welcome message, got {len(existing_users_for_welcome)}"
        
        # Property: All existing user IDs should be present in the welcome message
        existing_user_ids = {u.user_id for u in existing_users}
        welcome_user_ids = {u.user_id for u in existing_users_for_welcome}
        
        assert existing_user_ids == welcome_user_ids, \
            f"Expected user IDs {existing_user_ids}, got {welcome_user_ids}"
        
        # Property: The new user should also be in the session now
        assert new_user.user_id in {u.user_id for u in all_users}, \
            f"New user {new_user.user_id} should be in the session"
    
    @pytest.mark.asyncio
    @given(
        workflow_id=workflow_id_strategy(),
        users=st.lists(user_info_strategy(), min_size=2, max_size=5, unique_by=lambda u: u.user_id),
        change_type=st.sampled_from(['node_add', 'node_update', 'node_delete', 'node_move', 'edge_add', 'edge_delete'])
    )
    @settings(max_examples=100, deadline=None)
    async def test_property_2_change_broadcast(self, workflow_id: str, users: List[UserInfo], change_type: str):
        """
        Feature: realtime-collaboration, Property 2: 변경사항 브로드캐스트
        
        임의의 워크플로우 변경사항에 대해, 한 사용자가 변경을 수행하면 
        동일한 워크플로우의 모든 다른 사용자는 해당 변경사항을 나타내는 메시지를 받아야 합니다.
        
        Validates: Requirements 1.2, 1.3, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5
        """
        # Create fresh instances for this test run
        websocket_manager = WebSocketManager()
        session_manager = SessionManager()
        
        # Create a session with all users and register them in the websocket manager
        for user in users:
            session_manager.create_or_join_session(workflow_id, user)
            # Register user session in websocket manager (simulating connection)
            from server.models.collaboration import SessionInfo
            websocket_manager.user_sessions[user.user_id] = SessionInfo(
                user_id=user.user_id,
                workflow_id=workflow_id
            )
        
        # Track which users should receive messages
        received_messages = {user.user_id: [] for user in users}
        
        # Mock the send_personal_message to track messages
        original_send = websocket_manager.send_personal_message
        
        async def mock_send(message: dict, user_id: str):
            if user_id in received_messages:
                received_messages[user_id].append(message)
        
        websocket_manager.send_personal_message = mock_send
        
        # Pick one user to make the change
        changing_user = users[0]
        other_users = users[1:]
        
        # Create a change message
        change = WorkflowChange(
            id=f"change-{workflow_id}-{change_type}",
            type=change_type,
            workflow_id=workflow_id,
            user_id=changing_user.user_id,
            timestamp=time.time() * 1000,
            data={"id": "test-node-1", "type": "test"}
        )
        
        # Broadcast the change to all users except the one making the change
        await websocket_manager.broadcast_to_workflow(
            {"type": "change_applied", "change": change.model_dump()},
            workflow_id,
            exclude_user=changing_user.user_id
        )
        
        # Property: All other users should have received the message
        for user in other_users:
            assert len(received_messages[user.user_id]) > 0, \
                f"User {user.user_id} should have received a broadcast message"
            
            # Verify the message contains the change
            message = received_messages[user.user_id][0]
            assert message["type"] == "change_applied", \
                f"Message type should be 'change_applied', got {message['type']}"
        
        # Property: The changing user should NOT have received the message (excluded)
        assert len(received_messages[changing_user.user_id]) == 0, \
            f"Changing user {changing_user.user_id} should not receive their own broadcast"
        
        # Restore original method
        websocket_manager.send_personal_message = original_send


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
