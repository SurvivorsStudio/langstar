

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel
from typing import Dict, Any
import datetime

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

# 실제 호출 엔드포인트
@app.post('/workflow/node/agentnode')
def agent_node(msg: dict = Body(...)):  # msg를 dict로 받음
    print( "node start : ", datetime.datetime.now() ) 
    print( msg )

    
    model_id = msg['model'] 
    system_prompt =  msg['system_prompt'] 
    user_prompt = msg['user_prompt'] 
    return_key = msg['return_key']
    tools_data = msg['tools']
    tools = [create_tool_from_api(**tool_info) for tool_info in tools_data]

    if len(system_prompt) == 0 : 
        system_prompt = "당신은 AI 도우미입니다" 

    # 모델 설정
    llm = ChatBedrockConverse(
        model="us.amazon.nova-pro-v1:0", 
        temperature=0.1,
        max_tokens=1000
    )

    # 메모리가 있는 경우 
    if len(memory_type) > 0 : 
        memory_group_name = msg['memory_group_name']
        chat_id           = msg['chat_id']
        memory_type       = msg['memory_type']
        
        if memory_type == "ConversationBufferMemory" : 
            if (chat_id not in MEMORY_STORE) : 
                memory = ConversationBufferMemory(memory_key=memory_group_name, return_messages=True)
                MEMORY_STORE[chat_id] = { memory_group_name : memory } 
            elif (chat_id in MEMORY_STORE) : 
                if memory_group_name not in MEMORY_STORE[chat_id] : 
                    MEMORY_STORE[chat_id][memory_group_name] = memory 
                    

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{system_prompt}
            이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요.
            """),
            MessagesPlaceholder(variable_name=memory_group_name),
            ("human", "{input}"),            
            MessagesPlaceholder(variable_name="agent_scratchpad")  # 필수 변수
        ])
        
        agent = create_openai_tools_agent(llm, tools, MEMORY_STORE[chat_id][memory_group_name], prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        result = agent_executor.invoke({"input": user_prompt})

        

    # 메모리가 없는 경우 
    else : 
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{system_prompt}
            이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요.
            """),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")  # 필수 변수
        ])

        agent = create_openai_tools_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        result = agent_executor.invoke({"input": user_prompt})

    print( "node end : ", datetime.datetime.now() ) 
        
        
    return result['output'][0]['text']





# 📌 메모리 저장소와 TTL
# user_memories: Dict[str, Tuple[AgentExecutor, datetime]] = {}
# MEMORY_TTL = timedelta(minutes=30)

# # 📌 요청 스키마
# class ChatRequest(BaseModel):
#     model: str
#     system_prompt: str
#     user_prompt: str
#     memory_group: str
#     memory_group_name: str
#     tools: Optional[List[dict]] = []  # tools가 빈 리스트일 수 있으므로 Optional로 처리
#     memory_type: str
#     return_key: str
#     chat_id: Optional[str] = None  # 요청에 없을 수도 있으므로 Optional 처리

# class ResetRequest(BaseModel):
#     memory_group: str
#     chat_id: str

# # 📌 오래된 메모리 정리 함수
# def clean_expired_memories():
#     now = datetime.utcnow()
#     expired = [k for k, (_, ts) in user_memories.items() if now - ts > MEMORY_TTL]
#     for k in expired:
#         del user_memories[k]

# # 📌 1분마다 실행되는 자동 정리 작업
# # @app.on_event("startup")
# # @repeat_every(seconds=60)
# def remove_stale_memories_task():
#     clean_expired_memories()

# # 📌 에이전트 생성 함수
# def create_agent_executor(tools, format_instructions, memory_group_name):
#     memory = ConversationBufferMemory(
#         memory_key="chat_history",
#         return_messages=True
#     )

#     #     if system_prompt is not None:
# #         prompt = ChatPromptTemplate.from_messages([
# #             ("system", f"""{system_prompt}
# #             이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요.
# #             """),
# #             ("human", "{input}"),
# #             MessagesPlaceholder(variable_name="agent_scratchpad")  # 필수 변수
# #         ])

#     prompt = ChatPromptTemplate.from_messages([
#         ("system", f"""
#         당신은 질문에 답변하는 도우미입니다.

#         사용 가능한 도구:
#         {{tools}}


#         이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요.
#         """),
#         MessagesPlaceholder(variable_name="chat_history"),
#         ("human", "{input}"),
#         MessagesPlaceholder(variable_name="agent_scratchpad")
#     ])

