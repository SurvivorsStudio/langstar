from fastapi import APIRouter, Body, HTTPException
from server.models.workflow import PromptNodeInput
from server.services.workflow_service import WorkflowService
import logging
import traceback


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
        logger.info("Received python node request")
        result = WorkflowService.process_python_node(msg)
        logger.info("Python node request processed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in python node endpoint: {str(e)}", exc_info=True)
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
    """Deploy workflow by generating python code and saving it as a file."""
    try:
        logger.info("Received workflow deploy request")
        print( msg )
        pycode = export_langgraph( msg )
        print( pycode ) 
        # result = WorkflowService.model_deploy(msg)
        logger.info("Workflow deployed successfully")
        return {'a' : 1}
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
