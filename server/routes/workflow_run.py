from fastapi import APIRouter, Body, HTTPException, Query
from server.services.workflow_run_service import workflow_run_service
import logging

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post('/workflow-runs')
def start_workflow_run(msg: dict = Body(...)):
    """빌더 워크플로우를 서버 백그라운드에서 실행합니다. (창을 닫아도 계속 실행)

    resume_from 에 실패/중지된 Run ID 를 주면 성공한 노드는 재사용하고 그 지점부터 이어서 실행합니다.
    """
    workflow_name = msg.get('workflow_name')
    nodes = msg.get('nodes')
    edges = msg.get('edges') or []
    if not workflow_name or not isinstance(nodes, list):
        raise HTTPException(status_code=400, detail="workflow_name and nodes are required")
    try:
        run = workflow_run_service.start_run(
            workflow_name, nodes, edges, msg.get('chat_id'), resume_from=msg.get('resume_from')
        )
        logger.info(f"Started workflow run {run['id']} for '{workflow_name}'")
        return {"success": True, "run": run}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting workflow run: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/workflow-runs')
def list_workflow_runs(
    workflow_name: str = Query(None),
    status: str = Query(None),
    limit: int = Query(50, ge=1, le=500)
):
    """실행 이력 목록을 반환합니다. (최신순)"""
    try:
        runs = workflow_run_service.list_runs(workflow_name, status, limit)
        return {"success": True, "runs": runs}
    except Exception as e:
        logger.error(f"Error listing workflow runs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/workflow-runs/{run_id}')
def get_workflow_run(run_id: str):
    """실행 상세(노드/엣지 상태, 이벤트 로그)를 반환합니다."""
    run = workflow_run_service.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Workflow run {run_id} not found")
    return {"success": True, "run": run}

@router.post('/workflow-runs/{run_id}/cancel')
def cancel_workflow_run(run_id: str):
    """실행 중인 워크플로우를 강제 종료합니다."""
    try:
        run = workflow_run_service.cancel_run(run_id)
        logger.info(f"Cancel requested for workflow run {run_id}")
        return {"success": True, "run": run}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Workflow run {run_id} not found")

@router.delete('/workflow-runs/{run_id}')
def delete_workflow_run(run_id: str):
    """실행 이력을 삭제합니다."""
    try:
        if not workflow_run_service.delete_run(run_id):
            raise HTTPException(status_code=404, detail=f"Workflow run {run_id} not found")
        return {"success": True}
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
