/**
 * 실행 엔진 (Execution Engine)
 * 
 * 워크플로우 실행을 오케스트레이션하는 중앙 엔진입니다.
 * 
 * 책임:
 * - 단일 노드 실행 관리
 * - 워크플로우 전체 실행 오케스트레이션
 * - 노드 실행 순서 결정
 * - 순환 구조 처리
 * - 실행 상태 콜백 관리
 * 
 * @module services/execution/executionEngine
 */

import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/node';
import { EDGE_STATES } from '../../types/edge';
import { getNodeExecutor } from './nodeExecutors';
import { ExecutionContext } from './nodeExecutorTypes';
import { hasValidEdgeData } from '../../utils/edgeUtils';
import type { ConditionExecutionResult } from './nodeExecutors/conditionNodeExecutor';

/**
 * 실행 콜백 인터페이스
 * 실행 엔진이 상태 변경을 알리기 위해 호출하는 콜백 함수들
 */
export interface ExecutionCallbacks {
  /** 노드 실행 시작 시 호출 */
  onNodeStart: (nodeId: string, nodeName: string) => void;
  /** 노드 실행 완료 시 호출 */
  onNodeComplete: (nodeId: string, output: any, success: boolean, nodeName: string) => void;
  /** 엣지 출력 업데이트 시 호출 */
  onEdgeUpdate: (edgeId: string, output: any) => void;
  /** 엣지 상태 업데이트 시 호출 */
  onEdgeStatusUpdate: (edgeId: string, status: 'executing' | 'success' | 'failure') => void;
  /** 워크플로우 실행 완료 시 호출 */
  onWorkflowComplete: (success: boolean, errorNodes?: string[]) => void;
  /** 노드 데이터 업데이트 시 호출 */
  onNodeDataUpdate: (nodeId: string, dataUpdate: Partial<NodeData>) => void;
  /** 노드 출력 설정 시 호출 */
  onNodeOutputSet: (nodeId: string, output: any) => void;
  /** 노드 ID로 노드 조회 */
  getNodeById: (nodeId: string) => Node<NodeData> | undefined;
  /** 현재 엣지 목록 조회 */
  getEdges: () => Edge[];
  /** 현재 노드 목록 조회 */
  getNodes: () => Node<NodeData>[];
  /** Condition convergence 노드 확인 */
  isConditionConvergenceNode: (nodeId: string, nodes: Node<NodeData>[], edges: Edge[]) => boolean;
}

/**
 * 단일 노드를 실행합니다.
 * 
 * @param nodeId - 실행할 노드 ID
 * @param callbacks - 실행 콜백
 * @param chatId - 채팅 ID (선택적, Agent 노드에서 사용)
 * @param isWorkflowExecution - 워크플로우 실행 중인지 여부
 * @returns 실행 결과 (output)
 */
