import logging
import json
import os
import time
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from functools import wraps
import uuid
from dataclasses import dataclass, asdict
from enum import Enum

class NodeStatus(Enum):
    STARTED = "started"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    RUNNING = "running"

@dataclass
class NodeExecutionLog:
    """노드 실행 로그 데이터 클래스"""
    id: str
    execution_id: str
    deployment_id: str
    version_id: str
    node_id: str
    node_name: str
    node_type: str
    status: NodeStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[int] = None
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    error_traceback: Optional[str] = None
    position: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class ExecutionLogger:
    """실행 로그 관리자"""
    
    def __init__(self, logs_dir: str = "execution_logs"):
        self.logs_dir = logs_dir
        self._ensure_logs_directory()
        self.current_execution_id: Optional[str] = None
        self.current_deployment_id: Optional[str] = None
        self.current_version_id: Optional[str] = None
        
    def _ensure_logs_directory(self):
        """로그 디렉토리 생성"""
        if not os.path.exists(self.logs_dir):
            os.makedirs(self.logs_dir)
            
    def start_execution(self, execution_id: str, deployment_id: str, version_id: str):
        """실행 시작 설정"""
        self.current_execution_id = execution_id
        self.current_deployment_id = deployment_id
        self.current_version_id = version_id
        
        # 실행별 로그 디렉토리 생성
        execution_log_dir = os.path.join(self.logs_dir, deployment_id, version_id, execution_id)
        os.makedirs(execution_log_dir, exist_ok=True)
        
    def log_node_execution(self, node_log: NodeExecutionLog):
        """노드 실행 로그 저장"""
        if not self.current_execution_id:
            raise ValueError("Execution not started. Call start_execution() first.")
            
        # 로그 파일 경로
        log_file = os.path.join(
            self.logs_dir, 
            self.current_deployment_id, 
            self.current_version_id, 
            self.current_execution_id,
            f"{node_log.node_id}.json"
        )
        
        # 로그 저장
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(node_log), f, indent=2, default=str, ensure_ascii=False)
            
    def get_execution_logs(self, deployment_id: str, version_id: str, execution_id: str) -> list[NodeExecutionLog]:
        """실행 로그 조회"""
        log_dir = os.path.join(self.logs_dir, deployment_id, version_id, execution_id)
        if not os.path.exists(log_dir):
            return []
            
        logs = []
        for filename in os.listdir(log_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(log_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        log_data = json.load(f)
                        # datetime 문자열을 datetime 객체로 변환
                        log_data['start_time'] = datetime.fromisoformat(log_data['start_time'])
                        if log_data.get('end_time'):
                            log_data['end_time'] = datetime.fromisoformat(log_data['end_time'])
                        
                        # status 필드 처리 - "NodeStatus.SUCCEEDED" 형태를 "succeeded"로 변환
                        status_str = log_data['status']
                        if status_str.startswith('NodeStatus.'):
                            status_str = status_str.replace('NodeStatus.', '').lower()
                        log_data['status'] = NodeStatus(status_str)
                        logs.append(NodeExecutionLog(**log_data))
                except Exception as e:
                    print(f"Error loading log file {filename}: {e}")
                    
        return sorted(logs, key=lambda x: x.start_time)
        
    def get_deployment_logs(self, deployment_id: str, version_id: str) -> Dict[str, list[NodeExecutionLog]]:
        """배포 버전의 모든 실행 로그 조회"""
        version_log_dir = os.path.join(self.logs_dir, deployment_id, version_id)
        if not os.path.exists(version_log_dir):
            return {}
            
        execution_logs = {}
        for execution_id in os.listdir(version_log_dir):
            execution_path = os.path.join(version_log_dir, execution_id)
            if os.path.isdir(execution_path):
                execution_logs[execution_id] = self.get_execution_logs(deployment_id, version_id, execution_id)
                
        return execution_logs

# 전역 로거 인스턴스
execution_logger = ExecutionLogger()

def log_node_execution(node_id: str, node_name: str, node_type: str, position: Optional[Dict[str, Any]] = None):
    """
    LangGraph 노드 함수의 실행을 로깅하는 데코레이터.
    
    Args:
        node_id: 노드 고유 ID
        node_name: 노드 표시 이름
        node_type: 노드 타입 (startNode, promptNode, endNode 등)
        position: 노드 위치 정보
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not execution_logger.current_execution_id:
                # 실행 로거가 초기화되지 않은 경우 원본 함수만 실행
                return func(*args, **kwargs)
                
            # 노드 실행 시작
            start_time = datetime.utcnow()
            node_log = NodeExecutionLog(
                id=str(uuid.uuid4()),
                execution_id=execution_logger.current_execution_id,
                deployment_id=execution_logger.current_deployment_id,
                version_id=execution_logger.current_version_id,
                node_id=node_id,
                node_name=node_name,
                node_type=node_type,
                status=NodeStatus.STARTED,
                start_time=start_time,
                position=position,
                metadata={
                    "function_name": func.__name__,
                    "module": func.__module__
                }
            )
            
            # 입력 데이터 추출 (LangGraph state)
            try:
                state = kwargs.get('state', args[0] if args else {})
                # 민감 정보 보호를 위해 일부만 로깅
                input_data = {}
                for key, value in state.items():
                    if isinstance(value, (str, int, float, bool, list, dict)):
                        if isinstance(value, str) and len(value) > 200:
                            input_data[key] = value[:200] + "..."
                        elif isinstance(value, (list, dict)) and len(str(value)) > 500:
                            input_data[key] = str(value)[:500] + "..."
                        else:
                            input_data[key] = value
                    else:
                        input_data[key] = f"<{type(value).__name__}>"
                        
                node_log.input_data = input_data
            except Exception as e:
                node_log.input_data = {"error": f"Failed to extract input: {str(e)}"}
            
            # 노드 시작 로그 저장
            execution_logger.log_node_execution(node_log)
            
            try:
                # 원본 노드 함수 실행
                result = func(*args, **kwargs)
                
                # 실행 완료
                end_time = datetime.utcnow()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)
                
                # 출력 데이터 추출
                try:
                    if isinstance(result, dict):
                        output_data = {}
                        for key, value in result.items():
                            if isinstance(value, (str, int, float, bool, list, dict)):
                                if isinstance(value, str) and len(value) > 200:
                                    output_data[key] = value[:200] + "..."
                                elif isinstance(value, (list, dict)) and len(str(value)) > 500:
                                    output_data[key] = str(value)[:500] + "..."
                                else:
                                    output_data[key] = value
                            else:
                                output_data[key] = f"<{type(value).__name__}>"
                    else:
                        output_data = {"result": str(result)[:500] + "..." if len(str(result)) > 500 else str(result)}
                        
                    node_log.output_data = output_data
                except Exception as e:
                    node_log.output_data = {"error": f"Failed to extract output: {str(e)}"}
                
                # 성공 로그 업데이트
                node_log.status = NodeStatus.SUCCEEDED
                node_log.end_time = end_time
                node_log.duration_ms = duration_ms
                execution_logger.log_node_execution(node_log)
                
                return result
                
            except Exception as e:
                # 에러 발생
                end_time = datetime.utcnow()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)
                
                import traceback
                node_log.status = NodeStatus.FAILED
                node_log.end_time = end_time
                node_log.duration_ms = duration_ms
                node_log.error_message = str(e)
                node_log.error_traceback = traceback.format_exc()
                execution_logger.log_node_execution(node_log)
                
                # 에러를 다시 발생시켜 LangGraph의 에러 핸들링으로 전달
                raise
                
        return wrapper
    return decorator

def create_langgraph_with_logging(workflow_snapshot: Dict[str, Any], execution_id: str, deployment_id: str, version_id: str):
    """
    워크플로우 스냅샷을 기반으로 로깅이 포함된 LangGraph를 생성합니다.
    """
    from langgraph.graph import StateGraph, START, END
    from langchain_core.prompts import PromptTemplate
    from typing import TypedDict, Annotated
    import operator
    
    # 실행 로거 시작
    execution_logger.start_execution(execution_id, deployment_id, version_id)
    
    # 동적으로 State 클래스 생성
    state_fields = {}
    for node in workflow_snapshot.get("nodes", []):
        if node.get("type") == "startNode":
            config = node.get("data", {}).get("config", {})
            variables = config.get("variables", [])
            for var in variables:
                var_name = var.get("name", "")
                if var_name:
                    state_fields[var_name] = Annotated[Any, operator.add]
    
    # 기본 필드 추가
    state_fields["response"] = Annotated[Dict[str, Any], operator.add]
    
    # 동적으로 State 클래스 생성
    StateClass = TypedDict("StateClass", state_fields)
    
    # 노드 함수들을 동적으로 생성하고 데코레이터 적용
    node_functions = {}
    
    def create_node_function(node_id, node_name, node_type, node_data, position):
        """클로저 문제를 해결하기 위한 노드 함수 생성 헬퍼"""
        
        if node_type == "startNode":
            @log_node_execution(node_id, node_name, node_type, position)
            def start_node(state: StateClass):
                # 시작 노드 로직
                return state
            return start_node
            
        elif node_type == "promptNode":
            config = node_data.get("config", {})
            template = config.get("template", "")
            output_variable = config.get("outputVariable", "output")
            
            @log_node_execution(node_id, node_name, node_type, position)
            def prompt_node(state: StateClass):
                # 프롬프트 템플릿 처리
                prompt_template = PromptTemplate(
                    template=template,
                    input_variables=list(state.keys())
                )
                prompt = prompt_template.format(**state)
                return {output_variable: prompt}
            return prompt_node
            
        elif node_type == "endNode":
            config = node_data.get("config", {})
            receive_keys = config.get("receiveKey", [])
            
            @log_node_execution(node_id, node_name, node_type, position)
            def end_node(state: StateClass):
                # 종료 노드 로직
                if receive_keys and receive_keys[0]:
                    return {key: state.get(key, "") for key in receive_keys}
                return state
            return end_node
            
        else:
            # 기본 노드
            @log_node_execution(node_id, node_name, node_type, position)
            def default_node(state: StateClass):
                return state
            return default_node
    
    for node in workflow_snapshot.get("nodes", []):
        node_id = node["id"]
        node_type = node["type"]
        node_data = node.get("data", {})
        node_name = node_data.get("label", node_id)
        position = node.get("position", {})
        
        node_functions[node_id] = create_node_function(node_id, node_name, node_type, node_data, position)
    
    # LangGraph 빌드
    graph = StateGraph(StateClass)
    
    # 노드 추가
    for node_id, func in node_functions.items():
        graph.add_node(node_id, func)
    
    # 엣지 추가
    edges = workflow_snapshot.get("edges", [])
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        
        if source == "start":
            graph.add_edge(START, target)
        elif target == "end":
            graph.add_edge(source, END)
        else:
            graph.add_edge(source, target)
    
    # 그래프 컴파일
    app = graph.compile()
    return app 