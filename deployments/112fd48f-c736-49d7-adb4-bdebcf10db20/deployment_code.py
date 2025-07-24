
# Deployment ID: 112fd48f-c736-49d7-adb4-bdebcf10db20
# Generated at: 2025-07-24T07:08:00.363051


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

class MyState(BaseModel):
    response:dict = {}
    Start_Config :dict = {'config': {'user_input': 'ads'}, 'node_type': 'startNode', 'next_node': [{'node_name': 'Agent', 'node_type': 'agentNode'}], 'node_name': 'Start'}
    Start :dict = {}
    End_Config :dict = {'config': {'receiveKey': ['']}}
    End :dict = {}
    Agent_Config :dict = {'config': {'model': {'connName': 'ㅁㄴㅇㅁㄴㅇ', 'providerName': 'openai', 'modelName': 'gpt-4o-mini', 'apiKey': 'ㅁㄴdasdasdasd'}, 'userPromptInputKey': 'user_input', 'systemPromptInputKey': 'system_message', 'tools': [], 'agentOutputVariable': 'agent_response', 'node_type': 'agentNode', 'next_node': [{'node_name': 'End', 'node_type': 'endNode'}], 'node_name': 'Agent', 'chat_history': []}}
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
graph.add_node("_Agent", node_Agent)

graph.add_edge(START, "_Start")
graph.add_edge("_Start", "_Agent")
graph.add_edge("_Agent", "_End")
graph.add_edge("_End", END)
checkpointer = InMemorySaver()
app = graph.compile(checkpointer=checkpointer)


# 배포 실행 함수
def run_deployment_112fd48f_c736_49d7_adb4_bdebcf10db20(input_data):
    try:
        result = app.invoke(input_data, {"configurable": {"thread_id": 1}})
        return {
            "success": True,
            "deployment_id": "112fd48f-c736-49d7-adb4-bdebcf10db20",
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "deployment_id": "112fd48f-c736-49d7-adb4-bdebcf10db20",
            "error": str(e)
        }
