import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Circle,
  RefreshCw,
  Square,
  Search,
  FileText as DocumentTextIcon,
  Play,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  ReactFlowInstance,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
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
  workflow_snapshot?: any;
  node_execution_history?: any[];
  state_transitions_list?: any[];
  api_call_info?: Record<string, any>;
  execution_source?: string;
  deployment_id?: string;
  arn?: string;
}

interface ExecutionDetailProps {
  execution: Execution;
  onBack: () => void;
}

// Execution용 커스텀 노드 컴포넌트
const ExecutionNode = ({ data, isConnectable }: any) => {
  const { status, nodeLog, getNodeColorClass } = data;
  const [isDragging, setIsDragging] = useState(false);
  

  
  const getNodeStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'startNode':
        return <Play className="w-4 h-4" />;
      case 'promptNode':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'endNode':
        return <Square className="w-4 h-4" />;
      case 'agentNode':
        return <Search className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg border-2 shadow-lg transition-all duration-300 hover:shadow-xl ${getNodeColorClass(data.nodeType, status)} ${data.selected ? 'ring-4 ring-blue-400 ring-opacity-50 shadow-2xl scale-105' : ''}`} 
      style={{ 
        width: '100%', 
        height: '160px', 
        boxSizing: 'border-box',
        // 드래그 중일 때는 transition 비활성화
        transition: isDragging ? 'none' : 'all 0.3s ease'
      }}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* Input Handle (Top Center) */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      
      {/* Node Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-2">
          {getNodeIcon(data.nodeType)}
          <span className="font-medium text-gray-900 dark:text-gray-100">{data.label}</span>
        </div>
        <div className="flex items-center space-x-1">
          {getNodeStatusIcon(status)}
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{data.description || 'No description'}</p>
        

        
                    {/* Node status and basic info */}
            {nodeLog && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Status: {status}
                {nodeLog.duration_ms && (
                  <span className="ml-2">Duration: {nodeLog.duration_ms}ms</span>
                )}
              </div>
            )}
      </div>

      {/* Status indicator */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
        status === 'succeeded' ? 'bg-green-500' :
        status === 'failed' ? 'bg-red-500' :
        status === 'running' ? 'bg-yellow-500' :
        'bg-gray-400'
      }`} />
      
      {/* Output Handle (Bottom Center) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  executionNode: ExecutionNode,
};


const ExecutionDetail: React.FC<ExecutionDetailProps> = ({ execution, onBack }) => {
  const { isDarkMode } = useThemeStore();
  const [detailedLogs, setDetailedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const getNodeColorClass = (nodeType: string, status: string) => {
    if (status === 'failed') return isDarkMode ? 'bg-red-900/20 border-red-600 text-red-300' : 'bg-red-100 border-red-300 text-red-800';
    if (status === 'running') return isDarkMode ? 'bg-yellow-900/20 border-yellow-600 text-yellow-300' : 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (status === 'succeeded') {
      switch (nodeType) {
        case 'startNode':
          return isDarkMode ? 'bg-green-900/20 border-green-600 text-green-300' : 'bg-green-100 border-green-300 text-green-800';
        case 'promptNode':
          return isDarkMode ? 'bg-blue-900/20 border-blue-600 text-blue-300' : 'bg-blue-100 border-blue-300 text-blue-800';
        case 'endNode':
          return isDarkMode ? 'bg-purple-900/20 border-purple-600 text-purple-300' : 'bg-purple-100 border-purple-300 text-purple-800';
        default:
          return isDarkMode ? 'bg-green-900/20 border-green-600 text-green-300' : 'bg-green-100 border-green-300 text-green-800';
      }
    }
    return isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-800';
  };



  // React Flow 노드와 엣지를 위한 상태
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // 초기 뷰포트 설정
  const initialViewport = { x: 0, y: 0, zoom: 1 };

  useEffect(() => {
    console.log('🔄 useEffect triggered with execution:', execution);
    console.log('🆔 Execution ID:', execution.id);
    console.log('📦 Execution deployment_id:', execution.deployment_id);
    fetchDetailedLogs();
  }, [execution.id]);

  // 워크플로우 스냅샷을 React Flow 노드와 엣지로 변환
  const convertWorkflowToReactFlow = useCallback(() => {
    console.log('Converting workflow to React Flow:', execution.workflow_snapshot);
    
    if (!execution.workflow_snapshot?.nodes) {
      console.log('No workflow snapshot nodes found, creating default nodes');
      // 기본 노드 생성 - 중앙 배치
      const containerWidth = 800;
      const containerHeight = 600;
      const nodeWidth = 256;
      const nodeHeight = 160;
      const fixedSpacing = 220;
      const totalHeight = 2 * fixedSpacing; // start와 end 노드
      const startY = (containerHeight - totalHeight) / 2;
      
      const defaultNodes: Node[] = [
        {
          id: 'start',
          type: 'executionNode',
          position: { x: (containerWidth - 2 * nodeWidth - fixedSpacing) / 2, y: startY },
          data: {
            label: 'Start',
            description: 'Starting point of the workflow',
            nodeType: 'startNode',
            status: 'succeeded',
            nodeLog: null,
            config: {},
            selected: selectedNodeId === 'start',
            getNodeColorClass
          },
          style: { width: nodeWidth, height: nodeHeight }
        },
        {
          id: 'end',
          type: 'executionNode',
          position: { x: (containerWidth - 2 * nodeWidth - fixedSpacing) / 2 + nodeWidth + fixedSpacing, y: startY },
          data: {
            label: 'End',
            description: 'End point of the workflow',
            nodeType: 'endNode',
            status: 'succeeded',
            nodeLog: null,
            config: {},
            selected: selectedNodeId === 'end',
            getNodeColorClass
          },
          style: { width: nodeWidth, height: nodeHeight }
        }
      ];
      
      const defaultEdges: Edge[] = [
        {
          id: 'start-end',
          source: 'start',
          target: 'end',
          type: 'default',
          style: { 
            stroke: isDarkMode ? '#9CA3AF' : '#6B7280', 
            strokeWidth: 2, 
            strokeDasharray: '5,5',
            animation: 'flowAnimation 2s linear infinite'
          },
          markerEnd: 'arrow',
          animated: true
        }
      ];
      
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      return;
    }

        // 실제 워크플로우 노드와 엣지 처리
    const { nodes: workflowNodes, edges: workflowEdges } = execution.workflow_snapshot;
    
    // 노드들을 타입별로 분류
    const startNodes = workflowNodes.filter((node: any) => node.type === 'startNode');
    const endNodes = workflowNodes.filter((node: any) => node.type === 'endNode');
    const conditionNodes = workflowNodes.filter((node: any) => node.type === 'conditionNode');
    const otherNodes = workflowNodes.filter((node: any) => 
      !['startNode', 'endNode', 'conditionNode'].includes(node.type)
    );
    
    // 분기 구조가 있는지 확인
    const hasBranching = conditionNodes.length > 0;
    
    let convertedNodes: Node[] = [];
    
    if (hasBranching) {
      // 분기 구조가 있는 경우 - 복잡한 레이아웃
      const containerWidth = 1200;
      const nodeWidth = 256;
      const nodeHeight = 160;
      const verticalSpacing = 200;
      const horizontalSpacing = 300;
      
      // Start 노드들 배치 (상단 중앙)
      startNodes.forEach((node: any) => {
        const status = getNodeStatus(node.id);
        const nodeLog = detailedLogs.find(log => log.node_id === node.id && log.status === 'succeeded');
        
        convertedNodes.push({
          id: node.id,
          type: 'executionNode',
          position: { 
            x: (containerWidth - nodeWidth) / 2, 
            y: 50 
          },
          data: {
            label: node.data?.label || node.id,
            description: node.data?.description || 'No description',
            nodeType: node.type,
            status,
            nodeLog,
            config: node.data?.config || {},
            selected: selectedNodeId === node.id,
            getNodeColorClass
          },
          style: { width: nodeWidth, height: nodeHeight }
        });
      });
      
      // Condition 노드들 배치 (Start 노드 아래)
      conditionNodes.forEach((node: any) => {
        const status = getNodeStatus(node.id);
        const nodeLog = detailedLogs.find(log => log.node_id === node.id && log.status === 'succeeded');
        
        convertedNodes.push({
          id: node.id,
          type: 'executionNode',
          position: { 
            x: (containerWidth - nodeWidth) / 2, 
            y: 50 + verticalSpacing 
          },
          data: {
            label: node.data?.label || node.id,
            description: node.data?.description || 'No description',
            nodeType: node.type,
            status,
            nodeLog,
            config: node.data?.config || {},
            selected: selectedNodeId === node.id,
            getNodeColorClass
          },
          style: { width: nodeWidth, height: nodeHeight }
        });
      });
      
      // 분기 노드들 배치 (Condition 노드 아래, 가로로 분산)
      const branchNodes = otherNodes.filter((node: any) => {
        return workflowEdges.some((edge: any) => 
          conditionNodes.some((cond: any) => cond.id === edge.source) && edge.target === node.id
        );
      });
      
      const branchCount = branchNodes.length;
      const startX = (containerWidth - (branchCount - 1) * horizontalSpacing) / 2;
      
      branchNodes.forEach((node: any, index: number) => {
        const status = getNodeStatus(node.id);
        const nodeLog = detailedLogs.find(log => log.node_id === node.id && log.status === 'succeeded');
        
        convertedNodes.push({
          id: node.id,
          type: 'executionNode',
          position: { 
            x: startX + index * horizontalSpacing, 
            y: 50 + verticalSpacing * 2 
          },
          data: {
            label: node.data?.label || node.id,
            description: node.data?.description || 'No description',
            nodeType: node.type,
            status,
            nodeLog,
            config: node.data?.config || {},
            selected: selectedNodeId === node.id,
            getNodeColorClass
          },
          style: { width: nodeWidth, height: nodeHeight }
        });
      });
      
      // End 노드들 배치 (하단 중앙)
      endNodes.forEach((node: any) => {
        const status = getNodeStatus(node.id);
        const nodeLog = detailedLogs.find(log => log.node_id === node.id && log.status === 'succeeded');
        
        convertedNodes.push({
          id: node.id,
          type: 'executionNode',
          position: { 
            x: (containerWidth - nodeWidth) / 2, 
            y: 50 + verticalSpacing * 3 
          },
          data: {
            label: node.data?.label || node.id,
            description: node.data?.description || 'No description',
            nodeType: node.type,
            status,
            nodeLog,
            config: node.data?.config || {},
            selected: selectedNodeId === node.id,
            getNodeColorClass
          },
          style: { width: nodeWidth, height: nodeHeight }
        });
      });
    } else {
      // 단순한 선형 구조인 경우 - 기존 로직 사용
      const containerWidth = 800;
      const containerHeight = 600;
      const nodeWidth = 256;
      const nodeHeight = 160;
      const fixedSpacing = 220;
      
      // 모든 노드를 순서대로 정렬
      const allNodes = [...workflowNodes].sort((a, b) => {
        if (a.type === 'startNode') return -1;
        if (b.type === 'startNode') return 1;
        if (a.type === 'endNode') return 1;
        if (b.type === 'endNode') return -1;
        return 0;
      });
      
      const totalHeight = allNodes.length * fixedSpacing;
      const startY = (containerHeight - totalHeight) / 2;
      
      convertedNodes = allNodes.map((node: any, index: number) => {
        const status = getNodeStatus(node.id);
        const nodeLog = detailedLogs.find(log => log.node_id === node.id && log.status === 'succeeded');
        
        return {
          id: node.id,
          type: 'executionNode',
          position: { 
            x: (containerWidth - nodeWidth) / 2, 
            y: startY + index * fixedSpacing 
          },
          data: {
            label: node.data?.label || node.id,
            description: node.data?.description || 'No description',
            nodeType: node.type,
            status,
            nodeLog,
            config: node.data?.config || {},
            selected: selectedNodeId === node.id,
            getNodeColorClass
          },
          style: { width: nodeWidth, height: nodeHeight }
        };
      });
    }

    // 실제 워크플로우 엣지를 사용하여 연결선 생성
    const convertedEdges: Edge[] = workflowEdges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'default',
      style: { 
        stroke: isDarkMode ? '#9CA3AF' : '#6B7280', 
        strokeWidth: 2, 
        strokeDasharray: '5,5',
        animation: 'flowAnimation 2s linear infinite'
      },
      markerEnd: 'arrow',
      animated: true,
      data: edge.data || {}
    }));

    console.log('Setting nodes:', convertedNodes);
    console.log('Setting edges:', convertedEdges);
    setNodes(convertedNodes);
    setEdges(convertedEdges);
  }, [execution.workflow_snapshot, detailedLogs, setNodes, setEdges]);

  // 워크플로우 변환 실행
  useEffect(() => {
    if (execution.workflow_snapshot) {
      convertWorkflowToReactFlow();
    }
  }, [execution.workflow_snapshot, detailedLogs, convertWorkflowToReactFlow]);

  // 노드가 로드된 후 뷰포트를 중앙에 맞춤
  useEffect(() => {
    if (rfInstance && nodes.length > 0) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.2 });
      }, 100);
    }
  }, [rfInstance, nodes]);

  const fetchDetailedLogs = async () => {
    // deployment_id가 없으면 실행 정보를 다시 조회해서 가져옴
    let deploymentId = execution.deployment_id;
    
    if (!deploymentId) {
      console.log('⚠️ execution.deployment_id is undefined, trying to fetch execution details...');
      try {
        const response = await fetch(`/api/executions/${execution.id}`);
        const data = await response.json();
        if (data.success && data.execution && data.execution.deployment_id) {
          deploymentId = data.execution.deployment_id;
          console.log('✅ Found deployment_id from API:', deploymentId);
        } else {
          console.log('❌ Could not find deployment_id from API');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('❌ Error fetching execution details:', error);
        setLoading(false);
        return;
      }
    }
    
    try {
      console.log('🔍 Fetching detailed logs for:', deploymentId, execution.id);
      const response = await fetch(`/api/deployments/${deploymentId}/executions/${execution.id}/detailed-logs`);
      const data = await response.json();
      
      console.log('📡 API Response:', data);
      console.log('📊 Logs count:', data.logs ? data.logs.length : 0);
      
      if (data.success && data.logs && data.logs.length > 0) {
        console.log('✅ Setting detailed logs from API:', data.logs.length, 'entries');
        console.log('📝 First log:', data.logs[0]);
        setDetailedLogs(data.logs);
      } else {
        console.log('⚠️ API returned no logs, using node_execution_history');
        // API에서 로그가 없으면 node_execution_history 사용
        if (execution.node_execution_history && execution.node_execution_history.length > 0) {
          console.log('📋 Using node_execution_history:', execution.node_execution_history.length, 'entries');
          setDetailedLogs(execution.node_execution_history);
        } else {
          console.log('❌ No logs available from any source');
          setDetailedLogs([]);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching detailed logs:', error);
      // 에러가 발생하면 node_execution_history를 폴백으로 사용
      if (execution.node_execution_history && execution.node_execution_history.length > 0) {
        console.log('📋 Using node_execution_history as fallback due to error');
        setDetailedLogs(execution.node_execution_history);
      } else {
        setDetailedLogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'aborted':
        return <Square className="w-5 h-5 text-gray-500" />;
      case 'timed_out':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-500" />;
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
        return 'Unknown';
    }
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return '0ms';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return '-';
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'startNode':
        return <Play className="w-4 h-4" />;
      case 'promptNode':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'endNode':
        return <Square className="w-4 h-4" />;
      case 'agentNode':
        return <Search className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getNodeStatus = (nodeId: string) => {
    const succeededLog = detailedLogs.find(log => log.node_id === nodeId && log.status === 'succeeded');
    const startedLog = detailedLogs.find(log => log.node_id === nodeId && log.status === 'started');
    const failedLog = detailedLogs.find(log => log.node_id === nodeId && log.status === 'failed');
    
    if (failedLog) return 'failed';
    if (succeededLog) return 'succeeded';
    if (startedLog) return 'running';
    return 'pending';
  };

  const getNodeColor = (nodeType: string, status: string) => {
    if (status === 'failed') return 'bg-red-100 border-red-300 text-red-800';
    if (status === 'running') return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (status === 'succeeded') {
      switch (nodeType) {
        case 'startNode':
          return 'bg-green-100 border-green-300 text-green-800';
        case 'promptNode':
          return 'bg-blue-100 border-blue-300 text-blue-800';
        case 'endNode':
          return 'bg-purple-100 border-purple-300 text-purple-800';
        default:
          return 'bg-green-100 border-green-300 text-green-800';
      }
    }
    return 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const downloadLogFile = async () => {
    try {
      setIsDownloading(true);
      console.log('Downloading log file for execution:', execution.id);
      
      const response = await fetch(`/api/executions/${execution.id}/download-logs`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 파일 다운로드 처리
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // UUID 기반 파일명 생성
      const generateUUID = () => {
        return 'xxxxxxxx'.replace(/[x]/g, function() {
          return Math.floor(Math.random() * 16).toString(16);
        });
      };
      a.download = `logs_${generateUUID()}.zip`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Log file downloaded successfully');
    } catch (error) {
      console.error('Error downloading log file:', error);
      alert('Failed to download log file: ' + error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Executions</span>
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center space-x-3">
              {getStatusIcon(execution.status)}
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Execution {execution.id}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getStatusText(execution.status)} • {formatDateTime(execution.start_time)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Duration: {formatDuration(execution.duration_ms)}</span>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex">
        {/* Left Panel - Workflow Graph */}
        <div className="w-1/2 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workflow Graph</h3>
          </div>
          <div className="flex-1 p-6">
            <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg h-full">
              <style>
                {`
                  @keyframes flowAnimation {
                    0% {
                      stroke-dashoffset: 0;
                    }
                    100% {
                      stroke-dashoffset: -24;
                    }
                  }
                  
                  .react-flow__edge-path {
                    animation: flowAnimation 2s linear infinite;
                  }
                  
                  /* 화살표 마커 스타일 */
                  .react-flow__edge-marker {
                    fill: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
                  }
                  
                  /* Handle 위치 조정 */
                  .react-flow__handle {
                    border: none !important;
                    background: ${isDarkMode ? '#9CA3AF' : '#6B7280'} !important;
                    width: 6px !important;
                    height: 6px !important;
                    border-radius: 50% !important;
                  }
                  
                  .react-flow__handle-top {
                    top: -3px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    margin-left: 0 !important;
                  }
                  
                  .react-flow__handle-bottom {
                    bottom: -3px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    margin-left: 0 !important;
                  }
                  
                  /* 노드 크기 제어 (드래그 최적화) */
                  .react-flow__node {
                    width: 256px;
                    min-width: 256px;
                    max-width: 256px;
                    min-height: 160px;
                    /* 드래그 성능 최적화 */
                    will-change: transform;
                    transform: translate3d(0, 0, 0);
                  }
                  
                  /* 노드 내부 컨테이너 크기 제어 */
                  .react-flow__node-default {
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                  }
                  
                  /* 드래그 중 노드 스타일 */
                  .react-flow__node.dragging {
                    z-index: 1000;
                    pointer-events: none;
                  }
                  
                  /* 드래그 중 노드 내부 요소들 비활성화 */
                  .react-flow__node.dragging * {
                    pointer-events: none;
                  }
                  
                  /* 선택된 노드 스타일 */
                  .react-flow__node.selected {
                    z-index: 10;
                  }
                  
                  /* React Flow 드래그 성능 최적화 */
                  .react-flow__pane {
                    cursor: grab;
                  }
                  
                  .react-flow__pane:active {
                    cursor: grabbing;
                  }
                  
                  /* 노드 드래그 중 스타일 */
                  .react-flow__node.dragging {
                    cursor: grabbing !important;
                    user-select: none;
                  }
                  
                  /* 드래그 중 노드 내부 상호작용 비활성화 */
                  .react-flow__node.dragging button,
                  .react-flow__node.dragging input,
                  .react-flow__node.dragging select {
                    pointer-events: none;
                  }
                  
                  /* 하이라이트된 로그 영역 스타일 */
                  .log-highlighted {
                    animation: pulse 2s infinite;
                  }
                  
                  @keyframes pulse {
                    0%, 100% {
                      opacity: 1;
                    }
                    50% {
                      opacity: 0.8;
                    }
                  }
                `}
              </style>
                                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                      </marker>
                    </defs>
                  </svg>
              {nodes.length > 0 ? (
                <>
                  {/* <div className="absolute top-2 left-2 z-10 bg-white p-2 rounded text-xs">
                    <div>Nodes: {nodes.length}</div>
                    <div>Edges: {edges.length}</div>
                    <div>Snapshot: {execution.workflow_snapshot?.nodes?.length || 0} nodes</div>
                    <div>Logs: {detailedLogs.length} entries</div>
                    <div>Node IDs: {nodes.map(n => n.id).join(', ')}</div>
                    <div>Edge Sources: {edges.map(e => e.source).join(', ')}</div>
                    <div>Edge Targets: {edges.map(e => e.target).join(', ')}</div>
                  </div> */}
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    defaultViewport={initialViewport}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    attributionPosition="bottom-left"
                    onInit={setRfInstance}
                    // 드래그 성능 최적화 설정
                    nodesDraggable={true}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    selectNodesOnDrag={false}
                    panOnDrag={true}
                    panOnScroll={false}
                    zoomOnScroll={true}
                    zoomOnPinch={true}
                    zoomOnDoubleClick={false}
                    preventScrolling={true}
                    // 드래그 중 성능 최적화
                    onNodeDragStart={(event, node) => {
                      // 드래그 시작 시 노드에 dragging 클래스 추가
                      const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
                      if (nodeElement) {
                        nodeElement.classList.add('dragging');
                      }
                    }}
                    onNodeDragStop={(event, node) => {
                      // 드래그 종료 시 노드에서 dragging 클래스 제거
                      const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
                      if (nodeElement) {
                        nodeElement.classList.remove('dragging');
                      }
                    }}
                    onNodeClick={(event, node) => {
                      setSelectedNodeId(node.id);
                      setHighlightedNodeId(node.id);
                      
                      // 해당 노드의 로그 영역으로 스크롤
                      setTimeout(() => {
                        const logElement = document.getElementById(`log-${node.id}`);
                        if (logElement) {
                          logElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }
                      }, 100);
                    }}
                    onPaneClick={() => {
                      setSelectedNodeId(null);
                      setHighlightedNodeId(null);
                    }}
                  >
                    <Background
                      variant={BackgroundVariant.Dots}
                      gap={20}
                      size={1}
                      color={isDarkMode ? "#374151" : "#e5e7eb"}
                    />
                    <Controls />
                    <MiniMap
                      nodeStrokeColor={(n) => {
                        if (n.type === 'input') return '#0041d0';
                        if (n.type === 'output') return '#ff0072';
                        return '#1a192b';
                      }}
                      nodeColor={(n) => {
                        if (n.type === 'input') return '#0041d0';
                        return '#fff';
                      }}
                      nodeBorderRadius={2}
                    />
                  </ReactFlow>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">No workflow snapshot available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Execution Timeline and Node Details */}
        <div className="w-1/2 bg-gray-900 dark:bg-gray-950 text-white flex flex-col">
          {/* Header Section */}
          <div className="p-4 border-b border-gray-700 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-mono">{execution.id}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {(() => {
                    const startTime = new Date(execution.start_time);
                    const now = new Date();
                    const diffMs = now.getTime() - startTime.getTime();
                    const diffMinutes = Math.floor(diffMs / (1000 * 60));
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    
                    if (diffDays > 0) {
                      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                    } else if (diffHours > 0) {
                      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                    } else if (diffMinutes > 0) {
                      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
                    } else {
                      return 'Just now';
                    }
                  })()}
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={downloadLogFile}
                  disabled={isDownloading}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <span>Download Log File</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Execution Timeline */}
          <div className="p-4 flex-1 overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 300px)' }}>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-400">Loading execution logs...</p>
              </div>
            ) : detailedLogs.length === 0 ? (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                
                {/* 기본 실행 정보 표시 */}
                <div className="ml-12">
                  <div className="relative mb-6">
                    <div className="absolute left-4 w-4 h-4 rounded-full border-2 border-gray-600 bg-green-500 border-green-500"></div>
                    <div className="ml-12">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm text-gray-300">execution</span>
                          <span className="text-green-400">✓</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span>{formatDateTime(execution.start_time)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 rounded-lg p-3 mb-2">
                        <div className="text-sm text-gray-300 mb-2">
                          Workflow Execution - {execution.status}
                        </div>
                        
                        {/* Input data */}
                        {execution.input && Object.keys(execution.input).length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Input Data:</div>
                            <div className="bg-gray-900 p-3 rounded border border-gray-700">
                              <div className="text-xs font-mono text-gray-300 max-h-40 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(execution.input, null, 2)}</pre>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Output data */}
                        {execution.output && Object.keys(execution.output).length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Output Data:</div>
                            <div className="bg-gray-900 p-3 rounded border border-gray-700">
                              <div className="text-xs font-mono text-gray-300 max-h-40 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(execution.output, null, 2)}</pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Performance metrics */}
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        {execution.duration_ms && <span>Duration: {execution.duration_ms}ms</span>}
                        <span>Status: {execution.status}</span>
                        <span>Start: {formatDateTime(execution.start_time)}</span>
                        {execution.end_time && <span>End: {formatDateTime(execution.end_time)}</span>}
                      </div>
                      
                      {/* Error information */}
                      {execution.error_message && (
                        <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded">
                          <div className="text-xs text-red-300 font-medium mb-1">Error:</div>
                          <div className="text-xs text-red-200">{execution.error_message}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center py-4">
                    <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No detailed node logs available</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                
                {(() => {
                  // 모든 로그를 시간순으로 정렬 (started, succeeded, failed 모두 포함)
                  const allLogs = [...detailedLogs].sort((a, b) => 
                    new Date(a.start_time || a.timestamp || 0).getTime() - 
                    new Date(b.start_time || b.timestamp || 0).getTime()
                  );
                  
                  return allLogs.map((log, index) => {
                    const node = nodes.find(n => n.id === log.node_id);
                    
                    // 상태별 아이콘과 색상
                    const getStatusDisplay = (status: string) => {
                      switch (status) {
                        case 'NodeStatus.SUCCEEDED':
                        case 'succeeded':
                          return { icon: '✓', color: 'bg-green-500 border-green-500', textColor: 'text-green-400' };
                        case 'NodeStatus.FAILED':
                        case 'failed':
                          return { icon: '✗', color: 'bg-red-500 border-red-500', textColor: 'text-red-400' };
                        case 'NodeStatus.STARTED':
                        case 'started':
                          return { icon: '⟳', color: 'bg-yellow-500 border-yellow-500', textColor: 'text-yellow-400' };
                        default:
                          return { icon: '○', color: 'bg-gray-500 border-gray-500', textColor: 'text-gray-400' };
                      }
                    };
                    
                    const statusDisplay = getStatusDisplay(log.status);
                    
                    return (
                      <div 
                        key={index} 
                        className={`relative mb-6 transition-all duration-300 ${
                          highlightedNodeId === log.node_id ? 'ring-4 ring-blue-400 ring-opacity-70 bg-blue-900 bg-opacity-30 rounded-lg p-3 shadow-lg log-highlighted' : ''
                        }`}
                        id={`log-${log.node_id}`}
                      >
                        {/* Timeline dot */}
                        <div className={`absolute left-4 w-4 h-4 rounded-full border-2 border-gray-600 ${statusDisplay.color}`}></div>
                        
                        {/* Content */}
                        <div className="ml-12">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm text-gray-300">{log.node_name || log.node_id}</span>
                              <span className={statusDisplay.textColor}>{statusDisplay.icon}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              <span>{formatDateTime(log.start_time || log.timestamp)}</span>
                            </div>
                          </div>
                          
                          {/* Node content */}
                          <div className="bg-gray-800 rounded-lg p-3 mb-2">
                            <div className="text-sm text-gray-300 mb-2">
                              {log.node_name || node?.data?.label || log.node_id} - {log.status}
                            </div>
                            
                            {/* Message */}
                            {log.message && (
                              <div className="mb-2">
                                <div className="text-xs text-gray-500 mb-1">Message:</div>
                                <div className="text-xs text-gray-300">{log.message}</div>
                              </div>
                            )}
                            

                            
                            {/* Input Data - Started 상태에서는 표시하지 않음 */}
                            {log.input_data && log.status !== 'started' && (
                              <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1 font-medium">Input Data:</div>
                                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                                  <div className="text-xs font-mono text-gray-300 max-h-40 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.input_data, null, 2)}</pre>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Output Data - Started 상태에서는 표시하지 않음 */}
                            {log.output_data && log.status !== 'started' && (
                              <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1 font-medium">Output Data:</div>
                                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                                  <div className="text-xs font-mono text-gray-300 max-h-40 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.output_data, null, 2)}</pre>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Additional Data Fields */}
                            {log.data && Object.keys(log.data).length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1 font-medium">Additional Data:</div>
                                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                                  <div className="text-xs font-mono text-gray-300 max-h-40 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.data, null, 2)}</pre>
                                  </div>
                                </div>
                              </div>
                            )}
                            

                          </div>
                          
                                                                                {/* Performance metrics */}
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            {log.duration_ms && <span>Duration: {formatDuration(log.duration_ms)}</span>}
                            <span>Status: {log.status}</span>
                            {log.start_time && <span>Start: {formatDateTime(log.start_time)}</span>}
                            {log.end_time && <span>End: {formatDateTime(log.end_time)}</span>}
                          </div>
                            
                            {/* Error information */}
                            {log.error_message && (
                              <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded">
                                <div className="text-xs text-red-300 font-medium mb-1">Error:</div>
                                <div className="text-xs text-red-200">{log.error_message}</div>
                                <div className="text-xs text-red-200">{log.error_traceback}</div>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="p-4 border-t border-gray-700 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 text-white text-xs rounded ${
                  execution.status === 'succeeded' ? 'bg-green-600' :
                  execution.status === 'failed' ? 'bg-red-600' :
                  execution.status === 'running' ? 'bg-yellow-600' :
                  'bg-gray-600'
                }`}>
                  {execution.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400">{formatDuration(execution.duration_ms)}</span>
                <span className="text-xs text-gray-400">{detailedLogs.length} logs</span>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionDetail; 