export async function executeNode(
  nodeId: string,
  callbacks: ExecutionCallbacks,
  chatId?: string
): Promise<any> {
  console.log(`🔍 [executeNode] Starting execution for node ${nodeId}`);
  
  const node = callbacks.getNodeById(nodeId);
  if (!node) {
    console.log(`❌ [executeNode] Node ${nodeId} not found`);
    return;
  }

  const nodeName = node.data?.label || node.type || 'Node';
  console.log(`📝 [executeNode] Node name: ${nodeName}, type: ${node.type}`);

  // 실행 전 inputData 초기화
  callbacks.onNodeDataUpdate(nodeId, { ...node.data, inputData: null });

  // 실행 시작 시: 나가는 엣지들을 실행 중으로 설정
  const edges = callbacks.getEdges();
  const outgoingEdges = edges.filter(edge => edge.source === nodeId);
  
  // 조건 노드는 분기 결정 전까지 어떤 엣지도 실행 표시하지 않는다
  if (node.type !== 'conditionNode') {
    outgoingEdges.forEach(edge => {
      callbacks.onEdgeStatusUpdate(edge.id, 'executing');
    });
  }

  // Node Inspector와 동일한 방식으로 input data 선택
  const incomingEdges = edges.filter(edge => edge.target === nodeId);
  let input: Record<string, any> = {};

  // condition convergence 노드인지 확인
  const nodes = callbacks.getNodes();
  const isConditionConvergence = callbacks.isConditionConvergenceNode(nodeId, nodes, edges);

  if (incomingEdges.length > 0) {
    // condition convergence 노드의 경우 특별 처리
    if (isConditionConvergence) {
      console.log(`🔀 [executeNode] ${nodeName} is a condition convergence node`);

      // null/undefined가 아닌 실제 데이터를 가진 edge만 필터링
      const edgesWithValidData = incomingEdges.filter(edge => {
        const hasOutput = edge.data?.output !== null &&
          edge.data?.output !== undefined &&
          typeof edge.data.output === 'object';
        if (hasOutput) {
          console.log(`🔀 [executeNode] Valid data from edge ${edge.id}:`, edge.data.output);
        }
        return hasOutput;
      });

      console.log(`🔀 [executeNode] ${edgesWithValidData.length}/${incomingEdges.length} edges have valid data`);

      // 실제 데이터가 있는 edge 중 가장 최근 것 사용
      if (edgesWithValidData.length > 0) {
        const sortedEdges = edgesWithValidData
          .map(edge => ({
            edge,
            timestamp: edge.data?.timestamp || 0,
            output: edge.data.output
          }))
          .sort((a, b) => b.timestamp - a.timestamp);

        input = sortedEdges[0].output;
        console.log(`🔀 [executeNode] Using data from most recent edge:`, input);
      } else {
        console.warn(`🔀 [executeNode] No valid data found in any incoming edges`);
      }
    } else {
      // 일반 노드: 가장 최근에 실행된 엣지의 데이터 사용
      const edgesWithTimestamps = incomingEdges
        .filter(edge => edge.data?.output && typeof edge.data.output === 'object')
        .map(edge => ({
          edge,
          timestamp: edge.data?.timestamp || 0,
          output: edge.data.output
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // 최신 순으로 정렬

      if (edgesWithTimestamps.length > 0) {
        input = edgesWithTimestamps[0].output;
      }
    }
  }

  try {
    // 현재 노드로 들어온 input을 inputData에 저장
    callbacks.onNodeDataUpdate(nodeId, { ...node.data, inputData: { ...input } });

    // 노드 실행자 가져오기
    const executor = getNodeExecutor(node.type);
    if (!executor) {
      throw new Error(`No executor found for node type: ${node.type}`);
    }

    // 실행 컨텍스트 구성
    const context: ExecutionContext = {
      node,
      input,
      nodes,
      edges,
      chatId,
      nodeId: nodeId
    };

    // 노드 실행
    const result = await executor.execute(context);

    // 실행 결과 처리
    let output = result.output;
    const hasError = !result.success;

    // Condition 노드: 각 엣지별 출력을 store에 반영 (분기된 엣지에만 값 전달)
    const conditionResult = result as ConditionExecutionResult;
    if (node.type === 'conditionNode' && conditionResult.edgeOutputs) {
      conditionResult.edgeOutputs.forEach((edgeOutput, edgeId) => {
        callbacks.onEdgeUpdate(edgeId, edgeOutput);
      });
    }

    // 노드 출력 설정
    callbacks.onNodeOutputSet(nodeId, output);

    // 노드 실행 완료 콜백
    callbacks.onNodeComplete(nodeId, output, !hasError, nodeName);

    // 성공/실패에 따라 나가는 엣지들의 상태 설정
    const currentEdges = callbacks.getEdges();
    const currentOutgoingEdges = currentEdges.filter(edge => edge.source === nodeId);

    if (node.type === 'conditionNode') {
      // 조건 노드: 실제로 데이터가 전달된 엣지만 성공 처리, 나머지는 기본 상태 유지
      const latestEdges = callbacks.getEdges();
      const latestOutgoingEdges = latestEdges.filter(edge => edge.source === nodeId);
      if (!hasError) {
        latestOutgoingEdges.forEach(edge => {
          const flowed = !!(edge.data && edge.data.output);
          if (flowed) {
            callbacks.onEdgeStatusUpdate(edge.id, 'success');
          }
        });
      }
    } else {
      if (!hasError) {
        // 성공한 경우: 모든 나가는 엣지를 성공 처리 (일반 노드는 동일 출력 전달)
        currentOutgoingEdges.forEach(edge => {
          callbacks.onEdgeStatusUpdate(edge.id, 'success');
        });
      } else {
        // 실패한 경우: 일반 노드는 나가는 엣지를 실패로 표시
        currentOutgoingEdges.forEach(edge => {
          callbacks.onEdgeStatusUpdate(edge.id, 'failure');
        });
      }
    }

    return output;
  } catch (error) {
    console.error('Error executing node:', error);
    callbacks.onNodeOutputSet(nodeId, { error: 'Execution failed' });
    callbacks.onNodeComplete(nodeId, { error: 'Execution failed' }, false, nodeName);

    // 실패한 경우 엣지 상태 처리
    const currentEdges = callbacks.getEdges();
    const currentOutgoingEdges = currentEdges.filter(edge => edge.source === nodeId);
    if (node.type !== 'conditionNode') {
      // 일반 노드: 실패로 표시
      currentOutgoingEdges.forEach(edge => {
        callbacks.onEdgeStatusUpdate(edge.id, 'failure');
      });
    }
  }
}

/** 완료된 노드의 하류 중 지금 실행 가능한 노드 ID 목록을 반환 (Merge: 전부 준비, 그 외: 1개 이상 준비) */
function getRunnableDownstream(
  completedNodeId: string,
  callbacks: ExecutionCallbacks
): string[] {
  const latestEdges = callbacks.getEdges();
  const nodes = callbacks.getNodes();
  const outgoingEdges = latestEdges.filter(edge => edge.source === completedNodeId);
  const result: string[] = [];

  for (const edge of outgoingEdges) {
    if (edge.data?.output === null || edge.data?.output === undefined) continue;
    const targetNodeId = edge.target;
    const targetNode = callbacks.getNodeById(targetNodeId);
    if (!targetNode) continue;

    if (targetNode.type === 'mergeNode') {
      const allIncoming = latestEdges.filter(e => e.target === targetNodeId);
      const ready = allIncoming.filter(hasValidEdgeData);
      if (ready.length === allIncoming.length) {
        result.push(targetNodeId);
      }
    } else if (callbacks.isConditionConvergenceNode(targetNodeId, nodes, latestEdges)) {
      const allIncoming = latestEdges.filter(e => e.target === targetNodeId);
      const ready = allIncoming.filter(hasValidEdgeData);
      if (ready.length > 0) result.push(targetNodeId);
    } else {
      result.push(targetNodeId);
    }
  }
  return result;
}

/** 노드가 실행 제한(실행 횟수, merge 대기 횟수)을 통과하는지 */
function canStartNode(
  nodeId: string,
  nodeExecutionCount: Map<string, number>,
  mergeNodeWaitCount: Map<string, number>,
  callbacks: ExecutionCallbacks,
  MAX_NODE_EXECUTIONS: number,
  MAX_MERGE_WAIT_ATTEMPTS: number
): boolean {
  const executionCount = nodeExecutionCount.get(nodeId) || 0;
  const node = callbacks.getNodeById(nodeId);
  if (!node) return false;

  if (node.type !== 'mergeNode') {
    return executionCount < MAX_NODE_EXECUTIONS;
  }

  const waitCount = mergeNodeWaitCount.get(nodeId) || 0;
  const canExecute = executionCount < MAX_NODE_EXECUTIONS && waitCount < MAX_MERGE_WAIT_ATTEMPTS;
  if (!canExecute && waitCount >= MAX_MERGE_WAIT_ATTEMPTS) {
    return executionCount < MAX_NODE_EXECUTIONS;
  }
  return canExecute;
}

/**
 * 워크플로우 전체를 실행합니다.
 * 완료 시점 기반 스케줄링: 노드가 끝나면 그 하류만 검사해 즉시 실행 대기열에 넣고, 동일 레벨 전체 완료를 기다리지 않습니다.
 *
 * @param callbacks - 실행 콜백
 * @param chatId - 채팅 ID (선택적)
 */
export async function runWorkflow(
  callbacks: ExecutionCallbacks,
  chatId?: string
): Promise<void> {
  console.log('🚀 [RunWorkflow] Starting workflow execution (completion-triggered scheduling)');

  const nodes = callbacks.getNodes();
  const edges = callbacks.getEdges();

  edges.forEach(edge => {
    callbacks.onEdgeUpdate(edge.id, EDGE_STATES.PENDING);
  });

  callbacks.onNodeStart('workflow', 'Workflow');
  console.log("🚀 워크플로우 실행 시작");
  console.log("=========================================");

  const startNode = nodes.find(n => n.type === 'startNode');
  if (!startNode) {
    console.error("❌ 시작 노드를 찾을 수 없습니다. 워크플로우를 실행할 수 없습니다.");
    alert("워크플로우 실행 실패: 워크플로우에 시작 노드가 없습니다.");
    callbacks.onWorkflowComplete(false);
    return;
  }
  console.log(`➡️ 시작 노드 발견: ${startNode.data.label} (ID: ${startNode.id})`);

  const nodeExecutionCount = new Map<string, number>();
  const mergeNodeWaitCount = new Map<string, number>();
  const MAX_NODE_EXECUTIONS = 100;
  const MAX_MERGE_WAIT_ATTEMPTS = 100;
  const MAX_TOTAL_ITERATIONS = 1000;
  const errorNodes: string[] = [];

  const runnable = new Set<string>([startNode.id]);
  const running = new Map<string, Promise<{ nodeId: string; output: any }>>();
  let totalIterations = 0;

  while (true) {
    totalIterations++;
    if (totalIterations > MAX_TOTAL_ITERATIONS) {
      console.warn("⚠️ 워크플로우 최대 반복 횟수 도달. 중단합니다.");
      break;
    }

    // runnable → running: 실행 가능하고 제한 통과한 노드만 시작
    const toStart: string[] = [];
    runnable.forEach(nodeId => {
      if (running.has(nodeId)) return;
      if (!canStartNode(nodeId, nodeExecutionCount, mergeNodeWaitCount, callbacks, MAX_NODE_EXECUTIONS, MAX_MERGE_WAIT_ATTEMPTS)) return;
      toStart.push(nodeId);
    });
    toStart.forEach(nodeId => {
      runnable.delete(nodeId);
      const node = callbacks.getNodeById(nodeId);
      if (!node) return;

      const currentCount = nodeExecutionCount.get(nodeId) || 0;
      nodeExecutionCount.set(nodeId, currentCount + 1);
      console.log(`🔄 [Schedule] 노드 ${node.data.label} (${nodeId}) 실행 시작 (${currentCount + 1}/${MAX_NODE_EXECUTIONS})`);

      const promise = executeNode(nodeId, callbacks, chatId)
        .then(output => ({ nodeId, output: output ?? (node.data?.output ?? null) }))
        .catch(err => {
          console.error(`Error in node ${nodeId}:`, err);
          return { nodeId, output: { error: 'Execution failed' } };
        });
      running.set(nodeId, promise);
    });

    if (running.size === 0) {
      if (runnable.size === 0) break;
      console.log("➡️ 실행 가능 노드는 있으나 제한으로 시작 불가. 종료합니다.");
      break;
    }

    // 완료 하나 나올 때까지 대기 (먼저 끝난 노드부터 처리)
    const completed = await Promise.race(
      Array.from(running.entries()).map(([nid, p]) =>
        p.then(out => ({ nodeId: nid, output: out.output }))
      )
    );
    const { nodeId: completedNodeId, output } = completed;

    running.delete(completedNodeId);
    const executedNode = callbacks.getNodeById(completedNodeId);
    if (output && typeof output === 'object' && output.error) {
      errorNodes.push(executedNode?.data?.label || completedNodeId);
    }

    getRunnableDownstream(completedNodeId, callbacks).forEach(downId => {
      if (!running.has(downId)) runnable.add(downId);
    });

    // Merge 노드 대기 시 재시도
    const isMergeWaiting = executedNode?.type === 'mergeNode' && output && (output as any).status === 'waiting';
    if (isMergeWaiting) {
      const currentWaitCount = mergeNodeWaitCount.get(completedNodeId) || 0;
      mergeNodeWaitCount.set(completedNodeId, currentWaitCount + 1);
      runnable.add(completedNodeId);
      console.log(`🔄 [MergeNode] ${executedNode.data.label} (${completedNodeId}) 대기 (${currentWaitCount + 1}/${MAX_MERGE_WAIT_ATTEMPTS}) - 재시도 대기열에 추가`);
    } else if (executedNode?.type === 'mergeNode' && output && (output as any).status !== 'waiting') {
      mergeNodeWaitCount.set(completedNodeId, 0);
    }
  }

  const success = errorNodes.length === 0;
  callbacks.onWorkflowComplete(success, errorNodes);
}
