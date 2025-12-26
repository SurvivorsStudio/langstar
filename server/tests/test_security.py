"""
Unit tests for security features.
Tests authentication, authorization, message validation, and rate limiting.
"""

import pytest
import time
from datetime import timedelta
from jose import jwt
from server.utils.security import (
    create_access_token,
    verify_token,
    authenticate_websocket,
    authorize_workflow_access,
    RateLimiter,
    SECRET_KEY,
    ALGORITHM
)


class TestAuthentication:
    """Tests for JWT authentication"""
    
    def test_create_access_token(self):
        """Test creating a valid JWT token"""
        data = {"sub": "user123", "username": "testuser"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_access_token_with_expiration(self):
        """Test creating a token with custom expiration"""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=15)
        token = create_access_token(data, expires_delta)
        
        # Decode to verify expiration
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload
    
    def test_verify_valid_token(self):
        """Test verifying a valid token"""
        data = {"sub": "user123", "username": "testuser"}
        token = create_access_token(data)
        
        token_data = verify_token(token)
        
        assert token_data is not None
        assert token_data.user_id == "user123"
        assert token_data.username == "testuser"
    
    def test_verify_invalid_token(self):
        """Test verifying an invalid token"""
        invalid_token = "invalid.token.here"
        
        token_data = verify_token(invalid_token)
        
        assert token_data is None
    
    def test_verify_expired_token(self):
        """Test verifying an expired token"""
        data = {"sub": "user123"}
        # Create token that expires immediately
        expires_delta = timedelta(seconds=-1)
        token = create_access_token(data, expires_delta)
        
        token_data = verify_token(token)
        
        assert token_data is None
    
    def test_verify_token_missing_sub(self):
        """Test verifying a token without 'sub' claim"""
        # Manually create token without 'sub'
        data = {"username": "testuser"}
        token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
        
        token_data = verify_token(token)
        
        assert token_data is None
    
    @pytest.mark.asyncio
    async def test_authenticate_websocket_valid_token(self):
        """Test WebSocket authentication with valid token"""
        data = {"sub": "user123", "username": "testuser"}
        token = create_access_token(data)
        
        token_data = await authenticate_websocket(token)
        
        assert token_data is not None
        assert token_data.user_id == "user123"
    
    @pytest.mark.asyncio
    async def test_authenticate_websocket_no_token(self):
        """Test WebSocket authentication without token"""
        token_data = await authenticate_websocket(None)
        
        assert token_data is None
    
    @pytest.mark.asyncio
    async def test_authenticate_websocket_invalid_token(self):
        """Test WebSocket authentication with invalid token"""
        token_data = await authenticate_websocket("invalid.token")
        
        assert token_data is None


class TestAuthorization:
    """Tests for workflow access authorization"""
    
    @pytest.mark.asyncio
    async def test_authorize_workflow_access_allowed(self):
        """Test authorizing access to a workflow (currently allows all)"""
        user_id = "user123"
        workflow_id = "workflow456"
        
        has_access = await authorize_workflow_access(user_id, workflow_id)
        
        # Currently allows all access
        assert has_access is True
    
    @pytest.mark.asyncio
    async def test_authorize_workflow_access_different_users(self):
        """Test authorization for different users"""
        workflow_id = "workflow456"
        
        user1_access = await authorize_workflow_access("user1", workflow_id)
        user2_access = await authorize_workflow_access("user2", workflow_id)
        
        # Currently allows all access
        assert user1_access is True
        assert user2_access is True


