"""
Monitoring Service for collaboration metrics collection.
Provides Prometheus metrics and threshold monitoring for collaboration features.
"""

import time
from typing import Dict, Optional
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
import structlog

# Create a custom registry for collaboration metrics
collaboration_registry = CollectorRegistry()

# Prometheus metrics
websocket_connections = Gauge(
    'collaboration_websocket_connections_total',
    'Total number of active WebSocket connections',
    ['workflow_id'],
    registry=collaboration_registry
)

websocket_connections_by_workflow = Gauge(
    'collaboration_websocket_connections_by_workflow',
    'Number of WebSocket connections per workflow',
    ['workflow_id'],
    registry=collaboration_registry
)

messages_sent_total = Counter(
    'collaboration_messages_sent_total',
    'Total number of messages sent',
    ['message_type', 'workflow_id'],
    registry=collaboration_registry
)

messages_received_total = Counter(
    'collaboration_messages_received_total',
    'Total number of messages received',
    ['message_type', 'workflow_id'],
    registry=collaboration_registry
)

message_processing_latency = Histogram(
    'collaboration_message_processing_latency_seconds',
    'Message processing latency in seconds',
    ['message_type'],
    registry=collaboration_registry
)

session_duration = Histogram(
    'collaboration_session_duration_seconds',
    'Session duration in seconds',
    ['workflow_id'],
    registry=collaboration_registry
)

lock_acquisitions_total = Counter(
    'collaboration_lock_acquisitions_total',
    'Total number of lock acquisitions',
    ['workflow_id', 'success'],
    registry=collaboration_registry
)

lock_releases_total = Counter(
    'collaboration_lock_releases_total',
    'Total number of lock releases',
    ['workflow_id'],
    registry=collaboration_registry
)

errors_total = Counter(
    'collaboration_errors_total',
    'Total number of errors',
    ['error_type', 'workflow_id'],
    registry=collaboration_registry
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)


