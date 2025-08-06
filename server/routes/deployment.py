from fastapi import APIRouter, HTTPException, Body, Request
from server.models.deployment import (
    CreateDeploymentRequest, CreateDeploymentResponse,
    DeploymentsResponse, UpdateDeploymentStatusRequest,
    DeploymentCodeGenerationRequest, DeploymentCodeGenerationResponse,
    DeploymentStatusResponse, RollbackDeploymentRequest
)
from server.services.deployment_service import deployment_service
from server.models.deployment import DeploymentStatus
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post('/deployment/create', response_model=CreateDeploymentResponse)
def create_deployment(request: CreateDeploymentRequest):
    """새로운 배포를 생성합니다."""
    try:
        logger.info(f"Creating deployment: {request.deploymentData.name}")
        
        deployment = deployment_service.create_deployment(
            request.deploymentData, 
            request.workflowData
        )
        
        logger.info(f"Successfully created deployment: {deployment.id}")
        
        return CreateDeploymentResponse(
            success=True,
            deployment=deployment,
            message=f"Deployment '{deployment.name}' created successfully"
        )
        
    except Exception as e:
        logger.error(f"Error creating deployment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/deployment/list', response_model=DeploymentsResponse)
def get_deployments():
    """모든 배포 목록을 반환합니다."""
    try:
        logger.info("Fetching all deployments")
        
        deployments = deployment_service.get_all_deployments()
        
        logger.info(f"Found {len(deployments)} deployments")
        
        return DeploymentsResponse(
            success=True,
            deployments=deployments,
            message=f"Retrieved {len(deployments)} deployments"
        )
        
    except Exception as e:
        logger.error(f"Error fetching deployments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/deployment/{deployment_id}', response_model=DeploymentStatusResponse)
def get_deployment_status(deployment_id: str):
    """특정 배포의 상태와 버전 정보를 반환합니다."""
    try:
        logger.info(f"Fetching deployment status: {deployment_id}")
        
        deployment = deployment_service.get_deployment_by_id(deployment_id)
        if not deployment:
            raise HTTPException(status_code=404, detail=f"Deployment {deployment_id} not found")
        
        versions = deployment_service.get_deployment_versions(deployment_id)
        
        logger.info(f"Retrieved deployment {deployment_id} with {len(versions)} versions")
        
        return DeploymentStatusResponse(
            success=True,
            deployment=deployment,
            versions=versions,
            message=f"Deployment '{deployment.name}' status retrieved"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching deployment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put('/deployment/{deployment_id}/status')
def update_deployment_status(deployment_id: str, request: UpdateDeploymentStatusRequest):
    """배포 상태를 업데이트합니다."""
    try:
        logger.info(f"Updating deployment {deployment_id} status to {request.status}")
        
        deployment = deployment_service.update_deployment_status(deployment_id, request.status)
        
        logger.info(f"Successfully updated deployment {deployment_id} status")
        
        return {
            "success": True,
            "deployment": deployment,
            "message": f"Deployment status updated to {request.status}"
        }
        
    except ValueError as e:
        logger.error(f"Deployment not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating deployment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/deployment/{deployment_id}/version')
def create_deployment_version(deployment_id: str, msg: dict = Body(...)):
    """새로운 배포 버전을 생성합니다."""
    try:
        workflow_data = msg.get("workflowData", {})
        version = msg.get("version", "")
        changelog = msg.get("changelog")
        
        if not version:
            raise HTTPException(status_code=400, detail="Version is required")
        
        logger.info(f"Creating version {version} for deployment {deployment_id}")
        
        deployment_version = deployment_service.create_deployment_version(
            deployment_id, workflow_data, version, changelog
        )
        
        logger.info(f"Successfully created version {version} for deployment {deployment_id}")
        
        return {
            "success": True,
            "version": deployment_version,
            "message": f"Version {version} created successfully"
        }
        
    except ValueError as e:
        logger.error(f"Deployment not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating deployment version: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/deployment/{deployment_id}/generate-code', response_model=DeploymentCodeGenerationResponse)
def generate_deployment_code(deployment_id: str, request: DeploymentCodeGenerationRequest):
    """배포 버전에 대한 Python 코드를 생성합니다."""
    try:
        logger.info(f"Generating code for deployment {deployment_id} version {request.versionId}")
        
        code = deployment_service.generate_deployment_code(deployment_id, request.versionId)
        
        logger.info(f"Successfully generated code for deployment {deployment_id}")
        
        return DeploymentCodeGenerationResponse(
            success=True,
            code=code,
            message=f"Code generated successfully for deployment {deployment_id}"
        )
        
    except ValueError as e:
        logger.error(f"Deployment or version not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating deployment code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/deployment/{deployment_id}/rollback')
def rollback_deployment(deployment_id: str, request: RollbackDeploymentRequest):
    """배포를 특정 버전으로 롤백합니다."""
    try:
        logger.info(f"Rolling back deployment {deployment_id} to version {request.versionId}")
        
        # 기존 활성 버전을 비활성화
        versions = deployment_service.get_deployment_versions(deployment_id)
        for version in versions:
            if version.isActive:
                version.isActive = False
                deployment_service._save_deployment_version_to_file(version)
        
        # 지정된 버전을 활성화
        target_version = None
        for version in versions:
            if version.id == request.versionId:
                target_version = version
                break
        
        if not target_version:
            raise HTTPException(status_code=404, detail=f"Version {request.versionId} not found")
        
        target_version.isActive = True
        deployment_service._save_deployment_version_to_file(target_version)
        
        # 배포 상태를 ACTIVE로 업데이트
        deployment = deployment_service.update_deployment_status(deployment_id, DeploymentStatus.ACTIVE)
        
        logger.info(f"Successfully rolled back deployment {deployment_id} to version {request.versionId}")
        
        return {
            "success": True,
            "deployment": deployment,
            "activeVersion": target_version,
            "message": f"Deployment rolled back to version {target_version.version}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back deployment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete('/deployment/{deployment_id}')
def delete_deployment(deployment_id: str):
    """배포를 삭제합니다."""
    try:
        logger.info(f"Deleting deployment: {deployment_id}")
        
        success = deployment_service.delete_deployment(deployment_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Deployment {deployment_id} not found")
        
        logger.info(f"Successfully deleted deployment: {deployment_id}")
        
        return {
            "success": True,
            "message": f"Deployment {deployment_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting deployment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/deployment/{deployment_id}/activate')
def activate_deployment(deployment_id: str):
    """배포를 활성화합니다."""
    try:
        logger.info(f"Activating deployment: {deployment_id}")
        
        deployment = deployment_service.update_deployment_status(deployment_id, DeploymentStatus.ACTIVE)
        
        logger.info(f"Successfully activated deployment: {deployment_id}")
        
        return {
            "success": True,
            "deployment": deployment,
            "message": f"Deployment '{deployment.name}' activated successfully"
        }
        
    except ValueError as e:
        logger.error(f"Deployment not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error activating deployment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/deployment/{deployment_id}/deactivate')
def deactivate_deployment(deployment_id: str):
    """배포를 비활성화합니다."""
    try:
        logger.info(f"Deactivating deployment: {deployment_id}")
        
        deployment = deployment_service.update_deployment_status(deployment_id, DeploymentStatus.INACTIVE)
        
        logger.info(f"Successfully deactivated deployment: {deployment_id}")
        
        return {
            "success": True,
            "deployment": deployment,
            "message": f"Deployment '{deployment.name}' deactivated successfully"
        }
        
    except ValueError as e:
        logger.error(f"Deployment not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deactivating deployment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post('/deployment/{deployment_id}/run')
def run_deployment(deployment_id: str, msg: dict = Body(...), request: Request = None):
    """배포를 실행합니다."""
    try:
        logger.info(f"Running deployment {deployment_id}")
        
        input_data = msg.get("input_data", {})
        if not input_data:
            raise HTTPException(status_code=400, detail="input_data is required")
        
        # API 호출 정보 수집
        api_call_info = {}
        if request:
            api_call_info = {
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
                "referer": request.headers.get("referer"),
                "origin": request.headers.get("origin"),
                "content_type": request.headers.get("content-type"),
                "accept": request.headers.get("accept"),
                "request_method": request.method,
                "request_url": str(request.url),
                "headers": dict(request.headers)
            }
        
        # 실행 소스 판단 (Referer나 Origin으로 내부/외부 구분)
        execution_source = "internal"
        if request and request.headers.get("referer"):
            referer = request.headers.get("referer", "")
            if "localhost:5173" in referer or "127.0.0.1:5173" in referer:
                execution_source = "internal"
            else:
                execution_source = "external"
        
        result = deployment_service.run_deployment(deployment_id, input_data, api_call_info, execution_source)
        
        logger.info(f"Successfully executed deployment {deployment_id}")
        
        # deployment_service에서 이미 완전한 응답 구조를 반환하므로 그대로 전달
        return result
        
    except ValueError as e:
        logger.error(f"Deployment not found or not active: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error running deployment {deployment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 