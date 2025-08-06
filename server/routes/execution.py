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
import os

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

@router.delete('/executions/{execution_id}')
def delete_execution(execution_id: str):
    """실행을 삭제합니다."""
    try:
        logger.info(f"Deleting execution: {execution_id}")
        
        success = execution_service.delete_execution(execution_id)
        
        if success:
            logger.info(f"Successfully deleted execution: {execution_id}")
            return {
                "success": True,
                "message": f"Execution {execution_id} deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail=f"Execution {execution_id} not found")
        
    except Exception as e:
        logger.error(f"Error deleting execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/executions/{execution_id}/download-logs')
def download_execution_logs(execution_id: str):
    """실행 로그 파일을 다운로드합니다."""
    try:
        logger.info(f"Downloading logs for execution: {execution_id}")
        
        # 1. 실행 정보 조회
        execution = execution_service.describe_execution(execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail=f"Execution {execution_id} not found")
        
        # 2. 로그 파일 경로 찾기
        log_file_path = execution_service.get_execution_log_file_path(execution_id)
        if not log_file_path or not os.path.exists(log_file_path):
            raise HTTPException(status_code=404, detail=f"Log file not found for execution {execution_id}")
        
        # 3. 파일 다운로드
        from fastapi.responses import FileResponse
        import zipfile
        import tempfile
        
        # 로그 디렉토리를 ZIP으로 압축
        log_dir = os.path.dirname(log_file_path)
        temp_zip_path = tempfile.mktemp(suffix='.zip')
        
        with zipfile.ZipFile(temp_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(log_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, log_dir)
                    zipf.write(file_path, arcname)
        
        # ZIP 파일을 응답으로 반환 (UUID 기반)
        import uuid
        unique_filename = f"logs_{uuid.uuid4().hex[:8]}.zip"
        
        def cleanup_temp_file():
            try:
                os.remove(temp_zip_path)
            except:
                pass
        
        return FileResponse(
            path=temp_zip_path,
            filename=unique_filename,
            media_type='application/zip',
            background=cleanup_temp_file
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading execution logs: {str(e)}")
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
        
        # 1. 먼저 execution 정보를 조회해서 실제 사용된 version_id를 가져옴
        execution = execution_service.describe_execution(execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail=f"Execution {execution_id} not found")
            
        # 2. execution에서 version_id 추출 (실제 실행에 사용된 버전)
        version_id = getattr(execution, 'version_id', None)
        if not version_id:
            # version_id가 없는 경우, 배포의 최신 버전 사용 (fallback)
            deployment = deployment_service.get_deployment_by_id(deployment_id)
            if not deployment:
                raise HTTPException(status_code=404, detail=f"Deployment {deployment_id} not found")
                
            versions = deployment_service.get_deployment_versions(deployment_id)
            if not versions:
                raise HTTPException(status_code=404, detail=f"No versions found for deployment {deployment_id}")
                
            version_id = versions[0].id  # 최신 버전 사용
            logger.info(f"Using latest version {version_id} as fallback for execution {execution_id}")
        else:
            logger.info(f"Using execution's version {version_id} for execution {execution_id}")
        
        # 3. 상세 로그 조회 (실제 사용된 version_id로)
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