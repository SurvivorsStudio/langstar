import type { FlowState, NodeData } from '../flowStore';
import type { Connection, Edge, Node } from 'reactflow';
import { addEdge } from 'reactflow';
import { EDGE_STATES } from '../constants/edges';
import { resetConfigOnConnect, resetConfigOnRemove } from '../nodes/nodePolicies';

type EdgeKeys =
  | 'calculateInDegree'
  | 'isConditionConvergenceNode'
  | 'hasPathFromTargetToSource'
  | 'canConnect'
  | 'findViolatingEdges'
  | 'updateEdgeWarnings'
  | 'onConnect'
  | 'removeEdge'
  | 'updateEdgeLabel'
  | 'updateEdgeDescription'
  | 'updateEdgeData';

export const createEdgesSlice = (
  set: (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>), replace?: boolean) => void,
  get: () => FlowState,
  _api?: unknown
): Pick<FlowState, EdgeKeys> => ({
  calculateInDegree: (nodeId: string, edges: Edge[]) => {
    return edges.filter(edge => edge.target === nodeId).length;
  },

  isConditionConvergenceNode: (nodeId: string, nodes: Node<NodeData>[], edges: Edge[]) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.type === 'mergeNode') return false;
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    if (incomingEdges.length < 2) return false;

    const findConditionNodeInPath = (currentNodeId: string, visited: Set<string> = new Set()): string | null => {
      if (visited.has(currentNodeId)) return null;
      visited.add(currentNodeId);
      const currentNode = nodes.find(n => n.id === currentNodeId);
      if (currentNode?.type === 'conditionNode') return currentNodeId;
      const parentEdges = edges.filter(edge => edge.target === currentNodeId);
      for (const parentEdge of parentEdges) {
        const conditionNodeId = findConditionNodeInPath(parentEdge.source, new Set(visited));
        if (conditionNodeId) return conditionNodeId;
      }
      return null;
    };

    const conditionNodeIds = new Set<string>();
    let edgesFromConditionPaths = 0;
    for (const edge of incomingEdges) {
      const conditionNodeId = findConditionNodeInPath(edge.source);
      if (conditionNodeId) {
        conditionNodeIds.add(conditionNodeId);
        edgesFromConditionPaths++;
      }
    }
    if (conditionNodeIds.size < 1 || edgesFromConditionPaths !== incomingEdges.length || incomingEdges.length < 2) {
      return false;
    }
    const sources = incomingEdges.map(e => e.source);
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const sourceA = sources[i];
        const sourceB = sources[j];
        const hasPathAtoB = get().hasPathFromTargetToSource(sourceB, sourceA, edges);
        const hasPathBtoA = get().hasPathFromTargetToSource(sourceA, sourceB, edges);
        if (hasPathAtoB || hasPathBtoA) return false;
      }
    }
    return true;
  },

  hasPathFromTargetToSource: (targetId: string, sourceId: string, edges: Edge[]) => {
    const visited = new Set<string>();
    const dfs = (currentNodeId: string): boolean => {
      if (currentNodeId === sourceId) return true;
      if (visited.has(currentNodeId)) return false;
      visited.add(currentNodeId);
      const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.target)) return true;
      }
      return false;
    };
    return dfs(targetId);
  },

  canConnect: (connection: Connection) => {
    const { nodes, edges } = get();
    const { source, target } = connection;
    if (!target) return { allowed: false, reason: "대상 노드가 없습니다." };
    const currentInDegree = get().calculateInDegree(target, edges);
    const node = nodes.find(n => n.id === target);
    const isMerge = node?.type === 'mergeNode';
    if (isMerge) return { allowed: true };
    const simulatedEdges = [...edges, { id: 'temp', source: source!, target, type: 'default' } as Edge];
    const isConditionConvergence = get().isConditionConvergenceNode(target, nodes, simulatedEdges);
    if (isConditionConvergence) return { allowed: true };
    if (currentInDegree >= 1) {
      const hasCircle = get().hasPathFromTargetToSource(target, source!, edges);
      if (hasCircle) return { allowed: true };
      return { allowed: false, reason: "일반 노드는 동시에 2개 이상의 직접 입력을 받을 수 없습니다. (순환 연결 또는 condition 분기 합류는 예외)" };
    }
    return { allowed: true };
  },

  findViolatingEdges: () => {
    const { nodes, edges } = get();
    const violatingEdgeIds: string[] = [];
    nodes.forEach(node => {
      const nodeId = node.id;
      if (node.type === 'mergeNode') return;
      if (get().isConditionConvergenceNode(nodeId, nodes, edges)) return;
      const incomingEdges = edges.filter(edge => edge.target === nodeId);
      if (incomingEdges.length > 1) {
        const hasAnyCircle = incomingEdges.some(edge => get().hasPathFromTargetToSource(nodeId, edge.source, edges));
        if (!hasAnyCircle) {
          violatingEdgeIds.push(...incomingEdges.map(edge => edge.id));
        }
      }
    });
    return violatingEdgeIds;
  },

  updateEdgeWarnings: () => {
    const violatingEdgeIds = get().findViolatingEdges();
    set(state => ({
      edges: state.edges.map(edge => ({
        ...edge,
        data: { ...edge.data, isWarning: violatingEdgeIds.includes(edge.id) }
      }))
    }));
  },

  onConnect: (connection: Connection) => {
    const connectionCheck = get().canConnect(connection);
    if (!connectionCheck.allowed) {
      window.dispatchEvent(new CustomEvent('connectionError', { detail: { reason: connectionCheck.reason } }));
      return;
    }
    const { nodes, edges } = get();
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);
    const isConditionNode = sourceNode?.type === 'conditionNode';
    const startNode = nodes.find(node => node.type === 'startNode');
    const className = startNode?.data.config?.className || 'data';
    const edgeData: any = { 
      output: EDGE_STATES.PENDING,
      isExecuting: false,
      isSuccess: false,
      isFailure: false,
      timestamp: undefined,
    };
    if (isConditionNode) {
      const existingSourceEdgesCount = edges.filter(e => e.source === connection.source).length;
      edgeData.label = `if ${className}['value'] > 0`;
      edgeData.conditionOrderIndex = existingSourceEdgesCount;
      edgeData.conditionDescription = `Rule #${existingSourceEdgesCount + 1}`;
    }
    set(state => {
      const updatedNodes = state.nodes.map(node => {
        if (node.id === connection.target && targetNode) {
          const resetConfig = resetConfigOnConnect(targetNode.type, (node.data.config || {}) as any);
          return { ...node, data: { ...node.data, config: resetConfig, inputData: null, output: null } };
        }
        return node;
      });
      return { nodes: updatedNodes, edges: addEdge({ ...connection, animated: true, data: edgeData }, state.edges) };
    });
    setTimeout(() => { get().updateEdgeWarnings(); }, 0);
  },

  removeEdge: (edgeId: string) => {
    const edge = get().edges.find(e => e.id === edgeId);
    if (!edge) return;
    set(state => {
      const updatedNodes = state.nodes.map(node => {
        if (node.id === edge.source) {
          return { ...node, data: { ...node.data, output: null } };
        }
        if (node.id === edge.target) {
          const resetConfig = resetConfigOnRemove(node.type, (node.data.config || {}) as any, edge.source);
          return { ...node, data: { ...node.data, config: resetConfig } };
        }
        return node;
      });
      const updatedEdges = state.edges.filter(e => e.id !== edgeId);
      return { nodes: updatedNodes, edges: updatedEdges };
    });
  },

  updateEdgeData: (edgeId: string, dataToUpdate: Partial<Edge['data']>) => {
    set(state => ({
      edges: state.edges.map(edge => 
        edge.id === edgeId ? { ...edge, data: { ...edge.data, ...dataToUpdate } } : edge
      )
    }));
  },

  updateEdgeLabel: (edgeId: string, label: string) => {
    get().updateEdgeData(edgeId, { label });
  },

  updateEdgeDescription: (edgeId: string, description: string) => {
    get().updateEdgeData(edgeId, { conditionDescription: description });
  },
});


