"""
Property-based tests for LockManager.
Tests the correctness properties defined in the design document.
"""

import pytest
import asyncio
from hypothesis import given, strategies as st, assume, settings
from server.services.lock_manager import LockManager


# Test fixtures
@pytest.fixture
def lock_manager():
    """Create a fresh LockManager instance for each test"""
    return LockManager()


# Property 4: 노드 잠금 라운드 트립
# Feature: realtime-collaboration, Property 4: 노드 잠금 라운드 트립
# Validates: Requirements 2.1, 2.4
@pytest.mark.asyncio
@given(
    workflow_id=st.text(min_size=1, max_size=50),
    node_id=st.text(min_size=1, max_size=50),
    user_id=st.text(min_size=1, max_size=50),
    user_name=st.text(min_size=1, max_size=50)
)
@settings(max_examples=100)
async def test_lock_round_trip(workflow_id, node_id, user_id, user_name):
    """
    Feature: realtime-collaboration, Property 4: 노드 잠금 라운드 트립
    
    임의의 노드와 사용자에 대해, 잠금을 획득한 후 즉시 해제하면 
    해당 노드는 잠기지 않은 상태로 돌아가야 합니다.
    
    Validates: Requirements 2.1, 2.4
    """
    lock_manager = LockManager()
    
    # Acquire lock
    acquired = await lock_manager.acquire_lock(workflow_id, node_id, user_id, user_name)
    assert acquired is True, "Lock acquisition should succeed"
    
    # Verify lock is held
    assert lock_manager.is_locked(workflow_id, node_id) is True, "Node should be locked"
    
    # Release lock
    released = await lock_manager.release_lock(workflow_id, node_id, user_id)
    assert released is True, "Lock release should succeed"
    
    # Verify lock is released (round trip complete)
    assert lock_manager.is_locked(workflow_id, node_id) is False, \
        "Node should be unlocked after release (round trip property)"


# Property 5: 잠금 배타성
# Feature: realtime-collaboration, Property 5: 잠금 배타성
# Validates: Requirements 2.3
@pytest.mark.asyncio
@given(
    workflow_id=st.text(min_size=1, max_size=50),
    node_id=st.text(min_size=1, max_size=50),
    user_a_id=st.text(min_size=1, max_size=50),
    user_a_name=st.text(min_size=1, max_size=50),
    user_b_id=st.text(min_size=1, max_size=50),
    user_b_name=st.text(min_size=1, max_size=50)
)
@settings(max_examples=100)
async def test_lock_exclusivity(workflow_id, node_id, user_a_id, user_a_name, user_b_id, user_b_name):
    """
    Feature: realtime-collaboration, Property 5: 잠금 배타성
    
    임의의 노드에 대해, 한 사용자가 잠금을 보유하고 있을 때 
    다른 사용자의 잠금 획득 시도는 실패해야 합니다.
    
    Validates: Requirements 2.3
    """
    # Ensure users are different
    assume(user_a_id != user_b_id)
    
    lock_manager = LockManager()
    
    # User A acquires lock
    acquired_a = await lock_manager.acquire_lock(workflow_id, node_id, user_a_id, user_a_name)
    assert acquired_a is True, "User A should acquire lock successfully"
    
    # Verify lock is held by user A
    assert lock_manager.is_locked(workflow_id, node_id) is True
    assert lock_manager.get_lock_owner(workflow_id, node_id) == user_a_id
    
    # User B attempts to acquire the same lock (should fail)
    acquired_b = await lock_manager.acquire_lock(workflow_id, node_id, user_b_id, user_b_name)
    assert acquired_b is False, \
        "User B should NOT be able to acquire lock while User A holds it (exclusivity property)"
    
    # Verify lock is still held by user A
    assert lock_manager.get_lock_owner(workflow_id, node_id) == user_a_id, \
        "Lock should still be owned by User A"


# Property 7: 세션 종료 시 잠금 자동 해제
# Feature: realtime-collaboration, Property 7: 세션 종료 시 잠금 자동 해제
# Validates: Requirements 2.5
@pytest.mark.asyncio
@given(
    workflow_id=st.text(min_size=1, max_size=50),
    user_id=st.text(min_size=1, max_size=50),
    user_name=st.text(min_size=1, max_size=50),
    node_ids=st.lists(st.text(min_size=1, max_size=50), min_size=1, max_size=10, unique=True)
)
@settings(max_examples=100)
async def test_session_end_releases_all_locks(workflow_id, user_id, user_name, node_ids):
    """
    Feature: realtime-collaboration, Property 7: 세션 종료 시 잠금 자동 해제
    
    임의의 사용자가 보유한 모든 노드 잠금에 대해, 해당 사용자의 세션이 종료되면 
    모든 잠금이 해제되어야 합니다.
    
    Validates: Requirements 2.5
    """
    lock_manager = LockManager()
    
    # User acquires locks on multiple nodes
    for node_id in node_ids:
        acquired = await lock_manager.acquire_lock(workflow_id, node_id, user_id, user_name)
        assert acquired is True, f"Lock acquisition should succeed for node {node_id}"
    
    # Verify all nodes are locked
    for node_id in node_ids:
        assert lock_manager.is_locked(workflow_id, node_id) is True, \
            f"Node {node_id} should be locked"
        assert lock_manager.get_lock_owner(workflow_id, node_id) == user_id, \
            f"Node {node_id} should be owned by user"
    
    # Simulate session end - release all user's locks
    released_count = await lock_manager.release_user_locks(workflow_id, user_id)
    assert released_count == len(node_ids), \
        f"Should release {len(node_ids)} locks, but released {released_count}"
    
    # Verify all nodes are now unlocked (automatic release on session end)
    for node_id in node_ids:
        assert lock_manager.is_locked(workflow_id, node_id) is False, \
            f"Node {node_id} should be unlocked after session end (automatic release property)"


