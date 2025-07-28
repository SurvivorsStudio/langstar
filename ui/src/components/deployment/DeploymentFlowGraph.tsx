import React, { useState, useEffect } from 'react';
import { Deployment } from '../../types/deployment';
import { 
  Play, 
  MessageSquare, 
  Code, 
  GitBranch, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface DeploymentFlowGraphProps {
  deployment: Deployment;
}

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  data: any;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

const DeploymentFlowGraph: React.FC<DeploymentFlowGraphProps> = ({ deployment }) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  useEffect(() => {
    if (deployment) {
      parseWorkflowData();
    }
  }, [deployment]);

  const parseWorkflowData = () => {
    try {
      // deployment.versions[0].workflowSnapshot에서 워크플로우 데이터 파싱
      const workflowSnapshot = deployment.versions?.[0]?.workflowSnapshot;
      if (!workflowSnapshot) {
        console.warn('No workflow snapshot found in deployment');
        return;
      }

      const workflowNodes = workflowSnapshot.nodes || [];
      const workflowEdges = workflowSnapshot.edges || [];

      console.log('Parsing workflow data:', { nodes: workflowNodes.length, edges: workflowEdges.length });

      // 노드 생성 - 실제 위치 정보 사용
      const parsedNodes: WorkflowNode[] = workflowNodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        label: node.data?.label || node.id,
        data: node.data,
        position: node.position || { x: 0, y: 0 }
      }));

      // 엣지 생성
      const parsedEdges: WorkflowEdge[] = workflowEdges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target
      }));

      setNodes(parsedNodes);
      setEdges(parsedEdges);
    } catch (error) {
      console.error('Error parsing workflow data:', error);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'startNode':
        return <Play className="w-5 h-5 text-green-500" />;
      case 'promptNode':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'functionNode':
        return <Code className="w-5 h-5 text-purple-500" />;
      case 'conditionNode':
        return <GitBranch className="w-5 h-5 text-orange-500" />;
      case 'agentNode':
        return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      case 'endNode':
        return <CheckCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'startNode':
        return 'Start';
      case 'promptNode':
        return 'Prompt';
      case 'functionNode':
        return 'Function';
      case 'conditionNode':
        return 'Condition';
      case 'agentNode':
        return 'Agent';
      case 'endNode':
        return 'End';
      default:
        return type;
    }
  };

  const getNodeStatus = (node: WorkflowNode) => {
    // 실제 구현에서는 실행 상태를 확인해야 함
    return 'completed'; // 임시로 completed 반환
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Workflow Definition</h3>
        <p className="text-sm text-gray-500 mt-1">
          {nodes.length} nodes, {edges.length} connections
        </p>
      </div>
      
      <div className="p-6">
        <div className="relative min-h-[400px]">
          {/* Workflow Nodes */}
          <div className="space-y-4">
            {nodes.map((node, index) => (
              <div key={node.id} className="relative">
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedNode?.id === node.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getNodeIcon(node.type)}
                      <div>
                        <h4 className="font-medium text-gray-900">{node.label}</h4>
                        <p className="text-sm text-gray-500">{getNodeTypeLabel(node.type)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(getNodeStatus(node))}
                      <span className="text-sm text-gray-500">
                        {getNodeStatus(node)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Node Configuration Preview */}
                  {node.data?.config && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(node.data.config).slice(0, 4).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-500">{key}:</span>
                            <span className="ml-1 text-gray-700">
                              {typeof value === 'string' && value.length > 20
                                ? `${value.substring(0, 20)}...`
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Connection Arrow */}
                {index < nodes.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Selected Node Details */}
        {selectedNode && (
          <div className="mt-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {selectedNode.label} Details
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500">Type:</span>
                <p className="text-sm text-gray-700">{getNodeTypeLabel(selectedNode.type)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">ID:</span>
                <p className="text-sm font-mono text-gray-700">{selectedNode.id}</p>
              </div>
              {selectedNode.data?.config && (
                <div>
                  <span className="text-xs text-gray-500">Configuration:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedNode.data.config, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentFlowGraph; 