#     llm = ChatBedrockConverse(
#         model="us.amazon.nova-pro-v1:0",
#         temperature=0.1,
#         max_tokens=1000,
#     )

#     agent = create_openai_tools_agent(
#         llm,
#         tools,
#         prompt.partial(
#             format_instructions=format_instructions,
#             tools="\n".join([f"- {tool['name']}: {tool['description']}" for tool in tools]) if tools else "없음"
#         )
#     )

#     return AgentExecutor(
#         agent=agent,
#         tools=tools,
#         memory=memory,
#         verbose=True
#     )

# # ✅ 에이전트 요청 API 경로 변경됨
# @app.post("/workflow/node/agentnode")
# async def agent_node_endpoint(request: ChatRequest):
#     # clean_expired_memories()

#     print( request ) 
#     key = f"{request.memory_group}|{request.chat_id}"

#     if key not in user_memories:
#         executor = create_agent_executor(request.tools, '{"answer": "<여기에 답변을 작성하세요>"}', request.memory_group_name)
#         user_memories[key] = (executor, datetime.utcnow())
#     else:
#         executor, _ = user_memories[key]
#         user_memories[key] = (executor, datetime.utcnow())  # 업데이트

#     result = await executor.ainvoke({"input": request.user_prompt})
#     print( "수정 필요 : ", result ) 
#     return result['output'][0]['text']
# import datetime
# from fastapi.responses import JSONResponse
# # 메모리 저장소: {memory_group: {"memory": ..., "last_used": datetime}}
# MEMORY_STORE: Dict[str, Dict] = {}

# # ✅ 실제 호출 엔드포인트

# # ✅ 실제 호출 엔드포인트
# @app.post('/workflow/node/agentnode')
# def agent_node(msg: dict = Body(...)):
#     print("📥 Node start:", datetime.datetime.now())
#     print("Payload:", msg)

#     # 요청 파라미터 추출
#     chat_id = msg['chat_id']
#     memory_group = msg['memory_group']
#     memory_group_name = msg['memory_group_name']
#     model_id = msg['model']
#     system_prompt = msg['system_prompt']
#     user_prompt = msg['user_prompt']
#     return_key = msg['return_key']
#     tools_data = msg.get('tools', [])
#     memory_type = msg.get('memory_type', 'ConversationBufferMemory')

#     # 메모리 조회 또는 생성
#     if chat_id not in MEMORY_STORE:
#         MEMORY_STORE[chat_id] = {}

#     if memory_group_name not in MEMORY_STORE[chat_id]:
#         if memory_type == "ConversationBufferMemory":
#             memory = ConversationBufferMemory(
#                 return_messages=True,
#                 memory_key="chat_history"
#             )
#         else:
#             return JSONResponse(status_code=400, content={"error": "지원하지 않는 memory_type"})

#         MEMORY_STORE[chat_id][memory_group_name] = {
#             "memory": memory,
#             "last_used": datetime.datetime.now(),
#             "group": memory_group,
#         }
#     else:
#         memory = MEMORY_STORE[chat_id][memory_group_name]["memory"]
#         MEMORY_STORE[chat_id][memory_group_name]["last_used"] = datetime.datetime.now()

#     # 도구 준비
#     tools = [create_tool_from_api(**tool_info) for tool_info in tools_data]

#     # 모델 설정
#     llm = ChatBedrockConverse(
#         model="us.amazon.nova-pro-v1:0",
#         temperature=0.1,
#         max_tokens=1000
#     )

#     # 프롬프트 정의
#     prompt = ChatPromptTemplate.from_messages([
#         ("system", f"""{system_prompt}
# 이전 대화 내용을 참고하여 사용자의 질문에 맥락에 맞게 답변하세요."""),
#         MessagesPlaceholder(variable_name="chat_history"),
#         ("human", "{input}"),
#         MessagesPlaceholder(variable_name="agent_scratchpad")
#     ])

#     # 에이전트 구성
#     agent = create_openai_tools_agent(llm, tools, prompt)
#     agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory, verbose=True)

#     # 실행
#     try:
#         result = agent_executor.invoke({"input": user_prompt})
#         raw_output = result.get(return_key)
#         parsed_output = json.loads(raw_output) if isinstance(raw_output, str) else {"answer": raw_output}
#     except Exception as e:
#         return JSONResponse(status_code=500, content={"error": str(e)})

#     print("✅ Node end:", datetime.datetime.now())
    
#     print(  MEMORY_STORE[chat_id][memory_group_name] ) 

#     # 응답 포맷 변경
#     return result['output'][0]['text']
