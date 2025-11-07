from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from enum import Enum
from datetime import datetime

class ScheduleStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class ScheduleType(str, Enum):
    CRON = "cron"  # Cron 표현식 사용
    INTERVAL = "interval"  # 일정 간격
    DATE = "date"  # 특정 날짜/시간

class Schedule(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    deploymentId: str
    deploymentName: str
    scheduleType: ScheduleType
    scheduleConfig: Dict[str, Any]  # cron 표현식 또는 interval 설정
    inputData: Optional[Dict[str, Any]] = None  # 실행 시 사용할 입력 데이터
    status: ScheduleStatus = ScheduleStatus.ACTIVE
    nextRunTime: Optional[str] = None
    lastRunTime: Optional[str] = None
    lastRunStatus: Optional[str] = None
    executionCount: int = 0
    createdAt: str
    updatedAt: str
    createdBy: Optional[str] = None

class CreateScheduleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    deploymentId: str
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


