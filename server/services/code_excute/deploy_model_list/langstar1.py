
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
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory




class MyState(BaseModel):
    response:dict = {}
    Start_Config :dict = {'config': {'aa': '당신은 ai 도우미 입니다. ', 'bb': '서울 날씨 어때?'}, 'node_type': 'startNode', 'next_node': [{'node_name': 'Agent', 'node_type': 'agentNode'}], 'node_name': 'Start'}
    Start :dict = {}
    Agent_Config :dict = {'config': {'model': {'connName': 'nova-lite', 'providerName': 'aws', 'modelName': 'amazon.nova-lite-v1:0', 'accessKeyId': 'adfadf', 'secretAccessKey': 'asfasdf', 'region': 'afdadf'}, 'userPromptInputKey': 'bb', 'systemPromptInputKey': 'aa', 'memoryGroup': {'id': 'group-1751010925148', 'name': 'New Memory Group', 'description': '', 'memoryType': 'ConversationBufferMemory'}, 'tools': [{'id': 'group-1750998029753', 'name': 'tool2', 'description': '특정 도시의 현재 날씨 정보를 알려주는 도구입니다.\n"이 도구는 **`location`** 이라는 **필수** 인자를 통해 **어떤 도시의 날씨**를 찾을지 알아야 합니다.\n선택적으로 `unit` (문자열) 인자를 통해 \'섭씨\' 또는 \'화씨\' 온도 단위를 지정할 수 있습니다. (기본값: \'섭씨\')\n**?? 도구 사용 예시:**\n1. 사용자 요청: \'서울 날씨 어때?\'\n   도구 호출: get_current_weather(location=\'서울\')\n2. 사용자 요청: \'뉴욕 날씨를 화씨로 알려줘\'\\n\n   도구 호출: get_current_weather(location=\'뉴욕\', unit=\'화씨\')\n**주의**: location이 없으면 날씨 검색을 수행할 수 없습니다. 항상 location을 먼저 파악하세요.', 'code': '\n\ndef get_current_weather(location, unit = "섭씨") -> str:\n\n    # 실제 날씨 API 호출 로직은 여기에 구현됩니다.\n    weather_data = {\n        "서울": {"섭씨": "맑음, 25도", "화씨": "맑음, 77화씨"},\n        "부산": {"섭씨": "흐림, 22도", "화씨": "흐림, 71.6화씨"},\n        "뉴욕": {"섭씨": "비, 18도", "화씨": "비, 64.4화씨"},\n        "런던": {"섭씨": "구름 많음, 15도", "화씨": "구름 많음, 59화씨"},\n    }\n\n    if location not in weather_data:\n        return f"죄송합니다. \'{location}\'의 날씨 정보는 찾을 수 없습니다."\n\n    if unit not in ["섭씨", "화씨"]:\n        return "지원되지 않는 온도 단위입니다. \'섭씨\' 또는 \'화씨\' 중 하나를 선택해 주세요."\n\n    return weather_data[location][unit]'}], 'agentOutputVariable': 'output_result', 'memoryTypeString': 'ConversationBufferMemory', 'topK': 40, 'topP': 1, 'temperature': 0.7, 'maxTokens': 160, 'node_type': 'agentNode', 'next_node': [{'node_name': 'End', 'node_type': 'endNode'}], 'node_name': 'Agent', 'chat_history': []}}
    Agent :dict = {}
    End_Config :dict = {'config': {'receiveKey': ['output_result']}}
    End :dict = {}


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

def get_memory_data( node_config ) : 
    
    memory_type = node_config['config']['memoryGroup']['memoryType']

    if memory_type == 'ConversationBufferWindowMemory' : 
        # limit_size = node_config['config']['memory_type']
        if len( node_config['config']['chat_history'] ) == 0 :
            memory_buffer = ConversationBufferWindowMemory(k=limit_size, return_messages=True)
            memory_buffer.chat_memory.messages = []
        else : 
            memory_buffer = ConversationBufferWindowMemory(k=limit_size, return_messages=True)
            memory_buffer.chat_memory.messages = node_config['config']['chat_history']
        
    elif memory_type == 'ConversationBufferMemory' : 
        if len( node_config['config']['chat_history'] ) == 0 :
            memory_buffer = ConversationBufferMemory(return_messages=True)
            memory_buffer.chat_memory.messages = []
        else : 
            memory_buffer = ConversationBufferMemory(return_messages=True)
            memory_buffer.chat_memory.messages = node_config['config']['chat_history']

    return memory_buffer
        


