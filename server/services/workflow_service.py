from langchain_core.prompts import PromptTemplate
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_aws import ChatBedrockConverse
from langchain.tools import Tool
from langchain.memory import ConversationBufferMemory
from langchain.agents import create_tool_calling_agent, AgentExecutor

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
from server.services.code_export import templates, utile
from server.services.code_excute import flower_manager
from server.models import workflow
from fastapi import HTTPException




# 로거 설정
logger = logging.getLogger(__name__)
flower_manager = flower_manager.FlowerManager()

def run_bedrock(modelName, temperature, max_token, system_prompt, user_prompt, memory="", tool_info=[]):
    # 도구 없이, 메모리 없이
    llm = ChatBedrockConverse(
            model=modelName,
            temperature=temperature,
            max_tokens=max_token
        )

    if memory == "" and len(tool_info) == 0:
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            ("human", "{user_prompt}")
        ])
       
        llm_chain = LLMChain(llm=llm, prompt=prompt)
        response = llm_chain.predict(user_prompt=user_prompt)
        return response.content if hasattr(response, 'content') else str(response).encode('utf-8', errors='ignore').decode('utf-8')

    # 메모리 있어
    elif memory != "" and len(tool_info) == 0:
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{user_prompt}")
        ])
        
        llm_chain = LLMChain(llm=llm, prompt=prompt, memory=memory)
        response = llm_chain.predict(user_prompt=user_prompt)
        return response.content if hasattr(response, 'content') else str(response).encode('utf-8', errors='ignore').decode('utf-8')

    # 도구 있어
    elif memory == "" and len(tool_info) != 0:
        print("aaa")
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            ("human", "{user_prompt}"),
            ("placeholder", "{agent_scratchpad}"),
        ])

        tools = [WorkflowService.create_tool_from_api(**tool) for tool in tool_info]
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=False)
        response = agent_executor.invoke( {'user_prompt' : user_prompt} )
        
        # 안전한 response 파싱
        try:
            if isinstance(response, dict) and "output" in response:
                output = response["output"]
                if isinstance(output, list) and len(output) > 0:
                    text_content = output[0].get('text', '')
                    if '</thinking>\n\n' in text_content:
                        return text_content.split('</thinking>\n\n')[1]
                    else:
                        return text_content
                else:
                    return str(response)
            else:
                return str(response)
        except Exception as e:
            logger.error(f"Error parsing agent response: {str(e)}")
            return str(response)

    # 도구 있어, 메모리 있어
    elif memory != "" and len(tool_info) != 0:
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}"),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{user_prompt}"),
            ("placeholder", "{agent_scratchpad}"),
        ])

        tools = [WorkflowService.create_tool_from_api(**tool) for tool in tool_info]
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=False)
        response = agent_executor.invoke( {'user_prompt' : user_prompt} )
        
        # 안전한 response 파싱
        try:
            if isinstance(response, dict) and "output" in response:
                output = response["output"]
                if isinstance(output, list) and len(output) > 0:
                    text_content = output[0].get('text', '')
                    if '</thinking>\n\n' in text_content:
                        return text_content.split('</thinking>\n\n')[1]
                    else:
                        return text_content
                else:
                    return str(response)
            else:
                return str(response)
        except Exception as e:
            logger.error(f"Error parsing agent response: {str(e)}")
            return str(response)





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
    def run_chatflow( msg: Dict[str, Any]):
        print( msg )
        flower_id = msg['flower_id']
        input_data = msg['input_data']
        try:
            # flower 로드
            if flower_id not in flower_manager.loaded_flowers : 
                print( "최초 들어오는 값입니다" ) 
                graph = flower_manager.load_flower(flower_id)
            print( flower_manager.loaded_flowers ) 
            print( flower_id ) 
                
            graph = flower_manager.loaded_flowers[flower_id]
            
            # graph 실행
            result = graph.invoke(input_data, {"configurable": {"thread_id": 1}} )
            
            return workflow.FlowerResponse(
                flower_id=flower_id,
                result=result,
                status="success"
            )
        
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")


    @staticmethod
    def chatflow_list():
        flowers = flower_manager.scan_flowers()
        return workflow.FlowerListResponse(available_flowers=flowers)

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

            tool = StructuredTool.from_function(
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


    @staticmethod
    def generate_langgraph_code(create_node_json: Dict[str, Any]) -> str:
        """Generate LangGraph Python code from workflow configuration"""
        try:
            logger.info("Generating LangGraph code")
            logger.info(f"Workflow nodes: {len(create_node_json.get('nodes', []))}")
            logger.info(f"Workflow edges: {len(create_node_json.get('edges', []))}")
            
            def react_to_python_langgraph(create_node_json):

                node_id_to_node_label = utile.init_node_id_to_node_label( create_node_json )
                edge_relation         = utile.init_edge_relation( create_node_json )
                node_config_json      = utile.init_node_config( create_node_json )

                python_code = templates.init_state_code(node_config_json)
                python_code += templates.return_next_node_code()
                
                # create function 
                for node in create_node_json['nodes']:
                    if node['type'] == 'startNode':
                        python_code += templates.start_node_code( node )

                    elif node['type'] == 'promptNode':
                        python_code += templates.prompt_node_code( node )
                        
                    elif node['type'] == 'mergeNode':
                        python_code += templates.merge_node_code( node )
                
                    elif node['type'] == 'endNode':
                        python_code += templates.end_node_code( node )

                    elif node['type'] == 'functionNode':
                        python_code += templates.python_function_node_code( node )

                    elif node['type'] == 'conditionNode':
                        python_code += templates.condition_node_code( node, node_id_to_node_label )

                    elif node['type'] == 'agentNode': 
                        python_code += templates.agent_node_code( node )
                    

                # create node  
                for node in create_node_json['nodes']:
                    if node['type'] == 'startNode':
                        python_code += templates.create_start_node_code( node )
                        
                    elif node['type'] == 'promptNode':
                        python_code += templates.create_node_code( node )
                        
                    elif node['type'] == 'mergeNode':
                        python_code += templates.create_node_code( node )
                
                    elif node['type'] == 'endNode':
                        python_code += templates.create_node_code( node )

                    elif node['type'] == 'functionNode':
                        python_code += templates.create_node_code( node )

                    elif node['type'] == 'conditionNode':
                        python_code += templates.create_condition_node_code( node )

                    elif node['type'] == 'agentNode': 
                        python_code += templates.create_node_code( node )

                python_code += "\n"
                
                # create egde 
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
                        # python_code += """app = graph.compile()"""

                        python_code += """checkpointer = InMemorySaver()\n"""
                        python_code += """app = graph.compile(checkpointer=checkpointer)\n"""
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