from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel
from typing import Dict, Any
import datetime
import uuid
import ast
import signal
import sys
import os
from contextlib import asynccontextmanager
import logging

# 커스텀 로거 설정
class ColoredFormatter(logging.Formatter):
    """에러 시 색상을 변경하는 커스텀 포매터"""
    
    COLORS = {
        'ERROR': '\033[91m',    # 빨간색
        'WARNING': '\033[93m',  # 노란색
        'INFO': '\033[92m',     # 초록색
        'DEBUG': '\033[94m',    # 파란색
        'RESET': '\033[0m'      # 리셋
    }
    
    def format(self, record):
        # 에러 레벨에 따라 색상 적용
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        record.levelname = f"{color}{record.levelname}{self.COLORS['RESET']}"
        return super().format(record)

# 로거 설정
logger = logging.getLogger("uvicorn")
handler = logging.StreamHandler()
handler.setFormatter(ColoredFormatter('%(levelname)s: %(message)s'))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

app = FastAPI()

# 안전한 종료를 위한 시그널 핸들러
def signal_handler(signum, frame):
    print("\n" + "="*50)
    print("Shutting down server safely...")
    print("="*50)
    # sys.exit(0) 대신 os._exit(0) 사용하여 깔끔하게 종료
    os._exit(0)

# SIGINT (Ctrl+C)와 SIGTERM 시그널 등록
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 앱 시작 시 즉시 실행되는 메시지
sys.stdout.write("\n" + "="*60 + "\n")
sys.stdout.write("LangStar server has started!\n")
sys.stdout.write("="*60 + "\n\n")
sys.stdout.flush()

class PromptNodeInput(BaseModel):
    prompt: str
    param: Dict[str, Any]
    return_key: str
    

@app.post('/workflow/node/promptnode')
def prompt_node(data: PromptNodeInput):
    print( data ) 
    template = PromptTemplate(
        template=data.prompt,
        input_variables=list(data.param.keys())
    )
    rendered = template.format(**data.param)
    data.param[data.return_key] = rendered
    print( data.param )
    return data.param

@app.post('/workflow/node/pythonnode')
def prompt_node(msg: dict = Body(...)): 
    python_code = msg['py_code'] 
    param = msg.get("param", {})
    
    parsed = ast.parse(python_code)
    func_def = next((node for node in parsed.body if isinstance(node, ast.FunctionDef)), None)
    
    if not func_def:
        return {"error": "No function found in python_code."}

    # 함수 이름 
    function_name = func_def.name
    # 인풋 리스트 ( 향후 사용 ) 
    # param_names = [arg.arg for arg in func_def.args.args]

    exec_globals = {}
    
    try:
        # 사용자 코드를 실행하여 함수 정의
        exec(python_code, exec_globals)
        func = exec_globals[function_name]
       
        result = func(param)
        return result
    
    except Exception as e:
        return {"error": str(e)}
    

@app.post('/workflow/node/startnode')
def start_node(msg: dict = Body(...)):  # msg를 dict로 받음
    print(msg) 
    result = {}
    for row in msg["variables"] : 
        result[row['variableName']] = row['defaultValue']
    
    return result


##########################################################

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_aws import ChatBedrockConverse

from langchain.tools import Tool
import types

from typing import Dict, Tuple
from datetime import datetime, timedelta
from typing import List, Optional
from langchain.memory import ConversationBufferMemory


### string을 툴로 변환하는 함수 
def create_tool_from_api(tool_name: str, tool_description: str, tool_code: str) -> Tool:
    """
    문자열로 전달된 Python 함수 코드와 이름, 설명으로 LangChain Tool 객체를 생성
    """

    # 안전한 네임스페이스 생성
    tool_namespace = {}

    try:
        # 전달받은 코드 실행
        exec(tool_code, tool_namespace)
    except Exception as e:
        raise ValueError(f"코드 실행 실패: {e}")

    # 함수 객체 추출 (가정: 함수가 하나만 존재)
    tool_func = None
    for v in tool_namespace.values():
        if isinstance(v, types.FunctionType):
            tool_func = v
            break

    if not tool_func:
        raise ValueError("제공된 코드에서 함수 객체를 찾을 수 없습니다.")

    # Tool 객체 생성
    return Tool.from_function(
        name=tool_name,
        description=tool_description,
        func=tool_func
    )



# 입력 모델 정의
class AgentNodeInput(BaseModel):
    input: str
    return_key: str


MEMORY_STORE = {}

