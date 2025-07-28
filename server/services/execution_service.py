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
            
            # deployment_service에서 저장한 실행 기록 읽기
            executions_dir = os.path.join("deployments", "executions")
            
            if not os.path.exists(executions_dir):
                return executions
            
            # 파일에서 실행 정보 읽기
            for filename in os.listdir(executions_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(executions_dir, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            execution_data = json.load(f)
                            
                            # 해당 workflow_id의 실행만 필터링
                            if execution_data.get('workflow_id') != workflow_id:
                                continue
                            
                            # Execution 모델로 변환
                            execution = Execution(
                                id=execution_data['id'],
                                name=execution_data['name'],
                                arn=f"langstar:ap-northeast-2:123456789012:execution:{execution_data['name']}",
                                workflow_id=execution_data['workflow_id'],
                                workflow_name=execution_data.get('workflow_name', 'Unknown'),
                                status=execution_data['status'],
                                start_time=datetime.fromisoformat(execution_data['start_time']),
                                end_time=datetime.fromisoformat(execution_data['end_time']) if execution_data.get('end_time') else None,
                                duration_ms=execution_data.get('duration_ms', 0),
                                input=execution_data.get('input', {}),
                                output=execution_data.get('output', {}),
                                error_message=execution_data.get('error_message'),
                                version=None,
                                alias=None,
                                executed_by="system",
                                workflow_snapshot=execution_data.get('workflow_snapshot'),
                                node_execution_history=execution_data.get('node_execution_history'),
                                state_transitions_list=execution_data.get('state_transitions'),
                                api_call_info=execution_data.get('api_call_info'),
                                execution_source=execution_data.get('execution_source', 'internal')
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
                        logger.warning(f"Error loading execution from {filename}: {str(e)}")
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
            
            # 2. 파일에서 찾기
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