from langchain_core.prompts import PromptTemplate
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_aws import ChatBedrockConverse
from langchain.tools import Tool
from langchain.memory import ConversationBufferMemory
import types
import uuid
import ast
import textwrap
import re
import logging
import traceback
from typing import Dict, Any
from langchain.chains import LLMChain
from langchain_core.tools import StructuredTool


# 로거 설정
logger = logging.getLogger(__name__)


def run_bedrock(modelName, temperature, max_token, system_prompt, user_prompt, memory="", tool_info=[]):
    # 도구 없이, 메모리 없이
    llm = ChatBedrockConverse(
            model=modelName,
            temperature=temperature,
            max_tokens=max_token
        )

    if memory == "" and len(tools) == 0:
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            ("human", "{user_prompt}")
        ])
       
        llm_chain = LLMChain(llm=llm, prompt=prompt)
        response = llm_chain.predict(user_prompt=user_prompt)
        return response.content if hasattr(response, 'content') else str(response).encode('utf-8', errors='ignore').decode('utf-8')

    # 메모리 있어
    elif memory != "" and len(tools) == 0:
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{user_prompt}")
        ])
        
        llm_chain = LLMChain(llm=llm, prompt=prompt, memory=memory)
        response = llm_chain.predict(user_prompt=user_prompt)
        return response.content if hasattr(response, 'content') else str(response).encode('utf-8', errors='ignore').decode('utf-8')

    # 도구 있어
    elif memory == "" and len(tools) != 0:
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            ("human", "{user_prompt}"),
            ("placeholder", "{agent_scratchpad}"),
        ])

        tools = [WorkflowService.create_tool_from_api(**tool_info) for tool_info in tools_data]
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=[product_search_tool, weather_tool], verbose=False)
        response = agent_executor.invoke( {'user_prompt' : user_prompt} )
        response = response["output"][0]['text'].split('</thinking>\n\n')[1]
        return response

    # 도구 있어, 메모리 있어
    elif memory != "" and len(tools) != 0:
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{user_prompt}"),
            ("placeholder", "{agent_scratchpad}"),
        ])

        tools = [WorkflowService.create_tool_from_api(**tool_info) for tool_info in tools_data]
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=[product_search_tool, weather_tool], verbose=False)
        response = agent_executor.invoke( {'user_prompt' : user_prompt} )
        response = response["output"][0]['text'].split('</thinking>\n\n')[1]
        return response





