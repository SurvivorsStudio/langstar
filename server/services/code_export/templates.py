import re 
import textwrap
import ast
from server.services.code_export import aws_templates



def init_log_code() :
    code = f'''
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
            state = kwargs.get('state', args[0] if args else {{}})
            
            # 입력 데이터 추출 (전체 상태 로깅)
            input_data = {{}}
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
                        input_data[key] = f"<{{type(value).__name__}}>"
            except Exception as e:
                input_data = {{"error": f"Failed to extract input: {{str(e)}}"}}
            
            # 노드 시작 로그 생성
            node_log = {{
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
                "position": {{"x": 0, "y": 0}},
                "metadata": {{
                    "function_name": func.__name__,
                    "module": "generated_code"
                }}
            }}
            
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
                logger.error(f"Failed to save start log: {{str(e)}}")
            
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
                output_data = {{}}
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
                                output_data[key] = f"<{{type(value).__name__}}>"
                    else:
                        output_data = {{"result": str(result)[:2000] + "... (truncated)" if len(str(result)) > 2000 else str(result)}}
                except Exception as e:
                    output_data = {{"error": f"Failed to extract output: {{str(e)}}"}}
                
                # 성공 로그 업데이트
                success_log = {{
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
                    "position": {{"x": 0, "y": 0}},
                    "metadata": {{
                        "function_name": func.__name__,
                        "module": "generated_code"
                    }}
                }}
                
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
                    logger.error(f"Failed to save success log: {{str(e)}}")
                
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
                error_log = {{
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
                    "position": {{"x": 0, "y": 0}},
                    "metadata": {{
                        "function_name": func.__name__,
                        "module": "generated_code"
                    }}
                }}
                
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
                    logger.error(f"Failed to save error log: {{str(save_error)}}")
                
                # 콘솔 로깅
                logger.exception("[" + node_name_display + "] Error in node. Original error: " + str(e))
                logger.error("[" + node_name_display + "] Execution time before error: " + str(duration_ms) + "ms")
                raise # 에러를 다시 발생시켜 LangGraph의 에러 핸들링으로 전달
        
        return wrapper
    return decorator

def return_next_node( my_node, next_node_list, return_value, node_cofing = {{}} ):
    updates = {{}}
    for next_node in next_node_list : 
        next_name = next_node['node_name']
        next_type = next_node['node_type']
        
        # merge node 
        if next_type == 'mergeNode':
            if next_name not in updates:
                updates[next_name] = {{my_node : return_value}}
            else : 
                updates[next_name][my_node] = return_value
        # 일반 노드 
        else : 
            if next_name not in updates:
                updates[next_name] = return_value
                
    updates = updates | node_cofing 
                
    return updates

    '''
    return code 


