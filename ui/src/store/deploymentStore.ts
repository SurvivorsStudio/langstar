import { Deployment, DeploymentVersion, DeploymentStatus, DeploymentEnvironment } from '../types/deployment';
import { Workflow } from './flowStore';
import * as storageService from '../services/storageService';

// 배포 데이터 관리 함수들 (MongoDB 사용)
export class DeploymentStore {
  // 데이터베이스 초기화 (더 이상 필요 없음)
  async init() {
    // MongoDB는 Backend에서 자동 초기화됨
    console.log('DeploymentStore: Using MongoDB backend');
  }

  // 배포 생성
  async createDeployment(deployment: Omit<Deployment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deployment> {
    const newDeployment: Deployment = {
      ...deployment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await storageService.createDeployment(newDeployment);
  }

  // 배포 조회 (ID로)
  async getDeployment(id: string): Promise<Deployment | undefined> {
    try {
      return await storageService.getDeploymentById(id);
    } catch (error) {
      console.error(`Failed to get deployment ${id}:`, error);
      return undefined;
    }
  }

  // 워크플로우 ID로 배포 조회
  async getDeploymentsByWorkflowId(workflowId: string): Promise<Deployment[]> {
    try {
      return await storageService.getDeploymentsByWorkflowId(workflowId);
    } catch (error) {
      console.error(`Failed to get deployments for workflow ${workflowId}:`, error);
      return [];
    }
  }

  // 모든 배포 조회
  async getAllDeployments(): Promise<Deployment[]> {
    try {
      return await storageService.getAllDeployments();
    } catch (error) {
      console.error('Failed to get all deployments:', error);
      return [];
    }
  }

  // 배포 업데이트
  async updateDeployment(id: string, updates: Partial<Omit<Deployment, 'id' | 'createdAt'>>): Promise<Deployment> {
    const existing = await this.getDeployment(id);
    if (!existing) {
      throw new Error(`Deployment with ID ${id} not found`);
    }

    const updatedDeployment: Deployment = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    return await storageService.updateDeployment(id, updatedDeployment);
  }

  // 배포 삭제
  async deleteDeployment(id: string): Promise<void> {
    await storageService.deleteDeployment(id);
  }

  // 배포 상태 업데이트
  async updateDeploymentStatus(id: string, status: DeploymentStatus): Promise<Deployment> {
    return this.updateDeployment(id, { status });
  }

  // 배포 버전 생성
  async createDeploymentVersion(
    deploymentId: string,
    versionData: Omit<DeploymentVersion, 'id' | 'createdAt' | 'version'>
  ): Promise<DeploymentVersion> {
    // 기존 버전들을 가져와서 새 버전 번호 결정
    const existingVersions = await this.getDeploymentVersions(deploymentId);
    const maxVersion = existingVersions.reduce((max, v) => Math.max(max, v.version), 0);

    const newVersion: DeploymentVersion = {
      ...versionData,
      id: crypto.randomUUID(),
      deploymentId,
      version: maxVersion + 1,
      createdAt: new Date().toISOString(),
    };

    return await storageService.createDeploymentVersion(newVersion);
  }

  // 배포 버전 조회 (ID로)
  async getDeploymentVersion(versionId: string): Promise<DeploymentVersion | undefined> {
    try {
      return await storageService.getDeploymentVersionById(versionId);
    } catch (error) {
      console.error(`Failed to get deployment version ${versionId}:`, error);
      return undefined;
    }
  }

  // 배포의 모든 버전 조회
  async getDeploymentVersions(deploymentId: string): Promise<DeploymentVersion[]> {
    try {
      return await storageService.getDeploymentVersions(deploymentId);
    } catch (error) {
      console.error(`Failed to get versions for deployment ${deploymentId}:`, error);
      return [];
    }
  }

  // 배포 버전 업데이트
  async updateDeploymentVersion(
    versionId: string,
    updates: Partial<Omit<DeploymentVersion, 'id' | 'deploymentId' | 'version' | 'createdAt'>>
  ): Promise<DeploymentVersion> {
    const existing = await this.getDeploymentVersion(versionId);
    if (!existing) {
      throw new Error(`Deployment version with ID ${versionId} not found`);
    }

    const updatedVersion: DeploymentVersion = {
      ...existing,
      ...updates,
      id: versionId,
    };

    return await storageService.updateDeploymentVersion(versionId, updatedVersion);
  }

  // 배포 버전 삭제
  async deleteDeploymentVersion(versionId: string): Promise<void> {
    await storageService.deleteDeploymentVersion(versionId);
  }

  // 특정 버전을 활성화 (다른 버전들은 비활성화)
  async activateVersion(deploymentId: string, versionId: string): Promise<void> {
    await storageService.activateDeploymentVersion(deploymentId, versionId);
  }

  // 현재 활성 버전 조회
  async getActiveVersion(deploymentId: string): Promise<DeploymentVersion | undefined> {
    const versions = await this.getDeploymentVersions(deploymentId);
    return versions.find(v => v.isActive);
  }

  // 배포 통계 조회
  async getDeploymentStats(): Promise<{
    total: number;
    byStatus: Record<DeploymentStatus, number>;
    byEnvironment: Record<DeploymentEnvironment, number>;
  }> {
    const deployments = await this.getAllDeployments();

    const byStatus: Record<DeploymentStatus, number> = {
      'draft': 0,
      'pending': 0,
      'deploying': 0,
      'active': 0,
      'inactive': 0,
      'failed': 0,
      'archived': 0
    };

    const byEnvironment: Record<DeploymentEnvironment, number> = {
      'development': 0,
      'staging': 0,
      'production': 0
    };

    deployments.forEach(d => {
      byStatus[d.status]++;
      byEnvironment[d.environment]++;
    });

    return {
      total: deployments.length,
      byStatus,
      byEnvironment
    };
  }

  // 최근 배포 조회 (limit 개수만큼)
  async getRecentDeployments(limit: number = 10): Promise<Deployment[]> {
    const deployments = await this.getAllDeployments();
    return deployments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // 워크플로우를 배포 가능한 형태로 변환
  prepareWorkflowForDeployment(workflow: Workflow): {
    workflowData: string;
    workflowSnapshot: any;
  } {
    // 워크플로우 데이터를 직렬화
    const workflowSnapshot = {
      projectName: workflow.projectName,
      projectId: workflow.projectId,
      nodes: workflow.nodes,
      edges: workflow.edges,
      viewport: workflow.viewport,
      manuallySelectedEdges: workflow.manuallySelectedEdges,
      lastModified: workflow.lastModified
    };

    return {
      workflowData: JSON.stringify(workflowSnapshot, null, 2),
      workflowSnapshot
    };
  }

  // 배포 복제
  async duplicateDeployment(deploymentId: string, newName: string): Promise<Deployment> {
    const original = await this.getDeployment(deploymentId);
    if (!original) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    // 원본 배포의 데이터를 복사하여 새로운 배포 생성
    const duplicated = await this.createDeployment({
      name: newName,
      description: `Copy of ${original.name}`,
      workflowId: original.workflowId,
      workflowSnapshot: original.workflowSnapshot,
      environment: original.environment,
      status: 'draft' as DeploymentStatus,
      config: { ...original.config }
    });

    // 원본의 모든 버전도 복제
    const originalVersions = await this.getDeploymentVersions(deploymentId);
    for (const version of originalVersions) {
      await this.createDeploymentVersion(duplicated.id, {
        workflowSnapshot: version.workflowSnapshot,
        config: { ...version.config },
        deployedBy: version.deployedBy,
        deploymentUrl: version.deploymentUrl,
        isActive: false, // 복제된 버전은 비활성 상태로
        notes: `Copied from version ${version.version}`
      });
    }

    return duplicated;
  }

  // 배포 내보내기 (JSON)
  async exportDeployment(deploymentId: string): Promise<string> {
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const versions = await this.getDeploymentVersions(deploymentId);

    const exportData = {
      deployment,
      versions,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  // 배포 가져오기 (JSON)
  async importDeployment(jsonData: string): Promise<Deployment> {
    const data = JSON.parse(jsonData);
    const { deployment, versions } = data;

    // 새로운 ID로 배포 생성
    const newDeployment = await this.createDeployment({
      name: deployment.name,
      description: deployment.description,
      workflowId: deployment.workflowId,
      workflowSnapshot: deployment.workflowSnapshot,
      environment: deployment.environment,
      status: 'draft' as DeploymentStatus,
      config: deployment.config
    });

    // 버전들도 가져오기
    if (versions && Array.isArray(versions)) {
      for (const version of versions) {
        await this.createDeploymentVersion(newDeployment.id, {
          workflowSnapshot: version.workflowSnapshot,
          config: version.config,
          deployedBy: version.deployedBy,
          deploymentUrl: version.deploymentUrl,
          isActive: false,
          notes: version.notes
        });
      }
    }

    return newDeployment;
  }
}

// 싱글톤 인스턴스 export
export const deploymentStore = new DeploymentStore();
