import re 
import textwrap
import ast
from server.services.code_export import aws_templates

# create_state 
def init_state_code( config_json ) : 
    code_lines = []
    for config_token in config_json:
        for config_key, config_val in config_token.items():
            if '__annotated__' in config_val:
                code_token = "    {0} :Annotated[dict, operator.or_] = ".format(config_key) + "{}"
            else:
                code_token = "    {0} :dict = {1}".format(config_key, str(config_val))
            code_lines.append(code_token)
    code_lines = "\n".join(code_lines) + "\n"

    code = f'''
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
            state: Dict[str, Any] = kwargs.get('state', args[0] if args else {{}})
            
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
    response:dict = {{}}
{code_lines}
'''
    return code 

# return_next_node
def return_next_node_code():
    code = """
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
"""
    return code 

# start_node_code
def start_node_code(node) :
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    code = f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}(state):
    node_label = "{node_name}" # 노드 레이블을 직접 사용

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다.
    state_dict = state.model_dump()
    
    # 딕셔너리 키 접근 시 .get() 메서드를 사용하여 안전성 확보
    node_input = state_dict.get(node_label, {{}}) # 키가 없으면 빈 딕셔너리 반환
    
    node_config_key = f"{{node_label}}_Config"
    full_node_config_data = state_dict.get(node_config_key, {{}}) # 전체 설정 데이터
    node_config = full_node_config_data.get('config', {{}}) # 'config' 키의 실제 설정값

    # 다음 노드에 전달하는 값
    # f-string 내 딕셔너리 리터럴은 중괄호를 두 번({{ }}) 사용해야 합니다.
    return_value = {{ **node_config, **node_input }}
    
    # 전달하고자 하는 타겟 node 리스트
    next_node_list = full_node_config_data.get('next_node', [])
    
    return_config = {{ node_config_key : state_dict[node_config_key] }}
    return return_next_node(node_label, next_node_list, return_value, return_config)
"""
    return code

def prompt_node_code( node ) : 
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    code = f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}(state):
    my_name = "{node_name}" 
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
    return_value.update( {{ output_value : prompt }} ) 

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = {{ node_config_key : state_dict[node_config_key] }}
    return return_next_node( node_name, next_node_list, return_value, return_config ) 
"""
    return code 

def merge_node_code( node ) : 
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    code = f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}(state):
    my_name = "{node_name}" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]
    
    # merge 노드 처리
    merged_data = {{}}
    for key, value in node_input.items():
        if isinstance(value, dict):
            merged_data.update(value)
        else:
            merged_data[key] = value
    
    # 다음 노드에 전달하는 값 
    return_value = merged_data

    # 전달하고자 하는 타겟 node 리스트 
    next_node_list = node_config.get('next_node', []) 

    return_config = {{ node_config_key : state_dict[node_config_key] }}
    return return_next_node( node_name, next_node_list, return_value, return_config )   
"""
    return code 

def end_node_code( node ) : 
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    code = f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}( state ) : 
    my_name = "{node_name}" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]['config']['receiveKey']

    # 다음 노드에 전달하는 값 
    return_value = {{}} 
    if len(node_config) == 1 and node_config[0] == '': 
        return_value = node_input
    else : 
        for key in node_config: 
            return_value[key] = node_input[key] 

    # 결과값 전달
    return_config = {{ node_config_key : state_dict[node_config_key] }}

    next_node_list = [ {{'node_name': 'response', 'node_type': 'responseNode'}} ]
    return return_next_node( node_name, next_node_list, return_value, return_config )   
    """
    return code 

# create_branch
def condition_sub1_node_code(function_name, condition_config):
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

