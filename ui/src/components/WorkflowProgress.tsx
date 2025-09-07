import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNodeExecutionEvents } from '../hooks/useNodeExecutionEvents';
import { useFlowStore } from '../store/flowStore';

interface WorkflowStep {
  nodeId: string;
  label: string;
  type: string;
  status: 'pending' | 'executing' | 'completed' | 'error';
  order: number;
}

/**
 * 전체 워크플로우 실행 진행률을 표시하는 컴포넌트
 */
const WorkflowProgress: React.FC = () => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const nodes = useFlowStore(state => state.nodes);
  const edges = useFlowStore(state => state.edges);

  const { executingNodes, isAnyNodeExecuting } = useNodeExecutionEvents((nodeId, eventType) => {
    if (eventType === 'start') {
      updateStepStatus(nodeId, 'executing');
    } else {
      updateStepStatus(nodeId, 'completed');
    }
  });

  // 워크플로우 단계 순서 계산
  useEffect(() => {
    if (isAnyNodeExecuting && executingNodes.length > 1) {
      // 전체 실행 감지
      const steps = calculateWorkflowSteps();
      setWorkflowSteps(steps);
      setIsVisible(true);
    } else if (!isAnyNodeExecuting) {
      // 실행 완료 후 3초 뒤 숨김
      setTimeout(() => {
        setIsVisible(false);
        setWorkflowSteps([]);
      }, 3000);
    }
  }, [isAnyNodeExecuting, executingNodes, nodes, edges]);

  const calculateWorkflowSteps = (): WorkflowStep[] => {
    // 실제로는 노드 그래프를 분석하여 실행 순서 계산
    // 여기서는 간단한 예시
    const startNode = nodes.find(n => n.type === 'startNode');
    if (!startNode) return [];

    const steps: WorkflowStep[] = [];
    const visited = new Set<string>();
    let order = 0;

    const traverseGraph = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      steps.push({
        nodeId,
        label: node.data?.label || getDefaultLabel(node.type),
        type: node.type,
        status: 'pending',
        order: order++
      });

      // 다음 노드들 찾기
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => {
        traverseGraph(edge.target);
      });
    };

    traverseGraph(startNode.id);
    return steps;
  };

  const updateStepStatus = (nodeId: string, status: WorkflowStep['status']) => {
    setWorkflowSteps(prev => 
      prev.map(step => 
        step.nodeId === nodeId ? { ...step, status } : step
      )
    );
  };

  const getDefaultLabel = (nodeType: string) => {
    const labels: { [key: string]: string } = {
      'startNode': 'Start',
      'promptNode': 'Prompt',
      'agentNode': 'Agent',
      'endNode': 'End'
    };
    return labels[nodeType] || nodeType;
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'executing':
        return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const completedSteps = workflowSteps.filter(step => step.status === 'completed').length;
  const totalSteps = workflowSteps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  if (!isVisible || workflowSteps.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 min-w-[400px]">
      {/* 헤더 */}
      <div className="flex items-center space-x-2 mb-4">
        <Play className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          워크플로우 실행 중
        </h3>
      </div>

      {/* 진행률 바 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>{completedSteps}/{totalSteps} 단계 완료</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 단계별 상태 */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {workflowSteps.map((step, index) => (
          <div 
            key={step.nodeId}
            className={`flex items-center space-x-3 p-2 rounded-md ${
              step.status === 'executing' ? 'bg-blue-50 dark:bg-blue-900/20' :
              step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' :
              'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-xs font-medium">
              {index + 1}
            </div>
            {getStepIcon(step.status)}
            <div className="flex-1">
              <span className={`text-sm font-medium ${
                step.status === 'executing' ? 'text-blue-600 dark:text-blue-400' :
                step.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {step.label}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {step.type}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowProgress;
