import { 
  Deployment, 
  DeploymentVersion, 
  DeploymentFormData, 
  DeploymentStatus, 
  DeploymentEnvironment 
} from '../types/deployment';
import { Workflow } from '../store/flowStore';

// API 응답 타입들
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

interface CreateDeploymentResponse {
  success: boolean;
  deployment: Deployment;
  message: string;
}

interface DeploymentsResponse {
  success: boolean;
  deployments: Deployment[];
  message: string;
}

interface DeploymentStatusResponse {
  success: boolean;
  deployment: Deployment;
  versions: DeploymentVersion[];
  message: string;
}

interface DeploymentCodeResponse {
  success: boolean;
  code: string;
  deploymentUrl?: string;
  message: string;
}

// API 기본 설정
const API_BASE_URL = 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // 공통 HTTP 메서드들
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // 배포 관련 API 메서드들

  /**
   * 새 배포 생성
   */
  async createDeployment(
    deploymentData: DeploymentFormData, 
    workflowData: Workflow
  ): Promise<Deployment> {
    const response = await this.request<CreateDeploymentResponse>('/api/deployment/create', {
      method: 'POST',
      body: JSON.stringify({
        deploymentData,
        workflowData
      })
    });

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.deployment;
  }

  /**
   * 모든 배포 목록 조회
   */
  async getDeployments(): Promise<Deployment[]> {
    const response = await this.request<DeploymentsResponse>('/api/deployment/list', {
      method: 'GET'
    });

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.deployments;
  }

  /**
   * 특정 배포 상태 조회
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    deployment: Deployment;
    versions: DeploymentVersion[];
  }> {
    const response = await this.request<DeploymentStatusResponse>(`/api/deployment/${deploymentId}`, {
      method: 'GET'
    });

    if (!response.success) {
      throw new Error(response.message);
    }

    return {
      deployment: response.deployment,
      versions: response.versions
    };
  }

  /**
   * 배포 상태 업데이트
   */
  async updateDeploymentStatus(
    deploymentId: string, 
    status: DeploymentStatus
  ): Promise<Deployment> {
    const response = await this.request<{ success: boolean; deployment: Deployment; message: string }>(
      `/api/deployment/${deploymentId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ deploymentId, status })
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.deployment;
  }

  /**
   * 새 배포 버전 생성
   */
  async createDeploymentVersion(
    deploymentId: string,
    workflowData: Workflow,
    version: string,
    changelog?: string
  ): Promise<DeploymentVersion> {
    const response = await this.request<{ success: boolean; version: DeploymentVersion; message: string }>(
      `/api/deployment/${deploymentId}/version`,
      {
        method: 'POST',
        body: JSON.stringify({
          workflowData,
          version,
          changelog
        })
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.version;
  }

  /**
   * 배포 코드 생성
   */
  async generateDeploymentCode(
    deploymentId: string, 
    versionId: string
  ): Promise<{ code: string; deploymentUrl?: string }> {
    const response = await this.request<DeploymentCodeResponse>(
      `/api/deployment/${deploymentId}/generate-code`,
      {
        method: 'POST',
        body: JSON.stringify({ deploymentId, versionId })
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    return {
      code: response.code,
      deploymentUrl: response.deploymentUrl
    };
  }

  /**
   * 배포 롤백
   */
  async rollbackDeployment(
    deploymentId: string, 
    versionId: string
  ): Promise<{ deployment: Deployment; activeVersion: DeploymentVersion }> {
    const response = await this.request<{
      success: boolean;
      deployment: Deployment;
      activeVersion: DeploymentVersion;
      message: string;
    }>(
      `/api/deployment/${deploymentId}/rollback`,
      {
        method: 'POST',
        body: JSON.stringify({ deploymentId, versionId })
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    return {
      deployment: response.deployment,
      activeVersion: response.activeVersion
    };
  }

  /**
   * 배포 삭제
   */
  async deleteDeployment(deploymentId: string): Promise<void> {
    const response = await this.request<{ success: boolean; message: string }>(
      `/api/deployment/${deploymentId}`,
      {
        method: 'DELETE'
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }
  }

  /**
   * 배포 활성화
   */
  async activateDeployment(deploymentId: string): Promise<Deployment> {
    const response = await this.request<{ success: boolean; deployment: Deployment; message: string }>(
      `/api/deployment/${deploymentId}/activate`,
      {
        method: 'POST'
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.deployment;
  }

  /**
   * 배포 비활성화
   */
  async deactivateDeployment(deploymentId: string): Promise<Deployment> {
    const response = await this.request<{ success: boolean; deployment: Deployment; message: string }>(
      `/api/deployment/${deploymentId}/deactivate`,
      {
        method: 'POST'
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.deployment;
  }

  async runDeployment(deploymentId: string, requestData: any): Promise<{ success: boolean; deployment_id: string; result: any }> {
    return this.request(`/api/deployment/${deploymentId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
  }

  // 기존 워크플로우 API와의 호환성을 위한 메서드들

  /**
   * 기존 워크플로우 배포 (하위 호환성)
   */
  async deployWorkflow(workflowData: Workflow, options?: {
    name?: string;
    version?: string;
    description?: string;
    environment?: DeploymentEnvironment;
  }): Promise<Deployment> {
    const response = await this.request<{ success: boolean; deployment: Deployment; message: string }>(
      '/workflow/deploy',
      {
        method: 'POST',
        body: JSON.stringify({
          ...workflowData,
          name: options?.name || `Deployment-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
          version: options?.version || '1.0.0',
          description: options?.description || 'Auto-generated deployment',
          environment: options?.environment || DeploymentEnvironment.DEV
        })
      }
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.deployment;
  }

  /**
   * LangGraph 코드 생성 (기존 기능)
   */
  async generateLangGraphCode(workflowData: Workflow): Promise<string> {
    const response = await this.request<{ langgraph: string }>(
      '/workflow/export/python/langgraph',
      {
        method: 'POST',
        body: JSON.stringify(workflowData)
      }
    );

    return response.langgraph;
  }
}

// 싱글톤 인스턴스
export const apiService = new ApiService();

// 타입 내보내기
export type { ApiResponse, CreateDeploymentResponse, DeploymentsResponse, DeploymentStatusResponse, DeploymentCodeResponse }; 