import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deployment, DeploymentStatus, DeploymentEnvironment } from '../../types/deployment';
import { Code, X, Play, Pause, Trash2, Rocket, AlertCircle, ChevronRight, ChevronDown, Folder, FileText, ExternalLink } from 'lucide-react';
import DeploymentPlayground from '../deployment/DeploymentPlayground';
import Editor from '@monaco-editor/react';
import { apiService } from '../../services/apiService';
import { useTranslation } from '../../hooks/useTranslation';

interface DeploymentListProps {
  deployments: Deployment[];
  isLoading: boolean;
  loadError: string | null;
  handleDeleteDeployment: (deploymentId: string) => void;
  handleActivateDeployment: (deploymentId: string) => void;
  handleDeactivateDeployment: (deploymentId: string) => void;
}

interface WorkflowGroup {
  workflowId: string;
  workflowName: string;
  deployments: Deployment[];
  isExpanded: boolean;
  environments: {
    dev: {
      isExpanded: boolean;
      deployments: Deployment[];
    };
    prod: {
      isExpanded: boolean;
      deployments: Deployment[];
    };
  };
}

const DeploymentList: React.FC<DeploymentListProps> = ({
  deployments,
  isLoading,
  loadError,
  handleDeleteDeployment,
  handleActivateDeployment,
  handleDeactivateDeployment,
}) => {
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [workflowGroups, setWorkflowGroups] = useState<WorkflowGroup[]>([]);
  const [apiResponseModalContent, setApiResponseModalContent] = useState<string | null>(null);
  const [apiModalTab, setApiModalTab] = useState<'javascript' | 'python' | 'curl'>('javascript');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const expandedStatesRef = useRef<Map<string, boolean>>(new Map());
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // 현재 테마 감지
  const isDarkMode = () => {
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  useEffect(() => {
    console.log('[DeploymentList] ➡️ 컴포넌트가 새로운 props로 렌더링됩니다.');
    if (isLoading) {
      console.log('[DeploymentList] ⏳ 상태: 로딩 중...');
    } else if (loadError) {
      console.error('[DeploymentList] ❌ 상태: 오류 발생.', loadError);
    } else {
      console.log(`[DeploymentList] ✅ 상태: 성공. ${deployments.length}개의 배포 목록을 받았습니다.`);
      console.log('[DeploymentList] 수신된 데이터:', deployments);
      organizeDeploymentsByWorkflow();
    }
  }, [deployments, isLoading, loadError]);

  const organizeDeploymentsByWorkflow = () => {
    const workflowMap = new Map<string, WorkflowGroup>();

    deployments.forEach(deployment => {
      const workflowName = deployment.workflowName || 'Unknown Workflow';
      
      // workflowName을 키로 사용하여 같은 ChatFlow 이름의 배포들을 그룹화
      if (!workflowMap.has(workflowName)) {
        // useRef를 사용하여 기존 확장 상태 유지
        const isExpanded = expandedStatesRef.current.get(workflowName) || false;
        
        workflowMap.set(workflowName, {
          workflowId: deployment.workflowId, // 첫 번째 workflowId를 사용
          workflowName,
          deployments: [],
          isExpanded: isExpanded, // useRef에서 가져온 확장 상태 사용
          environments: {
            dev: {
              isExpanded: false,
              deployments: []
            },
            prod: {
              isExpanded: false,
              deployments: []
            }
          }
        });
      }

      const group = workflowMap.get(workflowName)!;
      group.deployments.push(deployment);

                    // 각 환경별로 배포 분류
              const envKey = deployment.environment.toLowerCase() as 'dev' | 'prod';
              if (envKey === 'dev' || envKey === 'prod') {
                group.environments[envKey].deployments.push(deployment);
      }
    });

    // 배포를 생성일 기준으로 정렬 (최신순)
    workflowMap.forEach(group => {
      group.deployments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // 각 환경별 배포도 정렬
      Object.values(group.environments).forEach(env => {
        env.deployments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      });
    });

    setWorkflowGroups(Array.from(workflowMap.values()));
  };

  const toggleWorkflowExpansion = (workflowName: string) => {
    // useRef에 확장 상태 저장
    const currentExpanded = expandedStatesRef.current.get(workflowName) || false;
    expandedStatesRef.current.set(workflowName, !currentExpanded);
    
    setWorkflowGroups(prev => 
      prev.map(group => 
        group.workflowName === workflowName 
          ? { ...group, isExpanded: !currentExpanded }
          : group
      )
    );
  };

  const toggleEnvironmentExpansion = (workflowName: string, environment: 'dev' | 'prod') => {
    setWorkflowGroups(prev => 
      prev.map(group => 
        group.workflowName === workflowName 
          ? { 
              ...group, 
              environments: {
                ...group.environments,
                [environment]: {
                  ...group.environments[environment],
                  isExpanded: !group.environments[environment].isExpanded
                }
              }
            }
          : group
      )
    );
  };

  const handleStatusToggle = async (e: React.MouseEvent, deployment: Deployment) => {
    e.stopPropagation();
    
    const deploymentId = deployment.id;
    setIsProcessing(prev => ({ ...prev, [deploymentId]: true }));

    try {
      if (deployment.status === DeploymentStatus.ACTIVE) {
        await handleDeactivateDeployment(deploymentId);
      } else {
        // 백엔드에서 같은 환경의 다른 배포들을 자동으로 비활성화하므로
        // 프론트엔드에서는 단순히 활성화만 요청
        await handleActivateDeployment(deploymentId);
      }
    } catch (error) {
      console.error('Failed to toggle deployment status:', error);
      alert(`Failed to toggle deployment status for ${deployment.name}. See console for details.`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [deploymentId]: false }));
    }
  };

  const handleViewCode = async (deployment: Deployment) => {
    try {
      // 선택된 배포 저장
      setSelectedDeployment(deployment);
      
      // 배포의 워크플로우 정보 가져오기
      const deploymentWithVersions = await apiService.getDeploymentStatus(deployment.id);
      
      // 워크플로우 정보가 포함된 배포 객체 생성
      const deploymentWithWorkflow = {
        ...deployment,
        versions: deploymentWithVersions.versions
      };
      
      // API 호출 예시 코드 생성 (기본값: JavaScript)
      const apiExampleCode = generateApiExampleCode(deploymentWithWorkflow, 'javascript');
      setApiResponseModalContent(apiExampleCode);
      setApiModalTab('javascript'); // 기본 탭을 JavaScript로 설정
    } catch (error) {
      console.error('Failed to generate API example code:', error);
      alert(`Failed to generate API example code for ${deployment.name}. See console for details.`);
    }
  };

  const handleOpenWorkflow = (deployment: Deployment) => {
    // Workflow 캔버스 화면으로 직접 이동
    navigate(`/flow/${encodeURIComponent(deployment.workflowName)}`);
  };



  const handleTabChange = async (language: 'javascript' | 'python' | 'curl') => {
    if (selectedDeployment) {
      setApiModalTab(language);
      
      try {
        // 배포의 워크플로우 정보 가져오기
        const deploymentWithVersions = await apiService.getDeploymentStatus(selectedDeployment.id);
        
        // 워크플로우 정보가 포함된 배포 객체 생성
        const deploymentWithWorkflow = {
          ...selectedDeployment,
          versions: deploymentWithVersions.versions
        };
        
        const apiExampleCode = generateApiExampleCode(deploymentWithWorkflow, language);
        setApiResponseModalContent(apiExampleCode);
      } catch (error) {
        console.error('Failed to generate API example code for tab change:', error);
        // 에러가 발생하면 기본 샘플 코드 사용
        const apiExampleCode = generateApiExampleCode(selectedDeployment, language);
        setApiResponseModalContent(apiExampleCode);
      }
    }
  };

  const getEditorLanguage = (language: 'javascript' | 'python' | 'curl'): string => {
    switch (language) {
      case 'javascript':
        return 'javascript';
      case 'python':
        return 'python';
      case 'curl':
        return 'shell';
      default:
        return 'javascript';
    }
  };

  const generateApiExampleCode = (deployment: Deployment, language: 'javascript' | 'python' | 'curl'): string => {
    // 백엔드 API URL 생성 (포트 8000 사용)
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const baseUrl = `${protocol}//${hostname}:8000`;
    const deploymentId = deployment.id;
    
    // Start 노드의 설정에서 샘플 입력 데이터 생성
    const generateSampleInput = () => {
      try {
        // 배포의 워크플로우 스냅샷에서 Start 노드 찾기
        const workflowSnapshot = deployment.versions?.[0]?.workflowSnapshot;
        if (!workflowSnapshot?.nodes) {
          return { user_input: "Hello! This is a test message." };
        }

        const startNode = workflowSnapshot.nodes.find((node: any) => node.type === 'startNode');
        if (!startNode?.data?.config?.variables) {
          return { user_input: "Hello! This is a test message." };
        }

        // Start 노드의 변수 설정을 기반으로 샘플 입력 생성
        const sampleInput: any = {};
        startNode.data.config.variables.forEach((variable: any) => {
          if (variable.defaultValue !== undefined && variable.defaultValue !== null) {
            sampleInput[variable.name] = variable.defaultValue;
          } else {
            // 기본값이 없으면 타입에 따른 기본값 설정
            switch (variable.type) {
              case 'string':
                sampleInput[variable.name] = "Sample text";
                break;
              case 'number':
                sampleInput[variable.name] = 42;
                break;
              case 'boolean':
                sampleInput[variable.name] = true;
                break;
              case 'array':
                sampleInput[variable.name] = ["item1", "item2"];
                break;
              case 'object':
                sampleInput[variable.name] = { key: "value" };
                break;
              default:
                sampleInput[variable.name] = "Sample value";
            }
          }
        });

        return sampleInput;
      } catch (error) {
        console.error('Error generating sample input:', error);
        return { user_input: "Hello! This is a test message." };
      }
    };

    const sampleInput = generateSampleInput();
    const sampleInputJson = JSON.stringify(sampleInput, null, 2);
    
    switch (language) {
      case 'javascript':
        return `// Execute deployment
/**
 * Function to execute deployment
 * @param {Object} inputData - Input data matching the Start node configuration
 * @returns {Promise<Object>} Execution result
 */
const runDeployment = async (inputData) => {
  try {
    const response = await fetch('${baseUrl}/api/deployment/${deploymentId}/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input_data: inputData })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Deployment execution successful:', result.result);
      return result.result;
    } else {
      console.error('Deployment execution failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Usage example
// 실제 배포된 워크플로우의 입력 데이터 형태
const inputData = ${sampleInputJson};

// API 호출
runDeployment(inputData)
  .then(result => console.log('Result:', result))
  .catch(error => console.error('Error:', error));`;

                          case 'python':
                      return `import requests
import json

def run_deployment(input_data):
    """
    Function to execute deployment
    
    Args:
        input_data (dict): Input data matching the Start node configuration
    
    Returns:
        dict: Execution result
    """
    url = "${baseUrl}/api/deployment/${deploymentId}/run"
    
    payload = { "input_data": input_data }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("success"):
            print("Deployment execution successful:", result["result"])
            return result["result"]
        else:
            print("Deployment execution failed:", result.get("error"))
            raise Exception(result.get("error"))
            
    except requests.exceptions.RequestException as e:
        print("API call error:", e)
        raise e

# Usage example
if __name__ == "__main__":
    try:
        # 실제 배포된 워크플로우의 입력 데이터 형태
        input_data = ${sampleInputJson}
        
        # API 호출
        result = run_deployment(input_data)
        print("Result:", result)
    except Exception as e:
        print("Error:", e)`;

      case 'curl':
                              return `# Execute deployment
# 실제 배포된 워크플로우의 입력 데이터 형태
INPUT_DATA='${sampleInputJson}'

curl -X POST "${baseUrl}/api/deployment/${deploymentId}/run" \\
  -H "Content-Type: application/json" \\
  -d "{\\"input_data\\": $INPUT_DATA}"`;

      default:
        return '';
    }
  };

  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case DeploymentStatus.ACTIVE:
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-200';
      case DeploymentStatus.INACTIVE:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
      case DeploymentStatus.DRAFT:
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-200';
      case DeploymentStatus.FAILED:
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-200';
      case DeploymentStatus.DEPLOYING:
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getEnvironmentColor = (environment: DeploymentEnvironment) => {
    switch (environment) {
      case DeploymentEnvironment.PROD:
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-200';

      case DeploymentEnvironment.DEV:
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('deploymentList.loadingDeployments')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-red-600 dark:text-red-400 mb-2">{t('deploymentList.failedToLoad')}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('deploymentList.title')}</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlaygroundOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
          >
            <Rocket className="h-4 w-4 mr-2" />
            {t('deploymentList.playground')}
          </button>
        </div>
      </div>

      {workflowGroups.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('deploymentList.noDeployments')}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('deploymentList.chatflowAndEnvironments')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.version')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('deployment.environment')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.description')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('deploymentList.lastUpdated')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {workflowGroups.map((group) => (
                <React.Fragment key={group.workflowName}>
                  {/* Workflow Row */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleWorkflowExpansion(group.workflowName)}
                          className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {group.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <Folder className="h-5 w-5 text-blue-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {group.workflowName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t('deploymentList.deploymentCount', { count: group.deployments.length })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {group.deployments[0] && group.deployments[0].description ? (
                        <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={group.deployments[0].description}>
                          {group.deployments[0].description}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {group.deployments[0] ? 
                        new Date(group.deployments[0].updatedAt).toLocaleDateString() :
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                    </td>
                  </tr>

                  {/* Environment Rows (Expanded) */}
                  {group.isExpanded && (
                    <>
                                             {/* Dev Environment */}
                       <tr className="bg-gray-50 dark:bg-gray-900">
                      <td className="px-6 py-3 pl-16">
                           <div className="flex items-center">
                             <button
                               onClick={() => toggleEnvironmentExpansion(group.workflowName, 'dev')}
                               className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                             >
                               {group.environments.dev.isExpanded ? (
                                 <ChevronDown className="h-4 w-4" />
                               ) : (
                                 <ChevronRight className="h-4 w-4" />
                               )}
                             </button>
                             <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                             <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                               {t('deploymentList.development')}
                             </div>
                             <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                               ({group.environments.dev.deployments.length})
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-3 text-center">
                           {(() => {
                             const activeDeployment = group.environments.dev.deployments.find(d => d.status === DeploymentStatus.ACTIVE);
                             return activeDeployment ? (
                               <div className="text-sm font-medium text-gray-900 dark:text-white">
                                 v{activeDeployment.version}
                               </div>
                             ) : (
                               <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                             );
                           })()}
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-200">
                             DEV
                           </span>
                         </td>
                         <td className="px-6 py-3 text-center">
                           {(() => {
                             const activeDeployment = group.environments.dev.deployments.find(d => d.status === DeploymentStatus.ACTIVE);
                             return activeDeployment ? (
                               <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-200">
                                 ACTIVE
                               </span>
                             ) : (
                               <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                             );
                           })()}
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                         </td>
                       </tr>

                      {/* Dev Deployments */}
                      {group.environments.dev.isExpanded && group.environments.dev.deployments.map((deployment) => (
                        <tr key={deployment.id} className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800">
                          <td className="px-6 py-3 pl-24">
                        <div 
                          className="flex items-center cursor-pointer"
                          onClick={() => navigate(`/deployment/${deployment.id}`)}
                        >
                          <FileText className="h-4 w-4 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600">
                              {deployment.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {deployment.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="text-sm text-gray-900 dark:text-white">
                          v{deployment.version}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEnvironmentColor(deployment.environment)}`}>
                              {deployment.environment.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deployment.status)}`}>
                              {deployment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {deployment.description ? (
                          <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={deployment.description}>
                            {deployment.description}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        {new Date(deployment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center items-center space-x-2">
                          {deployment.status === DeploymentStatus.ACTIVE ? (
                            <button 
                              title="Deactivate" 
                              onClick={(e) => { e.stopPropagation(); handleStatusToggle(e, deployment); }}
                              disabled={isProcessing[deployment.id]}
                              className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          ) : (
                            <button 
                              title="Activate" 
                              onClick={(e) => { e.stopPropagation(); handleStatusToggle(e, deployment); }}
                              disabled={isProcessing[deployment.id]}
                              className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <button 
                            title="Open Workflow" 
                            onClick={(e) => { e.stopPropagation(); handleOpenWorkflow(deployment); }}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button 
                            title="View API Call Example" 
                            onClick={(e) => { e.stopPropagation(); handleViewCode(deployment); }}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            <Code className="h-4 w-4" />
                          </button>
                          <button 
                            title="Delete Deployment" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteDeployment(deployment.id); }}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}



                                             {/* Production Environment */}
                       <tr className="bg-gray-50 dark:bg-gray-900">
                         <td className="px-6 py-3 pl-16">
                           <div className="flex items-center">
                  <button
                               onClick={() => toggleEnvironmentExpansion(group.workflowName, 'prod')}
                               className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                             >
                               {group.environments.prod.isExpanded ? (
                                 <ChevronDown className="h-4 w-4" />
                               ) : (
                                 <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                             <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                             <div className="text-sm font-medium text-green-600 dark:text-green-400">
                               {t('deploymentList.production')}
                </div>
                             <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                               ({group.environments.prod.deployments.length})
              </div>
                    </div>
                         </td>
                         <td className="px-6 py-3 text-center">
                           {(() => {
                             const activeDeployment = group.environments.prod.deployments.find(d => d.status === DeploymentStatus.ACTIVE);
                             return activeDeployment ? (
                               <div className="text-sm font-medium text-gray-900 dark:text-white">
                                 v{activeDeployment.version}
                      </div>
                             ) : (
                               <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                             );
                           })()}
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-200">
                             PRODUCTION
                           </span>
                         </td>
                         <td className="px-6 py-3 text-center">
                           {(() => {
                             const activeDeployment = group.environments.prod.deployments.find(d => d.status === DeploymentStatus.ACTIVE);
                             return activeDeployment ? (
                               <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-200">
                                 ACTIVE
                               </span>
                             ) : (
                               <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                             );
                           })()}
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                         </td>
                         <td className="px-6 py-3 text-center">
                           <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                         </td>
                       </tr>

                      {/* Production Deployments */}
                      {group.environments.prod.isExpanded && group.environments.prod.deployments.map((deployment) => (
                        <tr key={deployment.id} className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800">
                          <td className="px-6 py-3 pl-24">
                            <div 
                              className="flex items-center cursor-pointer"
                              onClick={() => navigate(`/deployment/${deployment.id}`)}
                            >
                              <FileText className="h-4 w-4 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600">
                                  {deployment.name}
                    </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ID: {deployment.id.slice(0, 8)}...
                  </div>
              </div>
            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="text-sm text-gray-900 dark:text-white">
                              v{deployment.version}
          </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEnvironmentColor(deployment.environment)}`}>
                              {deployment.environment.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deployment.status)}`}>
                              {deployment.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {deployment.description ? (
                              <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={deployment.description}>
                                {deployment.description}
        </div>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                            {new Date(deployment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex justify-center items-center space-x-2">
                              {deployment.status === DeploymentStatus.ACTIVE ? (
              <button
                                  title="Deactivate" 
                                  onClick={(e) => { e.stopPropagation(); handleStatusToggle(e, deployment); }}
                                  disabled={isProcessing[deployment.id]}
                                  className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                >
                                  <Pause className="h-4 w-4" />
              </button>
                              ) : (
                                <button 
                                  title="Activate" 
                                  onClick={(e) => { e.stopPropagation(); handleStatusToggle(e, deployment); }}
                                  disabled={isProcessing[deployment.id]}
                                  className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}
                              <button 
                                title="Open Workflow" 
                                onClick={(e) => { e.stopPropagation(); handleOpenWorkflow(deployment); }}
                                className="p-1 text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              <button 
                                title="View API Call Example" 
                                onClick={(e) => { e.stopPropagation(); handleViewCode(deployment); }}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              >
                                <Code className="h-4 w-4" />
                              </button>
                              <button 
                                title="Delete Deployment" 
                                onClick={(e) => { e.stopPropagation(); handleDeleteDeployment(deployment.id); }}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                    </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* API Response Modal */}
      {apiResponseModalContent && selectedDeployment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('deploymentList.apiExamples')}</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedDeployment.name} (v{selectedDeployment.version})
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(apiResponseModalContent || '');
                      alert(t('alert.codeCopied'));
                    } catch (err) {
                      console.error('Failed to copy code: ', err);
                      alert(t('alert.codeCopyFailed'));
                    }
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
                  title={t('common.copy')}
                >
                  <Code size={16} className="mr-1" /> {t('common.copy')}
                </button>
                <button
                  onClick={() => {
                    setApiResponseModalContent(null);
                    setSelectedDeployment(null);
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* 탭 네비게이션 */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex space-x-1 p-3">
                <button
                  onClick={() => handleTabChange('javascript')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    apiModalTab === 'javascript'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  JavaScript/TypeScript
                </button>
                <button
                  onClick={() => handleTabChange('python')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    apiModalTab === 'python'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => handleTabChange('curl')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    apiModalTab === 'curl'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  cURL
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-auto flex-1">
              <div className="h-[60vh] rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                <Editor
                  height="100%"
                  language={getEditorLanguage(apiModalTab)}
                  value={apiResponseModalContent || ''}
                  theme={isDarkMode() ? 'vs-dark' : 'vs-light'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible'
                    },
                    wordWrap: 'on',
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Playground Modal */}
      <DeploymentPlayground
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
      />
    </div>
  );
};

export default DeploymentList;