
# Deployment ID: 076b8e38-3067-4a42-b7a3-4369966bc8b1
# Generated at: 2025-08-06T00:32:31.241785


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
            # 노드 실행 시작 로깅
            start_time = time.time()
            node_name_display = func.__name__
            
            # LangGraph 노드는 보통 첫 번째 인자로 'state'를 받습니다.
            state: Dict[str, Any] = kwargs.get('state', args[0] if args else {})
            
            # 입력 상태 로깅 (민감 정보 보호 및 성능을 위해 일부만 로깅)
            input_log_str = str(state.get('messages', state))[:100] + "..." if state else "None"
            
            if logger.isEnabledFor(logging.INFO):
                logger.info("[" + node_name_display + "] Node started. Input state (partial): " + input_log_str)
            
            try:
                # 원본 노드 함수 실행
                result = func(*args, **kwargs)
                
                # 실행 완료 시간 계산
                end_time = time.time()
                duration_ms = int((end_time - start_time) * 1000)
                
                # 출력 결과 로깅 (민감 정보 보호 및 성능을 위해 일부만 로깅)
                output_log_str = str(result)[:100] + "..." if result else "None"
                if logger.isEnabledFor(logging.INFO):
                    logger.info("[" + node_name_display + "] Node finished. Output result (partial): " + output_log_str)
                    logger.info("[" + node_name_display + "] Execution time: " + str(duration_ms) + "ms")
                
                return result
            except Exception as e:
                # 에러 발생 시, 노드 이름과 함께 상세 에러 정보(스택 트레이스 포함) 로깅
                end_time = time.time()
                duration_ms = int((end_time - start_time) * 1000)
                logger.exception("[" + node_name_display + "] Error in node. Original error: " + str(e))
                logger.error("[" + node_name_display + "] Execution time before error: " + str(duration_ms) + "ms")
                raise # 에러를 다시 발생시켜 LangGraph의 에러 핸들링으로 전달
        return wrapper
    return decorator

class MyState(BaseModel):
    response:dict = {}
    Start_Config :dict = {'config': {'system_prompt': '당신은 사용자 질의를 일본어로 번역합니다. ', 'user_input': '안녕하세요'}, 'node_type': 'startNode', 'next_node': [{'node_name': 'Prompt', 'node_type': 'promptNode'}], 'node_name': 'Start'}
    Start :dict = {}
    End_Config :dict = {'config': {'receiveKey': ['agent_response']}}
    End :dict = {}
    Prompt_Config :dict = {'config': {'template': '작성된 프롬포트는 다음과 같습니다\n\nUser: {user_input}\nAssistant:'}, 'outputVariable': 'user_input', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Agent', 'node_type': 'agentNode'}], 'node_name': 'Prompt'}
    Prompt :dict = {}
    Agent_Config :dict = {'config': {'model': {'connName': 'nova-lite', 'providerName': 'aws', 'modelName': 'amazon.nova-lite-v1:0', 'accessKeyId': 'adfadf', 'secretAccessKey': 'asfasdf', 'region': 'afdadf'}, 'userPromptInputKey': 'user_input', 'systemPromptInputKey': 'system_prompt', 'tools': [], 'agentOutputVariable': 'agent_response', 'memoryTypeString': '', 'topP': 1, 'temperature': 0.6, 'node_type': 'agentNode', 'next_node': [{'node_name': 'End', 'node_type': 'endNode'}], 'node_name': 'Agent', 'chat_history': []}}
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

@log_node_execution("C2otlOX8POA_rlXcYcI-l", "Start", "startNode")
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

@log_node_execution("68zFb7uLZyrGhVj-G0u34", "End", "endNode")
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
    
@log_node_execution("qdUhEdEhr2ABQwnYjKlC0", "Prompt", "promptNode")
def node_Prompt(state):
    my_name = "Prompt" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # prompt 생성 
    template = PromptTemplate(
        template=node_config['config']['template'],
        input_variables=list(node_input.keys())
    )

    prompt = template.format(**node_input)
    output_value = node_config['outputVariable']
    
    # 다음 노드에 전달하는 값 
    return_value = node_input.copy() 
    return_value.update( { output_value : prompt } ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = { node_config_key : state_dict[node_config_key] }
    return return_next_node( node_name, next_node_list, return_value, return_config ) 

@log_node_execution("o_4-XG69oiW-HN4GXyuMR", "Agent", "agentNode")
def node_Agent( state ) : 
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_aws import ChatBedrockConverse

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


    llm = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )
                
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt
    )


    # 도구 없이 LLM 직접 호출
    response = llm_chian.predict( **{ "user_prompt" : user_prompt }  )
    node_input[output_value] = response.content if hasattr(response, 'content') else response

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    
    return_config = { node_config_name : state_dict[node_config_name] }    
    return return_next_node(node_name, next_node_list, return_value, return_config )

graph = StateGraph(MyState)
graph.add_node("_Start", node_Start)
graph.add_node("_End", node_End)
graph.add_node("_Prompt", node_Prompt)
graph.add_node("_Agent", node_Agent)

graph.add_edge(START, "_Start")
graph.add_edge("_Start", "_Prompt")
graph.add_edge("_Prompt", "_Agent")
graph.add_edge("_Agent", "_End")
graph.add_edge("_End", END)
checkpointer = InMemorySaver()
app = graph.compile(checkpointer=checkpointer)


# 배포 실행 함수 (로컬 실행)
def run_deployment_076b8e38_3067_4a42_b7a3_4369966bc8b1(input_data):
    try:
        result = app.invoke(input_data, {"configurable": {"thread_id": 1}})
        return {
            "success": True,
            "deployment_id": "076b8e38-3067-4a42-b7a3-4369966bc8b1",
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "deployment_id": "076b8e38-3067-4a42-b7a3-4369966bc8b1",
            "error": str(e)
        }

# API를 통한 배포 실행 함수
def run_deployment_via_api(input_data):
    import requests
    import json
    
    url = "http://localhost:8000/api/deployment/076b8e38-3067-4a42-b7a3-4369966bc8b1/run"
    
    payload = {
        "input_data": input_data
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("success"):
            print("Deployment execution successful:", result["result"])
            return result["result"]
        else:
            print("Deployment execution failed:", result.get("error"))
            raise Exception(result.get("error"))
            
    except requests.exceptions.RequestException as e:
        print("API call error:", e)
        raise e

# 사용 예시
if __name__ == "__main__":
    try:
        # API를 통한 실행
        result = run_deployment_via_api("Hello! This is a test message.")
        print("Result:", result)
    except Exception as e:
        print("Error:", e)