def return_update_config( node_config, user_message_content, ai_message_content  ) :
   
    memory_type = node_config['config']['memoryGroup']['memoryType']
    
    if memory_type == 'ConversationBufferWindowMemory' : 
        limit_size = 2
        memory_buffer = ConversationBufferWindowMemory(k=limit_size, return_messages=True)
        memory_buffer.chat_memory.messages = node_config['config']['chat_history']

    elif memory_type == 'ConversationBufferMemory' : 
        memory_buffer = ConversationBufferMemory(return_messages=True)
        memory_buffer.chat_memory.messages = node_config['config']['chat_history']
        
    # set value
    memory_buffer.chat_memory.add_user_message(user_message_content)
    memory_buffer.chat_memory.add_ai_message(ai_message_content)

    # get update value
    current_buffered_history = memory_buffer.load_memory_variables({})['history']
    node_config['config']['chat_history'] = current_buffered_history
    return node_config
    

def node_Agent( state ) : 

    from langchain_aws import ChatBedrockConverse
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

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

    memory = get_memory_data( state_dict[node_config_name] )
    

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
        ("human", "{user_prompt}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    tool_list = []
    
    


    def get_current_weather(location, unit = "섭씨") -> str:

        # 실제 날씨 API 호출 로직은 여기에 구현됩니다.
        weather_data = {
            "서울": {"섭씨": "맑음, 25도", "화씨": "맑음, 77화씨"},
            "부산": {"섭씨": "흐림, 22도", "화씨": "흐림, 71.6화씨"},
            "뉴욕": {"섭씨": "비, 18도", "화씨": "비, 64.4화씨"},
            "런던": {"섭씨": "구름 많음, 15도", "화씨": "구름 많음, 59화씨"},
        }

        if location not in weather_data:
            return f"죄송합니다. '{location}'의 날씨 정보는 찾을 수 없습니다."

        if unit not in ["섭씨", "화씨"]:
            return "지원되지 않는 온도 단위입니다. '섭씨' 또는 '화씨' 중 하나를 선택해 주세요."

        return weather_data[location][unit]

    _get_current_weather_tool =  StructuredTool.from_function(
                                                            func=get_current_weather,
                                                            name="get_current_weather",
                                                            description=('''특정 도시의 현재 날씨 정보를 알려주는 도구입니다.
"이 도구는 **`location`** 이라는 **필수** 인자를 통해 **어떤 도시의 날씨**를 찾을지 알아야 합니다.
선택적으로 `unit` (문자열) 인자를 통해 '섭씨' 또는 '화씨' 온도 단위를 지정할 수 있습니다. (기본값: '섭씨')
**?? 도구 사용 예시:**
1. 사용자 요청: '서울 날씨 어때?'
   도구 호출: get_current_weather(location='서울')
2. 사용자 요청: '뉴욕 날씨를 화씨로 알려줘'\n
   도구 호출: get_current_weather(location='뉴욕', unit='화씨')
**주의**: location이 없으면 날씨 검색을 수행할 수 없습니다. 항상 location을 먼저 파악하세요.''') 
                                                        )

    tool_list.append( _get_current_weather_tool )         


    agent = create_tool_calling_agent(llm, tool_list, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tool_list, memory=memory, verbose=False)

    
    # 도구 없이 LLM 직접 호출
    response = agent_executor.invoke({"user_prompt": user_prompt})
    node_input[output_value] = response["output"][0]['text'].split( "</thinking>" )[1]

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = return_update_config( state_dict[node_config_name], user_prompt, node_input[output_value] )
    return return_next_node(node_name, next_node_list, return_value, {node_config_name : return_config} )
    
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
    
graph = StateGraph(MyState)
graph.add_node("_Start", node_Start)
graph.add_node("_Agent", node_Agent)
graph.add_node("_End", node_End)

graph.add_edge("_Agent", "_End")
graph.add_edge(START, "_Start")
graph.add_edge("_Start", "_Agent")
graph.add_edge("_End", END)
checkpointer = InMemorySaver()
graph = graph.compile(checkpointer=checkpointer)