# create_state 
def init_state_code( config_json ) : 
    code_lines = []
    for config_token in config_json:
        for config_key, config_val in config_token.items():
            if '__annotated__' in config_val:
                code_token = "    {0} :Annotated[dict, operator.or_] = ".format(config_key) + "{}"
            else:
                if 'node_type' in config_val:
                    if config_val['node_type'] == 'promptNode':
                        del config_val['config']['template'] 
                    elif config_val['node_type'] == 'functionNode':
                        del config_val['config']['code'] 
                    elif config_val['node_type'] == 'userNode':
                        del config_val['config']['code'] 
                    #     del config_val['data']['code']
                        
                code_token = "    {0} :dict = {1}".format(config_key, str(config_val))
                
            code_lines.append(code_token)
    code_lines = "\n".join(code_lines) + "\n"

    code = f"""
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

{init_log_code()}

class MyState(BaseModel):
    response:dict = {{}}
{code_lines}
"""
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

    prompt_template = node['data']['config']['template']



    code = """
import re

def render_prompt(prompt: str, context: dict, show_error: bool = False) -> str:
    def replacer(match):
        expr = match.group(1).strip()
        try:
            return str(eval(expr, {}, context))
        except Exception as e:
            return f"<ERROR: {e}>" if show_error else "{{" + expr + "}}"

    return re.sub(r"\{\{(.*?)\}\}", replacer, prompt)

"""

    code += f"""

@log_node_execution("{node_id}", "{node_name}", "{node_type}")
def node_{node_name}(state):
    my_name = "{node_name}" 
    node_name = my_name
    node_config_key = my_name + "_Config"

    # 사용자에게 전달 받은 값과 설정값을 가지고 온다. 
    state_dict  = state.model_dump()
    node_input  = state_dict[my_name] 
    node_config = state_dict[node_config_key]

    prompt_template = '''{prompt_template}'''
    
    # prompt 생성 

    prompt = render_prompt(prompt_template, node_input)

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
                        
    # 다음 노드에 전달하는 값 
    return_value = {{}} 
    for key, value  in node_config['config'].items():
        match_node  = value['node_name'] 
        match_value = value['node_value'] 
        return_value[key]  = node_input[match_node][match_value]

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
def condition_sub1_node_code(function_name, condition_config, node_id, node_name, node_type):
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
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
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
def condition_sub2_node_code (function_name, condition_config, node_id, node_name, node_type):
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
@log_node_execution("{node_id}", "{node_name}", "{node_type}")
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
    node_id = node['id']
    node_type = node['type']
    condition_config = []
    for row in node['data']['config']['conditions']:
        row['next_node'] = [node_id_to_node_label[row['targetNodeId']]]
        condition_config.append(row)
    code = ""
    # code += condition_sub1_node_code(node_name, condition_config)
    # code += condition_sub2_node_code(node_name, condition_config)
    code += condition_sub1_node_code(node_name, condition_config, node_id, node_name, node_type)
    code += condition_sub2_node_code(node_name, condition_config, node_id, node_name, node_type)
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
    # print( node )
    provider = node['data']['config']['model']['providerName'] 
    # tools = node['data']['config']['tools'] 
    tools = (
    node.get('data', {})
        .get('config', {})
        .get('tools', [])
    )
        
    # memory_type = node['data']['config']['memoryGroup']['memoryType']
    memory_type = (
    node.get('data', {})
        .get('config', {})
        .get('memoryGroup', {})
        .get('memoryType', '')
    )

    print("-------------------*******************")
    print( provider )
    print( memory_type )
    print( tools )
    if provider == "aws": 
        if memory_type =="" and len(tools) == 0: 
            return aws_templates.base_base_agent_code( node )
        elif memory_type !="" and len(tools) == 0: 
            print ("??????????????????")
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



def user_node_code( node ) : 
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
    input_param = state_dict[ node_name ] 

    node_parameters = state_dict[node_config_key]['parameters']
    output_value    = state_dict[node_config_key]['outputVariable']

    func_args = {{}}
    for row in node_parameters:
        tmp_func_args = row['funcArgs']
        tmp_match_data = row['matchData']
        # func_args[tmp_func_args] = input_param[tmp_match_data]

        
        if row['inputType'] == 'select box':
            tmp_data = eval(tmp_match_data, {{}}, input_param)
        elif row['inputType'] == 'text box':
            tmp_data = row['matchData']
        elif row['inputType'] == 'checkbox':
            tmp_data = row['matchData']
        elif row['inputType'] == 'radio button':
            tmp_data = row['matchData']
        else : 
            tmp_data = ''

        func_args[row['funcArgs']] = tmp_data 




    user_result = {function_name}( **func_args ) 

    return_value = input_param.copy() 
    return_value.update( {{ output_value : user_result }} ) 
    
    node_config = state_dict[node_config_key]

    return_config = {{ node_config_key : state_dict[node_config_key] }}    
    next_node_list = node_config.get('next_node', []) 

    return return_next_node( node_name, next_node_list, return_value, return_config ) 


"""
    return code 


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