class MonitoringService:
    """Service for monitoring collaboration metrics and logging"""
    
    def __init__(
        self,
        max_connections_threshold: int = 100,
        message_latency_threshold: float = 1.0  # seconds
    ):
        """
        Initialize monitoring service.
        
        Args:
            max_connections_threshold: Maximum concurrent connections before warning
            message_latency_threshold: Maximum message latency before warning (seconds)
        """
        self.max_connections_threshold = max_connections_threshold
        self.message_latency_threshold = message_latency_threshold
        self.logger = structlog.get_logger(__name__)
        
        # Track session start times for duration calculation
        self.session_start_times: Dict[str, float] = {}
        
        # Track message processing times
        self.message_start_times: Dict[str, float] = {}
    
    def log_session_start(self, workflow_id: str, user_id: str, user_name: str):
        """
        Log session start event.
        
        Args:
            workflow_id: The workflow ID
            user_id: The user ID
            user_name: The user name
        """
        session_key = f"{workflow_id}:{user_id}"
        self.session_start_times[session_key] = time.time()
        
        self.logger.info(
            "session_started",
            workflow_id=workflow_id,
            user_id=user_id,
            user_name=user_name,
            timestamp=time.time()
        )
    
    def log_session_end(self, workflow_id: str, user_id: str):
        """
        Log session end event and record duration.
        
        Args:
            workflow_id: The workflow ID
            user_id: The user ID
        """
        session_key = f"{workflow_id}:{user_id}"
        
        if session_key in self.session_start_times:
            duration = time.time() - self.session_start_times[session_key]
            session_duration.labels(workflow_id=workflow_id).observe(duration)
            del self.session_start_times[session_key]
            
            self.logger.info(
                "session_ended",
                workflow_id=workflow_id,
                user_id=user_id,
                duration_seconds=duration,
                timestamp=time.time()
            )
        else:
            self.logger.warning(
                "session_ended_without_start",
                workflow_id=workflow_id,
                user_id=user_id,
                timestamp=time.time()
            )
    
    def log_message_sent(
        self,
        message_type: str,
        workflow_id: str,
        user_id: Optional[str] = None,
        message_size: Optional[int] = None
    ):
        """
        Log message sent event.
        
        Args:
            message_type: Type of message
            workflow_id: The workflow ID
            user_id: Optional user ID
            message_size: Optional message size in bytes
        """
        messages_sent_total.labels(
            message_type=message_type,
            workflow_id=workflow_id
        ).inc()
        
        self.logger.debug(
            "message_sent",
            message_type=message_type,
            workflow_id=workflow_id,
            user_id=user_id,
            message_size_bytes=message_size,
            timestamp=time.time()
        )
    
    def log_message_received(
        self,
        message_type: str,
        workflow_id: str,
        user_id: str,
        message_size: Optional[int] = None
    ):
        """
        Log message received event.
        
        Args:
            message_type: Type of message
            workflow_id: The workflow ID
            user_id: The user ID
            message_size: Optional message size in bytes
        """
        messages_received_total.labels(
            message_type=message_type,
            workflow_id=workflow_id
        ).inc()
        
        self.logger.debug(
            "message_received",
            message_type=message_type,
            workflow_id=workflow_id,
            user_id=user_id,
            message_size_bytes=message_size,
            timestamp=time.time()
        )
    
    def start_message_processing(self, message_id: str):
        """
        Start tracking message processing time.
        
        Args:
            message_id: Unique message identifier
        """
        self.message_start_times[message_id] = time.time()
    
    def end_message_processing(
        self,
        message_id: str,
        message_type: str,
        workflow_id: str
    ):
        """
        End tracking message processing time and check threshold.
        
        Args:
            message_id: Unique message identifier
            message_type: Type of message
            workflow_id: The workflow ID
        """
        if message_id not in self.message_start_times:
            return
        
        latency = time.time() - self.message_start_times[message_id]
        del self.message_start_times[message_id]
        
        # Record latency metric
        message_processing_latency.labels(message_type=message_type).observe(latency)
        
        # Check threshold and log warning if exceeded
        if latency > self.message_latency_threshold:
            self.logger.warning(
                "message_latency_threshold_exceeded",
                message_type=message_type,
                workflow_id=workflow_id,
                latency_seconds=latency,
                threshold_seconds=self.message_latency_threshold,
                timestamp=time.time()
            )
    
    def update_connection_count(self, workflow_id: str, count: int):
        """
        Update connection count and check threshold.
        
        Args:
            workflow_id: The workflow ID
            count: Current connection count
        """
        websocket_connections_by_workflow.labels(workflow_id=workflow_id).set(count)
        
        # Check threshold and log warning if exceeded
        if count > self.max_connections_threshold:
            self.logger.warning(
                "concurrent_connections_threshold_exceeded",
                workflow_id=workflow_id,
                connection_count=count,
                threshold=self.max_connections_threshold,
                timestamp=time.time()
            )
    
    def log_lock_acquisition(
        self,
        workflow_id: str,
        node_id: str,
        user_id: str,
        success: bool
    ):
        """
        Log lock acquisition attempt.
        
        Args:
            workflow_id: The workflow ID
            node_id: The node ID
            user_id: The user ID
            success: Whether acquisition was successful
        """
        lock_acquisitions_total.labels(
            workflow_id=workflow_id,
            success=str(success)
        ).inc()
        
        if success:
            self.logger.info(
                "lock_acquired",
                workflow_id=workflow_id,
                node_id=node_id,
                user_id=user_id,
                timestamp=time.time()
            )
        else:
            self.logger.warning(
                "lock_acquisition_failed",
                workflow_id=workflow_id,
                node_id=node_id,
                user_id=user_id,
                timestamp=time.time()
            )
    
    def log_lock_release(self, workflow_id: str, node_id: str, user_id: str):
        """
        Log lock release.
        
        Args:
            workflow_id: The workflow ID
            node_id: The node ID
            user_id: The user ID
        """
        lock_releases_total.labels(workflow_id=workflow_id).inc()
        
        self.logger.info(
            "lock_released",
            workflow_id=workflow_id,
            node_id=node_id,
            user_id=user_id,
            timestamp=time.time()
        )
    
    def log_error(
        self,
        error_type: str,
        workflow_id: str,
        error_message: str,
        user_id: Optional[str] = None,
        exc_info: Optional[Exception] = None
    ):
        """
        Log error event.
        
        Args:
            error_type: Type of error
            workflow_id: The workflow ID
            error_message: Error message
            user_id: Optional user ID
            exc_info: Optional exception info
        """
        errors_total.labels(
            error_type=error_type,
            workflow_id=workflow_id
        ).inc()
        
        self.logger.error(
            "collaboration_error",
            error_type=error_type,
            workflow_id=workflow_id,
            user_id=user_id,
            error_message=error_message,
            timestamp=time.time(),
            exc_info=exc_info
        )
    
    def get_metrics_text(self) -> str:
        """
        Get Prometheus metrics in text format.
        
        Returns:
            Metrics in Prometheus text format
        """
        from prometheus_client import generate_latest
        return generate_latest(collaboration_registry).decode('utf-8')


# Global monitoring service instance
monitoring_service = MonitoringService()