# Additional unit tests for edge cases and specific scenarios

@pytest.mark.asyncio
async def test_same_user_can_refresh_lock():
    """Test that the same user can refresh their own lock"""
    lock_manager = LockManager()
    workflow_id = "workflow-1"
    node_id = "node-1"
    user_id = "user-1"
    user_name = "User One"
    
    # Acquire lock
    acquired = await lock_manager.acquire_lock(workflow_id, node_id, user_id, user_name)
    assert acquired is True
    
    # Get initial lock info
    lock1 = lock_manager.get_lock(workflow_id, node_id)
    assert lock1 is not None
    initial_acquired_at = lock1.acquired_at
    
    # Wait a tiny bit
    await asyncio.sleep(0.01)
    
    # Same user acquires again (should refresh)
    acquired_again = await lock_manager.acquire_lock(workflow_id, node_id, user_id, user_name)
    assert acquired_again is True
    
    # Verify lock is refreshed
    lock2 = lock_manager.get_lock(workflow_id, node_id)
    assert lock2 is not None
    assert lock2.acquired_at > initial_acquired_at, "Lock should be refreshed with new timestamp"


@pytest.mark.asyncio
async def test_release_nonexistent_lock():
    """Test releasing a lock that doesn't exist"""
    lock_manager = LockManager()
    
    released = await lock_manager.release_lock("workflow-1", "node-1", "user-1")
    assert released is False, "Releasing non-existent lock should return False"


@pytest.mark.asyncio
async def test_release_lock_by_wrong_user():
    """Test that a user cannot release another user's lock"""
    lock_manager = LockManager()
    workflow_id = "workflow-1"
    node_id = "node-1"
    
    # User A acquires lock
    await lock_manager.acquire_lock(workflow_id, node_id, "user-a", "User A")
    
    # User B tries to release it
    released = await lock_manager.release_lock(workflow_id, node_id, "user-b")
    assert released is False, "User B should not be able to release User A's lock"
    
    # Verify lock is still held by User A
    assert lock_manager.is_locked(workflow_id, node_id) is True
    assert lock_manager.get_lock_owner(workflow_id, node_id) == "user-a"


@pytest.mark.asyncio
async def test_expired_lock_is_automatically_removed():
    """Test that expired locks are automatically removed"""
    lock_manager = LockManager(default_lock_duration=0.1)  # 0.1 second duration
    workflow_id = "workflow-1"
    node_id = "node-1"
    
    # Acquire lock with short duration
    await lock_manager.acquire_lock(workflow_id, node_id, "user-1", "User One", duration=0.1)
    
    # Verify lock exists
    assert lock_manager.is_locked(workflow_id, node_id) is True
    
    # Wait for lock to expire
    await asyncio.sleep(0.15)
    
    # Check if lock is still valid (should be removed)
    assert lock_manager.is_locked(workflow_id, node_id) is False, \
        "Expired lock should be automatically removed"


@pytest.mark.asyncio
async def test_get_workflow_locks():
    """Test getting all locks for a workflow"""
    lock_manager = LockManager()
    workflow_id = "workflow-1"
    
    # Acquire locks on multiple nodes
    await lock_manager.acquire_lock(workflow_id, "node-1", "user-1", "User One")
    await lock_manager.acquire_lock(workflow_id, "node-2", "user-2", "User Two")
    await lock_manager.acquire_lock(workflow_id, "node-3", "user-1", "User One")
    
    # Acquire lock in different workflow
    await lock_manager.acquire_lock("workflow-2", "node-1", "user-3", "User Three")
    
    # Get locks for workflow-1
    locks = lock_manager.get_workflow_locks(workflow_id)
    
    assert len(locks) == 3, "Should have 3 locks in workflow-1"
    node_ids = {lock.node_id for lock in locks}
    assert node_ids == {"node-1", "node-2", "node-3"}


@pytest.mark.asyncio
async def test_cleanup_expired_locks():
    """Test manual cleanup of expired locks"""
    lock_manager = LockManager(default_lock_duration=0.1)
    
    # Acquire some locks with short duration
    await lock_manager.acquire_lock("workflow-1", "node-1", "user-1", "User One", duration=0.1)
    await lock_manager.acquire_lock("workflow-1", "node-2", "user-2", "User Two", duration=0.1)
    
    assert lock_manager.get_lock_count() == 2
    
    # Wait for locks to expire
    await asyncio.sleep(0.15)
    
    # Manually trigger cleanup
    await lock_manager.cleanup_expired_locks()
    
    assert lock_manager.get_lock_count() == 0, "All expired locks should be cleaned up"