# create_condition_node
def condition_sub2_node_code (function_name, condition_config):
    tmp_function_name = "tmp_" + function_name
    tmp_param = re.search(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\[", condition_config[0]['condition'])
    tmp_param = tmp_param.group(1)

    code = f"def {tmp_function_name}({tmp_param}) :"
    for row in condition_config:
        condition = row['condition']
        next_node_list = row['next_node']
        code += f"""
    {condition} : 
        return return_next_node( node_name, {next_node_list}, {tmp_param}, {{ node_config_key : state_dict[node_config_key] }} ) 
"""

    indented_code = textwrap.indent(code, "    ")
    
    function_node_code = f"""
def node_{function_name}(state):
    my_name = "{function_name}"
    node_name = my_name
    node_config_key = my_name + "_Config"
    state_dict  = state.model_dump()

{indented_code}

    # 함수 실행
    input_param = state_dict[node_name] 
    return {tmp_function_name}( input_param ) 
    
"""
    return function_node_code

def condition_node_code( node, node_id_to_node_label ) :
    node_name = node['data']['label']
    condition_config = node['data']['config']['conditions']
    
    code = condition_sub1_node_code( node_name, condition_config )
    code += condition_sub2_node_code( node_name, condition_config )
    
    return code

# create_function_node
def python_function_node_code( node ):
    node_name = node['data']['label']
    node_id = node['id']
    node_type = node['type']
    py_code = node['data']['code']
    parsed = ast.parse(py_code)
    func_def = next((node for node in parsed.body if isinstance(node, ast.FunctionDef)), None)
    function_name = func_def.name     

    indented_code = textwrap.indent(py_code, "    ")
    code = f"""
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}(state):
    my_name = "{node_name}"
    node_name = my_name
    node_config_key = my_name + "_Config"

    state_dict  = state.model_dump()

{indented_code}

    # 함수 실행
    input_param = state_dict[node_name ] 
    result = {function_name}( input_param ) 
    
    node_config = state_dict[node_config_key]

    return_config = {{ node_config_key : state_dict[node_config_key] }}    
    next_node_list = node_config.get('next_node', []) 

    return return_next_node( node_name, next_node_list, result, return_config ) 

"""
    return code 

def agent_node_code( node ):
    print( node )
    provider = node['data']['config']['model']['providerName'] 
    # tools = node['data']['config']['tools'] 
    tools = (
    node.get('data', {})
        .get('config', {})
        .get('tools', [])
    )
        
    # memory_type = node['data']['config']['memoryGroup']['memoryType']
    memory_group = (
    node.get('data', {})
        .get('config', {})
        .get('memoryGroup', {})
    )
    
    memory_type = ''
    if isinstance(memory_group, dict) and memory_group.get('memoryType'):
        memory_type = memory_group.get('memoryType', '')

    if provider == "aws": 
        if memory_type =="" and len(tools) == 0: 
            return aws_templates.base_base_agent_code( node )
        elif memory_type !="" and len(tools) == 0: 
            return aws_templates.memory_base_agent_code( node )
        elif memory_type =="" and len(tools) != 0: 
            return aws_templates.base_tool_agent_code( node )
        elif memory_type !="" and len(tools) != 0: 
            return aws_templates.memory_tool_agent_code( node )
    else : 
        if memory_type =="" and len(tools) == 0: 
            return aws_templates.base_base_agent_code( node )
        elif memory_type !="" and len(tools) == 0: 
            return aws_templates.memory_base_agent_code( node )
        elif memory_type =="" and len(tools) != 0: 
            return aws_templates.base_tool_agent_code( node )
        elif memory_type !="" and len(tools) != 0: 
            return aws_templates.memory_tool_agent_code( node )

def create_start_node_code( node ) : 
    node_name = node['data']['label']
    return f"""
graph = StateGraph(MyState)
graph.add_node("_{node_name}", node_{node_name})
"""

def create_node_code( node ) : 
    node_name = node['data']['label']
    return f"""graph.add_node("_{node_name}", node_{node_name})
"""

def create_condition_node_code( node ) : 
    node_name = node['data']['label']
    code = create_node_code( node )
    node_branch = {} 
    for condition_config in node['data']['config']['conditions']:
        key = condition_config['description'] 
        value = "_" + condition_config['targetNodeLabel']
        node_branch[key] = value
    node_branch = str(node_branch)
    code += f"""graph.add_conditional_edges("_{node_name}", node_branch_{node_name}, {node_branch}  )
"""
    return code 