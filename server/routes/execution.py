from fastapi import APIRouter, HTTPException, Query
from server.models.execution import (
    Execution, ExecutionHistory, ExecutionStatus, ExecutionType,
    StartExecutionRequest, StartExecutionResponse,
    ListExecutionsRequest, ListExecutionsResponse,
    DescribeExecutionResponse, StopExecutionRequest, StopExecutionResponse
)
from server.services.execution_service import execution_service
from server.services.deployment_service import deployment_service
from server.utils.execution_logger import execution_logger
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post('/workflows/{workflow_id}/executions', response_model=StartExecutionResponse)
def start_execution(workflow_id: str, request: StartExecutionRequest):
    """워크플로우 실행을 시작합니다."""
    try:
        logger.info(f"Starting execution for workflow: {workflow_id}")
        
        execution = execution_service.start_execution(workflow_id, request)
        
        logger.info(f"Successfully started execution: {execution.id}")
        
        return StartExecutionResponse(
            success=True,
            execution=execution,
            message=f"Execution '{execution.name}' started successfully"
        )
        
    except Exception as e:
        logger.error(f"Error starting execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/workflows/{workflow_id}/executions', response_model=ListExecutionsResponse)
def list_executions(
    workflow_id: str,
    max_results: int = Query(100, ge=1, le=1000),
    next_token: str = Query(None),
    status_filter: str = Query(None),
    start_time_filter: str = Query(None),
    end_time_filter: str = Query(None)
):
    """워크플로우의 실행 목록을 반환합니다."""
    try:
        logger.info(f"Listing executions for workflow: {workflow_id}")
        
        request = ListExecutionsRequest(
            max_results=max_results,
            next_token=next_token,
            status_filter=ExecutionStatus(status_filter) if status_filter else None,
            start_time_filter=start_time_filter,
            end_time_filter=end_time_filter
        )
        
        executions = execution_service.list_executions(workflow_id, request)
        
        logger.info(f"Found {len(executions)} executions for workflow {workflow_id}")
        
        return ListExecutionsResponse(
            success=True,
            executions=executions,
            next_token=None,  # TODO: 실제 페이지네이션 구현
            message=f"Retrieved {len(executions)} executions"
        )
        
    except Exception as e:
        logger.error(f"Error listing executions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/executions/{execution_id}', response_model=DescribeExecutionResponse)
def describe_execution(execution_id: str):
    """특정 실행의 상세 정보를 반환합니다."""
    try:
        logger.info(f"Describing execution: {execution_id}")
        
        execution = execution_service.describe_execution(execution_id)
        history = execution_service.get_execution_history(execution_id)
        
        logger.info(f"Retrieved execution {execution_id} with {len(history)} history entries")
        
        return DescribeExecutionResponse(
            success=True,
            execution=execution,
            history=history,
            message=f"Execution '{execution.name}' details retrieved"
        )
        
    except ValueError as e:
        logger.error(f"Execution not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error describing execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/executions/{execution_id}/stop', response_model=StopExecutionResponse)
def stop_execution(execution_id: str, request: StopExecutionRequest):
    """실행을 중지합니다."""
    try:
        logger.info(f"Stopping execution: {execution_id}")
        
        execution = execution_service.stop_execution(
            execution_id, 
            error=request.error, 
            cause=request.cause
        )
        
        logger.info(f"Successfully stopped execution: {execution_id}")
        
        return StopExecutionResponse(
            success=True,
            execution=execution,
            message=f"Execution '{execution.name}' stopped successfully"
        )
        
    except ValueError as e:
        logger.error(f"Active execution not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error stopping execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/executions/{execution_id}/history')
def get_execution_history(execution_id: str):
    """실행 히스토리를 반환합니다."""
    try:
        logger.info(f"Getting execution history: {execution_id}")
        
        history = execution_service.get_execution_history(execution_id)
        
        logger.info(f"Retrieved {len(history)} history entries for execution {execution_id}")
        
        return {
            "success": True,
            "history": history,
            "message": f"Retrieved {len(history)} history entries"
        }
        
    except Exception as e:
        logger.error(f"Error getting execution history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/executions/{execution_id}/status')
def get_execution_status(execution_id: str):
    """실행 상태를 반환합니다."""
    try:
        logger.info(f"Getting execution status: {execution_id}")
        
        execution = execution_service.describe_execution(execution_id)
        
        return {
            "success": True,
            "execution_id": execution_id,
            "status": execution.status,
            "start_time": execution.start_time,
            "end_time": execution.end_time,
            "duration_ms": execution.duration_ms,
            "message": f"Execution status: {execution.status}"
        }
        
    except Exception as e:
        logger.error(f"Error getting execution status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 새로운 상세 로그 API 엔드포인트들
@router.get('/deployments/{deployment_id}/executions/{execution_id}/detailed-logs')
def get_detailed_execution_logs(deployment_id: str, execution_id: str):
    """실행의 상세 노드별 로그를 반환합니다."""
    try:
        logger.info(f"Getting detailed logs for execution: {execution_id}")
        
        # 배포 버전 정보 조회
        deployment = deployment_service.get_deployment_by_id(deployment_id)
        if not deployment:
            raise HTTPException(status_code=404, detail=f"Deployment {deployment_id} not found")
            
        versions = deployment_service.get_deployment_versions(deployment_id)
        if not versions:
            raise HTTPException(status_code=404, detail=f"No versions found for deployment {deployment_id}")
            
        version_id = versions[0].id  # 최신 버전 사용
        
        # 상세 로그 조회
        detailed_logs = execution_logger.get_execution_logs(deployment_id, version_id, execution_id)
        
        # 로그를 딕셔너리로 변환
        logs_data = []
        for log in detailed_logs:
            log_dict = {
                "id": log.id,
                "execution_id": log.execution_id,
                "deployment_id": log.deployment_id,
                "version_id": log.version_id,
                "node_id": log.node_id,
                "node_name": log.node_name,
                "node_type": log.node_type,
                "status": log.status.value,
                "start_time": log.start_time.isoformat(),
                "end_time": log.end_time.isoformat() if log.end_time else None,
                "duration_ms": log.duration_ms,
                "input_data": log.input_data,
                "output_data": log.output_data,
                "error_message": log.error_message,
                "error_traceback": log.error_traceback,
                "position": log.position,
                "metadata": log.metadata
            }
            logs_data.append(log_dict)
        
        logger.info(f"Retrieved {len(logs_data)} detailed log entries for execution {execution_id}")
        
        return {
            "success": True,
            "execution_id": execution_id,
            "deployment_id": deployment_id,
            "version_id": version_id,
            "logs": logs_data,
            "message": f"Retrieved {len(logs_data)} detailed log entries"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting detailed execution logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/deployments/{deployment_id}/versions/{version_id}/execution-logs')
def get_deployment_version_logs(deployment_id: str, version_id: str):
    """배포 버전의 모든 실행 로그를 반환합니다."""
    try:
        logger.info(f"Getting all execution logs for deployment {deployment_id} version {version_id}")
        
        # 모든 실행 로그 조회
        all_logs = execution_logger.get_deployment_logs(deployment_id, version_id)
        
        # 결과 정리
        result = {
            "deployment_id": deployment_id,
            "version_id": version_id,
            "executions": {}
        }
        
        for execution_id, logs in all_logs.items():
            logs_data = []
            for log in logs:
                log_dict = {
                    "id": log.id,
                    "node_id": log.node_id,
                    "node_name": log.node_name,
                    "node_type": log.node_type,
                    "status": log.status.value,
                    "start_time": log.start_time.isoformat(),
                    "end_time": log.end_time.isoformat() if log.end_time else None,
                    "duration_ms": log.duration_ms,
                    "input_data": log.input_data,
                    "output_data": log.output_data,
                    "error_message": log.error_message,
                    "position": log.position
                }
                logs_data.append(log_dict)
            
            result["executions"][execution_id] = logs_data
        
        logger.info(f"Retrieved logs for {len(all_logs)} executions")
        
        return {
            "success": True,
            "data": result,
            "message": f"Retrieved logs for {len(all_logs)} executions"
        }
        
    except Exception as e:
        logger.error(f"Error getting deployment version logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 