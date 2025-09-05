import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/flowStore';

type NodeExecutionEventHandler = (nodeId: string, eventType: 'start' | 'end') => void;

/**
 * 노드 실행 이벤트를 감지하는 커스텀 훅
 * @param onNodeExecution 노드 실행 시작/종료 시 호출될 콜백 함수
 */
export const useNodeExecutionEvents = (onNodeExecution?: NodeExecutionEventHandler) => {
  const nodes = useFlowStore(state => state.nodes);
  const prevExecutingNodes = useRef<Set<string>>(new Set());

  useEffect(() => {
    console.log('🔍 useNodeExecutionEvents: Checking nodes:', nodes.length);
    console.log('🔍 All nodes data:', nodes.map(n => ({ id: n.id, isExecuting: n.data?.isExecuting })));
    
    const currentExecutingNodes = new Set<string>();
    
    // 현재 실행 중인 노드들 찾기
    nodes.forEach(node => {
      console.log(`🔍 Node ${node.id}: isExecuting = ${node.data?.isExecuting}`);
      if (node.data?.isExecuting) {
        console.log(`🔍 Found executing node: ${node.id}`);
        currentExecutingNodes.add(node.id);
      }
    });

    console.log('🔍 Current executing nodes:', Array.from(currentExecutingNodes));
    console.log('🔍 Previous executing nodes:', Array.from(prevExecutingNodes.current));

    // 이전 상태와 비교하여 이벤트 감지
    const previousSet = prevExecutingNodes.current;
    
    // 새로 시작된 노드들
    currentExecutingNodes.forEach(nodeId => {
      if (!previousSet.has(nodeId)) {
        console.log(`🎬 노드 실행 시작: ${nodeId}`);
        onNodeExecution?.(nodeId, 'start');
      }
    });

    // 종료된 노드들
    previousSet.forEach(nodeId => {
      if (!currentExecutingNodes.has(nodeId)) {
        console.log(`🏁 노드 실행 종료: ${nodeId}`);
        onNodeExecution?.(nodeId, 'end');
      }
    });

    // 현재 상태를 이전 상태로 업데이트
    prevExecutingNodes.current = new Set(currentExecutingNodes);
  }, [nodes, onNodeExecution]);

  // 현재 실행 중인 노드들 반환
  const executingNodes = nodes
    .filter(node => node.data?.isExecuting)
    .map(node => ({
      id: node.id,
      type: node.type,
      label: node.data?.label || 'Unnamed Node'
    }));

  return {
    executingNodes,
    isAnyNodeExecuting: executingNodes.length > 0
  };
};

/**
 * 특정 노드의 실행 상태만 감지하는 훅
 * @param nodeId 감지할 노드 ID
 * @param onExecutionChange 실행 상태 변경 시 호출될 콜백
 */
export const useNodeExecutionStatus = (
  nodeId: string, 
  onExecutionChange?: (isExecuting: boolean, nodeId: string) => void
) => {
  const node = useFlowStore(state => state.nodes.find(n => n.id === nodeId));
  const prevExecuting = useRef<boolean>(false);

  const isExecuting = node?.data?.isExecuting || false;

  useEffect(() => {
    if (prevExecuting.current !== isExecuting) {
      console.log(`📊 노드 ${nodeId} 실행 상태 변경: ${prevExecuting.current} → ${isExecuting}`);
      onExecutionChange?.(isExecuting, nodeId);
      prevExecuting.current = isExecuting;
    }
  }, [isExecuting, nodeId, onExecutionChange]);

  return {
    isExecuting,
    node
  };
};
