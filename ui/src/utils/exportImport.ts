import { Node, Edge, Viewport } from 'reactflow';
import { Workflow } from '../store/flowStore';
import { Deployment } from '../types/deployment';

// IndexedDB 설정
const DB_NAME = 'WorkflowDatabase';
const WORKFLOWS_STORE_NAME = 'WorkflowsStore';
const AI_CONNECTIONS_STORE_NAME = 'AIConnectionsStore';
const USER_NODES_STORE_NAME = 'UserNodesStore';

const DEPLOYMENT_DB_NAME = 'LangStarDeploymentDB';
const DEPLOYMENTS_STORE_NAME = 'deployments';
const DEPLOYMENT_VERSIONS_STORE_NAME = 'deployment_versions';

// IndexedDB 열기 함수
const openWorkflowDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const openDeploymentDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEPLOYMENT_DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// 안전한 데이터 가져오기 함수
const safeGetAll = (store: IDBObjectStore): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        console.warn('Store getAll failed, returning empty array');
        resolve([]);
      };
    } catch (error) {
      console.warn('Store operation failed, returning empty array:', error);
      resolve([]);
    }
  });
};

const safeGet = (store: IDBObjectStore, key: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.warn(`Store get failed for key: ${key}`);
        resolve(null);
      };
    } catch (error) {
      console.warn(`Store get operation failed for key: ${key}:`, error);
      resolve(null);
    }
  });
};

// Export 데이터 타입 정의
export interface ChatflowExportData {
  version: string;
  exportDate: string;
  workflows: Workflow[];
  aiConnections: any[];
  userNodes: any[];
  deployments: Deployment[];
  deploymentVersions: any[];
}