@app.post('/workflow/node/agentnode')
def agent_node(msg: dict = Body(...)):
    print(msg)
    model_id = msg['model']
    system_prompt = msg.get('system_prompt', "당신은 AI 도우미입니다")
    user_prompt = msg['user_prompt']
    return_key = msg['return_key']
    tools_data = msg['tools']
    tools = [create_tool_from_api(**tool_info) for tool_info in tools_data]
    memory_type = msg.get('memory_type', "")
    
    llm = ChatBedrockConverse(
        model="us.amazon.nova-pro-v1:0",
        temperature=0.1,
        max_tokens=1000
    )
    
    if memory_type:
        memory_group_name = msg['memory_group_name']
        chat_id = msg.get('chat_id', str(uuid.uuid1()))
        
        # Initialize memory if not exists
        if memory_type == "ConversationBufferMemory":
            if chat_id not in MEMORY_STORE:
                memory = ConversationBufferMemory(memory_key=memory_group_name, return_messages=True)
                MEMORY_STORE[chat_id] = {memory_group_name: memory}
            elif memory_group_name not in MEMORY_STORE[chat_id]:
                memory = ConversationBufferMemory(memory_key=memory_group_name, return_messages=True)
                MEMORY_STORE[chat_id][memory_group_name] = memory
        
        memory = MEMORY_STORE[chat_id][memory_group_name]
        
        # Create prompt with memory placeholder
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}\n이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요."),
            MessagesPlaceholder(variable_name=memory_group_name),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        # Create agent with prompt only (no memory parameter)
        agent = create_openai_tools_agent(llm, tools, prompt)
        
        # Create agent executor with memory
        agent_executor = AgentExecutor(
            agent=agent, 
            tools=tools, 
            memory=memory,  # Memory goes here in AgentExecutor
            verbose=True
        )
        
        try:
            result = agent_executor.invoke({"input": user_prompt})
            return  result['output'][0]['text']
        except Exception as e:
            return {"error": str(e)}
    
    else:
        # No memory case
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{system_prompt}\n이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요."),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        # Create agent without memory
        agent = create_openai_tools_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        
        try:
            result = agent_executor.invoke({"input": user_prompt})
            return result['output'][0]['text']
        except Exception as e:
            return {"error": str(e)}



#####################################
import textwrap
import ast 

def create_state(config_json) : 
    code_lines = [
        "from pydantic import BaseModel",
        "from typing import Annotated",
        "import operator",
        "from langchain_core.prompts import PromptTemplate",
        "from langgraph.graph import StateGraph, START, END",
        "",
        "class MyState(BaseModel):",
        "    response:dict = {}"
    ]

    
    for config_token in config_json : 
        
        for config_key, config_val in config_token.items() : 
            # print( config_val ) 
            if '__annotated__' in config_val :
                # print( config_val ) 
                code_token = "    {0} :Annotated[dict, operator.or_] = ".format( config_key ) + "{}"
            else : 
                code_token = "    {0} :dict = {1}".format( config_key, str(config_val ) ) 
            
            code_lines.append( code_token ) 
    return "\n".join( code_lines ) 



def create_function_node(function_name, py_code, func_exec):
    # 함수 내부용 코드 블록을 올바르게 들여쓰기 처리
    indented_code = textwrap.indent(py_code, "    ")

    # 전체 함수 코드 구성
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
        
    

