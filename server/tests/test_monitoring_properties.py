"""
Property-based tests for monitoring service.
Tests correctness properties related to monitoring thresholds and logging.
"""

import pytest
import time
from hypothesis import given, strategies as st, settings, assume
from server.services.monitoring_service import MonitoringService


class TestMonitoringProperties:
    """Property-based tests for monitoring service"""
    
    @given(
        workflow_id=st.text(min_size=1, max_size=50),
        connection_count=st.integers(min_value=0, max_value=200)
    )
    @settings(max_examples=100)
    def test_property_15_concurrent_connections_threshold_warning(
        self,
        workflow_id: str,
        connection_count: int
    ):
        """
        Feature: realtime-collaboration, Property 15: 동시 접속자 임계값 경고
        
        임의의 워크플로우에 대해, 접속자 수가 설정된 임계값을 초과하면 
        경고가 발생해야 합니다.
        
        Validates: Requirements 7.4
        """
        # Set a threshold
        threshold = 100
        monitoring_service = MonitoringService(max_connections_threshold=threshold)
        
        # Track if warning was logged
        warning_logged = False
        original_logger = monitoring_service.logger
        
        class MockLogger:
            def warning(self, event, **kwargs):
                nonlocal warning_logged
                if event == "concurrent_connections_threshold_exceeded":
                    warning_logged = True
            
            def info(self, *args, **kwargs):
                pass
            
            def debug(self, *args, **kwargs):
                pass
            
            def error(self, *args, **kwargs):
                pass
        
        monitoring_service.logger = MockLogger()
        
        # Update connection count
        monitoring_service.update_connection_count(workflow_id, connection_count)
        
        # Verify: warning should be logged if and only if count exceeds threshold
        if connection_count > threshold:
            assert warning_logged, (
                f"Expected warning for {connection_count} connections "
                f"(threshold: {threshold}), but none was logged"
            )
        else:
            assert not warning_logged, (
                f"Unexpected warning for {connection_count} connections "
                f"(threshold: {threshold})"
            )
        
        # Restore original logger
        monitoring_service.logger = original_logger
    
    @given(
        workflow_id=st.text(min_size=1, max_size=50),
        message_type=st.sampled_from(['ping', 'cursor_update', 'change', 'lock_request']),
        processing_time=st.floats(min_value=0.0, max_value=5.0, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100)
    def test_property_16_message_latency_threshold_warning(
        self,
        workflow_id: str,
        message_type: str,
        processing_time: float
    ):
        """
        Feature: realtime-collaboration, Property 16: 메시지 지연 임계값 경고
        
        임의의 메시지 전송에 대해, 전송 지연이 설정된 임계값을 초과하면 
        성능 경고가 발생해야 합니다.
        
        Validates: Requirements 7.5
        """
        # Set a latency threshold
        latency_threshold = 1.0  # 1 second
        monitoring_service = MonitoringService(message_latency_threshold=latency_threshold)
        
        # Track if warning was logged
        warning_logged = False
        original_logger = monitoring_service.logger
        
        class MockLogger:
            def warning(self, event, **kwargs):
                nonlocal warning_logged
                if event == "message_latency_threshold_exceeded":
                    warning_logged = True
            
            def info(self, *args, **kwargs):
                pass
            
            def debug(self, *args, **kwargs):
                pass
            
            def error(self, *args, **kwargs):
                pass
        
        monitoring_service.logger = MockLogger()
        
        # Simulate message processing
        message_id = f"msg_{workflow_id}_{message_type}"
        
        # Start tracking
        monitoring_service.start_message_processing(message_id)
        
        # Simulate processing time by manipulating the start time
        if message_id in monitoring_service.message_start_times:
            monitoring_service.message_start_times[message_id] = time.time() - processing_time
        
        # End tracking
        monitoring_service.end_message_processing(message_id, message_type, workflow_id)
        
        # Verify: warning should be logged if and only if latency exceeds threshold
        if processing_time > latency_threshold:
            assert warning_logged, (
                f"Expected warning for {processing_time:.3f}s latency "
                f"(threshold: {latency_threshold}s), but none was logged"
            )
        else:
            assert not warning_logged, (
                f"Unexpected warning for {processing_time:.3f}s latency "
                f"(threshold: {latency_threshold}s)"
            )
        
        # Restore original logger
        monitoring_service.logger = original_logger
    
    @given(
        workflow_id=st.text(min_size=1, max_size=50),
        user_id=st.text(min_size=1, max_size=50),
        user_name=st.text(min_size=1, max_size=100)
    )
    @settings(max_examples=100)
    def test_session_logging_completeness(
        self,
        workflow_id: str,
        user_id: str,
        user_name: str
    ):
        """
        Test that session start and end are properly logged.
        
        For any session, both start and end events should be logged.
        """
        monitoring_service = MonitoringService()
        
        # Track logged events
        events_logged = []
        original_logger = monitoring_service.logger
        
        class MockLogger:
            def info(self, event, **kwargs):
                events_logged.append(event)
            
            def warning(self, *args, **kwargs):
                pass
            
            def debug(self, *args, **kwargs):
                pass
            
            def error(self, *args, **kwargs):
                pass
        
        monitoring_service.logger = MockLogger()
        
        # Log session start
        monitoring_service.log_session_start(workflow_id, user_id, user_name)
        
        # Log session end
        monitoring_service.log_session_end(workflow_id, user_id)
        
        # Verify both events were logged
        assert "session_started" in events_logged, "Session start was not logged"
        assert "session_ended" in events_logged, "Session end was not logged"
        
        # Restore original logger
        monitoring_service.logger = original_logger
    
    @given(
        workflow_id=st.text(min_size=1, max_size=50),
        message_type=st.sampled_from(['ping', 'cursor_update', 'change', 'lock_request']),
        user_id=st.text(min_size=1, max_size=50)
    )
    @settings(max_examples=100)
    def test_message_logging_completeness(
        self,
        workflow_id: str,
        message_type: str,
        user_id: str
    ):
        """
        Test that messages are properly logged.
        
        For any message sent or received, it should be logged with correct type.
        """
        monitoring_service = MonitoringService()
        
        # Track logged events
        events_logged = []
        original_logger = monitoring_service.logger
        
        class MockLogger:
            def debug(self, event, **kwargs):
                events_logged.append((event, kwargs.get('message_type')))
            
            def info(self, *args, **kwargs):
                pass
            
            def warning(self, *args, **kwargs):
                pass
            
            def error(self, *args, **kwargs):
                pass
        
        monitoring_service.logger = MockLogger()
        
        # Log message sent
        monitoring_service.log_message_sent(message_type, workflow_id, user_id)
        
        # Log message received
        monitoring_service.log_message_received(message_type, workflow_id, user_id)
        
        # Verify both events were logged with correct type
        assert ("message_sent", message_type) in events_logged, (
            f"Message sent was not logged for type {message_type}"
        )
        assert ("message_received", message_type) in events_logged, (
            f"Message received was not logged for type {message_type}"
        )
        
        # Restore original logger
        monitoring_service.logger = original_logger
    
    @given(
        workflow_id=st.text(min_size=1, max_size=50),
        node_id=st.text(min_size=1, max_size=50),
        user_id=st.text(min_size=1, max_size=50),
        success=st.booleans()
    )
    @settings(max_examples=100)
    def test_lock_logging_completeness(
        self,
        workflow_id: str,
        node_id: str,
        user_id: str,
        success: bool
    ):
        """
        Test that lock operations are properly logged.
        
        For any lock acquisition or release, it should be logged.
        """
        monitoring_service = MonitoringService()
        
        # Track logged events
        events_logged = []
        original_logger = monitoring_service.logger
        
        class MockLogger:
            def info(self, event, **kwargs):
                events_logged.append(event)
            
            def warning(self, event, **kwargs):
                events_logged.append(event)
            
            def debug(self, *args, **kwargs):
                pass
            
            def error(self, *args, **kwargs):
                pass
        
        monitoring_service.logger = MockLogger()
        
        # Log lock acquisition
        monitoring_service.log_lock_acquisition(workflow_id, node_id, user_id, success)
        
        # Log lock release
        monitoring_service.log_lock_release(workflow_id, node_id, user_id)
        
        # Verify events were logged
        if success:
            assert "lock_acquired" in events_logged, "Lock acquisition was not logged"
        else:
            assert "lock_acquisition_failed" in events_logged, (
                "Failed lock acquisition was not logged"
            )
        
        assert "lock_released" in events_logged, "Lock release was not logged"
        
        # Restore original logger
        monitoring_service.logger = original_logger
    
    @given(
        workflow_id=st.text(min_size=1, max_size=50),
        error_type=st.sampled_from(['invalid_message', 'change_processing_error', 'connection_error']),
        error_message=st.text(min_size=1, max_size=200),
        user_id=st.text(min_size=1, max_size=50)
    )
    @settings(max_examples=100)
    def test_error_logging_completeness(
        self,
        workflow_id: str,
        error_type: str,
        error_message: str,
        user_id: str
    ):
        """
        Test that errors are properly logged.
        
        For any error, it should be logged with correct type and message.
        """
        monitoring_service = MonitoringService()
        
        # Track logged events
        events_logged = []
        original_logger = monitoring_service.logger
        
        class MockLogger:
            def error(self, event, **kwargs):
                events_logged.append((event, kwargs.get('error_type'), kwargs.get('error_message')))
            
            def info(self, *args, **kwargs):
                pass
            
            def warning(self, *args, **kwargs):
                pass
            
            def debug(self, *args, **kwargs):
                pass
        
        monitoring_service.logger = MockLogger()
        
        # Log error
        monitoring_service.log_error(error_type, workflow_id, error_message, user_id)
        
        # Verify error was logged with correct information
        assert len(events_logged) > 0, "Error was not logged"
        
        logged_event, logged_type, logged_message = events_logged[0]
        assert logged_event == "collaboration_error", f"Wrong event type: {logged_event}"
        assert logged_type == error_type, f"Wrong error type: {logged_type}"
        assert logged_message == error_message, f"Wrong error message: {logged_message}"
        
        # Restore original logger
        monitoring_service.logger = original_logger
