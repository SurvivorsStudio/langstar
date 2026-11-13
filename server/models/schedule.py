from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from enum import Enum
from datetime import datetime

class ScheduleStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class ScheduleTargetType(str, Enum):
    DEPLOYMENT = "deployment"  # 배포된 워크플로우 실행
    WORKFLOW = "workflow"  # 배포하지 않은 챗플로우(저장된 워크플로우)를 서버 Run 으로 실행

class ScheduleType(str, Enum):
    CRON = "cron"  # Cron 표현식 사용
    INTERVAL = "interval"  # 일정 간격
    DATE = "date"  # 특정 날짜/시간

class Schedule(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    targetType: ScheduleTargetType = ScheduleTargetType.DEPLOYMENT
    deploymentId: str = ""
    deploymentName: str = ""
    workflowName: Optional[str] = None  # targetType == workflow 일 때 실행할 챗플로우 이름
    scheduleType: ScheduleType
    scheduleConfig: Dict[str, Any]  # cron 표현식 또는 interval 설정
    inputData: Optional[Dict[str, Any]] = None  # 실행 시 사용할 입력 데이터
    status: ScheduleStatus = ScheduleStatus.ACTIVE
    nextRunTime: Optional[str] = None
    lastRunTime: Optional[str] = None
    lastRunStatus: Optional[str] = None
    lastRunId: Optional[str] = None  # 챗플로우 스케줄의 마지막 실행 Run ID (실행 이력에서 조회)
    executionCount: int = 0
    createdAt: str
    updatedAt: str
    createdBy: Optional[str] = None

class CreateScheduleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    targetType: ScheduleTargetType = ScheduleTargetType.DEPLOYMENT
    deploymentId: Optional[str] = None
    workflowName: Optional[str] = None
    scheduleType: ScheduleType
    scheduleConfig: Dict[str, Any]
    inputData: Optional[Dict[str, Any]] = None

class UpdateScheduleRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    scheduleConfig: Optional[Dict[str, Any]] = None
    inputData: Optional[Dict[str, Any]] = None
    status: Optional[ScheduleStatus] = None

class ScheduleResponse(BaseModel):
    success: bool
    schedule: Schedule
    message: str

class SchedulesListResponse(BaseModel):
    success: bool
    schedules: list[Schedule]
    message: str