class TestRateLimiter:
    """Tests for rate limiting functionality"""
    
    def test_rate_limiter_initialization(self):
        """Test rate limiter initialization"""
        limiter = RateLimiter(max_messages_per_second=5, window_seconds=1.0)
        
        assert limiter.max_messages == 5
        assert limiter.window == 1.0
        assert len(limiter.user_messages) == 0
    
    def test_rate_limiter_within_limit(self):
        """Test rate limiter allows messages within limit"""
        limiter = RateLimiter(max_messages_per_second=5, window_seconds=1.0)
        user_id = "user123"
        
        # Send 5 messages (within limit)
        for i in range(5):
            result = limiter.check_rate_limit(user_id)
            assert result is True
    
    def test_rate_limiter_exceeds_limit(self):
        """Test rate limiter blocks messages exceeding limit"""
        limiter = RateLimiter(max_messages_per_second=5, window_seconds=1.0)
        user_id = "user123"
        
        # Send 5 messages (within limit)
        for i in range(5):
            result = limiter.check_rate_limit(user_id)
            assert result is True
        
        # 6th message should be blocked
        result = limiter.check_rate_limit(user_id)
        assert result is False
    
    def test_rate_limiter_window_reset(self):
        """Test rate limiter resets after time window"""
        limiter = RateLimiter(max_messages_per_second=3, window_seconds=0.1)
        user_id = "user123"
        
        # Send 3 messages (within limit)
        for i in range(3):
            result = limiter.check_rate_limit(user_id)
            assert result is True
        
        # 4th message should be blocked
        result = limiter.check_rate_limit(user_id)
        assert result is False
        
        # Wait for window to reset
        time.sleep(0.15)
        
        # Should be allowed again
        result = limiter.check_rate_limit(user_id)
        assert result is True
    
    def test_rate_limiter_multiple_users(self):
        """Test rate limiter tracks users independently"""
        limiter = RateLimiter(max_messages_per_second=3, window_seconds=1.0)
        
        # User 1 sends 3 messages
        for i in range(3):
            result = limiter.check_rate_limit("user1")
            assert result is True
        
        # User 2 should still be able to send messages
        for i in range(3):
            result = limiter.check_rate_limit("user2")
            assert result is True
        
        # Both users should be blocked on next message
        assert limiter.check_rate_limit("user1") is False
        assert limiter.check_rate_limit("user2") is False
    
    def test_rate_limiter_reset_user(self):
        """Test resetting rate limit for a specific user"""
        limiter = RateLimiter(max_messages_per_second=3, window_seconds=1.0)
        user_id = "user123"
        
        # Send 3 messages (within limit)
        for i in range(3):
            limiter.check_rate_limit(user_id)
        
        # Reset user
        limiter.reset_user(user_id)
        
        # Should be able to send messages again
        result = limiter.check_rate_limit(user_id)
        assert result is True
    
    def test_rate_limiter_cleanup_old_entries(self):
        """Test cleaning up old rate limiter entries"""
        limiter = RateLimiter(max_messages_per_second=5, window_seconds=1.0)
        
        # Add messages for multiple users
        limiter.check_rate_limit("user1")
        limiter.check_rate_limit("user2")
        limiter.check_rate_limit("user3")
        
        assert len(limiter.user_messages) == 3
        
        # Wait and cleanup
        time.sleep(0.1)
        limiter.cleanup_old_entries(max_age_seconds=0.05)
        
        # All entries should be removed
        assert len(limiter.user_messages) == 0
    
    def test_rate_limiter_cleanup_keeps_recent(self):
        """Test cleanup keeps recent entries"""
        limiter = RateLimiter(max_messages_per_second=5, window_seconds=1.0)
        
        # Add old message
        limiter.check_rate_limit("user1")
        time.sleep(0.1)
        
        # Add recent message
        limiter.check_rate_limit("user2")
        
        # Cleanup old entries
        limiter.cleanup_old_entries(max_age_seconds=0.05)
        
        # user1 should be removed, user2 should remain
        assert "user1" not in limiter.user_messages
        assert "user2" in limiter.user_messages


class TestMessageValidation:
    """Tests for message validation (via Pydantic models)"""
    
    def test_workflow_change_validation_valid(self):
        """Test valid workflow change passes validation"""
        from server.models.collaboration import WorkflowChange
        
        change = WorkflowChange(
            id="change123",
            type="node_add",
            workflow_id="workflow456",
            user_id="user789",
            timestamp=time.time() * 1000,
            data={"node": "test"}
        )
        
        assert change.id == "change123"
        assert change.type == "node_add"
    
    def test_workflow_change_validation_invalid_type(self):
        """Test invalid change type fails validation"""
        from server.models.collaboration import WorkflowChange
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            WorkflowChange(
                id="change123",
                type="invalid_type",
                workflow_id="workflow456",
                user_id="user789",
                data={}
            )
    
    def test_workflow_change_validation_future_timestamp(self):
        """Test future timestamp fails validation"""
        from server.models.collaboration import WorkflowChange
        from pydantic import ValidationError
        
        future_timestamp = (time.time() + 120) * 1000  # 2 minutes in future
        
        with pytest.raises(ValidationError):
            WorkflowChange(
                id="change123",
                type="node_add",
                workflow_id="workflow456",
                user_id="user789",
                timestamp=future_timestamp,
                data={}
            )
    
    def test_workflow_change_validation_empty_id(self):
        """Test empty change ID fails validation"""
        from server.models.collaboration import WorkflowChange
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            WorkflowChange(
                id="",
                type="node_add",
                workflow_id="workflow456",
                user_id="user789",
                data={}
            )
    
    def test_workflow_change_validation_empty_workflow_id(self):
        """Test empty workflow ID fails validation"""
        from server.models.collaboration import WorkflowChange
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            WorkflowChange(
                id="change123",
                type="node_add",
                workflow_id="",
                user_id="user789",
                data={}
            )
    
    def test_workflow_change_validation_empty_user_id(self):
        """Test empty user ID fails validation"""
        from server.models.collaboration import WorkflowChange
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            WorkflowChange(
                id="change123",
                type="node_add",
                workflow_id="workflow456",
                user_id="",
                data={}
            )
    
    def test_lock_request_message_validation(self):
        """Test lock request message validation"""
        from server.models.collaboration import LockRequestMessage
        
        msg = LockRequestMessage(type="lock_request", node_id="node123")
        
        assert msg.type == "lock_request"
        assert msg.node_id == "node123"
    
    def test_cursor_update_message_validation(self):
        """Test cursor update message validation"""
        from server.models.collaboration import CursorUpdateMessage, CursorPosition
        
        msg = CursorUpdateMessage(
            type="cursor_update",
            position=CursorPosition(x=100.0, y=200.0)
        )
        
        assert msg.type == "cursor_update"
        assert msg.position.x == 100.0
        assert msg.position.y == 200.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
