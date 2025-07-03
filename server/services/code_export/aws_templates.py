
def base_base_agent_code(node) : 
    node_name = node['data']['label']
    code = f"""
def node_{node_name}( state ) : 
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_aws import ChatBedrockConverse

    my_name = "{node_name}" 
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
        ("system", f"{{system_prompt}}"),
        ("human", "{{user_prompt}}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt
    )


    # 도구 없이 LLM 직접 호출
    response = llm_chian.predict( **{{ "user_prompt" : user_prompt }}  )
    node_input[output_value] = response.content if hasattr(response, 'content') else response

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return return_next_node(node_name, next_node_list, return_value )
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
    node_name = node['data']['label']
    code = memory_select_code() 

    code += f"""
def node_{node_name}( state ) : 
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_aws import ChatBedrockConverse

    my_name = "{node_name}" 
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


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
                )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{{system_prompt}}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{{user_prompt}}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt,
        memory=memory
    )


    # 도구 없이 LLM 직접 호출
    response = llm_chian.predict( **{{ "user_prompt" : user_prompt }}  )
    node_input[output_value] = response.content if hasattr(response, 'content') else response

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return return_next_node(node_name, next_node_list, return_value )
""" 
    return code 


# tool 에 들어갈 정보들을 생성한다. 
def get_tool_list(node) : 
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
    tool_list = get_tool_list(node)

    code = f"""
def node_{node_name}( state ) : 

    from langchain_aws import ChatBedrockConverse
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "{node_name}" 
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


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
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

    
    # 도구 없이 LLM 직접 호출
    response = agent_executor.invoke({{"user_prompt": user_prompt}})
    node_input[output_value] = response["output"][0]['text'].split( "</thinking>" )[1]

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return return_next_node(node_name, next_node_list, return_value )
    """ 
    return code 


def memory_tool_agent_code(node) : 
    code = ""
    node_name = node['data']['label']
    tool_list = get_tool_list(node)

    code = memory_select_code() 
    code += f"""
def node_{node_name}( state ) : 

    from langchain_aws import ChatBedrockConverse
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "{node_name}" 
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


    llm  = ChatBedrockConverse(
                    model=modelName,
                    temperature=temperature,
                    max_tokens=max_token
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

    
    # 도구 없이 LLM 직접 호출
    response = agent_executor.invoke({{"user_prompt": user_prompt}})
    node_input[output_value] = response["output"][0]['text'].split( "</thinking>" )[1]

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return return_next_node(node_name, next_node_list, return_value )
    """ 

    return code 