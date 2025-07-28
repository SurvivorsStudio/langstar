import { Deployment, DeploymentVersion, DeploymentStatus, DeploymentEnvironment } from '../types/deployment';
import { Workflow } from './flowStore';

// IndexedDB 설정
const DB_NAME = 'LangStarDeploymentDB';
const DB_VERSION = 1;
const DEPLOYMENTS_STORE_NAME = 'deployments';
const DEPLOYMENT_VERSIONS_STORE_NAME = 'deployment_versions';

// IndexedDB 열기/초기화 헬퍼 함수
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // deployments 테이블 생성
      if (!db.objectStoreNames.contains(DEPLOYMENTS_STORE_NAME)) {
        const deploymentStore = db.createObjectStore(DEPLOYMENTS_STORE_NAME, { keyPath: 'id' });
        deploymentStore.createIndex('by-workflow-id', 'workflowId');
        deploymentStore.createIndex('by-status', 'status');
        deploymentStore.createIndex('by-environment', 'environment');
        deploymentStore.createIndex('by-created-at', 'createdAt');
        console.log(`Object store "${DEPLOYMENTS_STORE_NAME}" created.`);
      }
      
      // deployment_versions 테이블 생성
      if (!db.objectStoreNames.contains(DEPLOYMENT_VERSIONS_STORE_NAME)) {
        const versionStore = db.createObjectStore(DEPLOYMENT_VERSIONS_STORE_NAME, { keyPath: 'id' });
        versionStore.createIndex('by-deployment-id', 'deploymentId');
        versionStore.createIndex('by-version', 'version');
        versionStore.createIndex('by-created-at', 'createdAt');
        console.log(`Object store "${DEPLOYMENT_VERSIONS_STORE_NAME}" created.`);
      }
    };

    request.onsuccess = (event) => {
      console.log(`Database "${DB_NAME}" opened successfully.`);
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// 배포 데이터 관리 함수들
export class DeploymentStore {
  private db: IDBDatabase | null = null;

  // 데이터베이스 초기화
  async init() {
    if (!this.db) {
      this.db = await openDB();
    }
  }

  // 배포 생성
  async createDeployment(deployment: Omit<Deployment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deployment> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const newDeployment: Deployment = {
      ...deployment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const request = store.add(newDeployment);

      request.onsuccess = () => resolve(newDeployment);
      request.onerror = () => reject(request.error);
    });
  }

  // 배포 조회 (ID로)
  async getDeployment(id: string): Promise<Deployment | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 워크플로우 ID로 배포 조회
  async getDeploymentsByWorkflowId(workflowId: string): Promise<Deployment[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const index = store.index('by-workflow-id');
      const request = index.getAll(workflowId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 모든 배포 조회
  async getAllDeployments(): Promise<Deployment[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 상태별 배포 조회
  async getDeploymentsByStatus(status: DeploymentStatus): Promise<Deployment[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const index = store.index('by-status');
      const request = index.getAll(status);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 환경별 배포 조회
  async getDeploymentsByEnvironment(environment: DeploymentEnvironment): Promise<Deployment[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const index = store.index('by-environment');
      const request = index.getAll(environment);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 배포 업데이트
  async updateDeployment(id: string, updates: Partial<Omit<Deployment, 'id' | 'createdAt'>>): Promise<Deployment> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getDeployment(id);
    if (!existing) throw new Error(`Deployment with id ${id} not found`);

    const updatedDeployment: Deployment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const request = store.put(updatedDeployment);

      request.onsuccess = () => resolve(updatedDeployment);
      request.onerror = () => reject(request.error);
    });
  }

  // 배포 삭제
  async deleteDeployment(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 관련 버전들 먼저 삭제
    const versions = await this.getVersionsByDeploymentId(id);
    for (const version of versions) {
      await this.deleteDeploymentVersion(version.id);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 배포 버전 생성
  async createDeploymentVersion(version: Omit<DeploymentVersion, 'id' | 'createdAt'>): Promise<DeploymentVersion> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const newVersion: DeploymentVersion = {
      ...version,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENT_VERSIONS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
      const request = store.add(newVersion);

      request.onsuccess = () => resolve(newVersion);
      request.onerror = () => reject(request.error);
    });
  }

  // 배포 ID로 버전들 조회
  async getVersionsByDeploymentId(deploymentId: string): Promise<DeploymentVersion[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENT_VERSIONS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
      const index = store.index('by-deployment-id');
      const request = index.getAll(deploymentId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 특정 버전 조회
  async getDeploymentVersion(id: string): Promise<DeploymentVersion | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENT_VERSIONS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 배포의 활성 버전 조회
  async getActiveVersion(deploymentId: string): Promise<DeploymentVersion | undefined> {
    const versions = await this.getVersionsByDeploymentId(deploymentId);
    return versions.find(v => v.isActive);
  }

  // 버전 업데이트
  async updateDeploymentVersion(id: string, updates: Partial<Omit<DeploymentVersion, 'id' | 'createdAt'>>): Promise<DeploymentVersion> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getDeploymentVersion(id);
    if (!existing) throw new Error(`Deployment version with id ${id} not found`);

    const updatedVersion: DeploymentVersion = {
      ...existing,
      ...updates,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENT_VERSIONS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
      const request = store.put(updatedVersion);

      request.onsuccess = () => resolve(updatedVersion);
      request.onerror = () => reject(request.error);
    });
  }

  // 버전 삭제
  async deleteDeploymentVersion(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENT_VERSIONS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 버전 활성화 (다른 버전들은 비활성화)
  async activateVersion(deploymentId: string, versionId: string): Promise<void> {
    const versions = await this.getVersionsByDeploymentId(deploymentId);
    
    // 모든 버전을 비활성화
    for (const version of versions) {
      await this.updateDeploymentVersion(version.id, { isActive: false });
    }
    
    // 지정된 버전을 활성화
    await this.updateDeploymentVersion(versionId, { isActive: true });
  }

  // 데이터베이스 초기화 (테스트용)
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DEPLOYMENTS_STORE_NAME, DEPLOYMENT_VERSIONS_STORE_NAME], 'readwrite');
      
      const deploymentStore = transaction.objectStore(DEPLOYMENTS_STORE_NAME);
      const versionStore = transaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
      
      const deploymentRequest = deploymentStore.clear();
      const versionRequest = versionStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// 싱글톤 인스턴스
export const deploymentStore = new DeploymentStore(); 