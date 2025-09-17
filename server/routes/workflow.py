from fastapi import APIRouter, Body, HTTPException
from server.models.workflow import PromptNodeInput
from server.services.workflow_service import WorkflowService
from server.services.deployment_service import deployment_service
from server.models.deployment import DeploymentFormData, DeploymentStatus, DeploymentEnvironment
import logging
import traceback
import uuid
from datetime import datetime


# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post('/workflow/node/promptnode')
def prompt_node(data: PromptNodeInput):
    try:
        logger.info("Received prompt node request")
        result = WorkflowService.process_prompt_node(data)
        logger.info("Prompt node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in prompt node endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/workflow/node/pythonnode')
def python_node(msg: dict = Body(...)):
    try:
        print( msg )
        logger.info("Received python node request")
        result = WorkflowService.process_python_node(msg)
        logger.info("Python node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in python node endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/workflow/node/usernode')
def user_node(msg: dict = Body(...)):
    try:
        print( msg )
        logger.info("Received user node request")
        result = WorkflowService.process_user_node(msg)
        logger.info("user node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in user node endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))




@router.post('/workflow/node/startnode')
def start_node(msg: dict = Body(...)):
    try:
        logger.info("Received start node request")
        result = WorkflowService.process_start_node(msg)
        logger.info("Start node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in start node endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/workflow/node/agentnode')
def agent_node(msg: dict = Body(...)):
    try:
        logger.info("Received agent node request")
        result = WorkflowService.process_agent_node(msg)
        logger.info("Agent node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in agent node endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



@router.post('/workflow/node/mergenode')
def merge_node(msg: dict = Body(...)):
    try:
        logger.info("Received merge node request")
        print( msg )
        result = WorkflowService.process_merge_node(msg)
        logger.info("merge node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in merge node endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/workflow/node/conditionnode')
def condition_node(msg: dict = Body(...)):
    try:
        logger.info("Received condition node request")
        print( msg )
        result = WorkflowService.process_condition_node(msg)
        logger.info("condition node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in condition node endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



@router.post('/workflow/export/python/langgraph')
def export_langgraph(msg: dict = Body(...)):
    """Export workflow to LangGraph Python code"""
    try:
        logger.info("Received LangGraph export request")
        langgraph_code = WorkflowService.generate_langgraph_code(msg)
        logger.info("LangGraph export request processed successfully")
        return {"langgraph": langgraph_code}
    except Exception as e:
        logger.error(f"Error in LangGraph export endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post('/workflow/run/{flower_id}')
def run_chatflow(msg: dict = Body(...)):
    """Export workflow to LangGraph Python code"""
    try:
        logger.info("Received Run Chatflow request")
        result = WorkflowService.run_chatflow(msg)
        logger.info("run_chatflow request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in workflow run endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 



@router.post('/workflow/list')
def run_chatflow_list(msg: dict = Body(...)):
    """Export workflow to LangGraph Python code"""
    try:
        logger.info("Received Run workflow list")
        result = WorkflowService.chatflow_list()
        logger.info("Run workflow list request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in workflow list endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 


@router.post('/workflow/deploy')
def deploy_workflow(msg: dict = Body(...)):
    """Deploy workflow by generating python code and creating deployment record."""
    try:
        logger.info("Received workflow deploy request")
        
        # 기본 배포 데이터 생성
        deployment_data = DeploymentFormData(
            name=msg.get("name", f"Deployment-{datetime.now().strftime('%Y%m%d-%H%M%S')}"),
            version=msg.get("version", "1.0.0"),
            description=msg.get("description", "Auto-generated deployment"),
            environment=DeploymentEnvironment.DEV,
            config=msg.get("config", {})
        )
        
        # 워크플로우 데이터 (기존 msg에서 추출)
        workflow_data = msg
        
        # 새로운 배포 생성
        deployment = deployment_service.create_deployment(deployment_data, workflow_data)
        
        # 배포 상태를 ACTIVE로 변경
        deployment = deployment_service.update_deployment_status(deployment.id, DeploymentStatus.ACTIVE)
        
        logger.info(f"Workflow deployed successfully: {deployment.id}")
        
        return {
            "success": True,
            "deployment": deployment,
            "message": f"Workflow deployed successfully as '{deployment.name}'"
        }
        
    except Exception as e:
        logger.error(f"Error in workflow deploy endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 


@router.post('/workflow/undeploy')
def undeploy_workflow(msg: dict = Body(...)):
    """workflow undeploy"""
    try:
        logger.info("Received workflow undeploy request")
        return msg 
        # result = WorkflowService.deploy(msg)
        # logger.info("Run workflow deploy request processed successfully")
        # return result
    except Exception as e:
        logger.error(f"Error in workflow undeploy endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# 메모리 관리 API 엔드포인트들
@router.post('/workflow/memory/clear-all')
def clear_all_memory():
    """전체 메모리 스토어 초기화"""
    try:
        logger.info("Received clear all memory request")
        result = WorkflowService.clear_all_memory()
        logger.info("Clear all memory request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in clear all memory endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/workflow/memory/clear-chat')
def clear_chat_memory(msg: dict = Body(...)):
    """특정 채팅 ID의 메모리 삭제"""
    try:
        chat_id = msg.get('chat_id')
        if not chat_id:
            raise HTTPException(status_code=400, detail="chat_id is required")
        
        logger.info(f"Received clear chat memory request for chat_id: {chat_id}")
        result = WorkflowService.clear_chat_memory(chat_id)
        logger.info(f"Clear chat memory request processed successfully for chat_id: {chat_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in clear chat memory endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/workflow/memory/clear-group')
def clear_memory_group(msg: dict = Body(...)):
    """특정 채팅 ID의 특정 메모리 그룹 삭제"""
    try:
        chat_id = msg.get('chat_id')
        memory_group_name = msg.get('memory_group_name')
        
        if not chat_id:
            raise HTTPException(status_code=400, detail="chat_id is required")
        if not memory_group_name:
            raise HTTPException(status_code=400, detail="memory_group_name is required")
        
        logger.info(f"Received clear memory group request for chat_id: {chat_id}, group: {memory_group_name}")
        result = WorkflowService.clear_memory_group(chat_id, memory_group_name)
        logger.info(f"Clear memory group request processed successfully for chat_id: {chat_id}, group: {memory_group_name}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in clear memory group endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/workflow/memory/status')
def get_memory_status():
    """메모리 스토어 상태 조회"""
    try:
        logger.info("Received memory status request")
        result = WorkflowService.get_memory_status()
        logger.info("Memory status request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in memory status endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 