def react_to_python_langgraph(create_node_json) : 
    # node id to name 
    node_id_to_node_label = {}
    for node in create_node_json['nodes'] : 
        node_id    = node['id']
        node_type  = node['type']
        node_label = node['data']['label']
        
        node_id_to_node_label[node_id] = { 'node_name' : node_label, 'node_type' : node_type } 
    
    
    # node relation 
    edge_relation = {}
    for edge in create_node_json['edges'] : 
        source = edge['source'] 
        target = edge['target'] 
    
        source_node_name = node_id_to_node_label[source]['node_name']
        target_node_name = node_id_to_node_label[target]['node_name']
        target_node_type = node_id_to_node_label[target]['node_type']
        
        if source_node_name not in edge_relation: 
            edge_relation[source_node_name]= [ { 'node_name' :  target_node_name, 'node_type' : target_node_type }  ]
        else : 
            edge_relation[source_node_name].append( { 'node_name' :  target_node_name, 'node_type' : target_node_type   } ) 
    
    
    # create config 
    result = []
    for node in create_node_json['nodes'] : 
        if node['type'] == 'startNode': 
            node_id   = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            node_config = node['data']['config']['variables']
            
            temp_config = {} 
            
            config_dict = {} 
            for token_config in node_config : 
                config_dict.update( { token_config['name'] : token_config['defaultValue'] } )
    
            # 데이터 엮어주기 
            config_id = node_name + "_Config"
            temp_config[config_id]              = { 'config' : config_dict } 
            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name
    
            
            result.append( temp_config.copy() )
            result.append( {node_name : {}} ) 
            
        elif node['type'] == 'promptNode': 
            node_id   = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            template = node['data']['config']['template']
            outputVariable = node['data']['config']['outputVariable']
    
            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id]              = { 'config' : {'template' : template} } 
            temp_config[config_id]['outputVariable'] = outputVariable
            temp_config[config_id]['node_type']      = node_type
            temp_config[config_id]['next_node']      = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name
    
            
            result.append( temp_config.copy() )
            result.append( {node_name : {}} ) 
            
        elif node['type'] == 'mergeNode': 
            node_id   = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            
            mergeMappings = node['data']['config']['mergeMappings']

            config_dict = {} 
            for return_style in mergeMappings : 
                output_value      = return_style['outputKey'] 
                source_node       = return_style['sourceNodeId'] 
                source_node_value = return_style['sourceNodeKey'] 
                
                source_node_name = node_id_to_node_label[source_node]['node_name']
                config_dict[output_value] = { 'node_name' : source_node_name , 'node_value' : source_node_value } 


            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id]                   = { 'config' : config_dict } 
            temp_config[config_id]['node_type']      = node_type
            temp_config[config_id]['next_node']      = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            result.append( temp_config.copy() )
            result.append( {node_name : {"__annotated__": True}} )
    
        elif node['type'] == 'endNode': 
            node_id   = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            outputVariable = node['data']['config']
    
            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id] = { 'config' : { 'receiveKey' : [ outputVariable['receiveKey'] ] } }
    
            result.append( temp_config.copy() )
            result.append( {node_name : {}} )       

        elif node['type'] == 'functionNode': 
            node_id   = node['id']
            node_type = node['type']
            node_name = node['data']['label']
            python_conde = node['data']['code']
            
            temp_config = {}
            config_id = node_name + "_Config"
            temp_config[config_id]              = { 'config' : {'code' : python_conde} } 
            temp_config[config_id]['node_type'] = node_type
            temp_config[config_id]['next_node'] = edge_relation[node_name]
            temp_config[config_id]['node_name'] = node_name

            
            result.append( temp_config.copy() )
            result.append( {node_name : {}} ) 


    python_code = class_state = create_state(result)
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
"""  + "\n" + "\n" + "\n"
    
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
"""  + "\n" + "\n" + "\n"
    
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
"""  + "\n" + "\n" + "\n"
    
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
"""  + "\n" + "\n" + "\n"
    
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

    
    # create function 
    for node in create_node_json['nodes'] : 
        node_name = node['data']['label']
        if node['type'] == 'startNode': 
            python_code += start_node_code.replace( "**startNode**", node_name ) 
            
        elif node['type'] == 'promptNode': 
            python_code += prompt_node_code.replace( "**promptNode**", node_name ) 
            
        elif node['type'] == 'mergeNode': 
            python_code += merge_node_code.replace( "**mergeNode**", node_name ) 
    
        elif node['type'] == 'endNode': 
            python_code += end_node_code.replace( "**endNode**", node_name ) 

        elif node['type'] == 'functionNode': 
            py_code   = node['data']['code']
            parsed = ast.parse(py_code)
            func_def = next((node for node in parsed.body if isinstance(node, ast.FunctionDef)), None)
            function_name = func_def.name            
            python_code += create_function_node(node_name, py_code, function_name) + "\n" + "\n"
        


    
    # create node  
    python_code += "\ngraph = StateGraph(MyState)\n" 
    tmp_create_node = """graph.add_node("_**tmp_node**", node_**tmp_node**)\n"""
    
    for node in create_node_json['nodes'] : 
        node_name = node['data']['label']
        if node['type'] == 'startNode': 
            python_code += tmp_create_node.replace( "**tmp_node**", node_name ) 
            
        elif node['type'] == 'promptNode': 
            python_code += tmp_create_node.replace( "**tmp_node**", node_name ) 
            
        elif node['type'] == 'mergeNode': 
            tmp_create_merge_node = """graph.add_node("_**tmp_node**", node_**tmp_node**, defer=True)\n"""
            python_code += tmp_create_merge_node.replace( "**tmp_node**", node_name ) 
    
        elif node['type'] == 'endNode': 
            python_code += tmp_create_node.replace( "**tmp_node**", node_name ) 

        elif node['type'] == 'functionNode': 
            python_code += tmp_create_node.replace( "**tmp_node**", node_name ) 


    python_code += "\n"
    
    cnt = 0 
    for node in create_node_json['edges'] : 
        source_node_id = node['source']
        target_node_id = node['target']
        source_node_name = node_id_to_node_label[source_node_id]['node_name'] 
        target_node_name = node_id_to_node_label[target_node_id]['node_name'] 
        if node_id_to_node_label[source_node_id]['node_type'] == 'startNode' : 
            if cnt == 0 : 
                python_code += """graph.add_edge(START, "_**tmp_node**")\n""".replace( "**tmp_node**", source_node_name) 
                cnt = 1
            python_code += """graph.add_edge("_**source**", "_**target**")\n""".replace( "**source**", source_node_name ).replace( "**target**", target_node_name) 
            
        else : 
            python_code += """graph.add_edge("_**source**", "_**target**")\n""".replace( "**source**", source_node_name ).replace( "**target**", target_node_name) 
    
    
    for node in create_node_json['edges'] : 
        source_node_id = node['source']
        target_node_id = node['target']
        source_node_name = node_id_to_node_label[source_node_id]['node_name'] 
        target_node_name = node_id_to_node_label[target_node_id]['node_name'] 
       
        if node_id_to_node_label[target_node_id]['node_type'] == 'endNode' : 
            python_code += """graph.add_edge("_**source**", END)\n""".replace( "**source**", target_node_name )
            python_code += """app = graph.compile()"""
            break 
    


    return python_code 
    

    

    




@app.post('/workflow/export/python/langgraph')
def react_to_python(msg: dict = Body(...)):
    return {"langgraph" : react_to_python_langgraph(msg)}


