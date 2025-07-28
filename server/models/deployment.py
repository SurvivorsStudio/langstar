from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime

class DeploymentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"
    DEPLOYING = "deploying"

class DeploymentEnvironment(str, Enum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"

class WorkflowSnapshot(BaseModel):
    projectId: str
    projectName: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    viewport: Dict[str, Any]
    lastModified: str

class DeploymentVersion(BaseModel):
    id: str
    deploymentId: str
    version: str
    workflowSnapshot: WorkflowSnapshot
    changelog: Optional[str] = None
    createdAt: str
    isActive: bool = False
    deployedAt: Optional[str] = None

class Deployment(BaseModel):
    id: str
    name: str
    version: str
    description: Optional[str] = None
    workflowId: str
    workflowName: str
    status: DeploymentStatus
    environment: DeploymentEnvironment
    createdAt: str
    updatedAt: str
    deployedAt: Optional[str] = None
    deploymentUrl: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    # AWS Step Functions 스타일 필드 추가
    arn: Optional[str] = None  # LangStar ARN 형식
    type: str = "STANDARD"
    xray_tracing: bool = False
    execution_count: int = 0
    last_execution_time: Optional[str] = None

class DeploymentFormData(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    version: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    environment: DeploymentEnvironment = DeploymentEnvironment.DEV
    config: Optional[Dict[str, Any]] = None

# API 요청/응답 모델들
class CreateDeploymentRequest(BaseModel):
    deploymentData: DeploymentFormData
    workflowData: Dict[str, Any]  # getWorkflowAsJSONString() 결과

class CreateDeploymentResponse(BaseModel):
    success: bool
    deployment: Deployment
    message: str

class DeploymentsResponse(BaseModel):
    success: bool
    deployments: List[Deployment]
    message: str

class UpdateDeploymentStatusRequest(BaseModel):
    deploymentId: str
    status: DeploymentStatus

class RollbackDeploymentRequest(BaseModel):
    deploymentId: str
    versionId: str

class DeploymentCodeGenerationRequest(BaseModel):
    deploymentId: str
    versionId: str

class DeploymentCodeGenerationResponse(BaseModel):
    success: bool
    code: str
    deploymentUrl: Optional[str] = None
    message: str

class DeploymentStatusResponse(BaseModel):
    success: bool
    deployment: Deployment
    versions: List[DeploymentVersion]
    message: str 