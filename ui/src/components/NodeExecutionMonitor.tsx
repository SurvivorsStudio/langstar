import React from 'react';
import { useNodeExecutionEvents, useNodeExecutionStatus } from '../hooks/useNodeExecutionEvents';

/**
 * 노드 실행 모니터링 컴포넌트 예시
 */
const NodeExecutionMonitor: React.FC = () => {
  // 모든 노드의 실행 이벤트 감지
  const { executingNodes, isAnyNodeExecuting } = useNodeExecutionEvents((nodeId, eventType) => {
    if (eventType === 'start') {
      console.log(`🎬 노드 ${nodeId} 실행 시작!`);
      // 여기서 원하는 작업 수행 (예: 애니메이션 시작)
    } else {
      console.log(`🏁 노드 ${nodeId} 실행 완료!`);
      // 여기서 원하는 작업 수행 (예: 애니메이션 정지)
    }
  });

  // 특정 노드의 실행 상태 감지 (예시)
  const { isExecuting: isStartNodeExecuting } = useNodeExecutionStatus('start', (isExecuting, nodeId) => {
    console.log(`Start 노드 실행 상태: ${isExecuting}`);
  });

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border">
      <h3 className="text-lg font-semibold mb-2">노드 실행 모니터</h3>
      
      <div className="space-y-2">
        <div className={`text-sm ${isAnyNodeExecuting ? 'text-green-600' : 'text-gray-500'}`}>
          {isAnyNodeExecuting ? '🟢 실행 중' : '⚪ 대기 중'}
        </div>
        
        {executingNodes.length > 0 && (
          <div>
            <p className="text-sm font-medium">실행 중인 노드들:</p>
            <ul className="text-xs space-y-1">
              {executingNodes.map(node => (
                <li key={node.id} className="text-blue-600">
                  • {node.label} ({node.type})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeExecutionMonitor;
