import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  RefreshCw,
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Code,
  FileText,
  BarChart3,
  GitBranch,
  MessageSquare,
  Bot,
  Search,
  Circle,
  FileText as DocumentTextIcon
} from 'lucide-react';
import Editor from '@monaco-editor/react';

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
  workflow_snapshot?: any;
  node_execution_history?: NodeExecutionHistory[];
  state_transitions_list?: StateTransition[];
  api_call_info?: Record<string, any>;
  execution_source?: string;
  deployment_id?: string;
}

interface NodeExecutionHistory {
  node_id: string;
  node_type: string;
  node_name: string;
  status: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  input: Record<string, any>;
  output: Record<string, any>;
  error_message?: string;
  position: { x: number; y: number };
}

interface StateTransition {
  timestamp: string;
  state: string;
  node_id: string;
  node_name: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
}

interface ExecutionHistory {
  id: string;
  state_name: string;
  state_type: string;
  status: string;
  start_time: string;
  end_time?: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  error_message?: string;
}

interface ExecutionDetailProps {
  execution: Execution;
  onBack: () => void;
}

const ExecutionDetail: React.FC<ExecutionDetailProps> = ({ execution, onBack }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'input-output' | 'definition' | 'detailed-logs'>('details');
  const [selectedState, setSelectedState] = useState<NodeExecutionHistory | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [detailedLogs, setDetailedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutionHistory();
  }, [execution.id]);

  const fetchExecutionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/executions/${execution.id}/history`);
      const data = await response.json();
      
      if (data.success) {
        setExecutionHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching execution history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedLogs = async () => {
    try {
      if (execution.deployment_id) {
        const response = await fetch(`/api/deployments/${execution.deployment_id}/executions/${execution.id}/detailed-logs`);
        const data = await response.json();
        
        if (data.success) {
          setDetailedLogs(data.logs || []);
        }
      }
    } catch (error) {
      console.error('Error fetching detailed logs:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'detailed-logs') {
      fetchDetailedLogs();
    }
  }, [activeTab, execution.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'aborted':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Succeeded';
      case 'failed':
        return 'Failed';
      case 'running':
        return 'Running';
      case 'aborted':
        return 'Aborted';
      case 'timed_out':
        return 'Timed Out';
      default:
        return status;
    }
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return '-';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Execution: {execution.name}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusIcon(execution.status)}
                  <span className="text-sm font-medium">{getStatusText(execution.status)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              {execution.status === 'running' && (
                <button className="px-3 py-2 text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 flex items-center space-x-2">
                  <Square className="w-4 h-4" />
                  <span>Stop execution</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Execution Info */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Execution ID:</span>
              <p className="font-mono text-xs text-gray-700 mt-1">{execution.id}</p>
            </div>
            <div>
              <span className="text-gray-500">Execution Status:</span>
              <p className="mt-1">{getStatusText(execution.status)}</p>
            </div>
            <div>
              <span className="text-gray-500">Execution Source:</span>
              <p className="mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  execution.execution_source === 'external' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {execution.execution_source === 'external' ? 'External API' : 'Internal'}
                </span>
              </p>
            </div>
            <div>
              <span className="text-gray-500">State transitions:</span>
              <p className="mt-1">{executionHistory.length}</p>
            </div>
            <div>
              <span className="text-gray-500">Start time:</span>
              <p className="mt-1">{formatDateTime(execution.start_time)}</p>
            </div>
            <div>
              <span className="text-gray-500">End time:</span>
              <p className="mt-1">{execution.end_time ? formatDateTime(execution.end_time) : '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <p className="mt-1">{formatDuration(execution.duration_ms)}</p>
            </div>
            {execution.api_call_info?.client_ip && (
              <div>
                <span className="text-gray-500">Client IP:</span>
                <p className="mt-1 font-mono text-xs">{execution.api_call_info.client_ip}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'details', label: 'Details', icon: Eye },
              { id: 'input-output', label: 'Execution input and output', icon: Code },
              { id: 'detailed-logs', label: 'Detailed Logs', icon: DocumentTextIcon },
              { id: 'definition', label: 'Definition', icon: GitBranch }
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
      <div className="flex h-screen">
        {activeTab === 'details' && (
          <>
            {/* Left Panel - Graph View */}
            <div className="w-2/3 p-6">
              <div className="bg-white rounded-lg shadow h-full">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Graph view</h3>
                </div>
                <div className="p-4 h-full overflow-auto">
                  {/* Workflow Graph with Nodes */}
                  {(() => {
                    const nodes = execution.workflow_snapshot?.nodes || [];
                    const minY = nodes.length > 0 ? Math.min(...nodes.map((n: any) => n.position?.y || 0)) : 0;
                    const maxY = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.position?.y || 0)) : 0;
                    const minX = nodes.length > 0 ? Math.min(...nodes.map((n: any) => n.position?.x || 0)) : 0;
                    const maxX = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.position?.x || 0)) : 0;
                    
                    const graphHeight = Math.max(600, maxY - minY + 300);
                    const graphWidth = Math.max(800, maxX - minX + 400);
                    
                    return (
                      <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-8" style={{
                        minHeight: '600px',
                        height: `${graphHeight}px`,
                        width: `${graphWidth}px`,
                        margin: '0 auto'
                      }}>
                        {execution.workflow_snapshot?.nodes?.map((node: any) => {
                          const nodeHistory = execution.node_execution_history?.find(
                            (h: NodeExecutionHistory) => h.node_id === node.id
                          );
                          
                          const getNodeIcon = (nodeType: string) => {
                            switch (nodeType) {
                              case 'startNode':
                                return <Play className="w-4 h-4" />;
                              case 'endNode':
                                return <Square className="w-4 h-4" />;
                              case 'promptNode':
                                return <MessageSquare className="w-4 h-4" />;
                              case 'agentNode':
                                return <Bot className="w-4 h-4" />;
                              case 'ragNode':
                                return <Search className="w-4 h-4" />;
                              default:
                                return <Circle className="w-4 h-4" />;
                            }
                          };
                          
                          const getNodeColor = (nodeType: string, status: string) => {
                            if (status === 'succeeded') {
                              switch (nodeType) {
                                case 'startNode':
                                  return 'bg-green-500 border-green-600';
                                case 'endNode':
                                  return 'bg-purple-500 border-purple-600';
                                case 'promptNode':
                                  return 'bg-blue-500 border-blue-600';
                                case 'agentNode':
                                  return 'bg-orange-500 border-orange-600';
                                case 'ragNode':
                                  return 'bg-indigo-500 border-indigo-600';
                                default:
                                  return 'bg-gray-500 border-gray-600';
                              }
                            } else if (status === 'failed') {
                              return 'bg-red-500 border-red-600';
                            } else if (status === 'running') {
                              return 'bg-yellow-500 border-yellow-600';
                            }
                            return 'bg-gray-400 border-gray-500';
                          };
                          
                          return (
                            <div
                              key={node.id}
                              onClick={() => setSelectedState(nodeHistory as any)}
                              className={`absolute group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                                selectedState?.node_id === node.id ? 'z-20' : 'z-10'
                              }`}
                              style={{
                                left: `${(node.position?.x || 0) + 50}px`,
                                top: `${(node.position?.y || 0) + 50}px`
                              }}
                            >
                              <div className={`relative p-4 rounded-lg shadow-lg border-2 transition-all duration-300 ${
                                nodeHistory ? getNodeColor(nodeHistory.node_type, nodeHistory.status) : 'bg-gray-400 border-gray-500'
                              } ${nodeHistory?.status === 'succeeded' ? 'animate-pulse' : ''}`}>
                                <div className="flex items-center space-x-2 text-white">
                                  {getNodeIcon(nodeHistory?.node_type || node.type)}
                                  <span className="font-medium text-sm">{nodeHistory?.node_name || node.data?.label || node.id}</span>
                                </div>
                                <div className="mt-2 text-white text-xs">
                                  <p>Status: {nodeHistory?.status || 'unknown'}</p>
                                  {nodeHistory?.duration_ms !== undefined && (
                                    <p>Duration: {formatDuration(nodeHistory.duration_ms)}</p>
                                  )}
                                </div>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                  {nodeHistory?.node_name || node.data?.label || node.id}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        <svg className="absolute inset-0 pointer-events-none" style={{ 
                          width: '100%', 
                          height: '100%',
                          minHeight: '600px'
                        }}>
                          {execution.workflow_snapshot?.edges?.map((edge: any) => {
                            const sourceNode = execution.workflow_snapshot.nodes.find((n: any) => n.id === edge.source);
                            const targetNode = execution.workflow_snapshot.nodes.find((n: any) => n.id === edge.target);
                            
                            if (!sourceNode || !targetNode) return null;
                            
                            const sourceX = (sourceNode.position?.x || 0) + 140;
                            const sourceY = (sourceNode.position?.y || 0) + 100;
                            const targetX = (targetNode.position?.x || 0) + 140;
                            const targetY = (targetNode.position?.y || 0) + 100;
                            
                            const midX = (sourceX + targetX) / 2;
                            const midY = (sourceY + targetY) / 2;
                            const curve = 30;
                            
                            return (
                              <g key={edge.id}>
                                <path
                                  d={`M ${sourceX} ${sourceY} Q ${midX} ${midY - curve} ${targetX} ${targetY}`}
                                  stroke="#E5E7EB"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  d={`M ${sourceX} ${sourceY} Q ${midX} ${midY - curve} ${targetX} ${targetY}`}
                                  stroke="#3B82F6"
                                  strokeWidth="2"
                                  fill="none"
                                  className="animate-pulse"
                                />
                                <defs>
                                  <marker
                                    id={`arrow-${edge.id}`}
                                    markerWidth="12"
                                    markerHeight="8"
                                    refX="10"
                                    refY="4"
                                    orient="auto"
                                  >
                                    <polygon 
                                      points="0 0, 12 4, 0 8" 
                                      fill="#3B82F6"
                                      className="animate-pulse"
                                    />
                                  </marker>
                                </defs>
                                <path
                                  d={`M ${sourceX} ${sourceY} Q ${midX} ${midY - curve} ${targetX} ${targetY}`}
                                  stroke="#3B82F6"
                                  strokeWidth="2"
                                  fill="none"
                                  markerEnd={`url(#arrow-${edge.id})`}
                                  className="animate-pulse"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Panel - Selected Node Details */}
            <div className="w-1/3 p-6">
              <div className="bg-white rounded-lg shadow h-full">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedState ? selectedState.node_name : 'Select a node'}
                  </h3>
                  {selectedState && (
                    <p className="text-sm text-gray-500 mt-1">{selectedState.node_type}</p>
                  )}
                </div>
                <div className="p-4 h-full overflow-auto">
                  {selectedState ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Node Status</h4>
                        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          {getStatusIcon(selectedState.status)}
                          <span className="font-medium">{getStatusText(selectedState.status)}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Execution Time</h4>
                        <div className="text-sm text-gray-600">
                          <p>Start: {formatDateTime(selectedState.start_time)}</p>
                          <p>End: {formatDateTime(selectedState.end_time)}</p>
                          <p>Duration: {formatDuration(selectedState.duration_ms)}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Node Input</h4>
                        <Editor
                          height="150px"
                          language="json"
                          value={JSON.stringify(selectedState.input, null, 2)}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 12,
                            theme: 'vs-light'
                          }}
                        />
                      </div>
                      
                      {selectedState.output && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Node Output</h4>
                          <Editor
                            height="150px"
                            language="json"
                            value={JSON.stringify(selectedState.output, null, 2)}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 12,
                              theme: 'vs-light'
                            }}
                          />
                        </div>
                      )}
                      
                      {selectedState.error_message && (
                        <div>
                          <h4 className="text-sm font-medium text-red-900 mb-2">Error Message</h4>
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{selectedState.error_message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <FileText className="w-12 h-12 mb-4" />
                      <p>Select a node from the graph to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'input-output' && (
          <div className="w-full p-6">
            <div className="bg-white rounded-lg shadow h-full">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Execution Input and Output</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Input Data</h4>
                  <Editor
                    height="200px"
                    language="json"
                    value={JSON.stringify(execution.input, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      theme: 'vs-light'
                    }}
                  />
                </div>
                
                {execution.output && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Output Data</h4>
                    <Editor
                      height="200px"
                      language="json"
                      value={JSON.stringify(execution.output, null, 2)}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        theme: 'vs-light'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detailed-logs' && (
          <div className="w-full p-6">
            <div className="bg-white rounded-lg shadow h-full">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detailed Node Execution Logs</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time logs from each node execution with timing and data flow
                </p>
              </div>
              <div className="p-6">
                {detailedLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No detailed logs available for this execution</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detailedLogs.map((log, index) => (
                      <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              log.status === 'succeeded' ? 'bg-green-500' :
                              log.status === 'failed' ? 'bg-red-500' :
                              log.status === 'started' ? 'bg-blue-500' : 'bg-gray-500'
                            }`} />
                            <h4 className="font-medium text-gray-900">{log.node_name}</h4>
                            <span className="text-sm text-gray-500">({log.node_type})</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Duration: {log.duration_ms || 0}ms</span>
                            <span>{formatDateTime(log.start_time)}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Input Data */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Input Data</h5>
                            <div className="bg-gray-50 rounded p-3 max-h-40 overflow-auto">
                              <Editor
                                height="120px"
                                language="json"
                                value={JSON.stringify(log.input_data || {}, null, 2)}
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  fontSize: 10,
                                  theme: 'vs-light',
                                  scrollBeyondLastLine: false
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Output Data */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Output Data</h5>
                            <div className="bg-gray-50 rounded p-3 max-h-40 overflow-auto">
                              <Editor
                                height="120px"
                                language="json"
                                value={JSON.stringify(log.output_data || {}, null, 2)}
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  fontSize: 10,
                                  theme: 'vs-light',
                                  scrollBeyondLastLine: false
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Error Information */}
                        {log.error_message && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-red-700 mb-2">Error Details</h5>
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <p className="text-sm text-red-800 mb-2">{log.error_message}</p>
                              {log.error_traceback && (
                                <details className="mt-2">
                                  <summary className="text-sm text-red-700 cursor-pointer">View Stack Trace</summary>
                                  <pre className="text-xs text-red-800 mt-2 whitespace-pre-wrap bg-red-100 p-2 rounded">
                                    {log.error_traceback}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Metadata */}
                        {log.metadata && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Function: {log.metadata.function_name}</span>
                              <span>Module: {log.metadata.module}</span>
                              {log.position && (
                                <span>Position: ({log.position.x}, {log.position.y})</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'definition' && (
          <div className="w-full p-6">
            <div className="bg-white rounded-lg shadow h-full">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Workflow Definition</h3>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {/* API Call Information */}
                  {execution.api_call_info && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">API Call Information</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Client IP:</span>
                            <p className="text-sm text-gray-900 font-mono">{execution.api_call_info.client_ip || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">User Agent:</span>
                            <p className="text-sm text-gray-900 font-mono truncate">{execution.api_call_info.user_agent || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Request Method:</span>
                            <p className="text-sm text-gray-900">{execution.api_call_info.request_method || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Content Type:</span>
                            <p className="text-sm text-gray-900">{execution.api_call_info.content_type || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Referer:</span>
                            <p className="text-sm text-gray-900 font-mono truncate">{execution.api_call_info.referer || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Origin:</span>
                            <p className="text-sm text-gray-900 font-mono truncate">{execution.api_call_info.origin || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {execution.api_call_info.headers && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">All Headers:</span>
                            <Editor
                              height="150px"
                              language="json"
                              value={JSON.stringify(execution.api_call_info.headers, null, 2)}
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 11,
                                theme: 'vs-light'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Workflow Snapshot */}
                  {execution.workflow_snapshot && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Workflow Snapshot</h4>
                      <Editor
                        height="400px"
                        language="json"
                        value={JSON.stringify(execution.workflow_snapshot, null, 2)}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 11,
                          theme: 'vs-light'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionDetail; 