class WorkflowService:
    """Workflow Node Processing Service"""
    
    @staticmethod
    def process_prompt_node(data) -> Dict[str, Any]:
        """Process prompt node"""
        try:
            logger.info(f"Processing prompt node with return_key: {data.return_key}")
            template = PromptTemplate(
                template=data.prompt,
                input_variables=list(data.param.keys())
            )
            rendered = template.format(**data.param)
            data.param[data.return_key] = rendered
            logger.info(f"Prompt node processed successfully")
            return data.param
        except Exception as e:
            logger.error(f"Error in prompt node processing: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def process_python_node(msg: Dict[str, Any]) -> Dict[str, Any]:
        """Process python node"""
        try:
            logger.info("Processing python node")
            python_code = msg['py_code'] 
            param = msg.get("param", {})
            
            parsed = ast.parse(python_code)
            func_def = next((node for node in parsed.body if isinstance(node, ast.FunctionDef)), None)
            
            if not func_def:
                error_msg = "No function found in python_code."
                logger.error(error_msg)
                return {"error": error_msg}

            function_name = func_def.name
            exec_globals = {}
            
            exec(python_code, exec_globals)
            func = exec_globals[function_name]
            result = func(param)
            logger.info(f"Python node processed successfully with function: {function_name}")
            return result
        except Exception as e:
            error_msg = f"Error in python node processing: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"error": str(e)}

    @staticmethod
    def process_start_node(msg: Dict[str, Any]) -> Dict[str, Any]:
        """Process start node"""
        try:
            logger.info("Processing start node")
            result = {}
            for row in msg["variables"]: 
                result[row['variableName']] = row['defaultValue']
            logger.info(f"Start node processed successfully with {len(result)} variables")
            return result
        except Exception as e:
            logger.error(f"Error in start node processing: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def create_tool_from_api(tool_name: str, tool_description: str, tool_code: str) -> Tool:
        """Create LangChain Tool from API string"""
        try:
            logger.info(f"Creating tool: {tool_name}")
            tool_namespace = {}

            exec(tool_code, tool_namespace)
            
            tool_func = None
            for v in tool_namespace.values():
                if isinstance(v, types.FunctionType):
                    tool_func = v
                    break

            if not tool_func:
                error_msg = "제공된 코드에서 함수 객체를 찾을 수 없습니다."
                logger.error(error_msg)
                raise ValueError(error_msg)

            tool = Tool.from_function(
                name=tool_name,
                description=tool_description,
                func=tool_func
            )
            logger.info(f"Tool {tool_name} created successfully")
            return tool
        except Exception as e:
            logger.error(f"Error creating tool {tool_name}: {str(e)}", exc_info=True)
            raise ValueError(f"코드 실행 실패: {e}")

    @staticmethod
    def process_agent_node(msg: Dict[str, Any]) -> str:

        #  {'model': {'connName': 'nova-lite', 'providerName': 'aws', 'modelName': 'amazon.nova-lite-v1:0', 'accessKeyId': 'adfadf', 'secretAccessKey': 'asfasdf', 'region': 'afdadf'}, 
        #  'modelSetting': {'topK': 40, 'topP': 1, 'temperature': 0.7, 'maxTokens': 2048}, 
        #  'system_prompt': '����� ai ����� �Դϴ�. ', 'user_prompt': '�ȳ�', 'memory_group': 'group-1750834607125', 'memory_group_name': 'New Memory Group', 
        #  'tools': [], 'memory_type': 'ConversationBufferMemory', 'return_key': 'output_result'}
        print( "--->", msg )
        """Process agent node"""
        

        
        try:
            logger.info("Processing agent node")
            modelName = msg['model']['modelName']
            system_prompt = msg['system_prompt']
            user_prompt = msg['user_prompt']
            memory_type = msg.get('memory_type', "")
            memory_group_name = msg.get('memory_group_name', "")
            tools = msg.get('tools',[])

            chat_id = msg.get('chat_id', str(uuid.uuid1()))

            temperature = msg['modelSetting']['temperature']
            max_token = msg['modelSetting']['maxTokens']


            memory = ""
            if memory_type == "ConversationBufferMemory" : 
                if chat_id not in WorkflowService.MEMORY_STORE:
                    memory = ConversationBufferMemory(return_messages=True)
                    WorkflowService.MEMORY_STORE[chat_id] = {memory_group_name: memory}
                elif memory_group_name not in WorkflowService.MEMORY_STORE[chat_id]:
                    memory = ConversationBufferMemory(return_messages=True)
                    WorkflowService.MEMORY_STORE[chat_id][memory_group_name] = memory 
                
                memory = WorkflowService.MEMORY_STORE[chat_id][memory_group_name]
                
                


            
            
            if msg['model']['providerName'] == 'aws' : 
                return run_bedrock(modelName, temperature, max_token, system_prompt, user_prompt, memory, tools )
                
            elif msg['providerName'] == 'openai' : 
                if memory_type == "" : 
                    pass 
                else : 
                    pass 


            elif msg['providerName'] == 'google' : 
                if memory_type == "" : 
                    pass 
                else : 
                    pass 

        except Exception as e: 
            error_msg = f"Error in agent node processing: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"error": str(e)} 



        # try:
        #     logger.info("Processing agent node")
        #     model_id = msg['model']
        #     system_prompt = msg.get('system_prompt', "당신은 AI 도우미입니다")
        #     user_prompt = msg['user_prompt']
        #     return_key = msg['return_key']
        #     tools_data = msg['tools']
        #     tools = [WorkflowService.create_tool_from_api(**tool_info) for tool_info in tools_data]
        #     memory_type = msg.get('memory_type', "")
            
        #     logger.info(f"Agent node config - model: {model_id}, tools: {len(tools)}, memory: {memory_type}")
            
        #     llm = ChatBedrockConverse(
        #         model="us.amazon.nova-pro-v1:0",
        #         temperature=0.1,
        #         max_tokens=1000
        #     )
            
        #     if memory_type:
        #         memory_group_name = msg['memory_group_name']
        #         chat_id = msg.get('chat_id', str(uuid.uuid1()))
                
        #         # Initialize memory if not exists
        #         if memory_type == "ConversationBufferMemory":
        #             if chat_id not in WorkflowService.MEMORY_STORE:
        #                 memory = ConversationBufferMemory(memory_key=memory_group_name, return_messages=True)
        #                 WorkflowService.MEMORY_STORE[chat_id] = {memory_group_name: memory}
        #             elif memory_group_name not in WorkflowService.MEMORY_STORE[chat_id]:
        #                 memory = ConversationBufferMemory(memory_key=memory_group_name, return_messages=True)
        #                 WorkflowService.MEMORY_STORE[chat_id][memory_group_name] = memory
                
        #         memory = WorkflowService.MEMORY_STORE[chat_id][memory_group_name]
                
        #         # Create prompt with memory placeholder
        #         prompt = ChatPromptTemplate.from_messages([
        #             ("system", f"{system_prompt}\n이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요."),
        #             MessagesPlaceholder(variable_name=memory_group_name),
        #             ("human", "{input}"),
        #             MessagesPlaceholder(variable_name="agent_scratchpad")
        #         ])
                
        #         # Create agent with prompt only (no memory parameter)
        #         agent = create_openai_tools_agent(llm, tools, prompt)
                
        #         # Create agent executor with memory
        #         agent_executor = AgentExecutor(
        #             agent=agent, 
        #             tools=tools, 
        #             memory=memory,
        #             verbose=True
        #         )
                
        #         result = agent_executor.invoke({"input": user_prompt})
        #         logger.info("Agent node processed successfully with memory")
        #         return result['output'][0]['text']
            
        #     else:
        #         # No memory case
        #         prompt = ChatPromptTemplate.from_messages([
        #             ("system", f"{system_prompt}\n이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요."),
        #             ("human", "{input}"),
        #             MessagesPlaceholder(variable_name="agent_scratchpad")
        #         ])
                
        #         # Create agent without memory
        #         agent = create_openai_tools_agent(llm, tools, prompt)
        #         agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
                
        #         result = agent_executor.invoke({"input": user_prompt})
        #         logger.info("Agent node processed successfully without memory")
        #         return result['output'][0]['text']
                
        # except Exception as e:
        #     error_msg = f"Error in agent node processing: {str(e)}"
        #     logger.error(error_msg, exc_info=True)
        #     return {"error": str(e)}

    @staticmethod
    def generate_langgraph_code(create_node_json: Dict[str, Any]) -> str:
        """Generate LangGraph Python code from workflow configuration"""
        try:
            logger.info("Generating LangGraph code")
            logger.info(f"Workflow nodes: {len(create_node_json.get('nodes', []))}")
            logger.info(f"Workflow edges: {len(create_node_json.get('edges', []))}")
            
            def create_state(config_json):
                code_lines = [
                    "from pydantic import BaseModel",
                    "from typing import Annotated",
                    "import operator",
                    "from langchain_core.prompts import PromptTemplate",
                    "from langchain.chains import LLMChain",
                    "from langgraph.graph import StateGraph, START, END",
                    "",
                    "class MyState(BaseModel):",
                    "    response:dict = {}"
                ]
                
                for config_token in config_json:
                    for config_key, config_val in config_token.items():
                        if '__annotated__' in config_val:
                            code_token = "    {0} :Annotated[dict, operator.or_] = ".format(config_key) + "{}"
                        else:
                            code_token = "    {0} :dict = {1}".format(config_key, str(config_val))
                        code_lines.append(code_token)
                return "\n".join(code_lines) + "\n"

            def create_function_node(function_name, py_code, func_exec):
                indented_code = textwrap.indent(py_code, "    ")
                function_node_code = f"""def node_{function_name}(state):
    my_name = "{function_name}"
    node_name = my_name
    node_config = my_name + "_Config"

    state_dict  = state.model_dump()

{indented_code}

    # 함수 실행
    input_param = state_dict[node_name ] 
    result = {func_exec}( input_param ) 
    
    node_config = state_dict[node_config]
    next_node_list = node_config.get('next_node', []) 
    return return_next_node( node_name, next_node_list, result ) 
    
"""
                return function_node_code.strip()

            def create_branch(function_name, condition_config):
                tmp_function_name = "tmp_" + function_name
                tmp_param = re.search(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\[", condition_config[0]['condition'])
                tmp_param = tmp_param.group(1)

                code = f"def {tmp_function_name}({tmp_param}) :"
                for row in condition_config:
                    condition = row['condition']
                    description = row['description']
                    code += f"""
    {condition} : 
        return "{description}"
"""
                indented_code = textwrap.indent(code, "    ")

                function_node_code = f"""
def node_branch_{function_name}(state):
    my_name = "{function_name}"
    node_name = my_name
    node_config = my_name + "_Config"

    state_dict  = state.model_dump()

{indented_code}

    # 함수 실행
    input_param = state_dict[node_name] 
    return {tmp_function_name}( input_param ) 
    
"""
                return function_node_code

            def create_condition_node(function_name, condition_config):
                tmp_function_name = "tmp_" + function_name
                tmp_param = re.search(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\[", condition_config[0]['condition'])
                tmp_param = tmp_param.group(1)

                code = f"def {tmp_function_name}({tmp_param}) :"
                for row in condition_config:
                    condition = row['condition']
                    next_node_list = row['next_node']
                    code += f"""
    {condition} : 
        return return_next_node( node_name, {next_node_list}, {tmp_param} ) 
"""

                indented_code = textwrap.indent(code, "    ")
                
                function_node_code = f"""
def node_{function_name}(state):
    my_name = "{function_name}"
    node_name = my_name
    

    state_dict  = state.model_dump()

{indented_code}

    # 함수 실행
    input_param = state_dict[node_name] 
    return {tmp_function_name}( input_param ) 
    
"""
                return function_node_code

            def react_to_python_langgraph(create_node_json):
                # node id to name 
                node_id_to_node_label = {}
                for node in create_node_json['nodes']:
                    node_id = node['id']
                    node_type = node['type']
                    node_label = node['data']['label']
                    node_id_to_node_label[node_id] = {'node_name': node_label, 'node_type': node_type}
                
                # node relation 
                edge_relation = {}
                for edge in create_node_json['edges']:
                    source = edge['source'] 
                    target = edge['target'] 
                    source_node_name = node_id_to_node_label[source]['node_name']
                    target_node_name = node_id_to_node_label[target]['node_name']
                    target_node_type = node_id_to_node_label[target]['node_type']
                    
                    if source_node_name not in edge_relation:
                        edge_relation[source_node_name] = [{'node_name': target_node_name, 'node_type': target_node_type}]
                    else:
                        edge_relation[source_node_name].append({'node_name': target_node_name, 'node_type': target_node_type})
                
                # create config 
                result = []
                for node in create_node_json['nodes']:
                    if node['type'] == 'startNode':
                        node_id = node['id']
                        node_type = node['type']
                        node_name = node['data']['label']
                        node_config = node['data']['config']['variables']
                        
                        temp_config = {}
                        config_dict = {}
                        for token_config in node_config:
                            config_dict.update({token_config['name']: token_config['defaultValue']})

                        config_id = node_name + "_Config"
                        temp_config[config_id] = {'config': config_dict}
                        temp_config[config_id]['node_type'] = node_type
                        temp_config[config_id]['next_node'] = edge_relation[node_name]
                        temp_config[config_id]['node_name'] = node_name

                        result.append(temp_config.copy())
                        result.append({node_name: {}})
                        
                    elif node['type'] == 'promptNode':
                        node_id = node['id']
                        node_type = node['type']
                        node_name = node['data']['label']
                        template = node['data']['config']['template']
                        outputVariable = node['data']['config']['outputVariable']

                        temp_config = {}
                        config_id = node_name + "_Config"
                        temp_config[config_id] = {'config': {'template': template}}
                        temp_config[config_id]['outputVariable'] = outputVariable
                        temp_config[config_id]['node_type'] = node_type
                        temp_config[config_id]['next_node'] = edge_relation[node_name]
                        temp_config[config_id]['node_name'] = node_name

                        result.append(temp_config.copy())
                        result.append({node_name: {}})
                        
                    elif node['type'] == 'mergeNode':
                        node_id = node['id']
                        node_type = node['type']
                        node_name = node['data']['label']
                        mergeMappings = node['data']['config']['mergeMappings']

                        config_dict = {}
                        for return_style in mergeMappings:
                            output_value = return_style['outputKey']
                            source_node = return_style['sourceNodeId']
                            source_node_value = return_style['sourceNodeKey']
                            
                            source_node_name = node_id_to_node_label[source_node]['node_name']
                            config_dict[output_value] = {'node_name': source_node_name, 'node_value': source_node_value}

                        temp_config = {}
                        config_id = node_name + "_Config"
                        temp_config[config_id] = {'config': config_dict}
                        temp_config[config_id]['node_type'] = node_type
                        temp_config[config_id]['next_node'] = edge_relation[node_name]
                        temp_config[config_id]['node_name'] = node_name

                        result.append(temp_config.copy())
                        result.append({node_name: {"__annotated__": True}})
                
                    elif node['type'] == 'endNode':
                        node_id = node['id']
                        node_type = node['type']
                        node_name = node['data']['label']
                        outputVariable = node['data']['config']

                        temp_config = {}
                        config_id = node_name + "_Config"
                        temp_config[config_id] = {'config': {'receiveKey': [outputVariable['receiveKey']]}}

                        result.append(temp_config.copy())
                        result.append({node_name: {}})

                    elif node['type'] == 'functionNode':
                        node_id = node['id']
                        node_type = node['type']
                        node_name = node['data']['label']
                        python_conde = node['data']['code']
                        
                        temp_config = {}
                        config_id = node_name + "_Config"
                        temp_config[config_id] = {'config': {'code': python_conde}}
                        temp_config[config_id]['node_type'] = node_type
                        temp_config[config_id]['next_node'] = edge_relation[node_name]
                        temp_config[config_id]['node_name'] = node_name

                        result.append(temp_config.copy())
                        result.append({node_name: {}})

                    elif node['type'] == 'conditionNode':
                        node_id = node['id']
                        node_type = node['type']
                        node_name = node['data']['label']
                        conditions_config_list = node['data']['config']['conditions']

                        config_id = node_name + "_Config"
                        temp_config = {}
                        temp_config[config_id] = {'config': []}
                        
                        for row in conditions_config_list:
                            temp_config[config_id]['config'].append({
                                'targetNodeLabel': row['targetNodeLabel'],
                                'condition': row['condition'],
                                'description': row['description']
                            })

                        temp_config[config_id]['node_type'] = node_type
                        temp_config[config_id]['next_node'] = edge_relation[node_name]
                        temp_config[config_id]['node_name'] = node_name

                        result.append(temp_config.copy())
                        result.append({node_name: {}})
                    
                    elif node['type'] == 'agentNode': 
                        node_id   = node['id']
                        node_type = node['type']
                        node_name = node['data']['label']
                        
                        conditions_config_list = node['data']['config']

                        config_id = node_name + "_Config"

                        temp_config = {}
                        temp_config[config_id] = { 'config' : conditions_config_list } 
                        
                        temp_config[config_id]['config']['node_type'] = node_type
                        temp_config[config_id]['config']['next_node'] = edge_relation[node_name]
                        temp_config[config_id]['config']['node_name'] = node_name

                        result.append( temp_config.copy() )
                        result.append( {node_name : {}} ) 
                    

                python_code = create_state(result)
                python_code += """
def return_next_node( my_node, next_node_list, return_value  ):

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
                
    return updates
""" + "\n" + "\n" + "\n"
                
                start_node_code = """
def node_**startNode**(state):
    my_name = "**startNode**" 
    node_name = my_name
    node_config = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config] 

    # 다음 노드에 전달하는 값 
    return_value = { **node_config['config'], **node_input } 
    
    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    
    return return_next_node( node_name, next_node_list, return_value ) 
""" + "\n" + "\n" + "\n"
                
                prompt_node_code = """
def node_**promptNode**(state):
    my_name = "**promptNode**" 
    node_name = my_name
    node_config = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config]
    
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
    
    return return_next_node( node_name, next_node_list, return_value ) 
""" + "\n" + "\n" + "\n"
                
                merge_node_code = """
def node_**mergeNode**(state):
    my_name = "**mergeNode**" 
    node_name = my_name
    node_config = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config]

                        
    # 다음 노드에 전달하는 값 
    return_value = {} 
    for key, value  in node_config['config'].items():
        match_node  = value['node_name'] 
        match_value = value['node_value'] 
        return_value[key]  = node_input[match_node][match_value]


    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return return_next_node( node_name, next_node_list, return_value )   
""" + "\n" + "\n" + "\n"
                
                end_node_code = """
def node_**endNode**( state ) : 
    my_name = "**endNode**" 
    node_name = my_name
    node_config = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config]['config']['receiveKey']

    # 다음 노드에 전달하는 값 
    return_value = {} 
    if len(node_config) == 1 and node_config[0] == '': 
        return_value = node_input
    else : 
        for key in node_config: 
            return_value[key] = node_input[key] 

    # 결과값 전달
    next_node_list = [ {'node_name': 'response', 'node_type': 'responseNode'} ]
        
    return return_next_node( node_name, next_node_list, return_value ) 
""" + "\n" + "\n" + "\n"

                agent_node_code_base = """

def node_**agentNode**( state ) : 
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    my_name = "**agentNode**" 
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


    **model_connection**


    # 도구 없이 LLM 직접 호출
    response = llm_chian.predict( **{ "user_prompt" : user_prompt }  )
    node_input[output_value] = response.content if hasattr(response, 'content') else response

    return_value = node_input.copy()

    # 다음 노드 처리
    next_node_list = node_config.get('next_node', []) 
    return return_next_node(node_name, next_node_list, return_value )
"""  + "\n" + "\n" + "\n"

                bedrock_no_memory_tools = """

    from langchain_aws import ChatBedrockConverse
    
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

"""

                openai_no_memory_tools = """

    from langchain_openai import ChatOpenAI
    
    llm = ChatOpenAI(
        temperature = temperature, 
        max_tokens = max_token, 
        model_name = modelName, 
        api_key = apiKey 
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt
    )
        
"""  

                google_no_memory_tools = """

    from langchain_google_genai import ChatGoogleGenerativeAI
    
    llm = ChatGoogleGenerativeAI(
        model=modelName,
        temperature=temperature,
        max_output_tokens=200,
        google_api_key=apiKey 
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{system_prompt}"),
        ("human", "{user_prompt}")
    ])

    llm_chian = LLMChain(
        llm=llm,
        prompt=prompt
    )
    
"""


                import_ConversationBufferMemory = """from langchain.memory import ConversationBufferMemory
memory = ConversationBufferMemory(return_messages=True)
"""

                bedrock_ConversationBufferMemory = """

    from langchain_aws import ChatBedrockConverse
    
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


"""

                openai_ConversationBufferMemory = """

    from langchain_openai import ChatOpenAI
    
    llm = ChatOpenAI(
        temperature = temperature, 
        max_tokens = max_token, 
        model_name = modelName, 
        api_key = apiKey 
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


"""


                google_ConversationBufferMemory = """

    from langchain_google_genai import ChatGoogleGenerativeAI
    
    llm = ChatGoogleGenerativeAI(
        model=modelName,
        temperature=temperature,
        max_output_tokens=200,
        google_api_key=apiKey 
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


"""


                # create function 
                for node in create_node_json['nodes']:
                    node_name = node['data']['label']
                    if node['type'] == 'startNode':
                        python_code += start_node_code.replace("**startNode**", node_name)
                        
                    elif node['type'] == 'promptNode':
                        python_code += prompt_node_code.replace("**promptNode**", node_name)
                        
                    elif node['type'] == 'mergeNode':
                        python_code += merge_node_code.replace("**mergeNode**", node_name)
                
                    elif node['type'] == 'endNode':
                        python_code += end_node_code.replace("**endNode**", node_name)

                    elif node['type'] == 'functionNode':
                        py_code = node['data']['code']
                        parsed = ast.parse(py_code)
                        func_def = next((node for node in parsed.body if isinstance(node, ast.FunctionDef)), None)
                        function_name = func_def.name            
                        python_code += create_function_node(node_name, py_code, function_name) + "\n" + "\n"

                    elif node['type'] == 'conditionNode':
                        condition_config = []
                        for row in node['data']['config']['conditions']:
                            row['next_node'] = [node_id_to_node_label[row['targetNodeId']]]
                            condition_config.append(row)
                        python_code += create_branch(node_name, condition_config)
                        python_code += create_condition_node(node_name, condition_config)


                    elif node['type'] == 'agentNode': 
                        ############################# 임시 설정 #############################
                        tools = []  #node['data']['config']['tools'] 
                        memory_type = "ConversationBufferMemory"
                        ###################################################################
                        
                        if node['data']['config']['model']['providerName'] == "openai" :
                            if len(tools) == 0 and memory_type == "": 
                                python_code += agent_node_code_base.replace( "**agentNode**", node_name ).replace( "**model_connection**", openai_no_memory_tools )
                            elif len(tools) == 0 and memory_type != "":
                                if memory_type == "ConversationBufferMemory" : 
                                    python_code += import_ConversationBufferMemory
                                    python_code += agent_node_code_base.replace( "**agentNode**", node_name ).replace( "**model_connection**", openai_ConversationBufferMemory )
                                
                                
                                
                        elif node['data']['config']['model']['providerName'] == "aws" :
                            if len(tools) == 0 and memory_type == "": 
                                python_code += agent_node_code_base.replace( "**agentNode**", node_name ).replace( "**model_connection**", bedrock_no_memory_tools )
                            elif len(tools) == 0 and memory_type != "":
                                if memory_type == "ConversationBufferMemory" : 
                                    python_code += import_ConversationBufferMemory
                                    python_code += agent_node_code_base.replace( "**agentNode**", node_name ).replace( "**model_connection**", bedrock_ConversationBufferMemory )
                                
                                
                                
                                
                        elif node['data']['config']['model']['providerName'] == "google" :
                            if len(tools) == 0 and memory_type == "": 
                                python_code += agent_node_code_base.replace( "**agentNode**", node_name ).replace( "**model_connection**", google_no_memory_tools )
                            elif len(tools) == 0 and memory_type != "":
                                if memory_type == "ConversationBufferMemory" : 
                                    python_code += import_ConversationBufferMemory
                                    python_code += agent_node_code_base.replace( "**agentNode**", node_name ).replace( "**model_connection**", google_ConversationBufferMemory )
                                
                    

                # create node  
                python_code += "\ngraph = StateGraph(MyState)\n" 
                tmp_create_node = """graph.add_node("_**tmp_node**", node_**tmp_node**)\n"""
                
                for node in create_node_json['nodes']:
                    node_name = node['data']['label']
                    if node['type'] == 'startNode':
                        python_code += tmp_create_node.replace("**tmp_node**", node_name)
                        
                    elif node['type'] == 'promptNode':
                        python_code += tmp_create_node.replace("**tmp_node**", node_name)
                        
                    elif node['type'] == 'mergeNode':
                        tmp_create_merge_node = """graph.add_node("_**tmp_node**", node_**tmp_node**, defer=True)\n"""
                        python_code += tmp_create_merge_node.replace("**tmp_node**", node_name)
                
                    elif node['type'] == 'endNode':
                        python_code += tmp_create_node.replace("**tmp_node**", node_name)

                    elif node['type'] == 'functionNode':
                        python_code += tmp_create_node.replace("**tmp_node**", node_name)

                    elif node['type'] == 'conditionNode':
                        python_code += tmp_create_node.replace("**tmp_node**", node_name)

                        node_branch = {} 
                        for condition_config in node['data']['config']['conditions']:
                            key = condition_config['description'] 
                            value = "_" + condition_config['targetNodeLabel']
                            node_branch[key] = value
                        node_branch = str(node_branch)
                        python_code += f"""graph.add_conditional_edges("_{node_name}", node_branch_{node_name}, {node_branch}  )"""

                    elif node['type'] == 'agentNode': 
                        python_code += tmp_create_node.replace( "**tmp_node**", node_name ) 

                python_code += "\n"
                
                cnt = 0 
                for node in create_node_json['edges']:
                    source_node_id = node['source']
                    target_node_id = node['target']
                    source_node_name = node_id_to_node_label[source_node_id]['node_name'] 
                    target_node_name = node_id_to_node_label[target_node_id]['node_name'] 
                    if node_id_to_node_label[source_node_id]['node_type'] == 'startNode':
                        if cnt == 0:
                            python_code += """graph.add_edge(START, "_**tmp_node**")\n""".replace("**tmp_node**", source_node_name) 
                            cnt = 1
                        python_code += """graph.add_edge("_**source**", "_**target**")\n""".replace("**source**", source_node_name).replace("**target**", target_node_name)

                    elif node_id_to_node_label[source_node_id]['node_type'] == 'conditionNode':
                        pass
                        
                    else:
                        python_code += """graph.add_edge("_**source**", "_**target**")\n""".replace("**source**", source_node_name).replace("**target**", target_node_name)
                
                for node in create_node_json['edges']:
                    source_node_id = node['source']
                    target_node_id = node['target']
                    source_node_name = node_id_to_node_label[source_node_id]['node_name'] 
                    target_node_name = node_id_to_node_label[target_node_id]['node_name'] 
                   
                    if node_id_to_node_label[target_node_id]['node_type'] == 'endNode':
                        python_code += """graph.add_edge("_**source**", END)\n""".replace("**source**", target_node_name)
                        python_code += """app = graph.compile()"""
                        break

                return python_code

            result = react_to_python_langgraph(create_node_json)
            logger.info("LangGraph code generated successfully")
            return result
            
        except Exception as e:
            error_msg = f"Error generating LangGraph code: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise

    # Memory store for agent nodes
    MEMORY_STORE = {} 