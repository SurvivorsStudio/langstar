import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Deployment, DeploymentStatus } from '../../types/deployment';
import ExecutionList from '../execution/ExecutionList';
import ExecutionDetail from '../execution/ExecutionDetail.tsx';
import { useThemeStore } from '../../store/themeStore';

interface Execution {
  id: string;
  name: string;
  status: 'running' | 'succeeded' | 'failed' | 'aborted' | 'timed_out';
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error_message?: string;
}

const DeploymentDetail: React.FC = () => {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useThemeStore();
  
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [activeTab, setActiveTab] = useState<'executions'>('executions');
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deploymentId) {
      fetchDeploymentDetails();
    }
  }, [deploymentId]);

  const fetchDeploymentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/deployment/${deploymentId}`);
      const data = await response.json();
      
      if (data.success) {
        // 백엔드에서 반환하는 구조에 맞춰 데이터 병합
        const deploymentWithVersions = {
          ...data.deployment,
          versions: data.versions || []
        };
        setDeployment(deploymentWithVersions);
      } else {
        setError(data.message || 'Failed to load deployment');
      }
    } catch (error) {
      console.error('Error fetching deployment details:', error);
      setError('Failed to load deployment details');
    } finally {
      setLoading(false);
    }
  };

  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [executionInput, setExecutionInput] = useState('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isLoadingExecutionDetail, setIsLoadingExecutionDetail] = useState(false);

  const generateDefaultInput = () => {
    try {
      const workflowSnapshot = deployment?.versions?.[0]?.workflowSnapshot;
      if (!workflowSnapshot) return '{}';

      const startNode = workflowSnapshot.nodes.find((node: any) => node.type === 'startNode');
      if (!startNode?.data?.config?.variables) return '{}';

      const defaultInput: any = {};
      startNode.data.config.variables.forEach((variable: any) => {
        defaultInput[variable.name] = variable.defaultValue;
      });

      return JSON.stringify(defaultInput, null, 2);
    } catch (error) {
      console.error('Error generating default input:', error);
      return '{}';
    }
  };

  const handleStartExecution = () => {
    setIsExecutionModalOpen(true);
    setExecutionInput(generateDefaultInput());
    setExecutionResult(null);
    setExecutionLogs([]);
    setInputError(null);
  };

  const validateInput = (inputData: any) => {
    try {
      const workflowSnapshot = deployment?.versions?.[0]?.workflowSnapshot;
      if (!workflowSnapshot) return { isValid: true, error: null };

      const startNode = workflowSnapshot.nodes.find((node: any) => node.type === 'startNode');
      if (!startNode?.data?.config?.variables) return { isValid: true, error: null };

      const requiredVariables = startNode.data.config.variables;
      const missingVariables: string[] = [];

      requiredVariables.forEach((variable: any) => {
        if (!(variable.name in inputData)) {
          missingVariables.push(variable.name);
        }
      });

      if (missingVariables.length > 0) {
        return { 
          isValid: false, 
          error: `Missing required variables: ${missingVariables.join(', ')}` 
        };
      }

      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: 'Error validating input' };
    }
  };

  const handleExecuteDeployment = async () => {
    try {
      setIsExecuting(true);
      setIsLoadingExecutionDetail(true); // Execute 버튼 클릭 시 로딩 시작
      setInputError(null);
      setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Starting execution...`]);
      
      // 설정 팝업 닫기
      setIsExecutionModalOpen(false);

      // Input 데이터 파싱
      let inputData = {};
      try {
        inputData = JSON.parse(executionInput);
      } catch (error) {
        setInputError('Invalid JSON format');
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: Invalid JSON input`]);
        return;
      }

      // Input 데이터 검증
      const validation = validateInput(inputData);
      if (!validation.isValid) {
        setInputError(validation.error);
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: ${validation.error}`]);
        return;
      }

      // 실행 API 호출 - deployment ID를 사용
      const response = await fetch(`/api/deployment/${deployment?.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_data: inputData
        })
      });

      const data = await response.json();
      
      console.log('🔍 Execution response data:', data);

      if (data.success) {
        setExecutionResult(data);
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Execution completed successfully`]);
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Result: ${JSON.stringify(data.result, null, 2)}`]);
        
        // Execution History 새로고침을 위해 이벤트 발생
        console.log('Dispatching executionCompleted event');
        window.dispatchEvent(new CustomEvent('executionCompleted'));
        
        // 새로 생성된 실행의 ID를 가져와서 ExecutionDetail을 최신화
        const executionId = data.execution_id || data.result?.execution_id;
        if (executionId) {
          console.log('New execution created with ID:', executionId);
          
          // 즉시 로딩 시작
          setIsLoadingExecutionDetail(true);
          console.log('🔄 Loading new execution detail...');
          
          // 새 실행 정보를 가져와서 ExecutionDetail을 업데이트
          setTimeout(async () => {
            try {
              const executionResponse = await fetch(`/api/executions/${executionId}`);
              const executionData = await executionResponse.json();
              
              if (executionData.success && executionData.execution) {
                console.log('✅ Fetched new execution data:', executionData.execution);
                setSelectedExecution(executionData.execution);
              } else {
                console.log('⚠️ Execution data not found, trying alternative approach...');
                // 대안: 가장 최근 실행을 가져오기
                const executionsResponse = await fetch(`/api/workflows/${deployment?.workflowId}/executions?max_results=1`);
                const executionsData = await executionsResponse.json();
                
                if (executionsData.success && executionsData.executions && executionsData.executions.length > 0) {
                  console.log('✅ Using most recent execution:', executionsData.executions[0]);
                  setSelectedExecution(executionsData.executions[0]);
                }
              }
            } catch (error) {
              console.error('❌ Error fetching new execution data:', error);
            } finally {
              setIsLoadingExecutionDetail(false);
            }
          }, 2000); // 2초 후에 실행 정보를 가져옴 (더 긴 지연)
        }
      } else {
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: ${data.message || 'Execution failed'}`]);
      }
    } catch (error) {
      console.error('Error executing deployment:', error);
      setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: ${error}`]);
      setIsLoadingExecutionDetail(false); // 에러 발생 시 로딩 상태 해제
    } finally {
      setIsExecuting(false);
    }
  };


  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case DeploymentStatus.ACTIVE:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case DeploymentStatus.INACTIVE:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case DeploymentStatus.DEPLOYING:
        return <Clock className="w-4 h-4 text-blue-500" />;
      case DeploymentStatus.FAILED:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: DeploymentStatus) => {
    switch (status) {
      case DeploymentStatus.ACTIVE:
        return 'Active';
      case DeploymentStatus.INACTIVE:
        return 'Inactive';
      case DeploymentStatus.DEPLOYING:
        return 'Deploying';
      case DeploymentStatus.FAILED:
        return 'Failed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error</h3>
          <p className="text-gray-600 dark:text-gray-400">{error || 'Deployment not found'}</p>
          <button
            onClick={() => navigate('/workspace?tab=deployment')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/workspace?tab=deployment')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{deployment.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deployment Details</p>
              </div>
            </div>

          </div>
        </div>

        {/* Deployment Info */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Name:</span>
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300 mt-1">
                {deployment.workflowName || 'Unknown Workflow'}:{deployment.name}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">ID:</span>
              <p className="mt-1 text-gray-900 dark:text-gray-100">{deployment.id}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon(deployment.status)}
                <span className="text-gray-900 dark:text-gray-100">{getStatusText(deployment.status)}</span>
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Creation date:</span>
              <p className="mt-1 text-gray-900 dark:text-gray-100">{new Date(deployment.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8">
            <button className="flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm border-blue-500 text-blue-600 dark:text-blue-400">
              <Activity className="w-4 h-4" />
              <span>Executions</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab === 'executions' && (
          <div className="space-y-6">


            {/* Execution History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Execution History</h3>
                  <button
                    onClick={handleStartExecution}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start execution</span>
                  </button>
                </div>
              </div>
              <div className="p-4">
                {isLoadingExecutionDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Loading execution details...</p>
                    </div>
                  </div>
                ) : selectedExecution ? (
                  <ExecutionDetail 
                    execution={selectedExecution}
                    onBack={() => setSelectedExecution(null)}
                  />
                ) : (
                  <ExecutionList
                    workflowId={deployment.id}
                    workflowName={deployment.name}
                    onExecutionSelect={setSelectedExecution}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Execution Modal */}
        {isExecutionModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Execute Deployment: {deployment?.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Configure input data and execute the workflow
                  </p>
                </div>
                <button
                  onClick={() => setIsExecutionModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Input Data (JSON) <span className="text-red-500">*</span>
                  </label>
                  <Editor
                    height="300px"
                    language="json"
                    value={executionInput}
                    onChange={(value) => {
                      setExecutionInput(value || '{}');
                      setInputError(null);
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      theme: isDarkMode ? 'vs-dark' : 'vs-light',
                      lineNumbers: 'on',
                      folding: true,
                      wordWrap: 'on'
                    }}
                  />
                  {inputError && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-4 h-4" />
                        <span>{inputError}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    * Required variables are automatically populated based on the workflow's Start node configuration.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setIsExecutionModalOpen(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                    disabled={isExecuting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDeployment}
                    disabled={isExecuting}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isExecuting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Execute</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        

      </div>
    </div>
  );
};

export default DeploymentDetail; 