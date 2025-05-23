

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel
from typing import Dict, Any
import datetime
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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



