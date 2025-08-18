
# Deployment ID: 83152353-17d1-465c-bdbd-a67e0148481d
# Generated at: 2025-08-18T00:58:58.847331


from pydantic import BaseModel
from typing import Annotated
import operator
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain
from langgraph.graph import StateGraph, START, END
from langchain.agents import create_tool_calling_agent, AgentExecutor
from typing import Optional
from langchain_core.tools import StructuredTool
from langgraph.checkpoint.memory import InMemorySaver 


import logging
from functools import wraps
from typing import Any, Dict
import time
from datetime import datetime


# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)


def log_node_execution(node_id: str, node_name: str, node_type: str):
    """
    LangGraph node function execution logging decorator.
    Records node start/end, input/output (partial), and detailed error information.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import os
            import json
            import uuid
            from datetime import datetime
            
            # 노드 실행 시작 로깅
            start_time = datetime.utcnow()
            node_name_display = func.__name__
            
            # LangGraph 노드는 보통 첫 번째 인자로 'state'를 받습니다.
            state = kwargs.get('state', args[0] if args else {})
            
            # 입력 데이터 추출 (전체 상태 로깅)
            input_data = {}
            try:
                # MyState 객체인 경우 model_dump() 사용
                if hasattr(state, 'model_dump'):
                    state_dict = state.model_dump()
                else:
                    state_dict = state
                
                for key, value in state_dict.items():
                    if isinstance(value, (str, int, float, bool, list, dict)):
                        if isinstance(value, str) and len(value) > 1000:
                            input_data[key] = value[:1000] + "... (truncated)"
                        elif isinstance(value, (list, dict)) and len(str(value)) > 2000:
                            input_data[key] = str(value)[:2000] + "... (truncated)"
                        else:
                            input_data[key] = value
                    else:
                        input_data[key] = f"<{type(value).__name__}>"
            except Exception as e:
                input_data = {"error": f"Failed to extract input: {str(e)}"}
            
            # 노드 시작 로그 생성
            node_log = {
                "id": str(uuid.uuid4()),
                "execution_id": os.environ.get("CURRENT_EXECUTION_ID", "unknown"),
                "deployment_id": os.environ.get("CURRENT_DEPLOYMENT_ID", "unknown"),
                "version_id": os.environ.get("CURRENT_VERSION_ID", "unknown"),
                "node_id": node_id,
                "node_name": node_name,
                "node_type": node_type,
                "status": "NodeStatus.STARTED",
                "start_time": start_time.isoformat(),
                "end_time": None,
                "duration_ms": None,
                "input_data": input_data,
                "output_data": None,
                "error_message": None,
                "error_traceback": None,
                "position": {"x": 0, "y": 0},
                "metadata": {
                    "function_name": func.__name__,
                    "module": "generated_code"
                }
            }
            
            # 노드 시작 로그 저장
            try:
                logs_dir = "deployments"
                deployment_id = os.environ.get("CURRENT_DEPLOYMENT_ID", "unknown")
                execution_id = os.environ.get("CURRENT_EXECUTION_ID", "unknown")
                execution_log_dir = os.path.join(
                    logs_dir,
                    deployment_id,
                    "executions",
                    execution_id
                )
                os.makedirs(execution_log_dir, exist_ok=True)
                
                log_file = os.path.join(execution_log_dir, "execution_log.json")
                logs = []
                if os.path.exists(log_file):
                    try:
                        with open(log_file, 'r', encoding='utf-8') as f:
                            logs = json.load(f)
                    except Exception:
                        logs = []
                
                logs.append(node_log)
                with open(log_file, 'w', encoding='utf-8') as f:
                    json.dump(logs, f, indent=2, default=str, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Failed to save start log: {str(e)}")
            
            # 콘솔 로깅
            input_log_str = str(input_data)[:100] + "..." if input_data else "None"
            if logger.isEnabledFor(logging.INFO):
                logger.info("[" + node_name_display + "] Node started. Input state (partial): " + input_log_str)
            
            try:
                # 원본 노드 함수 실행
                result = func(*args, **kwargs)
                
                # 실행 완료 시간 계산
                end_time = datetime.utcnow()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)
                
                # 출력 데이터 추출
                output_data = {}
                try:
                    if isinstance(result, dict):
                        for key, value in result.items():
                            if isinstance(value, (str, int, float, bool, list, dict)):
                                if isinstance(value, str) and len(value) > 1000:
                                    output_data[key] = value[:1000] + "... (truncated)"
                                elif isinstance(value, (list, dict)) and len(str(value)) > 2000:
                                    output_data[key] = str(value)[:2000] + "... (truncated)"
                                else:
                                    output_data[key] = value
                            else:
                                output_data[key] = f"<{type(value).__name__}>"
                    else:
                        output_data = {"result": str(result)[:2000] + "... (truncated)" if len(str(result)) > 2000 else str(result)}
                except Exception as e:
                    output_data = {"error": f"Failed to extract output: {str(e)}"}
                
                # 성공 로그 업데이트
                success_log = {
                    "id": str(uuid.uuid4()),
                    "execution_id": os.environ.get("CURRENT_EXECUTION_ID", "unknown"),
                    "deployment_id": os.environ.get("CURRENT_DEPLOYMENT_ID", "unknown"),
                    "version_id": os.environ.get("CURRENT_VERSION_ID", "unknown"),
                    "node_id": node_id,
                    "node_name": node_name,
                    "node_type": node_type,
                    "status": "NodeStatus.SUCCEEDED",
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "duration_ms": duration_ms,
                    "input_data": input_data,
                    "output_data": output_data,
                    "error_message": None,
                    "error_traceback": None,
                    "position": {"x": 0, "y": 0},
                    "metadata": {
                        "function_name": func.__name__,
                        "module": "generated_code"
                    }
                }
                
                # 성공 로그 저장
                try:
                    # 로그 파일 경로 다시 정의
                    logs_dir = "deployments"
                    deployment_id = os.environ.get("CURRENT_DEPLOYMENT_ID", "unknown")
                    execution_id = os.environ.get("CURRENT_EXECUTION_ID", "unknown")
                    execution_log_dir = os.path.join(
                        logs_dir,
                        deployment_id,
                        "executions",
                        execution_id
                    )
                    log_file = os.path.join(execution_log_dir, "execution_log.json")
                    
                    # 기존 로그 읽기
                    logs = []
                    if os.path.exists(log_file):
                        try:
                            with open(log_file, 'r', encoding='utf-8') as f:
                                logs = json.load(f)
                        except Exception:
                            logs = []
                    
                    logs.append(success_log)
                    with open(log_file, 'w', encoding='utf-8') as f:
                        json.dump(logs, f, indent=2, default=str, ensure_ascii=False)
                except Exception as e:
                    logger.error(f"Failed to save success log: {str(e)}")
                
                # 콘솔 로깅
                output_log_str = str(output_data)[:100] + "..." if output_data else "None"
                if logger.isEnabledFor(logging.INFO):
                    logger.info("[" + node_name_display + "] Node finished. Output result (partial): " + output_log_str)
                    logger.info("[" + node_name_display + "] Execution time: " + str(duration_ms) + "ms")
                
                return result
                
            except Exception as e:
                # 에러 발생 시
                import traceback
                end_time = datetime.utcnow()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)
                
                # 에러 로그 생성
                error_log = {
                    "id": str(uuid.uuid4()),
                    "execution_id": os.environ.get("CURRENT_EXECUTION_ID", "unknown"),
                    "deployment_id": os.environ.get("CURRENT_DEPLOYMENT_ID", "unknown"),
                    "version_id": os.environ.get("CURRENT_VERSION_ID", "unknown"),
                    "node_id": node_id,
                    "node_name": node_name,
                    "node_type": node_type,
                    "status": "NodeStatus.FAILED",
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "duration_ms": duration_ms,
                    "input_data": input_data,
                    "output_data": None,
                    "error_message": str(e),
                    "error_traceback": traceback.format_exc(),
                    "position": {"x": 0, "y": 0},
                    "metadata": {
                        "function_name": func.__name__,
                        "module": "generated_code"
                    }
                }
                
                # 에러 로그 저장
                try:
                    # 로그 파일 경로 다시 정의
                    logs_dir = "deployments"
                    deployment_id = os.environ.get("CURRENT_DEPLOYMENT_ID", "unknown")
                    execution_id = os.environ.get("CURRENT_EXECUTION_ID", "unknown")
                    execution_log_dir = os.path.join(
                        logs_dir,
                        deployment_id,
                        "executions",
                        execution_id
                    )
                    log_file = os.path.join(execution_log_dir, "execution_log.json")
                    
                    # 기존 로그 읽기
                    logs = []
                    if os.path.exists(log_file):
                        try:
                            with open(log_file, 'r', encoding='utf-8') as f:
                                logs = json.load(f)
                        except Exception:
                            logs = []
                    
                    logs.append(error_log)
                    with open(log_file, 'w', encoding='utf-8') as f:
                        json.dump(logs, f, indent=2, default=str, ensure_ascii=False)
                except Exception as save_error:
                    logger.error(f"Failed to save error log: {str(save_error)}")
                
                # 콘솔 로깅
                logger.exception("[" + node_name_display + "] Error in node. Original error: " + str(e))
                logger.error("[" + node_name_display + "] Execution time before error: " + str(duration_ms) + "ms")
                raise # 에러를 다시 발생시켜 LangGraph의 에러 핸들링으로 전달
        
        return wrapper
    return decorator

def return_next_node( my_node, next_node_list, return_value, node_cofing = {} ):
    updates = {}
    for next_node in next_node_list : 
        next_name = next_node['node_name']
        next_type = next_node['node_type']
        
        # merge node 
        if next_type == 'mergeNode':
            if next_name not in updates:
                updates[next_name] = {my_node : return_value}
            else : 
                updates[next_name][my_node] = return_value
        # 일반 노드 
        else : 
            if next_name not in updates:
                updates[next_name] = return_value
                
    updates = updates | node_cofing 
                
    return updates

    

class MyState(BaseModel):
    response:dict = {}
    Start_Config :dict = {'config': {'user': 'ㅁㅁㅁ', 'sys': '당신은 친절한 챗봇입니다.'}, 'node_type': 'startNode', 'next_node': [{'node_name': 'Agent', 'node_type': 'agentNode'}, {'node_name': 'my_function', 'node_type': 'userNode'}], 'node_name': 'Start'}
    Start :dict = {}
    End_Config :dict = {'config': {'receiveKey': ['agent_response']}}
    End :dict = {}
    Agent_Config :dict = {'config': {'model': {'connName': 'AWS - Nova Pro', 'providerName': 'aws', 'modelName': 'amazon.nova-pro-v1:0', 'accessKeyId': 'asdfasdf', 'secretAccessKey': 'asdfasdfasdf', 'region': 'us-east-1'}, 'memoryGroup': {'id': 'group-1754631680695', 'name': 'New Memory Group', 'description': '', 'memoryType': 'ConversationBufferMemory'}, 'tools': [], 'userPromptInputKey': 'user', 'systemPromptInputKey': 'sys', 'agentOutputVariable': 'agent_response', 'topK': 40, 'topP': 1, 'temperature': 0.7, 'maxTokens': 1000, 'node_type': 'agentNode', 'next_node': [{'node_name': 'End', 'node_type': 'endNode'}], 'node_name': 'Agent', 'chat_history': []}}
    Agent :dict = {}


def return_next_node( my_node, next_node_list, return_value, node_cofing = {} ):
    updates = {}
    for next_node in next_node_list : 
        next_name = next_node['node_name']
        next_type = next_node['node_type']
        
        # merge node 
        if next_type == 'mergeNode':
            if next_name not in updates:
                updates[next_name] = {my_node : return_value}
            else : 
                updates[next_name][my_node] = return_value
        # 일반 노드 
        else : 
            if next_name not in updates:
                updates[next_name] = return_value
                
    updates = updates | node_cofing 
                
    return updates

@log_node_execution("start", "Start", "startNode")
def node_Start(state):
    node_label = "Start" # 노드 레이블을 직접 사용

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다.
    state_dict = state.model_dump()
    
    # 딕셔너리 키 접근 시 .get() 메서드를 사용하여 안전성 확보
    node_input = state_dict.get(node_label, {}) # 키가 없으면 빈 딕셔너리 반환
    
    node_config_key = f"{node_label}_Config"
    full_node_config_data = state_dict.get(node_config_key, {}) # 전체 설정 데이터
    node_config = full_node_config_data.get('config', {}) # 'config' 키의 실제 설정값

    # 다음 노드에 전달하는 값
    # f-string 내 딕셔너리 리터럴은 중괄호를 두 번({ }) 사용해야 합니다.
    return_value = { **node_config, **node_input }
    
    # 전달하고자 하는 타겟 node 리스트
    next_node_list = full_node_config_data.get('next_node', [])
    
    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node(node_label, next_node_list, return_value, return_config)

@log_node_execution("end", "End", "endNode")
def node_End( state ) : 
    my_name = "End" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]['config']['receiveKey']

    # 다음 노드에 전달하는 값 
    return_value = {} 
    if len(node_config) == 1 and node_config[0] == '': 
        return_value = node_input
    else : 
        for key in node_config: 
            return_value[key] = node_input[key] 

    # 결과값 전달
    return_config = { node_config_key : state_dict[node_config_key] }

    next_node_list = [ {'node_name': 'response', 'node_type': 'responseNode'} ]
    return return_next_node( node_name, next_node_list, return_value, return_config )   
    

from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_aws import ChatBedrockConverse
from langchain.memory import ConversationBufferMemory
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import HumanMessage, AIMessage

def convert_to_message_objects(chat_history):
    
    messages = []
    
    for item in chat_history:
        if isinstance(item, dict):
            # 딕셔너리 형태의 메시지를 객체로 변환
            if item.get('type') == 'human':
                messages.append(HumanMessage(content=item['content']))
            elif item.get('type') == 'ai':
                messages.append(AIMessage(content=item['content']))
        elif hasattr(item, 'content'):
            # 이미 메시지 객체인 경우 그대로 사용
            messages.append(item)
        elif isinstance(item, str):
            # 문자열인 경우 HumanMessage로 변환 (fallback)
            messages.append(HumanMessage(content=item))
    
    return messages

def get_memory_data(node_config):
    memory_type = node_config['config']['memoryGroup']['memoryType']

    if memory_type == 'ConversationBufferWindowMemory':
        windowSize = node_config['config']['memoryGroup']['modelConfig']['windowSize']
        windowSize = windowSize * 2
        memory_buffer = ConversationBufferWindowMemory(k=windowSize, return_messages=True)
        
        if len(node_config['config']['chat_history']) == 0:
            memory_buffer.chat_memory.messages = []
        else:
            # 히스토리를 메시지 객체로 변환
            messages = convert_to_message_objects(node_config['config']['chat_history'])
            memory_buffer.chat_memory.messages = messages
            
    elif memory_type == 'ConversationBufferMemory':
        memory_buffer = ConversationBufferMemory(return_messages=True)
        
        if len(node_config['config']['chat_history']) == 0:
            memory_buffer.chat_memory.messages = []
        else:
            # 히스토리를 메시지 객체로 변환
            messages = convert_to_message_objects(node_config['config']['chat_history'])
            memory_buffer.chat_memory.messages = messages

    return memory_buffer

def return_update_config(node_config, user_message_content, ai_message_content):
    # 현재 chat_history를 메시지 객체로 변환
    if node_config['config']['chat_history']:
        current_history = convert_to_message_objects(node_config['config']['chat_history'])
    else:
        current_history = []
    
    # 새로운 메시지 추가
    current_history.append(HumanMessage(content=user_message_content))
    current_history.append(AIMessage(content=ai_message_content))
    
    # 메모리 타입에 따른 크기 관리
    memory_type = node_config['config']['memoryGroup']['memoryType']
    
    if memory_type == 'ConversationBufferWindowMemory':
        windowSize = node_config['config']['memoryGroup']['modelConfig']['windowSize']
        if len(current_history) > windowSize:
            current_history = current_history[-windowSize:]
    
    # 메시지 객체들을 저장 (LangChain이 자동으로 직렬화 처리)
    node_config['config']['chat_history'] = current_history
    
    return node_config
    
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_aws import ChatBedrockConverse
from langchain.memory import ConversationBufferMemory
from langchain.memory import ConversationBufferWindowMemory


@log_node_execution("s_HmfO3w12GZ2cYhs60nq", "Agent", "agentNode")
def node_Agent( state ) : 

    my_name = "Agent" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    if provider == "aws" : 
        accessKeyId     = model_info['accessKeyId'] 
        secretAccessKey = model_info['secretAccessKey'] 
        region          = model_info['region'] 
        
    else :
        apiKey = model_info['apiKey'] 

    memory = get_memory_data( state_dict[node_config_name] )

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = node_input[system_prompt_key]
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = node_input[user_prompt_key]
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']
    top_k       = node_config['topK']
    top_p       = node_config['topP']


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{user_prompt}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt,
        memory=memory
    )


    # 도구 없이 LLM 직접 호출
    response = llm_chian.predict( **{ "user_prompt" : user_prompt }  )
    node_input[output_value] = response.content if hasattr(response, 'content') else response

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = return_update_config( state_dict[node_config_name], user_prompt, node_input[output_value] )
    return return_next_node(node_name, next_node_list, return_value, {node_config_name : return_config} )

graph = StateGraph(MyState)
graph.add_node("_Start", node_Start)
graph.add_node("_End", node_End)
graph.add_node("_Agent", node_Agent)

graph.add_edge(START, "_Start")
graph.add_edge("_Start", "_Agent")
graph.add_edge("_Agent", "_End")
graph.add_edge("_Start", "_my_function")
graph.add_edge("_my_function", "_End")
graph.add_edge("_End", END)
checkpointer = InMemorySaver()
app = graph.compile(checkpointer=checkpointer)


# 배포 실행 함수 (로컬 실행)
def run_deployment_83152353_17d1_465c_bdbd_a67e0148481d(input_data):
    try:
        result = app.invoke(input_data, {"configurable": {"thread_id": 1}})
        return {
            "success": True,
            "deployment_id": "83152353-17d1-465c-bdbd-a67e0148481d",
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "deployment_id": "83152353-17d1-465c-bdbd-a67e0148481d",
            "error": str(e)
        }

