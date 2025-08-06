from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime

class ExecutionStatus(str, Enum):
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    ABORTED = "aborted"
    TIMED_OUT = "timed_out"

class ExecutionType(str, Enum):
    STANDARD = "standard"
    EXPRESS = "express"

class Execution(BaseModel):
    id: str
    name: str
    arn: str  # LangStar ARN 형식: langstar:region:account:execution:workflow:execution
    workflow_id: str
    workflow_name: str
    status: ExecutionStatus
    execution_type: ExecutionType = ExecutionType.STANDARD
    start_time: datetime
    end_time: Optional[datetime] = None
    input: Dict[str, Any] = {}
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    state_transitions: int = 0
    executed_by: Optional[str] = None
    version: Optional[str] = None
    alias: Optional[str] = None
    duration_ms: Optional[int] = None
    workflow_snapshot: Optional[Dict[str, Any]] = None
    node_execution_history: Optional[List[Dict[str, Any]]] = None
    state_transitions_list: Optional[List[Dict[str, Any]]] = None
    # 배포 정보
    deployment_id: Optional[str] = None  # 실행에 사용된 배포 ID
    # 외부 API 호출 정보
    api_call_info: Optional[Dict[str, Any]] = None  # API 호출 관련 정보 (IP, User-Agent, 요청 헤더 등)
    execution_source: str = "internal"  # "internal" (프론트엔드), "external" (외부 API), "scheduled" (스케줄러)

class ExecutionHistory(BaseModel):
    id: str
    execution_id: str
    state_name: str
    state_type: str
    status: ExecutionStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    input: Dict[str, Any] = {}
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None

# API 요청/응답 모델들
class StartExecutionRequest(BaseModel):
    name: Optional[str] = None
    input: Dict[str, Any] = {}
    version: Optional[str] = None
    alias: Optional[str] = None

class StartExecutionResponse(BaseModel):
    success: bool
    execution: Execution
    message: str

class ListExecutionsRequest(BaseModel):
    max_results: int = 100
    next_token: Optional[str] = None
    status_filter: Optional[ExecutionStatus] = None
    start_time_filter: Optional[datetime] = None
    end_time_filter: Optional[datetime] = None

class ListExecutionsResponse(BaseModel):
    success: bool
    executions: List[Execution]
    next_token: Optional[str] = None
    message: str

class DescribeExecutionResponse(BaseModel):
    success: bool
    execution: Execution
    history: List[ExecutionHistory]
    message: str

class StopExecutionRequest(BaseModel):
    error: Optional[str] = None
    cause: Optional[str] = None

class StopExecutionResponse(BaseModel):
    success: bool
    execution: Execution
    message: str 