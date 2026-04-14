import { Connection, Edge, Node } from 'reactflow';
import { NodeData } from '../types/node';

/**
 * 특정 노드로 들어오는 간선의 개수(in-degree)를 계산합니다.
 * 
 * @param nodeId - 대상 노드 ID
 * @param edges - 전체 간선 배열
 * @returns 들어오는 간선의 개수
 */
export const calculateInDegree = (nodeId: string, edges: Edge[]): number => {
  return edges.filter(edge => edge.target === nodeId).length;
};

/**
 * 노드가 merge 노드인지 확인합니다.
 * 
 * @param nodeId - 확인할 노드 ID
 * @param nodes - 전체 노드 배열
 * @returns merge 노드이면 true
 */
export const isMergeNode = (nodeId: string, nodes: Node<NodeData>[]): boolean => {
  const node = nodes.find(n => n.id === nodeId);
  return node?.type === 'mergeNode';
};

/**
 * 노드가 condition 분기 합류 노드인지 확인합니다.
 * condition 노드에서 분기된 여러 경로가 이 노드로 합쳐지는 경우를 감지합니다.
 * 
 * @param nodeId - 확인할 노드 ID
 * @param nodes - 전체 노드 배열
 * @param edges - 전체 간선 배열
 * @returns condition 분기 합류 노드이면 true
 */
export const isConditionConvergenceNode = (nodeId: string, nodes: Node<NodeData>[], edges: Edge[]): boolean => {
  const node = nodes.find(n => n.id === nodeId);
  
  // merge 노드는 이미 다중 입력을 허용하므로 제외
  if (node?.type === 'mergeNode') {
    return false;
  }
  
  // 현재 노드로 들어오는 모든 edge 확인
  const incomingEdges = edges.filter(edge => edge.target === nodeId);
  
  // 2개 미만의 입력이면 convergence가 아님
  if (incomingEdges.length < 2) {
    return false;
  }
  
  // 각 incoming edge의 source에서 역으로 거슬러 올라가서 condition 노드를 찾는 함수
  const findConditionNodeInPath = (currentNodeId: string, visited: Set<string> = new Set()): string | null => {
    if (visited.has(currentNodeId)) {
      return null; // 순환 방지
    }
    visited.add(currentNodeId);
    
    const currentNode = nodes.find(n => n.id === currentNodeId);
    
    // condition 노드를 찾았으면 반환
    if (currentNode?.type === 'conditionNode') {
      return currentNodeId;
    }
    
    // 상위 노드들을 재귀적으로 탐색
    const parentEdges = edges.filter(edge => edge.target === currentNodeId);
    
    for (const parentEdge of parentEdges) {
      const conditionNodeId = findConditionNodeInPath(parentEdge.source, new Set(visited));
      if (conditionNodeId) {
        return conditionNodeId;
      }
    }
    
    return null;
  };
  
  // 각 incoming edge의 source에서 condition 노드 찾기
  const conditionNodeIds = new Set<string>();
  let edgesFromConditionPaths = 0;
  
  for (const edge of incomingEdges) {
    const conditionNodeId = findConditionNodeInPath(edge.source);
    if (conditionNodeId) {
      conditionNodeIds.add(conditionNodeId);
      edgesFromConditionPaths++;
    }
  }
  
  // 기본 조건 체크
  if (conditionNodeIds.size < 1 || 
      edgesFromConditionPaths !== incomingEdges.length || 
      incomingEdges.length < 2) {
    return false;
  }
  
  // 추가 검증: 모든 incoming edges가 서로 "배타적인" 경로에서 와야 함
  const sources = incomingEdges.map(e => e.source);
  
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const sourceA = sources[i];
      const sourceB = sources[j];
      
      // sourceA에서 sourceB로 가는 경로가 있는지 확인
      const hasPathAtoB = hasPathFromTargetToSource(sourceB, sourceA, edges);
      // sourceB에서 sourceA로 가는 경로가 있는지 확인
      const hasPathBtoA = hasPathFromTargetToSource(sourceA, sourceB, edges);
      
      if (hasPathAtoB || hasPathBtoA) {
        console.log(`🚫 [isConditionConvergenceNode] Sources ${sourceA} and ${sourceB} are not mutually exclusive - path exists between them`);
        return false;
      }
    }
  }
  
  return true;
};

