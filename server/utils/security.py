"""
Security utilities for authentication and authorization.
Provides JWT token validation, workflow access control, and rate limiting.
"""

import time
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status
from server.utils.logger import setup_logger

logger = setup_logger()

# Security configuration
SECRET_KEY = "your-secret-key-here-change-in-production"  # TODO: Move to environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


class TokenData:
    """Data extracted from JWT token"""
    def __init__(self, user_id: str, username: Optional[str] = None):
        self.user_id = user_id
        self.username = username


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time
        
    Returns:
        Encoded JWT token
    """
    from datetime import timezone
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token to verify
        
    Returns:
        TokenData if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing 'sub' claim")
            return None
        
        username: str = payload.get("username")
        return TokenData(user_id=user_id, username=username)
    
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        return None
    
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {e}")
        return None


async def authenticate_websocket(token: Optional[str]) -> Optional[TokenData]:
    """
    Authenticate a WebSocket connection using JWT token.
    
    Args:
        token: JWT token from query parameter or header
        
    Returns:
        TokenData if authenticated, None otherwise
    """
    if not token:
        logger.warning("No token provided for WebSocket authentication")
        return None
    
    return verify_token(token)


async def authorize_workflow_access(user_id: str, workflow_id: str) -> bool:
    """
    Check if a user has access to a workflow.
    
    For now, this is a placeholder that allows all access.
    In production, this should check against a database of workflow permissions.
    
    Args:
        user_id: User ID requesting access
        workflow_id: Workflow ID to access
        
    Returns:
        True if authorized, False otherwise
    """
    # TODO: Implement actual authorization logic
    # This should check:
    # 1. If the user is the owner of the workflow
    # 2. If the user is in the list of collaborators
    # 3. If the workflow has public access enabled
    
    logger.info(f"Authorization check: user={user_id}, workflow={workflow_id}")
    
    # For now, allow all access
    # In production, query the database:
    # workflow = await get_workflow(workflow_id)
    # return user_id in workflow.collaborators or user_id == workflow.owner_id
    
    return True


class RateLimiter:
    """
    Rate limiter for WebSocket messages.
    Prevents abuse by limiting the number of messages per user per time window.
    """
    
    def __init__(self, max_messages_per_second: int = 10, window_seconds: float = 1.0):
        """
        Initialize rate limiter.
        
        Args:
            max_messages_per_second: Maximum messages allowed per second
            window_seconds: Time window for rate limiting (seconds)
        """
        self.max_messages = max_messages_per_second
        self.window = window_seconds
        self.user_messages: Dict[str, List[float]] = {}
    
    def check_rate_limit(self, user_id: str) -> bool:
        """
        Check if a user is within rate limits.
        
        Args:
            user_id: User ID to check
            
        Returns:
            True if within limits, False if rate limit exceeded
        """
        now = time.time()
        
        # Initialize user's message list if not exists
        if user_id not in self.user_messages:
            self.user_messages[user_id] = []
        
        # Remove messages outside the time window
        self.user_messages[user_id] = [
            ts for ts in self.user_messages[user_id]
            if now - ts < self.window
        ]
        
        # Check if limit exceeded
        if len(self.user_messages[user_id]) >= self.max_messages:
            logger.warning(
                f"Rate limit exceeded for user {user_id}: "
                f"{len(self.user_messages[user_id])} messages in {self.window}s"
            )
            return False
        
        # Add current message timestamp
        self.user_messages[user_id].append(now)
        return True
    
    def reset_user(self, user_id: str):
        """
        Reset rate limit for a user.
        
        Args:
            user_id: User ID to reset
        """
        if user_id in self.user_messages:
            del self.user_messages[user_id]
    
    def cleanup_old_entries(self, max_age_seconds: float = 300):
        """
        Clean up old entries to prevent memory leaks.
        
        Args:
            max_age_seconds: Maximum age of entries to keep (seconds)
        """
        now = time.time()
        users_to_remove = []
        
        for user_id, timestamps in self.user_messages.items():
            # Remove old timestamps
            self.user_messages[user_id] = [
                ts for ts in timestamps
                if now - ts < max_age_seconds
            ]
            
            # Mark user for removal if no recent messages
            if not self.user_messages[user_id]:
                users_to_remove.append(user_id)
        
        # Remove users with no recent messages
        for user_id in users_to_remove:
            del self.user_messages[user_id]
        
        if users_to_remove:
            logger.debug(f"Cleaned up rate limiter entries for {len(users_to_remove)} users")


# Global rate limiter instance
rate_limiter = RateLimiter(max_messages_per_second=10, window_seconds=1.0)
