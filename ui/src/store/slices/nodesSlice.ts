import type { FlowState, NodeData } from '../flowStore';
import type { Node } from 'reactflow';
import { safeCompare } from '../helpers/flowHelpers';
import { createNode } from '../nodes/nodeFactory';

type NodesKeys =
  | 'addNode'
  | 'updateNodeData'
  | 'removeNode'
  | 'getNodeById'
  | 'setNodeOutput'
  | 'setNodeExecuting';

export const createNodesSlice = (
  set: (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>), replace?: boolean) => void,
  get: () => FlowState,
  _api?: unknown
): Pick<FlowState, NodesKeys> => ({
  addNode: ({ type, position, data }) => {
    const newNode: Node<NodeData> = createNode({
      type: type as any,
      position,
      data,
      existingNodes: get().nodes,
    });
    const id = newNode.id;
    set({ nodes: [...get().nodes, newNode] });

    const { collaborationService, isReceivingRemoteChange } = get();
    if (collaborationService?.isConnected() && !isReceivingRemoteChange) {
      console.log(`✅ [Collaboration] Broadcasting node add: ${id}`);
      collaborationService.broadcastNodeAdd(newNode);
    }
    
    return id;
  },

  updateNodeData: (nodeId, dataUpdate) => {
    console.log(`[FlowStore] updateNodeData called - nodeId: ${nodeId}, dataUpdate:`, dataUpdate);
    const { collaborationService, isReceivingRemoteChange } = get();
    if (collaborationService?.isConnected() && !isReceivingRemoteChange) {
      console.log(`[Collaboration] Broadcasting node data update: ${nodeId}`);
      collaborationService.broadcastNodeChange(nodeId, dataUpdate);
    }
    
    set(state => {
      const nodeToUpdate = state.nodes.find(node => node.id === nodeId);
      if (!nodeToUpdate) {
        console.log(`[FlowStore] Node not found: ${nodeId}`);
        return state;
      }

      console.log(`[FlowStore] Current node data:`, nodeToUpdate.data);
      const newData: NodeData = { ...nodeToUpdate.data, ...dataUpdate };
      if (dataUpdate.config) {
        newData.config = { ...nodeToUpdate.data.config, ...dataUpdate.config };
      }
      console.log(`[FlowStore] New node data:`, newData);
      console.log(`[FlowStore] Data changed:`, !safeCompare(nodeToUpdate.data, newData));
      if (safeCompare(nodeToUpdate.data, newData)) {
        console.log(`[FlowStore] No changes detected, returning current state`);
        return state;
      }

      const updatedNodes = state.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      });
      return { nodes: updatedNodes };
    });
  },

  removeNode: (nodeId) => {
    set(state => ({
      nodes: state.nodes.filter(node => node.id !== nodeId),
      edges: state.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
    }));
  },

  getNodeById: (nodeId) => {
    return get().nodes.find(node => node.id === nodeId);
  },

  setNodeOutput: (nodeId, output) => {
    set(state => ({
      nodes: state.nodes.map(node => 
        node.id === nodeId ? { ...node, data: { ...node.data, output } } : node
      ),
    }));
  },

  setNodeExecuting: (nodeId, isExecuting, success = true, nodeName, isWorkflowExecution) => {
    set(state => ({
      nodes: state.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isExecuting,
            }
          };
        }
        return node;
      })
    }));
    const nameForLog = nodeName || get().nodes.find(n => n.id === nodeId)?.data?.label || nodeId;
    if (!isExecuting) {
      const eventDetail = {
        nodeId,
        success,
        nodeName: nameForLog,
        isWorkflowExecution: !!isWorkflowExecution
      };
      window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', { detail: eventDetail }));
    }
  },
});