/**
 * DFS를 사용하여 target에서 source로 가는 경로가 있는지 확인합니다.
 * 순환 경로 검사에 사용됩니다.
 * 
 * @param targetId - 시작 노드 ID
 * @param sourceId - 목표 노드 ID
 * @param edges - 전체 간선 배열
 * @returns 경로가 존재하면 true
 */
export const hasPathFromTargetToSource = (targetId: string, sourceId: string, edges: Edge[]): boolean => {
  const visited = new Set<string>();
  
  const dfs = (currentNodeId: string): boolean => {
    if (currentNodeId === sourceId) {
      return true; // 순환 경로 발견
    }
    
    if (visited.has(currentNodeId)) {
      return false; // 이미 방문한 노드
    }
    
    visited.add(currentNodeId);
    
    // 현재 노드에서 출발하는 모든 간선을 확인
    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);
    
    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) {
        return true;
      }
    }
    
    return false;
  };
  
  return dfs(targetId);
};

/**
 * 두 노드 간의 연결이 가능한지 검사합니다.
 * merge 노드와 condition convergence 노드는 다중 입력을 허용합니다.
 * 
 * @param connection - 연결 정보
 * @param nodes - 전체 노드 배열
 * @param edges - 전체 간선 배열
 * @returns 연결 가능 여부와 이유
 */
export const canConnect = (
  connection: Connection,
  nodes: Node<NodeData>[],
  edges: Edge[]
): { allowed: boolean; reason?: string } => {
  const { source, target } = connection;
  
  if (!target) return { allowed: false, reason: "대상 노드가 없습니다." };
  
  // 현재 target 노드의 in-degree 계산
  const currentInDegree = calculateInDegree(target, edges);
  
  // merge 노드인지 확인
  const isMerge = isMergeNode(target, nodes);
  
  // merge 노드는 다수의 입력을 허용
  if (isMerge) {
    return { allowed: true };
  }
  
  // condition convergence 노드인지 확인 (새로 연결했을 때를 가정)
  const simulatedEdges = [...edges, { 
    id: 'temp', 
    source: source!, 
    target: target,
    type: 'default'
  } as Edge];
  const isConditionConvergence = isConditionConvergenceNode(target, nodes, simulatedEdges);
  
  // condition 분기 합류 노드는 여러 입력을 허용
  if (isConditionConvergence) {
    console.log(`🔀 [Connection] ${target} is a condition convergence node - allowing multiple inputs`);
    return { allowed: true };
  }
  
  // 일반 노드의 경우, 이미 1개 이상의 입력이 있으면 순환 여부 검사
  if (currentInDegree >= 1) {
    // 순환 경로가 있는지 확인 (target -> ... -> source)
    const hasCircle = hasPathFromTargetToSource(target, source!, edges);
    
    if (hasCircle) {
      return { allowed: true }; // 순환 경로가 있으면 허용 (회귀 허용 조건)
    } else {
      return { 
        allowed: false, 
        reason: "일반 노드는 동시에 2개 이상의 직접 입력을 받을 수 없습니다. (순환 연결 또는 condition 분기 합류는 예외)" 
      };
    }
  }
  
  // in-degree가 1 미만이면 허용
  return { allowed: true };
};

/**
 * 제약 조건을 위반하는 edge들을 찾아서 반환합니다.
 * 
 * @param nodes - 전체 노드 배열
 * @param edges - 전체 간선 배열
 * @returns 위반하는 edge ID 배열
 */
export const findViolatingEdges = (nodes: Node<NodeData>[], edges: Edge[]): string[] => {
  const violatingEdgeIds: string[] = [];
  
  // 각 노드별로 제약 조건 위반 여부 검사
  nodes.forEach(node => {
    const nodeId = node.id;
    
    // merge 노드는 다수 입력 허용하므로 제외
    if (isMergeNode(nodeId, nodes)) {
      return;
    }
    
    // condition convergence 노드는 다수 입력 허용하므로 제외
    if (isConditionConvergenceNode(nodeId, nodes, edges)) {
      return;
    }
    
    // 현재 노드로 들어오는 모든 edge들
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    
    if (incomingEdges.length > 1) {
      // 2개 이상의 입력이 있는 경우, 순환 여부 검사
      const hasAnyCircle = incomingEdges.some(edge => 
        hasPathFromTargetToSource(nodeId, edge.source, edges)
      );
      
      if (!hasAnyCircle) {
        // 순환 경로가 없으면 모든 incoming edge가 위반
        violatingEdgeIds.push(...incomingEdges.map(edge => edge.id));
      }
    }
  });
  
  return violatingEdgeIds;
};
