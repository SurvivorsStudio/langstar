from pydantic import BaseModel
from typing import Annotated
import operator
from langchain_core.prompts import PromptTemplate
from langgraph.graph import StateGraph, START, END
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_aws import ChatBedrockConverse
from langchain.memory import ConversationBufferMemory

class MyState(BaseModel):
    response:dict = {}
    Start_Config :dict = {'config': {'aa': '당신은 ai 도우미 입니다. ', 'bb': '오늘 며칠이야?', 'ifelse': '1'}, 'node_type': 'startNode', 'next_node': [{'node_name': 'Prompt', 'node_type': 'promptNode'}, {'node_name': 'Prompt_1', 'node_type': 'promptNode'}], 'node_name': 'Start'}
    Start :dict = {}
    End_Config :dict = {'config': {'receiveKey': ['']}}
    End :dict = {}
    Prompt_Config :dict = {'config': {'template': '# Enter your prompt template here\n\nUser: {aa}\n\nAssistant:'}, 'outputVariable': 'prompt', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Merge_1', 'node_type': 'mergeNode'}], 'node_name': 'Prompt'}
    Prompt :dict = {}
    Merge_1_Config :dict = {'config': {'resultA': {'node_name': 'Prompt', 'node_value': 'aa'}, 'resultB': {'node_name': 'Prompt', 'node_value': 'bb'}}, 'node_type': 'mergeNode', 'next_node': [{'node_name': 'End', 'node_type': 'endNode'}], 'node_name': 'Merge_1'}
    Merge_1 :Annotated[dict, operator.or_] = {}
    Prompt_1_Config :dict = {'config': {'template': '# Enter your prompt template here\n\nUser: {bb}\n\nAssistant:'}, 'outputVariable': 'bb', 'node_type': 'promptNode', 'next_node': [{'node_name': 'Merge_1', 'node_type': 'mergeNode'}], 'node_name': 'Prompt_1'}
    Prompt_1 :dict = {}
    
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
    
    
    

def node_Start(state):
    my_name = "Start" 
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
        
    
    
def node_End( state ) : 
    my_name = "End" 
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

    
    
def node_Prompt(state):
    my_name = "Prompt" 
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
    
    
    
def node_Merge_1(state):
    my_name = "Merge_1" 
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
        
    
    
def node_Prompt_1(state):
    my_name = "Prompt_1" 
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
    
    
graph = StateGraph(MyState)
graph.add_node("_Start", node_Start)
graph.add_node("_End", node_End)
graph.add_node("_Prompt", node_Prompt)
graph.add_node("_Merge_1", node_Merge_1)
graph.add_node("_Prompt_1", node_Prompt_1)

graph.add_edge(START, "_Start")
graph.add_edge("_Start", "_Prompt")
graph.add_edge("_Merge_1", "_End")
graph.add_edge("_Start", "_Prompt_1")
graph.add_edge("_Prompt", "_Merge_1")
graph.add_edge("_Prompt_1", "_Merge_1")
graph.add_edge("_End", END)
graph = graph.compile()