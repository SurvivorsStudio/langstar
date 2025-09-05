import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Play, ArrowRight } from 'lucide-react';
import { useNodeExecutionEvents } from '../hooks/useNodeExecutionEvents';

interface ExecutionStep {
  fromNodeId: string;
  toNodeId: string;
  fromLabel: string;
  toLabel: string;
  status: 'pending' | 'executing' | 'completed' | 'error';
  timestamp?: Date;
}

/**
 * 노드 실행 상태를 시각적으로 표시하는 컴포넌트
 */
const ExecutionStatusIndicator: React.FC = () => {
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [isGlobalExecution, setIsGlobalExecution] = useState(false);

  const { executingNodes, isAnyNodeExecuting } = useNodeExecutionEvents((nodeId, eventType) => {
    if (eventType === 'start') {
      handleNodeExecutionStart(nodeId);
    } else {
      handleNodeExecutionEnd(nodeId);
    }
  });

  const handleNodeExecutionStart = (nodeId: string) => {
    console.log(`🎬 노드 실행 시작: ${nodeId}`);
    
    // 개별 노드 실행인지 전체 실행인지 판단
    if (executingNodes.length <= 1) {
      // 개별 실행: 현재 노드와 연결된 다음 노드들 표시
      showIndividualExecution(nodeId);
    } else {
      // 전체 실행: 워크플로우 단계별 표시
      setIsGlobalExecution(true);
    }
  };

  const handleNodeExecutionEnd = (nodeId: string) => {
    console.log(`🏁 노드 실행 완료: ${nodeId}`);
    
    // 해당 노드의 실행 상태를 완료로 업데이트
    setExecutionSteps(prev => 
      prev.map(step => 
        step.fromNodeId === nodeId 
          ? { ...step, status: 'completed', timestamp: new Date() }
          : step
      )
    );

    // 3초 후 개별 실행 표시 제거
    if (!isGlobalExecution) {
      setTimeout(() => {
        setExecutionSteps(prev => prev.filter(step => step.fromNodeId !== nodeId));
      }, 3000);
    }
  };

  const showIndividualExecution = (nodeId: string) => {
    // 여기서 실제 노드 데이터를 가져와서 연결된 노드들 찾기
    // 임시 예시 데이터
    const mockStep: ExecutionStep = {
      fromNodeId: nodeId,
      toNodeId: 'next-node',
      fromLabel: getNodeLabel(nodeId),
      toLabel: 'Next Node',
      status: 'executing',
      timestamp: new Date()
    };

    setExecutionSteps(prev => [...prev, mockStep]);
  };

  const getNodeLabel = (nodeId: string) => {
    // 실제 구현에서는 flowStore에서 노드 정보 가져오기
    const nodeLabels: { [key: string]: string } = {
      'start': 'Start',
      'prompt': 'Prompt',
      'agent': 'Agent'
    };
    return nodeLabels[nodeId] || nodeId;
  };

  if (!isAnyNodeExecuting && executionSteps.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <div className="space-y-3">
        {/* 전체 실행 상태 */}
        {isGlobalExecution && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              워크플로우 실행 중...
            </span>
          </div>
        )}

        {/* 개별 실행 단계들 */}
        {executionSteps.map((step, index) => (
          <IndividualExecutionStep key={`${step.fromNodeId}-${index}`} step={step} />
        ))}

        {/* 현재 실행 중인 노드들 */}
        {executingNodes.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">실행 중:</p>
            {executingNodes.map(node => (
              <div key={node.id} className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 dark:text-green-400">{node.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 개별 실행 단계를 표시하는 컴포넌트
 */
const IndividualExecutionStep: React.FC<{ step: ExecutionStep }> = ({ step }) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'executing':
        return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <div className="w-4 h-4 bg-red-500 rounded-full" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'executing':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={`flex items-center space-x-2 p-2 rounded-md bg-gray-50 dark:bg-gray-700 ${
      step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' : ''
    }`}>
      {getStatusIcon()}
      <div className="flex items-center space-x-1 text-sm">
        <span className={getStatusColor()}>{step.fromLabel}</span>
        <ArrowRight className="w-3 h-3 text-gray-400" />
        <span className={getStatusColor()}>{step.toLabel}</span>
      </div>
      {step.status === 'completed' && step.timestamp && (
        <span className="text-xs text-gray-500">
          {step.timestamp.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default ExecutionStatusIndicator;
