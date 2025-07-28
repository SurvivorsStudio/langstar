import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Edit, 
  MoreHorizontal, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  BarChart3,
  FileText,
  Tag,
  GitBranch,
  Settings,
  RefreshCw
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Deployment, DeploymentStatus } from '../../types/deployment';
import ExecutionList from '../execution/ExecutionList';
import DeploymentFlowGraph from './DeploymentFlowGraph.tsx';
import ExecutionDetail from '../execution/ExecutionDetail.tsx';

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
  
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [activeTab, setActiveTab] = useState<'executions' | 'monitoring' | 'logging' | 'definition' | 'aliases' | 'versions' | 'tags'>('executions');
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
      setInputError(null);
      setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Starting execution...`]);

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

      if (data.success) {
        setExecutionResult(data);
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Execution completed successfully`]);
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Result: ${JSON.stringify(data.result, null, 2)}`]);
        
        // Execution History 새로고침을 위해 이벤트 발생
        console.log('Dispatching executionCompleted event');
        window.dispatchEvent(new CustomEvent('executionCompleted'));
      } else {
        setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: ${data.message || 'Execution failed'}`]);
      }
    } catch (error) {
      console.error('Error executing deployment:', error);
      setExecutionLogs((prev: string[]) => [...prev, `[${new Date().toLocaleString()}] Error: ${error}`]);
    } finally {
      setIsExecuting(false);
    }
  };



  const handleEditDeployment = () => {
    navigate(`/flow-builder?deploymentId=${deploymentId}`);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600">{error || 'Deployment not found'}</p>
          <button
            onClick={() => navigate('/workspace')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/workspace')}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{deployment.name}</h1>
                <p className="text-sm text-gray-500">Deployment Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEditDeployment}
                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Deployment Info */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Arn:</span>
              <p className="font-mono text-xs text-gray-700 mt-1">
                langstar:ap-northeast-2:123456789012:workflow:{deployment.name}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <p className="mt-1">Standard</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon(deployment.status)}
                <span>{getStatusText(deployment.status)}</span>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Creation date:</span>
              <p className="mt-1">{new Date(deployment.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'executions', label: 'Executions', icon: Activity },
              { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
              { id: 'logging', label: 'Logging', icon: FileText },
              { id: 'definition', label: 'Definition', icon: GitBranch },
              { id: 'aliases', label: 'Aliases', icon: Tag },
              { id: 'versions', label: 'Versions', icon: GitBranch },
              { id: 'tags', label: 'Tags', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab === 'executions' && (
          <div className="space-y-6">
            {/* Execution Management Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Execution Management</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setExecutionLogs([]);
                      setExecutionResult(null);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                    title="Clear logs"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleStartExecution}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start execution</span>
                  </button>
                </div>
              </div>

              {/* Execution Status */}
              {isExecuting && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-blue-700 font-medium">Execution in progress...</span>
                  </div>
                </div>
              )}

              {/* Execution Logs */}
              {executionLogs.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Execution Logs</h4>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
                    {executionLogs.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution Result */}
              {executionResult && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Execution Result</h4>
                  <Editor
                    height="200px"
                    language="json"
                    value={JSON.stringify(executionResult, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      theme: 'vs-dark'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Execution History */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Execution History</h3>
              </div>
              <div className="p-4">
                {selectedExecution ? (
                  <ExecutionDetail 
                    execution={selectedExecution}
                    onBack={() => setSelectedExecution(null)}
                  />
                ) : (
                  <ExecutionList
                    workflowId={deployment.workflowId}
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
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Execute Deployment: {deployment?.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure input data and execute the workflow
                  </p>
                </div>
                <button
                  onClick={() => setIsExecutionModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Input Configuration */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        theme: 'vs-light',
                        lineNumbers: 'on',
                        folding: true,
                        wordWrap: 'on'
                      }}
                    />
                    {inputError && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4" />
                          <span>{inputError}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      * Required variables are automatically populated based on the workflow's Start node configuration.
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setIsExecutionModalOpen(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      disabled={isExecuting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteDeployment}
                      disabled={isExecuting}
                      className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
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

                {/* Right Column - Execution Status & Results */}
                <div className="space-y-4">
                  {/* Execution Status */}
                  {isExecuting && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-blue-700 font-medium">Execution in progress...</span>
                      </div>
                    </div>
                  )}

                  {/* Execution Logs */}
                  {executionLogs.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Execution Logs
                      </label>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-40 overflow-y-auto border">
                        {executionLogs.map((log, index) => (
                          <div key={index} className="mb-1">{log}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Execution Result */}
                  {executionResult && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Execution Result
                      </label>
                      <Editor
                        height="200px"
                        language="json"
                        value={JSON.stringify(executionResult, null, 2)}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          theme: 'vs-dark',
                          lineNumbers: 'on',
                          folding: true,
                          wordWrap: 'on'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'definition' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Definition</h3>
            <DeploymentFlowGraph deployment={deployment} />
          </div>
        )}
        
        {activeTab === 'monitoring' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monitoring</h3>
            <p className="text-gray-600">Monitoring dashboard will be implemented here.</p>
          </div>
        )}
        
        {activeTab === 'logging' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Logging</h3>
            <p className="text-gray-600">Logging configuration will be implemented here.</p>
          </div>
        )}
        
        {activeTab === 'aliases' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aliases</h3>
            <p className="text-gray-600">Alias management will be implemented here.</p>
          </div>
        )}
        
        {activeTab === 'versions' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Versions</h3>
            <p className="text-gray-600">Version management will be implemented here.</p>
          </div>
        )}
        
        {activeTab === 'tags' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
            <p className="text-gray-600">Tag management will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentDetail; 