import { Node, Edge, Viewport } from 'reactflow';
import { Workflow } from '../store/flowStore';
import { Deployment } from '../types/deployment';
import * as storageService from '../services/storageService';


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
      if (projectName) {
        // 특정 프로젝트만 export
        console.log(`Exporting specific workflow: ${projectName}`);
        const workflow = await storageService.getWorkflowByName(projectName);
        if (workflow) {
          exportData.workflows.push(workflow);
          console.log(`Found workflow: ${projectName}`);
        } else {
          console.log(`Workflow not found: ${projectName}`);
        }
      } else {
        // 모든 워크플로우 export
        console.log('Exporting all workflows');
        exportData.workflows = await storageService.getAllWorkflows();
        console.log(`Found ${exportData.workflows.length} workflows`);
      }
    } catch (error) {
      console.error('Error exporting workflows:', error);
    }

    // AI 연결 데이터 가져오기
    try {
      exportData.aiConnections = await storageService.getAllAIConnections();
      console.log(`Found ${exportData.aiConnections.length} AI connections`);
    } catch (error) {
      console.error('Error exporting AI connections:', error);
    }

    // 사용자 노드 데이터 가져오기
    try {
      exportData.userNodes = await storageService.getAllUserNodes();
      console.log(`Found ${exportData.userNodes.length} user nodes`);
    } catch (error) {
      console.error('Error exporting user nodes:', error);
    }

    // 배포 데이터 가져오기
    try {
      exportData.deployments = await storageService.getAllDeployments();
      console.log(`Found ${exportData.deployments.length} deployments`);
    } catch (error) {
      console.error('Error exporting deployments:', error);
    }

    // 배포 버전 데이터 가져오기 (모든 deployment의 버전들을 수집)
    try {
      const allVersions: any[] = [];
      for (const deployment of exportData.deployments) {
        try {
          const versions = await storageService.getDeploymentVersions(deployment.id);
          allVersions.push(...versions);
        } catch (err) {
          console.warn(`Failed to get versions for deployment ${deployment.id}:`, err);
        }
      }
      exportData.deploymentVersions = allVersions;
      console.log(`Found ${exportData.deploymentVersions.length} deployment versions`);
    } catch (error) {
      console.error('Error exporting deployment versions:', error);
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

    // 워크플로우 데이터 import (필수)
    let importedWorkflowsCount = 0;
    for (const workflow of importData.workflows) {
      try {
        await storageService.updateWorkflow(workflow.projectName, workflow);
        importedWorkflowsCount++;
      } catch (error) {
        console.warn(`Failed to import workflow: ${workflow.projectName}`, error);
      }
    }
    console.log(`Imported ${importedWorkflowsCount} workflows`);

    // 전체 export 형식인 경우에만 추가 데이터 import
    if (importData.aiConnections && importData.userNodes && importData.deployments && importData.deploymentVersions) {
      console.log('Importing additional data (full export format)');
      
      // AI 연결 데이터 import
      for (const connection of importData.aiConnections) {
        try {
          await storageService.updateAIConnection(connection.id, connection);
        } catch (error) {
          try {
            // 존재하지 않으면 생성
            await storageService.createAIConnection(connection);
          } catch (createError) {
            console.warn('Failed to import AI connection:', createError);
          }
        }
      }
      console.log(`Imported ${importData.aiConnections.length} AI connections`);

      // 사용자 노드 데이터 import
      for (const userNode of importData.userNodes) {
        try {
          await storageService.updateUserNode(userNode.id, userNode);
        } catch (error) {
          try {
            // 존재하지 않으면 생성
            await storageService.createUserNode(userNode);
          } catch (createError) {
            console.warn('Failed to import user node:', createError);
          }
        }
      }
      console.log(`Imported ${importData.userNodes.length} user nodes`);

      // 배포 데이터 import
      for (const deployment of importData.deployments) {
        try {
          await storageService.updateDeployment(deployment.id, deployment);
        } catch (error) {
          try {
            // 존재하지 않으면 생성
            await storageService.createDeployment(deployment);
          } catch (createError) {
            console.warn('Failed to import deployment:', createError);
          }
        }
      }
      console.log(`Imported ${importData.deployments.length} deployments`);

      // 배포 버전 데이터 import
      for (const version of importData.deploymentVersions) {
        try {
          await storageService.updateDeploymentVersion(version.id, version);
        } catch (error) {
          try {
            // 존재하지 않으면 생성
            await storageService.createDeploymentVersion(version);
          } catch (createError) {
            console.warn('Failed to import deployment version:', createError);
          }
        }
      }
      console.log(`Imported ${importData.deploymentVersions.length} deployment versions`);
    }

    console.log('Import completed successfully');
    return {
      success: true,
      message: `Successfully imported ${importedWorkflowsCount} workflows${importData.aiConnections ? ' and related data' : ''}`
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

    // 워크플로우 데이터만 import
    let importedCount = 0;
    for (const workflow of importData.workflows) {
      try {
        await storageService.updateWorkflow(workflow.projectName, workflow);
        importedCount++;
        console.log(`Imported workflow: ${workflow.projectName}`);
      } catch (error) {
        console.warn(`Failed to import workflow: ${workflow.projectName}`, error);
      }
    }
    console.log(`Successfully imported ${importedCount} workflows`);
    
    return {
      success: true,
      message: `Successfully imported ${importedCount} workflows`
    };
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
    const workflows = await storageService.getAllWorkflows();
    return workflows.map(wf => wf.projectName);
  } catch (error) {
    console.error('Failed to get workflow list:', error);
    return [];
  }
};

// 간단한 워크플로우만 export (테스트용)
export const exportWorkflowOnly = async (projectName?: string): Promise<void> => {
  try {
    console.log('Starting simple workflow export...');

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      workflows: [] as any[],
      message: 'Simple workflow export'
    };

    // 워크플로우 데이터만 가져오기
    if (projectName) {
      // 특정 프로젝트만 export
      console.log(`Exporting specific workflow: ${projectName}`);
      const workflow = await storageService.getWorkflowByName(projectName);
      if (workflow) {
        exportData.workflows.push(workflow);
        console.log(`Found workflow: ${projectName}`);
      } else {
        throw new Error(`Workflow "${projectName}" not found`);
      }
    } else {
      // 모든 워크플로우 export
      console.log('Exporting all workflows');
      exportData.workflows = await storageService.getAllWorkflows();
      console.log(`Found ${exportData.workflows.length} workflows`);
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

// MongoDB 상태 확인 (디버깅용)
export const checkMongoDBStatus = async (): Promise<void> => {
  try {
    console.log('=== MongoDB Storage Status Check ===');
    
    const workflows = await storageService.getAllWorkflows();
    console.log(`Workflows: ${workflows.length} items`);
    
    const aiConnections = await storageService.getAllAIConnections();
    console.log(`AI Connections: ${aiConnections.length} items`);
    
    const userNodes = await storageService.getAllUserNodes();
    console.log(`User Nodes: ${userNodes.length} items`);
    
    const deployments = await storageService.getAllDeployments();
    console.log(`Deployments: ${deployments.length} items`);
    
    console.log('=== End Status Check ===');
  } catch (error) {
    console.error('Status check failed:', error);
  }
};
