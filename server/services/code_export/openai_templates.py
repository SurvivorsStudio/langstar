import ast
import textwrap

def base_base_agent_code(node) : 
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    code = f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}( state ) : 
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_openai import ChatOpenAI

    my_name = "{node_name}" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    if not node_input:
        print("No inputs received yet, waiting...")
        return {{}}
        
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = eval(system_prompt_key, {{}}, node_input)    
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = eval(user_prompt_key, {{}}, node_input)
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']


    llm = ChatOpenAI(
                    model=modelName,
                    temperature=temperature,
                    max_completion_tokens=max_token,
                    openai_api_key=apiKey
                )
                
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{{system_prompt}}"),
        ("human", "{{user_prompt}}")
    ])

    chain = prompt | llm
    response = chain.invoke({{"user_prompt": user_prompt}})
    node_input[output_value] = response.content if hasattr(response, 'content') else str(response).encode('utf-8', errors='ignore').decode('utf-8')

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    
    return_config = {{ node_config_name : state_dict[node_config_name] }}    
    return return_next_node(node_name, next_node_list, return_value, return_config )
""" 
    return code 


def memory_select_code(memory_type = 'ConversationBufferMemory') : 
    if memory_type == "ConversationBufferMemory" : 
        return """
from langchain.memory import ConversationBufferMemory
memory = ConversationBufferMemory(return_messages=True)
"""



def memory_base_agent_code(node) : 
    code = ""
    code += common_memory_code() 
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    # if node['data']['config']['memoryGroup']['memoryType'] =='ConversationBufferMemory': 
    code += f"""
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.memory import ConversationBufferWindowMemory


@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}( state ) : 

    my_name = "{node_name}" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    if not node_input:
        print("No inputs received yet, waiting...")
        return {{}}
        
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    apiKey = model_info['apiKey'] 

    memory = get_memory_data( state_dict[node_config_name] )

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = eval(system_prompt_key, {{}}, node_input)    
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = eval(user_prompt_key, {{}}, node_input)

    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']


    llm  = ChatOpenAI(
                    model=modelName,
                    temperature=temperature,
                    max_completion_tokens=max_token,
                    openai_api_key=apiKey
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{{system_prompt}}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{{user_prompt}}")
    ])

    chain = prompt | llm
    response = chain.invoke({{"user_prompt": user_prompt, "history": memory.chat_memory.messages}})
    node_input[output_value] = response.content if hasattr(response, 'content') else str(response).encode('utf-8', errors='ignore').decode('utf-8')

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = return_update_config( state_dict[node_config_name], user_prompt, node_input[output_value] )
    return return_next_node(node_name, next_node_list, return_value, {{node_config_name : return_config}} )
""" 
    return code 

    


# tool 에 들어갈 정보들을 생성한다. 
def get_tool_list(node) :
    token_tool_code_list = [] 
    for tool_info in  node['data']['config']['tools']: 
        indented_code = textwrap.indent(tool_info['code'], "    ")
        parsed = ast.parse(tool_info['code'])
        func_def = next((node for node in parsed.body if isinstance(node, ast.FunctionDef)), None)
        function_name = func_def.name  
        tool_description = tool_info["description"] 
        tmp_code = f"""
{indented_code}

    _{function_name}_tool =  StructuredTool.from_function(
                                                            func={function_name},
                                                            name="{function_name}",
                                                            description=('''{tool_description}''') 
                                                        )

    tool_list.append( _{function_name}_tool )         
"""     
        token_tool_code_list.append( tmp_code ) 
    code = token_tool_code_list = "\n".join( token_tool_code_list ) 
    return code


def base_tool_agent_code(node) :
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    tool_list = get_tool_list(node)

    code = f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}( state ) : 

    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "{node_name}" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    if not node_input:
        print("No inputs received yet, waiting...")
        return {{}}
        
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = eval(system_prompt_key, {{}}, node_input)    
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = eval(user_prompt_key, {{}}, node_input)
    
    output_value  = node_config['agentOutputVariable']
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']


    llm  = ChatOpenAI(
                    model=modelName,
                    temperature=temperature,
                    max_completion_tokens=max_token,
                    openai_api_key=apiKey
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{{system_prompt}}"),
        ("human", "{{user_prompt}}"),
        ("placeholder", "{{agent_scratchpad}}"),
    ])

    tool_list = []
    
    {tool_list}

    agent = create_tool_calling_agent(llm, tool_list, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tool_list, verbose=False)

    
    # 도구와 함께 LLM 호출
    response = agent_executor.invoke({{"user_prompt": user_prompt}})
    
    # OpenAI 응답 파싱
    if isinstance(response, dict) and "output" in response:
        output = response["output"]
        if isinstance(output, list) and len(output) > 0:
            text_content = output[0].get('text', '')
            if '</thinking>\\n\\n' in text_content:
                node_input[output_value] = text_content.split('</thinking>\\n\\n')[1]
            else:
                node_input[output_value] = text_content
        else:
            node_input[output_value] = str(response)
    else:
        node_input[output_value] = str(response)

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = {{ node_config_name : state_dict[node_config_name] }}    
    return return_next_node(node_name, next_node_list, return_value, return_config )
    """ 
    return code 


def common_memory_code() : 
    code = """

from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
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
    """
    return code 


def memory_tool_agent_code(node) : 
    code = ""
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    tool_list = get_tool_list(node)

    # code = memory_select_code() 
    print( node )

    code += common_memory_code() 
    code += f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}( state ) : 

    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "{node_name}" 
    node_name = my_name
    node_config_name = my_name + "_Config"

    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    if not node_input:
        print("No inputs received yet, waiting...")
        return {{}}
        
    node_config = state_dict[node_config_name]['config']
    print( node_config )

    # 모델 정보
    model_info = node_config['model']
    provider = model_info['providerName'] 
    modelName = model_info['modelName'] 
    apiKey = model_info['apiKey'] 

    # prompt 
    system_prompt_key = node_config['systemPromptInputKey']
    system_prompt     = eval(system_prompt_key, {{}}, node_input)    
    
    user_prompt_key = node_config['userPromptInputKey']
    user_prompt     = eval(user_prompt_key, {{}}, node_input)
    
    output_value  = node_config['agentOutputVariable']

    memory = get_memory_data( state_dict[node_config_name] )
    

    # 답변 옵션     
    temperature = node_config['temperature']
    max_token   = node_config['maxTokens']


    llm  = ChatOpenAI(
                    model=modelName,
                    temperature=temperature,
                    max_completion_tokens=max_token,
                    openai_api_key=apiKey
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{{system_prompt}}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{{user_prompt}}"),
        ("placeholder", "{{agent_scratchpad}}"),
    ])

    tool_list = []
    
    {tool_list}

    agent = create_tool_calling_agent(llm, tool_list, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tool_list, memory=memory, verbose=False)

    
    # 도구와 메모리 함께 LLM 호출
    response = agent_executor.invoke({{"user_prompt": user_prompt}})
    
    # OpenAI 응답 파싱
    if isinstance(response, dict) and "output" in response:
        output = response["output"]
        if isinstance(output, list) and len(output) > 0:
            text_content = output[0].get('text', '')
            if '</thinking>\\n\\n' in text_content:
                node_input[output_value] = text_content.split('</thinking>\\n\\n')[1]
            else:
                node_input[output_value] = text_content
        else:
            node_input[output_value] = str(response)
    else:
        node_input[output_value] = str(response)

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return_config = return_update_config( state_dict[node_config_name], user_prompt, node_input[output_value] )
    return return_next_node(node_name, next_node_list, return_value, {{node_config_name : return_config}} )
    """ 

    return code 