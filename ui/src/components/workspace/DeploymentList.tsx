import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deployment, DeploymentStatus, DeploymentEnvironment } from '../../types/deployment';
import { PlusCircle, Code, ArrowRightCircle, ListChecks, X, Play, Pause, Trash2, Rocket, Grid, List, AlertCircle, ChevronRight, ChevronDown, Folder, FileText, ExternalLink, Zap, Activity } from 'lucide-react';
import { apiService } from '../../services/apiService';
import DeploymentPlayground from '../DeploymentPlayground';
import Editor from '@monaco-editor/react';

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
  activeDeployment: Deployment | null;
}

const DeploymentList: React.FC<DeploymentListProps> = ({
  deployments,
  isLoading,
  loadError,
  handleDeleteDeployment,
  handleActivateDeployment,
  handleDeactivateDeployment,
}) => {
  const [apiResponseModalContent, setApiResponseModalContent] = useState<string | null>(null);
  const [apiModalTab, setApiModalTab] = useState<'javascript' | 'python' | 'curl'>('javascript');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [workflowGroups, setWorkflowGroups] = useState<WorkflowGroup[]>([]);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedExecutionDeployment, setSelectedExecutionDeployment] = useState<Deployment | null>(null);
  const [executionInput, setExecutionInput] = useState<string>('{}');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const expandedStatesRef = useRef<Map<string, boolean>>(new Map());
  const navigate = useNavigate();
  
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
          activeDeployment: null
        });
      }

      const group = workflowMap.get(workflowName)!;
      group.deployments.push(deployment);

      // 활성 배포 찾기 (가장 최근에 활성화된 배포를 우선)
      if (deployment.status === DeploymentStatus.ACTIVE) {
        if (!group.activeDeployment || 
            new Date(deployment.updatedAt) > new Date(group.activeDeployment.updatedAt)) {
          group.activeDeployment = deployment;
        }
      }
    });

    // 배포를 생성일 기준으로 정렬 (최신순)
    workflowMap.forEach(group => {
      group.deployments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
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

  const handleStatusToggle = async (e: React.MouseEvent, deployment: Deployment) => {
    e.stopPropagation();
    
    const deploymentId = deployment.id;
    setIsProcessing(prev => ({ ...prev, [deploymentId]: true }));

    try {
      if (deployment.status === DeploymentStatus.ACTIVE) {
        await handleDeactivateDeployment(deploymentId);
      } else {
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
      // API 호출 예시 코드 생성 (기본값: JavaScript)
      const apiExampleCode = generateApiExampleCode(deployment, 'javascript');
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

  const handleExecuteDeployment = (deployment: Deployment) => {
    setSelectedExecutionDeployment(deployment);
    setExecutionInput('{}');
    setExecutionResult(null);
    setExecutionLogs([]);
    setIsExecutionModalOpen(true);
  };

  const handleViewLogs = (deployment: Deployment) => {
    setSelectedExecutionDeployment(deployment);
    fetchExecutionLogs(deployment.id);
    setIsLogModalOpen(true);
  };

  const fetchExecutionLogs = async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/workflows/${deploymentId}/executions`);
      const data = await response.json();
      if (data.success) {
        setExecutionLogs(data.executions.map((exec: any) => 
          `[${new Date(exec.start_time).toLocaleString()}] ${exec.status.toUpperCase()}: ${exec.name}`
        ));
      }
    } catch (error) {
      console.error('Error fetching execution logs:', error);
      setExecutionLogs(['Error fetching logs']);
    }
  };

  const executeDeployment = async () => {
    if (!selectedExecutionDeployment) return;

    setIsExecuting(true);
    setExecutionLogs([]);
    
    try {
      // 입력 데이터 파싱
      const inputData = JSON.parse(executionInput);
      
      // 실행 시작
      const response = await fetch(`/api/workflows/${selectedExecutionDeployment.id}/executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `execution-${Date.now()}`,
          input: inputData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setExecutionResult(data.execution);
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Started execution: ${data.execution.name}`]);
        
        // 실행 상태 모니터링
        monitorExecution(data.execution.id);
      } else {
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: ${data.message}`]);
      }
    } catch (error) {
      console.error('Error executing deployment:', error);
              setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: ${error}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  const monitorExecution = async (executionId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/executions/${executionId}/status`);
        const data = await response.json();
        
        if (data.success) {
          setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Status: ${data.status}`]);
          
          if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'aborted') {
            // 실행 완료
            if (data.status === 'succeeded') {
              setExecutionResult((prev: any) => ({ ...prev, status: data.status, output: data.output }));
            }
            return; // 모니터링 중단
          }
          
          // 1초 후 다시 체크
          setTimeout(checkStatus, 1000);
        }
      } catch (error) {
        console.error('Error monitoring execution:', error);
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error monitoring: ${error}`]);
      }
    };
    
    checkStatus();
  };

  const handleTabChange = (language: 'javascript' | 'python' | 'curl') => {
    if (selectedDeployment) {
      setApiModalTab(language);
      const apiExampleCode = generateApiExampleCode(selectedDeployment, language);
      setApiResponseModalContent(apiExampleCode);
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
    
    switch (language) {
      case 'javascript':
        return `// Execute deployment
const runDeployment = async (inputData) => {
  try {
    const response = await fetch('${baseUrl}/api/deployment/${deploymentId}/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input_data: inputData
      })
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
runDeployment("Hello! This is a test message.")
  .then(result => console.log('Result:', result))
  .catch(error => console.error('Error:', error));`;

      case 'python':
        return `import requests
import json

def run_deployment(input_data):
    """
    Function to execute deployment
    
    Args:
        input_data (str): User input data
    
    Returns:
        dict: Execution result
    """
    url = "${baseUrl}/api/deployment/${deploymentId}/run"
    
    payload = {
        "input_data": input_data
    }
    
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
        result = run_deployment("Hello! This is a test message.")
        print("Result:", result)
    except Exception as e:
        print("Error:", e)`;

      case 'curl':
        return `# Execute deployment
curl -X POST "${baseUrl}/api/deployment/${deploymentId}/run" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_data": "Hello! This is a test message."
  }'`;

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
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-200';
      case DeploymentEnvironment.STAGING:
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-200';
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
            <p className="text-gray-600 dark:text-gray-400">Loading deployments...</p>
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
            <p className="text-red-600 dark:text-red-400 mb-2">Failed to load deployments</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">ChatFlow Deployments</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlaygroundOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Playground
          </button>
        </div>
      </div>

      {workflowGroups.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No ChatFlow deployments available. Create a new one to get started.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ChatFlow
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Active Version
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Environment
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Deployed
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {workflowGroups.map((group) => (
                <React.Fragment key={group.workflowName}>
                  {/* ChatFlow Row */}
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
                            {group.deployments.length} version{group.deployments.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {group.activeDeployment ? (
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          v{group.activeDeployment.version}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No active version</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {group.activeDeployment && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEnvironmentColor(group.activeDeployment.environment)}`}>
                          {group.activeDeployment.environment}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {group.activeDeployment && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(group.activeDeployment.status)}`}>
                          {group.activeDeployment.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {group.activeDeployment && group.activeDeployment.description ? (
                        <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={group.activeDeployment.description}>
                          {group.activeDeployment.description}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {group.activeDeployment ? 
                        new Date(group.activeDeployment.deployedAt || group.activeDeployment.createdAt).toLocaleDateString() :
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/* 상위 ChatFlow 항목에서는 액션 버튼 숨김 */}
                    </td>
                  </tr>

                  {/* Version Rows (Expanded) */}
                  {group.isExpanded && group.deployments.map((deployment) => (
                    <tr key={deployment.id} className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <td className="px-6 py-3 pl-16">
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
                          {deployment.environment}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deployment.status)}`}>
                          {deployment.status}
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
                            title="Execute Deployment" 
                            onClick={(e) => { e.stopPropagation(); handleExecuteDeployment(deployment); }}
                            className="p-1 text-orange-600 hover:text-orange-800"
                          >
                            <Zap className="h-4 w-4" />
                          </button>
                          <button 
                            title="View Logs" 
                            onClick={(e) => { e.stopPropagation(); handleViewLogs(deployment); }}
                            className="p-1 text-purple-600 hover:text-purple-800"
                          >
                            <Activity className="h-4 w-4" />
                          </button>
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Execution Modal */}
      {isExecutionModalOpen && selectedExecutionDeployment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <Zap className="h-6 w-6 text-orange-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Execute Deployment
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedExecutionDeployment.name} (v{selectedExecutionDeployment.version})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExecutionModalOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex">
              {/* Input Panel */}
              <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Input Parameters
                </h4>
                <Editor
                  height="300px"
                  language="json"
                  value={executionInput}
                  onChange={(value) => setExecutionInput(value || '{}')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    theme: isDarkMode() ? 'vs-dark' : 'vs-light'
                  }}
                />
                <div className="mt-4">
                  <button
                    onClick={executeDeployment}
                    disabled={isExecuting}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isExecuting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>Execute</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Output Panel */}
              <div className="w-1/2 p-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Execution Logs
                </h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 h-64 overflow-y-auto font-mono text-xs">
                  {executionLogs.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400">
                      No logs yet. Click Execute to start...
                    </div>
                  ) : (
                    executionLogs.map((log, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{log}</span>
                      </div>
                    ))
                  )}
                </div>
                
                {executionResult && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Result
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-gray-700 dark:text-gray-300">
                        {JSON.stringify(executionResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {isLogModalOpen && selectedExecutionDeployment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <Activity className="h-6 w-6 text-purple-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Execution Logs
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedExecutionDeployment.name} (v{selectedExecutionDeployment.version})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 h-full overflow-y-auto font-mono text-xs">
                {executionLogs.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400">
                    No execution logs found.
                  </div>
                ) : (
                  executionLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Response Modal */}
      {apiResponseModalContent && selectedDeployment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">API Call Example</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedDeployment.name} (v{selectedDeployment.version})
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(apiResponseModalContent || '');
                      alert('Code copied to clipboard!');
                    } catch (err) {
                      console.error('Failed to copy code: ', err);
                      alert('Failed to copy code. See console for details.');
                    }
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
                  title="Copy Code"
                >
                  <Code size={16} className="mr-1" /> Copy
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