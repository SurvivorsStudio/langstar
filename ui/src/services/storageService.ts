/**
 * Storage Service - MongoDB API 호출 서비스
 * IndexedDB 대신 Backend MongoDB API를 사용합니다
 */

const API_BASE_URL = 'http://localhost:8000/api/storage';

// ==================== Helper Functions ====================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  return response.json();
}

// ==================== Workflows ====================

export async function getAllWorkflows(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/workflows`);
  return handleResponse(response);
}

export async function getWorkflowByName(projectName: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/workflows/${encodeURIComponent(projectName)}`);
  return handleResponse(response);
}

export async function createWorkflow(workflowData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflowData)
  });
  return handleResponse(response);
}

export async function updateWorkflow(projectName: string, workflowData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/workflows/${encodeURIComponent(projectName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflowData)
  });
  return handleResponse(response);
}

export async function deleteWorkflow(projectName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/workflows/${encodeURIComponent(projectName)}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

export async function renameWorkflow(oldName: string, newName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/workflows/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName })
  });
  return handleResponse(response);
}

// ==================== AI Connections ====================

export async function getAllAIConnections(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/ai-connections`);
  return handleResponse(response);
}

export async function getAIConnectionById(connectionId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/ai-connections/${connectionId}`);
  return handleResponse(response);
}

export async function createAIConnection(connectionData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/ai-connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(connectionData)
  });
  return handleResponse(response);
}

export async function updateAIConnection(connectionId: string, connectionData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/ai-connections/${connectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(connectionData)
  });
  return handleResponse(response);
}

export async function deleteAIConnection(connectionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ai-connections/${connectionId}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

// ==================== User Nodes ====================

export async function getAllUserNodes(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/user-nodes`);
  return handleResponse(response);
}

export async function getUserNodeById(nodeId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/user-nodes/${nodeId}`);
  return handleResponse(response);
}

export async function createUserNode(nodeData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/user-nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nodeData)
  });
  return handleResponse(response);
}

export async function updateUserNode(nodeId: string, nodeData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/user-nodes/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nodeData)
  });
  return handleResponse(response);
}

export async function deleteUserNode(nodeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/user-nodes/${nodeId}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

// ==================== Deployments ====================

export async function getAllDeployments(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/deployments`);
  return handleResponse(response);
}

export async function getDeploymentById(deploymentId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}`);
  return handleResponse(response);
}

export async function getDeploymentsByWorkflowId(workflowId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/deployments/workflow/${workflowId}`);
  return handleResponse(response);
}

export async function createDeployment(deploymentData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/deployments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deploymentData)
  });
  return handleResponse(response);
}

export async function updateDeployment(deploymentId: string, deploymentData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deploymentData)
  });
  return handleResponse(response);
}

export async function deleteDeployment(deploymentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

// ==================== Deployment Versions ====================

export async function getDeploymentVersions(deploymentId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/deployment-versions/deployment/${deploymentId}`);
  return handleResponse(response);
}

export async function getDeploymentVersionById(versionId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/deployment-versions/${versionId}`);
  return handleResponse(response);
}

export async function createDeploymentVersion(versionData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/deployment-versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(versionData)
  });
  return handleResponse(response);
}

export async function updateDeploymentVersion(versionId: string, versionData: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/deployment-versions/${versionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(versionData)
  });
  return handleResponse(response);
}

export async function deleteDeploymentVersion(versionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/deployment-versions/${versionId}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

export async function activateDeploymentVersion(deploymentId: string, versionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/deployment-versions/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deploymentId, versionId })
  });
  return handleResponse(response);
}