// 전체 chatflow 데이터 export
export const exportChatflow = async (projectName?: string): Promise<ChatflowExportData> => {
  try {
    console.log('Starting export process...');
    
    const workflowDB = await openWorkflowDB();
    console.log('WorkflowDB opened successfully');
    
    const deploymentDB = await openDeploymentDB();
    console.log('DeploymentDB opened successfully');

    const exportData: ChatflowExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      workflows: [],
      aiConnections: [],
      userNodes: [],
      deployments: [],
      deploymentVersions: []
    };

    // 워크플로우 데이터 가져오기
    try {
      if (workflowDB.objectStoreNames.contains(WORKFLOWS_STORE_NAME)) {
        const workflowTransaction = workflowDB.transaction([WORKFLOWS_STORE_NAME], 'readonly');
        const workflowStore = workflowTransaction.objectStore(WORKFLOWS_STORE_NAME);
        
        if (projectName) {
          // 특정 프로젝트만 export
          console.log(`Exporting specific workflow: ${projectName}`);
          const workflow = await safeGet(workflowStore, projectName);
          if (workflow) {
            exportData.workflows.push(workflow);
            console.log(`Found workflow: ${projectName}`);
          } else {
            console.log(`Workflow not found: ${projectName}`);
          }
        } else {
          // 모든 워크플로우 export
          console.log('Exporting all workflows');
          exportData.workflows = await safeGetAll(workflowStore);
          console.log(`Found ${exportData.workflows.length} workflows`);
        }
      } else {
        console.log('WorkflowsStore not found in database');
      }
    } catch (error) {
      console.error('Error exporting workflows:', error);
      // 워크플로우 에러가 있어도 계속 진행
    }

    // AI 연결 데이터 가져오기
    try {
      if (workflowDB.objectStoreNames.contains(AI_CONNECTIONS_STORE_NAME)) {
        const aiTransaction = workflowDB.transaction([AI_CONNECTIONS_STORE_NAME], 'readonly');
        const aiStore = aiTransaction.objectStore(AI_CONNECTIONS_STORE_NAME);
        exportData.aiConnections = await safeGetAll(aiStore);
        console.log(`Found ${exportData.aiConnections.length} AI connections`);
      } else {
        console.log('AIConnectionsStore not found in database');
      }
    } catch (error) {
      console.error('Error exporting AI connections:', error);
      // AI 연결 에러가 있어도 계속 진행
    }

    // 사용자 노드 데이터 가져오기
    try {
      if (workflowDB.objectStoreNames.contains(USER_NODES_STORE_NAME)) {
        const userNodeTransaction = workflowDB.transaction([USER_NODES_STORE_NAME], 'readonly');
        const userNodeStore = userNodeTransaction.objectStore(USER_NODES_STORE_NAME);
        exportData.userNodes = await safeGetAll(userNodeStore);
        console.log(`Found ${exportData.userNodes.length} user nodes`);
      } else {
        console.log('UserNodesStore not found in database');
      }
    } catch (error) {
      console.error('Error exporting user nodes:', error);
      // 사용자 노드 에러가 있어도 계속 진행
    }

    // 배포 데이터 가져오기
    try {
      if (deploymentDB.objectStoreNames.contains(DEPLOYMENTS_STORE_NAME)) {
        const deploymentTransaction = deploymentDB.transaction([DEPLOYMENTS_STORE_NAME], 'readonly');
        const deploymentStore = deploymentTransaction.objectStore(DEPLOYMENTS_STORE_NAME);
        exportData.deployments = await safeGetAll(deploymentStore);
        console.log(`Found ${exportData.deployments.length} deployments`);
      } else {
        console.log('DeploymentsStore not found in database');
      }
    } catch (error) {
      console.error('Error exporting deployments:', error);
      // 배포 에러가 있어도 계속 진행
    }

    // 배포 버전 데이터 가져오기
    try {
      if (deploymentDB.objectStoreNames.contains(DEPLOYMENT_VERSIONS_STORE_NAME)) {
        const versionTransaction = deploymentDB.transaction([DEPLOYMENT_VERSIONS_STORE_NAME], 'readonly');
        const versionStore = versionTransaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
        exportData.deploymentVersions = await safeGetAll(versionStore);
        console.log(`Found ${exportData.deploymentVersions.length} deployment versions`);
      } else {
        console.log('DeploymentVersionsStore not found in database');
      }
    } catch (error) {
      console.error('Error exporting deployment versions:', error);
      // 배포 버전 에러가 있어도 계속 진행
    }

    console.log('Export completed successfully');
    return exportData;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Failed to export chatflow data: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 파일로 다운로드
export const downloadChatflowFile = async (projectName?: string): Promise<void> => {
  try {
    const exportData = await exportChatflow(projectName);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = projectName ? `${projectName}_chatflow.json` : 'chatflow_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

// Import 데이터 검증 (더 유연한 검증)
export const validateImportData = (data: any): boolean => {
  // 기본 구조 검증
  if (!data || typeof data !== 'object') {
    console.log('Invalid data: not an object');
    return false;
  }

  // 버전 정보 검증
  if (typeof data.version !== 'string') {
    console.log('Invalid data: version is not a string');
    return false;
  }

  // 워크플로우 배열 검증 (필수)
  if (!Array.isArray(data.workflows)) {
    console.log('Invalid data: workflows is not an array');
    return false;
  }

  // 간단한 export 형식인지 확인 (message 필드가 있는 경우)
  if (data.message && typeof data.message === 'string') {
    console.log('Detected simple workflow export format');
    return true;
  }

  // 전체 export 형식인지 확인
  if (typeof data.exportDate === 'string' &&
      Array.isArray(data.aiConnections) &&
      Array.isArray(data.userNodes) &&
      Array.isArray(data.deployments) &&
      Array.isArray(data.deploymentVersions)) {
    console.log('Detected full chatflow export format');
    return true;
  }

  console.log('Invalid data: unknown format');
  return false;
};

// chatflow 데이터 import
export const importChatflow = async (file: File): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Starting import process...');
    const text = await file.text();
    const importData = JSON.parse(text);

    console.log('Parsed import data:', importData);

    if (!validateImportData(importData)) {
      throw new Error('Invalid import file format');
    }

    const workflowDB = await openWorkflowDB();
    console.log('WorkflowDB opened for import');

    // 워크플로우 데이터 import (필수)
    try {
      if (workflowDB.objectStoreNames.contains(WORKFLOWS_STORE_NAME)) {
        const workflowTransaction = workflowDB.transaction([WORKFLOWS_STORE_NAME], 'readwrite');
        const workflowStore = workflowTransaction.objectStore(WORKFLOWS_STORE_NAME);
        
        let importedCount = 0;
        for (const workflow of importData.workflows) {
          try {
            await new Promise<void>((resolve, reject) => {
              const request = workflowStore.put(workflow);
              request.onsuccess = () => {
                importedCount++;
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            console.warn(`Failed to import workflow: ${workflow.projectName}`, error);
          }
        }
        console.log(`Imported ${importedCount} workflows`);
      } else {
        console.log('WorkflowsStore not found in database');
      }
    } catch (error) {
      console.error('Error importing workflows:', error);
      throw new Error('Failed to import workflows');
    }

    // 전체 export 형식인 경우에만 추가 데이터 import
    if (importData.aiConnections && importData.userNodes && importData.deployments && importData.deploymentVersions) {
      console.log('Importing additional data (full export format)');
      
      // AI 연결 데이터 import
      try {
        if (workflowDB.objectStoreNames.contains(AI_CONNECTIONS_STORE_NAME)) {
          const aiTransaction = workflowDB.transaction([AI_CONNECTIONS_STORE_NAME], 'readwrite');
          const aiStore = aiTransaction.objectStore(AI_CONNECTIONS_STORE_NAME);
          
          for (const connection of importData.aiConnections) {
            try {
              await new Promise<void>((resolve, reject) => {
                const request = aiStore.put(connection);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            } catch (error) {
              console.warn('Failed to import AI connection:', error);
            }
          }
          console.log(`Imported ${importData.aiConnections.length} AI connections`);
        }
      } catch (error) {
        console.error('Error importing AI connections:', error);
      }

      // 사용자 노드 데이터 import
      try {
        if (workflowDB.objectStoreNames.contains(USER_NODES_STORE_NAME)) {
          const userNodeTransaction = workflowDB.transaction([USER_NODES_STORE_NAME], 'readwrite');
          const userNodeStore = userNodeTransaction.objectStore(USER_NODES_STORE_NAME);
          
          for (const userNode of importData.userNodes) {
            try {
              await new Promise<void>((resolve, reject) => {
                const request = userNodeStore.put(userNode);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            } catch (error) {
              console.warn('Failed to import user node:', error);
            }
          }
          console.log(`Imported ${importData.userNodes.length} user nodes`);
        }
      } catch (error) {
        console.error('Error importing user nodes:', error);
      }

      // 배포 데이터 import
      try {
        const deploymentDB = await openDeploymentDB();
        if (deploymentDB.objectStoreNames.contains(DEPLOYMENTS_STORE_NAME)) {
          const deploymentTransaction = deploymentDB.transaction([DEPLOYMENTS_STORE_NAME], 'readwrite');
          const deploymentStore = deploymentTransaction.objectStore(DEPLOYMENTS_STORE_NAME);
          
          for (const deployment of importData.deployments) {
            try {
              await new Promise<void>((resolve, reject) => {
                const request = deploymentStore.put(deployment);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            } catch (error) {
              console.warn('Failed to import deployment:', error);
            }
          }
          console.log(`Imported ${importData.deployments.length} deployments`);
        }
      } catch (error) {
        console.error('Error importing deployments:', error);
      }

      // 배포 버전 데이터 import
      try {
        const deploymentDB = await openDeploymentDB();
        if (deploymentDB.objectStoreNames.contains(DEPLOYMENT_VERSIONS_STORE_NAME)) {
          const versionTransaction = deploymentDB.transaction([DEPLOYMENT_VERSIONS_STORE_NAME], 'readwrite');
          const versionStore = versionTransaction.objectStore(DEPLOYMENT_VERSIONS_STORE_NAME);
          
          for (const version of importData.deploymentVersions) {
            try {
              await new Promise<void>((resolve, reject) => {
                const request = versionStore.put(version);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            } catch (error) {
              console.warn('Failed to import deployment version:', error);
            }
          }
          console.log(`Imported ${importData.deploymentVersions.length} deployment versions`);
        }
      } catch (error) {
        console.error('Error importing deployment versions:', error);
      }
    }

    console.log('Import completed successfully');
    return {
      success: true,
      message: `Successfully imported ${importData.workflows.length} workflows${importData.aiConnections ? ' and related data' : ''}`
    };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Import failed'
    };
  }
};

// 간단한 워크플로우만 import (테스트용)
export const importWorkflowOnly = async (file: File): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Starting simple workflow import...');
    const text = await file.text();
    const importData = JSON.parse(text);

    console.log('Parsed import data:', importData);

    // 기본 검증
    if (!importData || typeof importData !== 'object') {
      throw new Error('Invalid file format: not a valid JSON object');
    }

    if (!Array.isArray(importData.workflows)) {
      throw new Error('Invalid file format: workflows array not found');
    }

    if (importData.workflows.length === 0) {
      throw new Error('No workflows found in the file');
    }

    const workflowDB = await openWorkflowDB();
    console.log('WorkflowDB opened for import');

    // 워크플로우 데이터만 import
    try {
      if (workflowDB.objectStoreNames.contains(WORKFLOWS_STORE_NAME)) {
        const workflowTransaction = workflowDB.transaction([WORKFLOWS_STORE_NAME], 'readwrite');
        const workflowStore = workflowTransaction.objectStore(WORKFLOWS_STORE_NAME);
        
        let importedCount = 0;
        for (const workflow of importData.workflows) {
          try {
            await new Promise<void>((resolve, reject) => {
              const request = workflowStore.put(workflow);
              request.onsuccess = () => {
                importedCount++;
                console.log(`Imported workflow: ${workflow.projectName}`);
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            console.warn(`Failed to import workflow: ${workflow.projectName}`, error);
          }
        }
        console.log(`Successfully imported ${importedCount} workflows`);
        
        return {
          success: true,
          message: `Successfully imported ${importedCount} workflows`
        };
      } else {
        throw new Error('WorkflowsStore not found in database');
      }
    } catch (error) {
      console.error('Error importing workflows:', error);
      throw error;
    }
  } catch (error) {
    console.error('Simple workflow import failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Import failed'
    };
  }
};

// 특정 워크플로우만 export (공유용)
export const exportSingleWorkflow = async (projectName: string): Promise<void> => {
  await downloadChatflowFile(projectName);
};

// 워크플로우 목록 가져오기
export const getWorkflowList = async (): Promise<string[]> => {
  try {
    const db = await openWorkflowDB();
    const transaction = db.transaction([WORKFLOWS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(WORKFLOWS_STORE_NAME);
    const request = store.getAllKeys();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get workflow list:', error);
    return [];
  }
};

// 간단한 워크플로우만 export (테스트용)
export const exportWorkflowOnly = async (projectName?: string): Promise<void> => {
  try {
    console.log('Starting simple workflow export...');
    
    const workflowDB = await openWorkflowDB();
    console.log('WorkflowDB opened successfully');

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      workflows: [] as any[],
      message: 'Simple workflow export'
    };

    // 워크플로우 데이터만 가져오기
    try {
      if (workflowDB.objectStoreNames.contains(WORKFLOWS_STORE_NAME)) {
        const workflowTransaction = workflowDB.transaction([WORKFLOWS_STORE_NAME], 'readonly');
        const workflowStore = workflowTransaction.objectStore(WORKFLOWS_STORE_NAME);
        
        if (projectName) {
          // 특정 프로젝트만 export
          console.log(`Exporting specific workflow: ${projectName}`);
          const workflow = await safeGet(workflowStore, projectName);
          if (workflow) {
            exportData.workflows.push(workflow);
            console.log(`Found workflow: ${projectName}`);
          } else {
            console.log(`Workflow not found: ${projectName}`);
            throw new Error(`Workflow "${projectName}" not found`);
          }
        } else {
          // 모든 워크플로우 export
          console.log('Exporting all workflows');
          exportData.workflows = await safeGetAll(workflowStore);
          console.log(`Found ${exportData.workflows.length} workflows`);
        }
      } else {
        console.log('WorkflowsStore not found in database');
        throw new Error('No workflows found in database');
      }
    } catch (error) {
      console.error('Error exporting workflows:', error);
      throw error;
    }

    // 파일로 다운로드
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = projectName ? `${projectName}_workflow.json` : 'workflows_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Simple workflow export completed successfully');
  } catch (error) {
    console.error('Simple workflow export failed:', error);
    throw error;
  }
};

// IndexedDB 상태 확인 (디버깅용)
export const checkIndexedDBStatus = async (): Promise<void> => {
  try {
    console.log('=== IndexedDB Status Check ===');
    
    // WorkflowDatabase 확인
    const workflowDB = await openWorkflowDB();
    console.log('WorkflowDatabase opened successfully');
    console.log('Available stores:', Array.from(workflowDB.objectStoreNames));
    
    // 각 저장소의 데이터 개수 확인
    for (const storeName of workflowDB.objectStoreNames) {
      try {
        const transaction = workflowDB.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const countRequest = store.count();
        
        await new Promise<void>((resolve, reject) => {
          countRequest.onsuccess = () => {
            console.log(`${storeName}: ${countRequest.result} items`);
            resolve();
          };
          countRequest.onerror = () => {
            console.log(`${storeName}: Error getting count`);
            resolve();
          };
        });
      } catch (error) {
        console.log(`${storeName}: Error accessing store`);
      }
    }
    
    // DeploymentDatabase 확인
    try {
      const deploymentDB = await openDeploymentDB();
      console.log('DeploymentDatabase opened successfully');
      console.log('Available stores:', Array.from(deploymentDB.objectStoreNames));
      
      for (const storeName of deploymentDB.objectStoreNames) {
        try {
          const transaction = deploymentDB.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const countRequest = store.count();
          
          await new Promise<void>((resolve, reject) => {
            countRequest.onsuccess = () => {
              console.log(`${storeName}: ${countRequest.result} items`);
              resolve();
            };
            countRequest.onerror = () => {
              console.log(`${storeName}: Error getting count`);
              resolve();
            };
          });
        } catch (error) {
          console.log(`${storeName}: Error accessing store`);
        }
      }
    } catch (error) {
      console.log('DeploymentDatabase not available:', error);
    }
    
    console.log('=== End Status Check ===');
  } catch (error) {
    console.error('Status check failed:', error);
  }
};
