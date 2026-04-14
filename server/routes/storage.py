"""
Storage API Routes - REST API for MongoDB storage operations
"""
from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from server.services.storage_service import storage_service

router = APIRouter(prefix="/api/storage")

# ==================== Workflows ====================

@router.get("/workflows", response_model=List[Dict[str, Any]])
async def get_all_workflows():
    """Get all workflows"""
    try:
        return storage_service.get_all_workflows()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workflows/{project_name}", response_model=Dict[str, Any])
async def get_workflow(project_name: str):
    """Get workflow by project name"""
    try:
        workflow = storage_service.get_workflow_by_name(project_name)
        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow '{project_name}' not found")
        return workflow
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflows", response_model=Dict[str, Any])
async def create_workflow(workflow_data: Dict[str, Any] = Body(...)):
    """Create new workflow"""
    try:
        return storage_service.create_workflow(workflow_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/workflows/{project_name}", response_model=Dict[str, Any])
async def update_workflow(project_name: str, workflow_data: Dict[str, Any] = Body(...)):
    """Update existing workflow (upsert)"""
    try:
        return storage_service.update_workflow(project_name, workflow_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/workflows/{project_name}")
async def delete_workflow(project_name: str):
    """Delete workflow by project name"""
    try:
        success = storage_service.delete_workflow(project_name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Workflow '{project_name}' not found")
        return {"message": f"Workflow '{project_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RenameWorkflowRequest(BaseModel):
    oldName: str
    newName: str

@router.post("/workflows/rename")
async def rename_workflow(request: RenameWorkflowRequest):
    """Rename workflow"""
    try:
        storage_service.rename_workflow(request.oldName, request.newName)
        return {"message": f"Workflow renamed from '{request.oldName}' to '{request.newName}'"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== AI Connections ====================

@router.get("/ai-connections", response_model=List[Dict[str, Any]])
async def get_all_ai_connections():
    """Get all AI connections"""
    try:
        return storage_service.get_all_ai_connections()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-connections/{connection_id}", response_model=Dict[str, Any])
async def get_ai_connection(connection_id: str):
    """Get AI connection by ID"""
    try:
        connection = storage_service.get_ai_connection_by_id(connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail=f"AI Connection '{connection_id}' not found")
        return connection
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-connections", response_model=Dict[str, Any])
async def create_ai_connection(connection_data: Dict[str, Any] = Body(...)):
    """Create new AI connection"""
    try:
        return storage_service.create_ai_connection(connection_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/ai-connections/{connection_id}", response_model=Dict[str, Any])
async def update_ai_connection(connection_id: str, connection_data: Dict[str, Any] = Body(...)):
    """Update existing AI connection"""
    try:
        return storage_service.update_ai_connection(connection_id, connection_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/ai-connections/{connection_id}")
async def delete_ai_connection(connection_id: str):
    """Delete AI connection by ID"""
    try:
        success = storage_service.delete_ai_connection(connection_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"AI Connection '{connection_id}' not found")
        return {"message": f"AI Connection '{connection_id}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== User Nodes ====================

@router.get("/user-nodes", response_model=List[Dict[str, Any]])
async def get_all_user_nodes():
    """Get all user nodes"""
    try:
        return storage_service.get_all_user_nodes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user-nodes/{node_id}", response_model=Dict[str, Any])
async def get_user_node(node_id: str):
    """Get user node by ID"""
    try:
        node = storage_service.get_user_node_by_id(node_id)
        if not node:
            raise HTTPException(status_code=404, detail=f"User Node '{node_id}' not found")
        return node
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-nodes", response_model=Dict[str, Any])
async def create_user_node(node_data: Dict[str, Any] = Body(...)):
    """Create new user node"""
    try:
        return storage_service.create_user_node(node_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/user-nodes/{node_id}", response_model=Dict[str, Any])
async def update_user_node(node_id: str, node_data: Dict[str, Any] = Body(...)):
    """Update existing user node"""
    try:
        return storage_service.update_user_node(node_id, node_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/user-nodes/{node_id}")
async def delete_user_node(node_id: str):
    """Delete user node by ID"""
    try:
        success = storage_service.delete_user_node(node_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"User Node '{node_id}' not found")
        return {"message": f"User Node '{node_id}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Deployments ====================

@router.get("/deployments", response_model=List[Dict[str, Any]])
async def get_all_deployments():
    """Get all deployments"""
    try:
        return storage_service.get_all_deployments()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/deployments/{deployment_id}", response_model=Dict[str, Any])
async def get_deployment(deployment_id: str):
    """Get deployment by ID"""
    try:
        deployment = storage_service.get_deployment_by_id(deployment_id)
        if not deployment:
            raise HTTPException(status_code=404, detail=f"Deployment '{deployment_id}' not found")
        return deployment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/deployments/workflow/{workflow_id}", response_model=List[Dict[str, Any]])
async def get_deployments_by_workflow(workflow_id: str):
    """Get deployments by workflow ID"""
    try:
        return storage_service.get_deployments_by_workflow_id(workflow_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deployments", response_model=Dict[str, Any])
async def create_deployment(deployment_data: Dict[str, Any] = Body(...)):
    """Create new deployment"""
    try:
        return storage_service.create_deployment(deployment_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/deployments/{deployment_id}", response_model=Dict[str, Any])
async def update_deployment(deployment_id: str, deployment_data: Dict[str, Any] = Body(...)):
    """Update existing deployment"""
    try:
        return storage_service.update_deployment(deployment_id, deployment_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/deployments/{deployment_id}")
async def delete_deployment(deployment_id: str):
    """Delete deployment by ID"""
    try:
        success = storage_service.delete_deployment(deployment_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Deployment '{deployment_id}' not found")
        return {"message": f"Deployment '{deployment_id}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Deployment Versions ====================

@router.get("/deployment-versions/deployment/{deployment_id}", response_model=List[Dict[str, Any]])
async def get_deployment_versions(deployment_id: str):
    """Get all versions for a deployment"""
    try:
        return storage_service.get_versions_by_deployment_id(deployment_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/deployment-versions/{version_id}", response_model=Dict[str, Any])
async def get_deployment_version(version_id: str):
    """Get deployment version by ID"""
    try:
        version = storage_service.get_version_by_id(version_id)
        if not version:
            raise HTTPException(status_code=404, detail=f"Deployment Version '{version_id}' not found")
        return version
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deployment-versions", response_model=Dict[str, Any])
async def create_deployment_version(version_data: Dict[str, Any] = Body(...)):
    """Create new deployment version"""
    try:
        return storage_service.create_deployment_version(version_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/deployment-versions/{version_id}", response_model=Dict[str, Any])
async def update_deployment_version(version_id: str, version_data: Dict[str, Any] = Body(...)):
    """Update existing deployment version"""
    try:
        return storage_service.update_deployment_version(version_id, version_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/deployment-versions/{version_id}")
async def delete_deployment_version(version_id: str):
    """Delete deployment version by ID"""
    try:
        success = storage_service.delete_deployment_version(version_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Deployment Version '{version_id}' not found")
        return {"message": f"Deployment Version '{version_id}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ActivateVersionRequest(BaseModel):
    deploymentId: str
    versionId: str

@router.post("/deployment-versions/activate")
async def activate_deployment_version(request: ActivateVersionRequest):
    """Activate a specific deployment version"""
    try:
        success = storage_service.activate_deployment_version(request.deploymentId, request.versionId)
        if not success:
            raise HTTPException(status_code=404, detail="Deployment or version not found")
        return {"message": f"Version '{request.versionId}' activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


