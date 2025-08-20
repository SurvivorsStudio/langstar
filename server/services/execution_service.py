import os
import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from server.models.execution import (
    Execution, ExecutionHistory, ExecutionStatus, ExecutionType,
    StartExecutionRequest, ListExecutionsRequest
)
from server.services.deployment_service import deployment_service
from server.services.workflow_service import WorkflowService
import asyncio
from concurrent.futures import ThreadPoolExecutor

# 로거 설정
logger = logging.getLogger(__name__)

class ExecutionService:
    """실행 관리 서비스"""
    
    def __init__(self):
        self.executions_dir = "executions"
        self.active_executions: Dict[str, Execution] = {}
        self.execution_history: Dict[str, List[ExecutionHistory]] = {}
        self._ensure_executions_directory()
        self.executor = ThreadPoolExecutor(max_workers=10)
    
    def _ensure_executions_directory(self):
        """실행 디렉토리가 존재하는지 확인하고 없으면 생성"""
        if not os.path.exists(self.executions_dir):
            os.makedirs(self.executions_dir)
    
    def start_execution(self, workflow_id: str, request: StartExecutionRequest) -> Execution:
        """워크플로우 실행을 시작합니다."""
        try:
            # 1. 배포 정보 가져오기
            deployment = deployment_service.get_deployment_by_id(workflow_id)
            if not deployment:
                raise ValueError(f"Deployment {workflow_id} not found")
            
            # 2. 실행 ID 생성
            execution_id = str(uuid.uuid4())
            execution_name = request.name or f"execution-{execution_id[:8]}"
            
            # 3. ARN 생성
            arn = f"langstar:ap-northeast-2:123456789012:execution:{deployment.name}:{execution_name}"
            
            # 4. 실행 객체 생성
            execution = Execution(
                id=execution_id,
                name=execution_name,
                arn=arn,
                workflow_id=workflow_id,
                workflow_name=deployment.name,
                status=ExecutionStatus.RUNNING,
                start_time=datetime.utcnow(),
                input=request.input,
                version=request.version,
                alias=request.alias,
                executed_by="current_user"  # TODO: 실제 사용자 ID로 변경
            )
            
            # 5. 활성 실행 목록에 추가
            self.active_executions[execution_id] = execution
            
            # 6. 파일에 저장
            self._save_execution(execution)
            
            # 7. 비동기로 실행 시작
            asyncio.create_task(self._execute_workflow_async(execution))
            
            logger.info(f"Started execution: {execution_id}")
            return execution
            
        except Exception as e:
            logger.error(f"Error starting execution: {str(e)}")
            raise
    
    async def _execute_workflow_async(self, execution: Execution):
        """워크플로우를 비동기로 실행합니다."""
        try:
            # 1. 배포 정보 가져오기
            deployment = deployment_service.get_deployment_by_id(execution.workflow_id)
            
            # 2. 워크플로우 실행
            result = await self._run_workflow(deployment, execution.input)
            
            # 3. 실행 완료 처리
            execution.status = ExecutionStatus.SUCCEEDED
            execution.end_time = datetime.utcnow()
            execution.output = result
            execution.duration_ms = int((execution.end_time - execution.start_time).total_seconds() * 1000)
            
            # 4. 활성 실행 목록에서 제거
            self.active_executions.pop(execution.id, None)
            
            # 5. 파일 업데이트
            self._save_execution(execution)
            
            logger.info(f"Execution completed: {execution.id}")
            
        except Exception as e:
            # 6. 에러 처리
            execution.status = ExecutionStatus.FAILED
            execution.end_time = datetime.utcnow()
            execution.error_message = str(e)
            execution.duration_ms = int((execution.end_time - execution.start_time).total_seconds() * 1000)
            
            # 7. 활성 실행 목록에서 제거
            self.active_executions.pop(execution.id, None)
            
            # 8. 파일 업데이트
            self._save_execution(execution)
            
            logger.error(f"Execution failed: {execution.id}, error: {str(e)}")
    
    async def _run_workflow(self, deployment: Any, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """실제 워크플로우를 실행합니다."""
        try:
            # deployment_service의 run_deployment 메서드 사용
            result = deployment_service.run_deployment(deployment.id, input_data)
            return result
        except Exception as e:
            logger.error(f"Error running workflow: {str(e)}")
            raise
    
    def list_executions(self, workflow_id: str, request: ListExecutionsRequest) -> List[Execution]:
        """워크플로우의 실행 목록을 반환합니다."""
        try:
            executions = []
            
            # 새로운 구조: deployments/{deployment_id}/executions/{execution_id}/workflow_snap.json
            deployments_dir = "deployments"
            
            if not os.path.exists(deployments_dir):
                return executions
            
            # 각 배포 디렉토리에서 실행 정보 찾기
            for deployment_id in os.listdir(deployments_dir):
                deployment_path = os.path.join(deployments_dir, deployment_id)
                if not os.path.isdir(deployment_path):
                    continue
                
                executions_dir = os.path.join(deployment_path, "executions")
                if not os.path.exists(executions_dir):
                    continue
                
                # 각 실행 디렉토리에서 workflow_snap.json 파일 찾기
                for execution_id in os.listdir(executions_dir):
                    execution_path = os.path.join(executions_dir, execution_id)
                    if not os.path.isdir(execution_path):
                        continue
                    
                    workflow_snap_file = os.path.join(execution_path, "workflow_snap.json")
                    if not os.path.exists(workflow_snap_file):
                        continue
                    
                    try:
                        with open(workflow_snap_file, 'r', encoding='utf-8') as f:
                            integrated_data = json.load(f)
                            execution_metadata = integrated_data.get("execution_metadata", {})
                            
                            # 해당 workflow_id의 실행만 필터링
                            if execution_metadata.get('workflow_id') != workflow_id:
                                continue
                            
                            # 실행 메타데이터가 완전한지 확인
                            if not execution_metadata.get("id") or not execution_metadata.get("start_time"):
                                continue
                            
                            # 데이터 형식 안전하게 처리
                            input_data = execution_metadata.get('input', {})
                            if isinstance(input_data, str):
                                input_data = {"user_input": input_data}
                            
                            output_data = execution_metadata.get('output', {})
                            if isinstance(output_data, str):
                                output_data = {"result": output_data}
                            
                            # Execution 모델로 변환
                            execution = Execution(
                                id=execution_metadata.get('id'),
                                name=execution_metadata.get('name'),
                                arn=execution_metadata.get('arn'),
                                workflow_id=execution_metadata.get('workflow_id'),
                                workflow_name=execution_metadata.get('workflow_name', 'Unknown'),
                                status=execution_metadata.get('status'),
                                start_time=datetime.fromisoformat(execution_metadata.get('start_time')),
                                end_time=datetime.fromisoformat(execution_metadata.get('end_time')) if execution_metadata.get('end_time') else None,
                                duration_ms=execution_metadata.get('duration_ms', 0),
                                input=input_data,
                                output=output_data,
                                error_message=execution_metadata.get('error_message'),
                                version=None,
                                alias=None,
                                executed_by="system",
                                workflow_snapshot=integrated_data.get('workflow_snapshot'),
                                node_execution_history=execution_metadata.get('node_execution_history'),
                                state_transitions_list=execution_metadata.get('state_transitions_list', []),
                                api_call_info=execution_metadata.get('api_call_info'),
                                execution_source=execution_metadata.get('execution_source', 'internal')
                            )
                            
                            # 필터 적용
                            if request.status_filter and execution.status != request.status_filter:
                                continue
                            if request.start_time_filter and execution.start_time < request.start_time_filter:
                                continue
                            if request.end_time_filter and execution.start_time > request.end_time_filter:
                                continue
                            
                            executions.append(execution)
                    except Exception as e:
                        logger.warning(f"Error loading execution from {workflow_snap_file}: {str(e)}")
                        continue
            
            # 시작 시간 기준으로 정렬 (최신순)
            executions.sort(key=lambda x: x.start_time, reverse=True)
            
            # 페이지네이션
            if request.next_token:
                # TODO: 실제 페이지네이션 로직 구현
                pass
            
            return executions[:request.max_results]
            
        except Exception as e:
            logger.error(f"Error listing executions: {str(e)}")
            raise
    
    def describe_execution(self, execution_id: str) -> Execution:
        """특정 실행의 상세 정보를 반환합니다."""
        try:
            # 1. 활성 실행에서 확인
            if execution_id in self.active_executions:
                return self.active_executions[execution_id]
            
            # 2. 배포별 실행 로그 디렉토리에서 찾기
            deployments_dir = "deployments"
            if os.path.exists(deployments_dir):
                for deployment_id in os.listdir(deployments_dir):
                    deployment_path = os.path.join(deployments_dir, deployment_id)
                    if os.path.isdir(deployment_path):
                        executions_dir = os.path.join(deployment_path, "executions")
                        if os.path.exists(executions_dir):
                            # 워크플로우 스냅샷 파일 확인 (통합 데이터)
                            workflow_snap_file = os.path.join(executions_dir, execution_id, "workflow_snap.json")
                            if os.path.exists(workflow_snap_file):
                                try:
                                    with open(workflow_snap_file, 'r', encoding='utf-8') as f:
                                        integrated_data = json.load(f)
                                        execution_metadata = integrated_data.get("execution_metadata", {})
                                        
                                        # 실행 메타데이터가 완전한지 확인
                                        if execution_metadata.get("id") and execution_metadata.get("start_time"):
                                            # Execution 객체 생성
                                            execution_data = {
                                                'id': execution_metadata.get('id'),
                                                'name': execution_metadata.get('name'),
                                                'arn': execution_metadata.get('arn'),
                                                'workflow_id': execution_metadata.get('workflow_id'),
                                                'workflow_name': execution_metadata.get('workflow_name'),
                                                'deployment_id': execution_metadata.get('deployment_id'),
                                                'version_id': execution_metadata.get('version_id'),
                                                'status': execution_metadata.get('status'),
                                                'start_time': execution_metadata.get('start_time'),
                                                'end_time': execution_metadata.get('end_time'),
                                                'duration_ms': execution_metadata.get('duration_ms'),
                                                'input': execution_metadata.get('input', {}),
                                                'output': execution_metadata.get('output', {}),
                                                'error_message': execution_metadata.get('error_message'),
                                                'state_transitions': execution_metadata.get('state_transitions', 0),
                                                'state_transitions_list': execution_metadata.get('state_transitions_list', []),
                                                'workflow_snapshot': integrated_data.get('workflow_snapshot'),
                                                'api_call_info': execution_metadata.get('api_call_info'),
                                                'execution_source': execution_metadata.get('execution_source', 'internal')
                                            }
                                            return Execution(**execution_data)
                                except Exception as e:
                                    logger.warning(f"Error reading workflow snapshot: {str(e)}")
                            
                            # 워크플로우 스냅샷이 없으면 로그 파일에서 추출 (기존 방식)
                            execution_log_path = os.path.join(executions_dir, execution_id)
                            if os.path.exists(execution_log_path):
                                log_file = os.path.join(execution_log_path, "execution_log.json")
                                if os.path.exists(log_file):
                                    with open(log_file, 'r', encoding='utf-8') as f:
                                        logs_data = json.load(f)
                                        if logs_data:
                                            # 첫 번째 로그에서 실행 정보 추출
                                            first_log = logs_data[0]
                                            # 성공 로그 찾기
                                            success_log = None
                                            for log in logs_data:
                                                if log.get('status') in ['NodeStatus.SUCCEEDED', 'succeeded']:
                                                    success_log = log
                                                    break
                                            if not success_log:
                                                success_log = logs_data[-1]  # 마지막 로그 사용
                                            
                                            execution_data = {
                                                'id': execution_id,
                                                'name': f"execution-{execution_id[:8]}",
                                                'arn': f"langstar:ap-northeast-2:123456789012:execution:{execution_id}",
                                                'workflow_id': deployment_id,
                                                'workflow_name': 'Unknown Workflow',
                                                'deployment_id': deployment_id,
                                                'version_id': first_log.get('version_id', 'unknown'),
                                                'status': 'succeeded',
                                                'start_time': first_log.get('start_time'),
                                                'end_time': success_log.get('end_time') if success_log else first_log.get('end_time'),
                                                'duration_ms': success_log.get('duration_ms') if success_log else first_log.get('duration_ms'),
                                                'input': first_log.get('input_data', {}),
                                                'output': success_log.get('output_data', {}) if success_log else {},
                                                'error_message': None,
                                                'state_transitions': len(logs_data),  # 로그 개수를 state_transitions로 사용
                                                'workflow_snapshot': None,  # 워크플로우 스냅샷 없음
                                                'execution_source': 'internal'
                                            }
                                            return Execution(**execution_data)
            
            # 3. 기존 executions/ 디렉토리에서 찾기 (하위 호환성)
            for workflow_dir in os.listdir(self.executions_dir):
                workflow_path = os.path.join(self.executions_dir, workflow_dir)
                if os.path.isdir(workflow_path):
                    for filename in os.listdir(workflow_path):
                        if filename.startswith(execution_id) and filename.endswith('.json'):
                            file_path = os.path.join(workflow_path, filename)
                            with open(file_path, 'r') as f:
                                execution_data = json.load(f)
                                return Execution(**execution_data)
            
            raise ValueError(f"Execution {execution_id} not found")
            
        except Exception as e:
            logger.error(f"Error describing execution: {str(e)}")
            raise
    
    def stop_execution(self, execution_id: str, error: Optional[str] = None, cause: Optional[str] = None) -> Execution:
        """실행을 중지합니다."""
        try:
            # 1. 활성 실행에서 찾기
            if execution_id in self.active_executions:
                execution = self.active_executions[execution_id]
                execution.status = ExecutionStatus.ABORTED
                execution.end_time = datetime.utcnow()
                execution.error_message = error or "Execution stopped by user"
                execution.duration_ms = int((execution.end_time - execution.start_time).total_seconds() * 1000)
                
                # 2. 활성 실행 목록에서 제거
                self.active_executions.pop(execution_id)
                
                # 3. 파일 업데이트
                self._save_execution(execution)
                
                logger.info(f"Stopped execution: {execution_id}")
                return execution
            
            raise ValueError(f"Active execution {execution_id} not found")
            
        except Exception as e:
            logger.error(f"Error stopping execution: {str(e)}")
            raise
    
    def delete_execution(self, execution_id: str) -> bool:
        """실행을 삭제합니다."""
        try:
            logger.info(f"Deleting execution: {execution_id}")
            
            # 1. 활성 실행에서 제거
            if execution_id in self.active_executions:
                self.active_executions.pop(execution_id)
            
            # 2. 배포별 로그 디렉토리에서 로그 파일들 삭제
            deployments_dir = "deployments"
            if os.path.exists(deployments_dir):
                for deployment_id in os.listdir(deployments_dir):
                    deployment_path = os.path.join(deployments_dir, deployment_id)
                    if os.path.isdir(deployment_path):
                        executions_dir = os.path.join(deployment_path, "executions")
                        if os.path.exists(executions_dir):
                            execution_log_path = os.path.join(executions_dir, execution_id)
                            if os.path.exists(execution_log_path):
                                import shutil
                                shutil.rmtree(execution_log_path)
                                logger.info(f"Deleted execution logs: {execution_log_path}")
            
            # 3. 기존 executions/ 디렉토리에서도 삭제 (하위 호환성)
            for workflow_dir in os.listdir(self.executions_dir):
                workflow_path = os.path.join(self.executions_dir, workflow_dir)
                if os.path.isdir(workflow_path):
                    for filename in os.listdir(workflow_path):
                        if filename.startswith(execution_id) and filename.endswith('.json'):
                            file_path = os.path.join(workflow_path, filename)
                            try:
                                with open(file_path, 'r') as f:
                                    execution_data = json.load(f)
                                    # 배포 ID와 버전 ID를 확인하여 삭제
                                    if execution_data.get('deployment_id') == deployment_id:
                                        os.remove(file_path)
                                        logger.info(f"Deleted execution record: {filename}")
                            except Exception as e:
                                logger.warning(f"Error reading execution file {filename}: {str(e)}")
                                continue
            
            logger.info(f"Successfully deleted execution: {execution_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting execution: {str(e)}")
            raise

    def get_execution_log_file_path(self, execution_id: str) -> str:
        """실행 로그 파일 경로를 찾습니다."""
        try:
            # 1. 배포별 로그 디렉토리에서 찾기
            deployments_dir = "deployments"
            if os.path.exists(deployments_dir):
                for deployment_id in os.listdir(deployments_dir):
                    deployment_path = os.path.join(deployments_dir, deployment_id)
                    if os.path.isdir(deployment_path):
                        executions_dir = os.path.join(deployment_path, "executions")
                        if os.path.exists(executions_dir):
                            execution_log_path = os.path.join(executions_dir, execution_id)
                            if os.path.exists(execution_log_path):
                                log_file = os.path.join(execution_log_path, "execution_log.json")
                                if os.path.exists(log_file):
                                    return log_file
            
            # 2. 기존 executions/ 디렉토리에서 찾기 (하위 호환성)
            for workflow_dir in os.listdir(self.executions_dir):
                workflow_path = os.path.join(self.executions_dir, workflow_dir)
                if os.path.isdir(workflow_path):
                    for filename in os.listdir(workflow_path):
                        if filename.startswith(execution_id) and filename.endswith('.json'):
                            file_path = os.path.join(workflow_path, filename)
                            try:
                                with open(file_path, 'r') as f:
                                    execution_data = json.load(f)
                                    deployment_id = execution_data.get('deployment_id')
                                    version_id = execution_data.get('version_id')
                                    if deployment_id and version_id:
                                        # 배포별 로그 디렉토리에서 찾기
                                        log_file = os.path.join("deployments", deployment_id, "executions", execution_id, "execution_log.json")
                                        if os.path.exists(log_file):
                                            return log_file
                            except Exception as e:
                                logger.warning(f"Error reading execution file {filename}: {str(e)}")
                                continue
            
            raise ValueError(f"Execution log file not found for: {execution_id}")
            
        except Exception as e:
            logger.error(f"Error finding execution log file: {str(e)}")
            raise
    
    def get_execution_history(self, execution_id: str) -> List[ExecutionHistory]:
        """실행 히스토리를 반환합니다."""
        try:
            # TODO: 실제 실행 히스토리 구현
            # 현재는 기본 히스토리만 반환
            execution = self.describe_execution(execution_id)
            
            history = [
                ExecutionHistory(
                    id=str(uuid.uuid4()),
                    execution_id=execution_id,
                    state_name="Start",
                    state_type="start",
                    status=ExecutionStatus.SUCCEEDED,
                    start_time=execution.start_time,
                    end_time=execution.start_time,
                    input=execution.input,
                    output=execution.input
                )
            ]
            
            if execution.end_time:
                history.append(
                    ExecutionHistory(
                        id=str(uuid.uuid4()),
                        execution_id=execution_id,
                        state_name="End",
                        state_type="end",
                        status=execution.status,
                        start_time=execution.end_time,
                        end_time=execution.end_time,
                        input=execution.output or {},
                        output=execution.output or {}
                    )
                )
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting execution history: {str(e)}")
            raise
    
    def _save_execution(self, execution: Execution):
        """실행 정보를 파일에 저장합니다."""
        try:
            workflow_dir = os.path.join(self.executions_dir, execution.workflow_id)
            if not os.path.exists(workflow_dir):
                os.makedirs(workflow_dir)
            
            file_path = os.path.join(workflow_dir, f"{execution.id}.json")
            with open(file_path, 'w') as f:
                json.dump(execution.dict(), f, default=str, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving execution: {str(e)}")
            raise

# 전역 인스턴스
execution_service = ExecutionService() 