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
  /** 수동 선택 엣지 설정 시 호출 */
  onManualEdgeSelect: (nodeId: string, edgeId: string | null) => void;
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
  /** 수동 선택 엣지 조회 */
  getManuallySelectedEdge: (nodeId: string) => string | null;
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
      // 일반 노드의 기존 로직
      // 수동으로 선택된 edge가 있는지 확인
      const manuallySelectedEdgeId = callbacks.getManuallySelectedEdge(nodeId);

      if (manuallySelectedEdgeId) {
        // 수동으로 선택된 edge의 데이터 사용
        const selectedEdge = incomingEdges.find(edge => edge.id === manuallySelectedEdgeId);
        if (selectedEdge && selectedEdge.data?.output && typeof selectedEdge.data.output === 'object') {
          input = selectedEdge.data.output;
        }
      } else {
        // 수동 선택이 없으면 가장 최근에 실행된 노드의 데이터 사용
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

    // 노드 출력 설정
    callbacks.onNodeOutputSet(nodeId, output);

    // 노드 실행 완료 콜백
    callbacks.onNodeComplete(nodeId, output, !hasError, nodeName);

    // 성공/실패에 따라 나가는 엣지들의 상태 설정
    const currentEdges = callbacks.getEdges();
    const currentOutgoingEdges = currentEdges.filter(edge => edge.source === nodeId);

    // 성공적으로 실행된 경우, 연결된 타겟 노드들의 입력 소스를 자동으로 이 노드로 설정
    // 단, merge 노드는 예외 (여러 입력을 합치는 역할이므로 특정 입력 소스를 표시하지 않음)
    if (!hasError) {
      currentOutgoingEdges.forEach(edge => {
        const targetNode = callbacks.getNodeById(edge.target);
        if (targetNode?.type !== 'mergeNode') {
          callbacks.onManualEdgeSelect(edge.target, edge.id);
        }
      });
    }

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

/**
 * 워크플로우 전체를 실행합니다.
 * 
 * @param callbacks - 실행 콜백
 * @param chatId - 채팅 ID (선택적)
 */
export async function runWorkflow(
  callbacks: ExecutionCallbacks,
  chatId?: string
): Promise<void> {
  console.log('🚀 [RunWorkflow] Starting workflow execution');

  const nodes = callbacks.getNodes();
  const edges = callbacks.getEdges();

  // 워크플로 시작 시 모든 edge를 PENDING 상태로 초기화 (순환 구조 지원)
  console.log("🔄 [RunWorkflow] Initializing all edges to PENDING state");
  edges.forEach(edge => {
    callbacks.onEdgeUpdate(edge.id, EDGE_STATES.PENDING);
  });

  // 워크플로우 실행 시작 알림
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

  // 순환 구조 지원을 위한 실행 로직
  const nodeExecutionCount = new Map<string, number>(); // 각 노드의 실행 횟수 추적
  const mergeNodeWaitCount = new Map<string, number>(); // merge 노드 대기 횟수 추적
  const MAX_NODE_EXECUTIONS = 10; // 무한 루프 방지를 위한 최대 실행 횟수
  const MAX_MERGE_WAIT_ATTEMPTS = 10; // merge 노드 최대 대기 시도 횟수
  let frontier: string[] = [startNode.id];
  const errorNodes: string[] = [];
  let totalIterations = 0;
  const MAX_TOTAL_ITERATIONS = 100; // 전체 실행 반복 제한

  while (frontier.length > 0) {
    totalIterations++;
    if (totalIterations > MAX_TOTAL_ITERATIONS) {
      console.warn("⚠️ 워크플로우가 최대 반복 횟수에 도달했습니다. 무한 루프를 방지하기 위해 중단합니다.");
      break;
    }

    // 실행 가능한 노드만 필터링 (최대 실행 횟수 및 merge 대기 제한 체크)
    const executableNodes = Array.from(new Set(frontier)).filter(nodeId => {
      const executionCount = nodeExecutionCount.get(nodeId) || 0;
      const node = callbacks.getNodeById(nodeId);

      // 일반 노드: 최대 실행 횟수만 체크
      if (node?.type !== 'mergeNode') {
        return executionCount < MAX_NODE_EXECUTIONS;
      }

      // merge 노드: 실행 횟수와 대기 시도 횟수 모두 체크
      const waitCount = mergeNodeWaitCount.get(nodeId) || 0;
      const canExecute = executionCount < MAX_NODE_EXECUTIONS && waitCount < MAX_MERGE_WAIT_ATTEMPTS;

      if (!canExecute && waitCount >= MAX_MERGE_WAIT_ATTEMPTS) {
        console.warn(`⚠️ [MergeNode] ${node.data.label} (${nodeId}) 최대 대기 횟수 초과 - 강제 실행`);
        // 최대 대기 횟수 초과 시 강제로 실행 허용
        return executionCount < MAX_NODE_EXECUTIONS;
      }

      return canExecute;
    });

    if (executableNodes.length === 0) {
      console.log("➡️ 더 이상 실행할 수 있는 노드가 없습니다. (최대 실행 횟수 도달)");
      break;
    }

    console.log(`➡️ Parallel executing level (iteration ${totalIterations}):`, executableNodes);
    console.log(`➡️ Node execution counts:`, Object.fromEntries(nodeExecutionCount));

    // 현재 레벨 병렬 실행
    await Promise.all(executableNodes.map(async (nodeId) => {
      const nodeToExecute = callbacks.getNodeById(nodeId);
      if (!nodeToExecute) {
        console.warn(`⚠️ 실행 중 ID ${nodeId}를 가진 노드를 찾을 수 없습니다. 건너뜁니다.`);
        return;
      }

      // 실행 횟수 증가
      const currentCount = nodeExecutionCount.get(nodeId) || 0;
      nodeExecutionCount.set(nodeId, currentCount + 1);
      console.log(`🔄 노드 ${nodeToExecute.data.label} (${nodeId}) 실행 횟수: ${currentCount + 1}/${MAX_NODE_EXECUTIONS}`);

      try {
        await executeNode(nodeId, callbacks, chatId, true);
      } catch (e) {
        // 내부에서 상태 처리됨
      }
    }));

    // 다음 레벨 수집
    const next: string[] = [];
    for (const nodeId of executableNodes) {
      const executedNode = callbacks.getNodeById(nodeId);
      const output = executedNode?.data.output;
      if (output && typeof output === 'object' && output.error) {
        errorNodes.push(executedNode?.data.label || nodeId);
      }

      const latestEdges = callbacks.getEdges();
      const outgoingEdges = latestEdges.filter(edge => edge.source === nodeId);
      outgoingEdges.forEach(edge => {
        if (edge.data?.output !== null && edge.data?.output !== undefined) {
          const targetNodeId = edge.target;
          const targetNode = callbacks.getNodeById(targetNodeId);

          // merge 노드인 경우 모든 incoming edge가 준비되었는지 사전 체크
          if (targetNode?.type === 'mergeNode') {
            const allIncomingEdges = latestEdges.filter(e => e.target === targetNodeId);
            const readyEdges = allIncomingEdges.filter(hasValidEdgeData);

            const allEdgesReady = readyEdges.length === allIncomingEdges.length;

            if (allEdgesReady) {
              console.log(`[Frontier] Merge 노드 ${targetNode.data.label} 준비 완료 - 실행 큐 추가`);
              next.push(targetNodeId);
            } else {
              console.log(`[Frontier] Merge 노드 ${targetNode.data.label} 대기 (${readyEdges.length}/${allIncomingEdges.length})`);
            }
          } else if (callbacks.isConditionConvergenceNode(targetNodeId, callbacks.getNodes(), latestEdges)) {
            // condition convergence 노드는 하나의 edge라도 데이터가 있으면 실행 가능
            const allIncomingEdges = latestEdges.filter(e => e.target === targetNodeId);
            const readyEdges = allIncomingEdges.filter(hasValidEdgeData);

            if (readyEdges.length > 0) {
              console.log(`🔀 [Frontier] Condition convergence 노드 ${targetNode?.data.label} 준비 완료 (${readyEdges.length}/${allIncomingEdges.length} edges ready) - 실행 큐 추가`);
              next.push(targetNodeId);
            } else {
              console.log(`🔀 [Frontier] Condition convergence 노드 ${targetNode?.data.label} 대기 중 - 아직 데이터가 없음`);
            }
          } else {
            // 일반 노드는 기존 로직대로
            next.push(targetNodeId);
          }
        }
      });

      // mergeNode가 대기 상태면 동일 노드를 재시도 대상으로 유지
      const isMergeWaiting = executedNode?.type === 'mergeNode' && output && (output as any).status === 'waiting';
      if (isMergeWaiting) {
        // merge 노드 대기 횟수 증가
        const currentWaitCount = mergeNodeWaitCount.get(nodeId) || 0;
        mergeNodeWaitCount.set(nodeId, currentWaitCount + 1);

        // 대기 중인 merge 노드는 다음 반복에서 재시도
        next.push(nodeId);
        console.log(`🔄 [MergeNode] ${executedNode.data.label} (${nodeId}) 대기 중 (${currentWaitCount + 1}/${MAX_MERGE_WAIT_ATTEMPTS}) - 다음 반복에서 재시도`);
        console.log(`🔄 [MergeNode] 대기 이유:`, (output as any).message);
        console.log(`🔄 [MergeNode] 완료 대기 중인 노드들:`, (output as any).waitingFor);
      } else if (executedNode?.type === 'mergeNode' && output && (output as any).status !== 'waiting') {
        // merge 노드가 성공적으로 완료된 경우 - 대기 카운트 리셋
        mergeNodeWaitCount.set(nodeId, 0);
        console.log(`✅ [MergeNode] ${executedNode.data.label} (${nodeId}) 완료 - 다음 노드들로 진행`);
      }
    }

    // 순환 구조 지원: visited Set 제거, 실행 횟수만으로 제한
    frontier = next;
  }

  // 워크플로우 완료 알림
  const success = errorNodes.length === 0;
  callbacks.onWorkflowComplete(success, errorNodes);
}
