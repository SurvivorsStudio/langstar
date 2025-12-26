/**
 * Flow Store
 * 
 * Main Zustand store for managing workflow canvas state.
 * 
 * Responsibilities:
 * - Node and edge management (add, update, delete)
 * - Workflow execution (individual nodes and full workflow)
 * - Canvas state (viewport, selection, focus)
 * - Workflow save/load operations
 * - Edge validation and connection rules
 * 
 * This store has been refactored from 2,744 lines to 1,183 lines (-57%)
 * by extracting specialized stores, services, and utilities.
 * 
 * Related stores:
 * - aiConnectionStore: AI model connections
 * - userNodeStore: User-defined nodes
 * - workflowStorageStore: Workflow list management
 * - deploymentZustandStore: Deployment management
 * 
 * @see store/README.md for architecture overview
 * @see EXTENSION_GUIDE.md for extension instructions
 */

import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  Viewport,
} from 'reactflow';
import { nanoid } from 'nanoid';
import * as storageService from '../services/storageService';

// Type imports
import { NodeData } from '../types/node';
import { EDGE_STATES } from '../types/edge';
import { Workflow } from '../types/workflow';

// Utility imports
import { hasValidEdgeData, getCircularReplacer, safeCompare } from '../utils/edgeUtils';
import { getUniqueNodeName, generateStartNodeOutput } from '../utils/nodeUtils';
import {
  calculateInDegree,
  isMergeNode,
  isConditionConvergenceNode,
  hasPathFromTargetToSource,
  canConnect,
  findViolatingEdges
} from '../utils/edgeValidation';
import {
  convertToPythonNotation,
  prepareConditionForEvaluation,
  evaluateCondition
} from '../utils/dataTransform';

// Execution engine imports
import * as executionEngine from '../services/execution/executionEngine';
import type { ExecutionCallbacks } from '../services/execution/executionEngine';

// Re-exports for backward compatibility
export { EDGE_STATES };
export type { NodeData, Workflow };


export interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  projectName: string;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setProjectName: (name: string) => void;
  addNode: (nodeData: { type: string; position: { x: number; y: number }; data: NodeData }) => void;
  updateNodeData: (nodeId: string, dataUpdate: Partial<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  getNodeById: (nodeId: string) => Node<NodeData> | undefined;
  setNodeOutput: (nodeId: string, output: any) => void;
  setEdgeOutput: (edgeId: string, output: any) => void;
  executeNode: (nodeId: string, chatId?: string) => Promise<void>;
  updateEdgeLabel: (edgeId: string, label: string) => void; // ��??
  updateEdgeDescription: (edgeId: string, description: string) => void; // ��??
  updateEdgeData: (edgeId: string, data: Partial<Edge['data']>) => void; // ???? ??��????��??Ʈ ??��

  setEdgeSuccess: (edgeId: string, isSuccess: boolean) => void; // ???? ??�� ??�� ??��
  setEdgeFailure: (edgeId: string, isFailure: boolean) => void; // ???? ??�� ??�� ??��
  setEdgeExecuting: (edgeId: string, isExecuting: boolean) => void; // ???? ??�� ????�� ??��
  resetAllEdgeStatuses: (excludeEdgeIds?: string[]) => void; // ��� ???? ??�� �ʱ�??(??�� ��� ??��)

  setNodeExecuting: (nodeId: string, isExecuting: boolean, success?: boolean, nodeName?: string, isWorkflowExecution?: boolean) => void;
  runWorkflow: (chatId?: string) => Promise<void>; // chatId ??����� ��??
  isWorkflowRunning: boolean;
  setWorkflowRunning: (isRunning: boolean) => void;
  viewport: Viewport; // viewport ??�� ��??
  setViewport: (viewport: Viewport) => void; // viewport ??��??Ʈ ??�� ��??
  
  // ??�� ??�� ??�� ���� ��????��??
  calculateInDegree: (nodeId: string, edges: Edge[]) => number;
  isMergeNode: (nodeId: string, nodes: Node<NodeData>[]) => boolean;
  isConditionConvergenceNode: (nodeId: string, nodes: Node<NodeData>[], edges: Edge[]) => boolean;
  hasPathFromTargetToSource: (targetId: string, sourceId: string, edges: Edge[]) => boolean;
  canConnect: (connection: Connection) => { allowed: boolean; reason?: string };
  findViolatingEdges: () => string[];
  updateEdgeWarnings: () => void;

  // ??�� ??�� ??��
  selectedNode: string | null;
  setSelectedNode: (id: string | null) => void;

  // IndexedDB ??????�ҷ�??�� ��????�� ????��
  isSaving: boolean;
  saveError: string | null;
  lastSaved: Date | null;
  isLoading: boolean;
  loadError: string | null;
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (projectName: string) => Promise<void>;
  getWorkflowAsJSONString: (deploymentData?: Workflow) => string | null;
  
  // ��Ŀ�� ����
  focusedElement: { type: 'node' | 'edge' | null; id: string | null };
  setFocusedElement: (type: 'node' | 'edge' | null, id: string | null) => void;


  // ??�� ??��??edge ??��
  manuallySelectedEdges: Record<string, string | null>; // nodeId -> edgeId
  setManuallySelectedEdge: (nodeId: string, edgeId: string | null) => void;
}

export const initialNodes: Node<NodeData>[] = [
  {
    id: 'start',
    type: 'startNode',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Start',
      description: 'Starting point of the workflow',
      output: null,
      isExecuting: false,
      config: {
        className: '',
        classType: 'TypedDict',
        variables: []
      }
    },
  },
  {
    id: 'end',
    type: 'endNode',
    position: { x: 400, y: 100 },
    data: {
      label: 'End',
      description: 'End point of the workflow',
      output: null,
      isExecuting: false,
      config: {
        receiveKey: ''
      }
    },
  }
];

// ????ũ??��???? ??�� �⺻ �ʱ� ??�� (Start, End ??�� ??��)
export const emptyInitialNodes: Node<NodeData>[] = [
  {
    id: 'start',
    type: 'startNode',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Start',
      description: 'Starting point of the workflow',
      output: null,
      isExecuting: false,
      config: {
        className: '',
        classType: 'TypedDict',
        variables: []
      }
    },
  },
  {
    id: 'end',
    type: 'endNode',
    position: { x: 400, y: 100 },
    data: {
      label: 'End',
      description: 'End point of the workflow',
      output: null,
      isExecuting: false,
      config: {
        receiveKey: ''
      }
    },
  }
];
export const emptyInitialEdges: Edge[] = [];

export const initialEdges: Edge[] = [];

// MongoDB Storage ??�� (IndexedDB ??��??
export const DEFAULT_PROJECT_NAME = 'New Workflow'; // �⺻ ??��??Ʈ ??�� ??��??

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  projectName: DEFAULT_PROJECT_NAME,
  viewport: { x: 0, y: 0, zoom: 1 }, // viewport �ʱ�??
  isWorkflowRunning: false,
  setWorkflowRunning: (isRunning: boolean) => set({ isWorkflowRunning: isRunning }),
  
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  // ??�� ??�� ??��
  selectedNode: null,
  setSelectedNode: (id: string | null) => set({ selectedNode: id }),

  // IndexedDB ��????�� �ʱ�??
  isSaving: false,
  saveError: null,
  lastSaved: null,
  isLoading: false,
  loadError: null,
  
  // ��Ŀ�� ���� �ʱ� ����
  focusedElement: { type: null, id: null },


  // ??�� ??��??edge ??��
  manuallySelectedEdges: {},
  setManuallySelectedEdge: (nodeId: string, edgeId: string | null) => set({ manuallySelectedEdges: { ...get().manuallySelectedEdges, [nodeId]: edgeId } }),

  setViewport: (viewport: Viewport) => {
    set({ viewport });
  },

  // ??�� ??�� ??�� ���� ��????��??(??ƿ��Ƽ ??�� ??��)
  calculateInDegree: (nodeId: string, edges: Edge[]) => calculateInDegree(nodeId, edges),
  isMergeNode: (nodeId: string, nodes: Node<NodeData>[]) => isMergeNode(nodeId, nodes),
  isConditionConvergenceNode: (nodeId: string, nodes: Node<NodeData>[], edges: Edge[]) => 
    isConditionConvergenceNode(nodeId, nodes, edges),
  hasPathFromTargetToSource: (targetId: string, sourceId: string, edges: Edge[]) => 
    hasPathFromTargetToSource(targetId, sourceId, edges),
  canConnect: (connection: Connection) => {
    const { nodes, edges } = get();
    return canConnect(connection, nodes, edges);
  },
  findViolatingEdges: () => {
    const { nodes, edges } = get();
    return findViolatingEdges(nodes, edges);
  },
  updateEdgeWarnings: () => {
    const violatingEdgeIds = get().findViolatingEdges();
    
    set(state => ({
      edges: state.edges.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          isWarning: violatingEdgeIds.includes(edge.id)
        }
      }))
    }));
  },
  
  onConnect: (connection: Connection) => {
    // ??�� ���� ��??
    const connectionCheck = get().canConnect(connection);
    
    if (!connectionCheck.allowed) {
      // ??�� ���� ??�� ????��??��????��????��
      window.dispatchEvent(new CustomEvent('connectionError', {
        detail: { reason: connectionCheck.reason }
      }));
      return; // ??�� �ߴ�
    }

    const { nodes, edges } = get(); // Get current nodes and edges
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);
    const isConditionNode = sourceNode?.type === 'conditionNode';
    const startNode = nodes.find(node => node.type === 'startNode');
    const className = startNode?.data.config?.className || 'data';

    // ??�� ???? �ʱ� ??��: PENDING??�� ??��
    const edgeData: any = { 
      output: EDGE_STATES.PENDING,  // ��Ȯ????????��????��
      isExecuting: false,
      isSuccess: false,
      isFailure: false,
      timestamp: undefined,
    };

    if (isConditionNode) {
      // Count existing outgoing edges from this source before adding the new one
      const existingSourceEdgesCount = edges.filter(e => e.source === connection.source).length;
      edgeData.label = `if ${className}['value'] > 0`; // Default 'if' condition label
      edgeData.conditionOrderIndex = existingSourceEdgesCount; // �ʱ� ??�� ??��????��
      edgeData.conditionDescription = `Rule #${existingSourceEdgesCount + 1}`; // Default rule description
    }
    
    // ??�� ??��????��??target ??��????��??�ʱ�??
    set(state => {
      const updatedNodes = state.nodes.map(node => {
        if (node.id === connection.target && targetNode) {
          const resetConfig = { ...node.data.config };
          
          // ??�� ????�� ??��??�ʱ�??(??����� ����??���� ��??)
          switch (targetNode.type) {
            case 'endNode':
              resetConfig.receiveKey = '';
              break;
            case 'promptNode':
              // ??��??Ʈ ??��????�� ��????�� �ʱ�??
              if (resetConfig.inputVariable) {
                resetConfig.inputVariable = '';
              }
              if (resetConfig.selectedKeyName) {
                resetConfig.selectedKeyName = '';
              }
              break;
            case 'agentNode':
              // ??��??Ʈ ??��????�� ��????�� �ʱ�??
              if (resetConfig.userPromptInputKey) {
                resetConfig.userPromptInputKey = '';
              }
              if (resetConfig.systemPromptInputKey) {
                resetConfig.systemPromptInputKey = '';
              }
              break;
            case 'userNode':
              // ??��????��????�� ??��??�ʱ�??
              if (resetConfig.inputData) {
                resetConfig.inputData = {};
              }
              break;
            case 'mergeNode':
              // ��?? ??��??��� ���� ���� ???? (??�� ??�� ��??
              break;
            default:
              // ??�� ??�� ????��??���� ??�� �ʱ�??
              if (resetConfig.inputKey) {
                resetConfig.inputKey = '';
              }
              if (resetConfig.selectedInput) {
                resetConfig.selectedInput = null;
              }
              break;
          }
          
          return {
            ...node,
            data: { 
              ...node.data, 
              config: resetConfig,
              inputData: null, // ??�� ??��??�ʱ�??
              output: null     // ��� ??��??�� �ʱ�??
            }
          };
        }
        return node;
      });
      
      return {
        nodes: updatedNodes,
        edges: addEdge({ 
          ...connection, 
          animated: true,
          data: edgeData
        }, state.edges),
      };
    });

    // ??�� ??��?????? ??��??�ʱ�??(??����� ����??���� ��??)
    set(state => ({
      manuallySelectedEdges: {
        ...state.manuallySelectedEdges,
        [connection.target!]: null
      }
    }));

    // ??�� ????�� ���� ????????��� ??�� ??��??Ʈ
    setTimeout(() => {
      get().updateEdgeWarnings();
    }, 0);
  },

  // ��� ???? ??�� �ʱ�??(??�� edgeId??????)
  resetAllEdgeStatuses: (excludeEdgeIds: string[] = []) => {
    set({
      edges: get().edges.map(edge => (
        excludeEdgeIds.includes(edge.id)
          ? edge
          : {
              ...edge,
              data: {
                ...edge.data,
                isExecuting: false,
                isSuccess: false,
                isFailure: false,
              }
            }
      ))
    });
  },

  setProjectName: (name: string) => set(state => state.projectName === name ? {} : { projectName: name }),
  
  addNode: ({ type, position, data }) => {
    const id = nanoid();
    const uniqueLabel = getUniqueNodeName(get().nodes, data.label);
    const defaultConfig = type === 'startNode' ? {
      className: '',
      classType: 'TypedDict' as const,
      variables: []
    } : type === 'functionNode' ? { // functionNode (Custom Python Function) �⺻ ??��
      outputVariable: uniqueLabel,
      // code??newNode ??�� ??data??���� ??��??��??
    } : type === 'loopNode' ? {
      repetitions: 1
    } : type === 'promptNode' ? { // promptNode??outputVariable �⺻??��??
      template: 'User: {{user_input}}\n\nAssistant:',
      outputVariable: uniqueLabel
    } : type === 'agentNode' ? {
      model: '',
      userPromptInputKey: '',
      systemPromptInputKey: '',
      memoryGroup: '',
      tools: [],
      agentOutputVariable: uniqueLabel
    } : type === 'mergeNode' ? {
      mergeMappings: []
    } : type === 'endNode' ? {
      receiveKey: ''
    } : type === 'userNode' ? {
      // UserNode??��� data.config??�� ��??�� ??��????��??��, �⺻���� ??��
      outputVariable: uniqueLabel,
      ...data.config
    } : {};

    // functionNode??��� data.code??�⺻ ??��??�� �ڵ�????��??��??
    const initialNodeData = { ...data };
    if (type === 'functionNode' && !initialNodeData.code) {
      initialNodeData.code =
        'def exce_code(state):\n' +
        '    # Access input variables:\n' +
        '    # value = state[\'variable_name\']\n' +
        '    # \n' +
        '    # Your code here...\n' +
        '    # \n' +
        '    return state';
    }

    const newNode: Node<NodeData> = {
      id,
      type,
      position,
      data: {
        ...initialNodeData, // �⺻ �ڵ尡 ??��??????�� initialNodeData ??��
        label: uniqueLabel,
        output: null,
        inputData: null, // inputData �ʱ�??
        isExecuting: false,
        config: type === 'userNode' ? data.config : defaultConfig
      },
    };
    
    set({
      nodes: [...get().nodes, newNode],
    });
    
    return id;
  },
  
  updateNodeData: (nodeId: string, dataUpdate: Partial<NodeData>) => {
    console.log(`[FlowStore] updateNodeData called - nodeId: ${nodeId}, dataUpdate:`, dataUpdate);
    set(state => {
      const nodeToUpdate = state.nodes.find(node => node.id === nodeId);
      if (!nodeToUpdate) {
        console.log(`[FlowStore] Node not found: ${nodeId}`);
        return state;
      }

      console.log(`[FlowStore] Current node data:`, nodeToUpdate.data);
      const newData = { ...nodeToUpdate.data, ...dataUpdate };

      // config ��ü?????? ����?????? ???? ??��??����??��????��??
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

      // output??�����??���� ??��??��, �����??��????��??????????��??Ʈ
      if (!safeCompare(nodeToUpdate.data.output, newData.output)) {
        const updatedEdges = state.edges.map(edge => {
          if (edge.source === nodeId) {
            return {
              ...edge,
              data: { ...edge.data, output: newData.output }
            };
          }
          return edge;
        });
        console.log(`[FlowStore] Updating nodes and edges`);
        return { nodes: updatedNodes, edges: updatedEdges };
      }

      console.log(`[FlowStore] Updating nodes only`);
      return { nodes: updatedNodes };
    });
  },
  
  removeNode: (nodeId: string) => {
    set(state => {
      const connectedEdges = state.edges.filter(
        edge => edge.source === nodeId || edge.target === nodeId
      );

      const affectedNodeIds = new Set<string>();
      connectedEdges.forEach(edge => {
        if (edge.source === nodeId) {
          affectedNodeIds.add(edge.target);
        } else {
          affectedNodeIds.add(edge.source);
        }
      });

      const updatedNodes = state.nodes
        .filter(node => node.id !== nodeId)
        .map(node => {
          if (affectedNodeIds.has(node.id)) {
            return {
              ...node,
              data: { ...node.data, output: null }
            };
          }
          return node;
        });

      const updatedEdges = state.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      );

      return {
        nodes: updatedNodes,
        edges: updatedEdges
      };
    });
  },

  removeEdge: (edgeId: string) => {
    const edge = get().edges.find(e => e.id === edgeId);
    if (!edge) return;

    set(state => {
      const updatedNodes = state.nodes.map(node => {
        // Source ??��??output �ʱ�??
        if (node.id === edge.source) {
          return {
            ...node,
            data: { ...node.data, output: null }
          };
        }
        
        // Target ??��????��??�ʱ�??
        if (node.id === edge.target) {
          const resetConfig = { ...node.data.config };
          
          // ??�� ????�� ??��??�ʱ�??
          switch (node.type) {
            case 'endNode':
              resetConfig.receiveKey = '';
              break;
            case 'promptNode':
              // ??��??Ʈ ??��????�� ��????�� �ʱ�??
              if (resetConfig.inputVariable) {
                resetConfig.inputVariable = '';
              }
              if (resetConfig.selectedKeyName) {
                resetConfig.selectedKeyName = '';
              }
              break;
            case 'agentNode':
              // ??��??Ʈ ??��????�� ��????�� �ʱ�??
              if (resetConfig.userPromptInputKey) {
                resetConfig.userPromptInputKey = '';
              }
              if (resetConfig.systemPromptInputKey) {
                resetConfig.systemPromptInputKey = '';
              }
              break;
            case 'userNode':
              // ??��????��????�� ??��??�ʱ�??
              if (resetConfig.inputData) {
                resetConfig.inputData = {};
              }
              break;
            case 'mergeNode':
              // ��?? ??��??���� ??��??�� ??�� ???? ��??���� ??��
              if (resetConfig.mergeMappings) {
                resetConfig.mergeMappings = resetConfig.mergeMappings.filter(
                  (mapping: any) => mapping.sourceNodeId !== edge.source
                );
              }
              break;
            default:
              // ??�� ??�� ????��??���� ??�� �ʱ�??
              if (resetConfig.inputKey) {
                resetConfig.inputKey = '';
              }
              if (resetConfig.selectedInput) {
                resetConfig.selectedInput = null;
              }
              break;
          }
          
          return {
            ...node,
            data: { 
              ...node.data, 
              config: resetConfig,
              inputData: null, // ??�� ??��??�ʱ�??
              output: null     // ��� ??��??�� �ʱ�??
            }
          };
        }
        
        return node;
      });

      return {
        nodes: updatedNodes,
        edges: state.edges.filter(e => e.id !== edgeId)
      };
    });

    // ??�� ??��?????? ??��??�ʱ�??
    const { manuallySelectedEdges } = get();
    if (manuallySelectedEdges[edge.target] === edgeId) {
      set(state => ({
        manuallySelectedEdges: {
          ...state.manuallySelectedEdges,
          [edge.target]: null
        }
      }));
    }

    // edge ???? ????�� ���� ????????��� ??�� ??��??Ʈ
    setTimeout(() => {
      get().updateEdgeWarnings();
    }, 0);
  },
  
  getNodeById: (nodeId: string) => {
    return get().nodes.find((node) => node.id === nodeId);
  },

  setNodeOutput: (nodeId: string, output: any) => {
    set(state => {
      const updatedNodes = state.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, output }
          };
        }
        return node;
      });

      const updatedEdges = state.edges.map(edge => {
        if (edge.source === nodeId) {
          const sourceNode = state.nodes.find(n => n.id === nodeId);
          if (sourceNode?.type === 'conditionNode') {
            // For edges originating from a ConditionNode, their `data.output`
            // is already correctly set by the ConditionNode's execution logic
            // (which uses `setEdgeOutput`). We must not overwrite it here.
            // Therefore, we return the edge as is.
            return edge;
          }
          // For other node types, propagate the node's output to the edge's data.output
          return {
            ...edge,
            data: { 
              ...edge.data, 
              output,
              timestamp: output ? Date.now() : 0 // output????�� ??�� timestamp ????
            }
          };
        }
        return edge;
      });

      return { nodes: updatedNodes, edges: updatedEdges };
    });
  },

  setEdgeOutput: (edgeId: string, output: any) => {
    set(state => {
      const updatedEdges = state.edges.map(edge => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: { 
              ...edge.data, 
              output,
              timestamp: output ? Date.now() : 0 // output????�� ??�� timestamp ????
            }
          };
        }
        return edge;
      });

      return { edges: updatedEdges };
    });
  },

  setNodeExecuting: (nodeId: string, isExecuting: boolean, success: boolean = true, nodeName?: string, isWorkflowExecution?: boolean) => {
    console.log(`??? [setNodeExecuting] Node ${nodeId} (${nodeName}) -> isExecuting: ${isExecuting}, success: ${success}, isWorkflowExecution: ${isWorkflowExecution}`);
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, isExecuting }
          };
        }
        return node;
      })
    });
    
    // ??�� ??�� ????��????��??�߻� (??ũ??��????�� ���� ??�� ??��)
    if (isExecuting && !isWorkflowExecution) {
      console.log(`??? [setNodeExecuting] Dispatching nodeExecutionStarted event for node ${nodeId}`);
      window.dispatchEvent(new CustomEvent('nodeExecutionStarted', {
        detail: { nodeId, nodeName }
      }));
    }

    // ??�� ??�� ????��????��??�߻� (??ũ??��????�� ���� ??�� ??��)
    if (!isExecuting && !isWorkflowExecution) {
      console.log(`??? [setNodeExecuting] Dispatching nodeExecutionCompleted event for node ${nodeId}`);
      window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', { 
        detail: { nodeId, success, nodeName } 
      }));
    }
  },

  updateEdgeLabel: (edgeId: string, label: string) => {
    get().updateEdgeData(edgeId, { label });
  },

  updateEdgeDescription: (edgeId: string, description: string) => {
    get().updateEdgeData(edgeId, { conditionDescription: description });
  },

  updateEdgeData: (edgeId: string, dataToUpdate: Partial<Edge['data']>) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: { ...edge.data, ...dataToUpdate }
          };
        }
        return edge;
      })
    });
  },

  setEdgeSuccess: (edgeId: string, isSuccess: boolean) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: { 
              ...edge.data, 
              isSuccess,
              isFailure: false, // ??�� ????�� ??�� ??��
              isExecuting: false, // ??�� ????�� ????�� ??��
              successTimestamp: isSuccess ? Date.now() : undefined
            }
          };
        }
        return edge;
      })
    });
    // ??��?? ??�� ??���?? ???? (??�� ??�� ??��)
  },

  setEdgeFailure: (edgeId: string, isFailure: boolean) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: { 
              ...edge.data, 
              isFailure,
              isSuccess: false, // ??�� ????�� ??�� ??��
              isExecuting: false, // ??�� ????�� ????�� ??��
              failureTimestamp: isFailure ? Date.now() : undefined
            }
          };
        }
        return edge;
      })
    });
    // ??��?? ??�� ??���?? ???? (??�� ??�� ??��)
  },

  setEdgeExecuting: (edgeId: string, isExecuting: boolean) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: { 
              ...edge.data, 
              isExecuting,
              isSuccess: false, // ??�� ??�� ????�� ??�� ??��
              isFailure: false,
              executingTimestamp: isExecuting ? Date.now() : undefined
            }
          };
        }
        return edge;
      })
    });
  },

  executeNode: async (nodeId: string, chatId?: string) => {
    // ??�� ??�� ??��????�� �ݹ� ??��
    const callbacks: ExecutionCallbacks = {
      onNodeStart: (nodeId: string, nodeName: string) => {
        get().setNodeExecuting(nodeId, true, true, nodeName, get().isWorkflowRunning);
      },
      onNodeComplete: (nodeId: string, output: any, success: boolean, nodeName: string) => {
        get().setNodeExecuting(nodeId, false, success, nodeName, get().isWorkflowRunning);
      },
      onEdgeUpdate: (edgeId: string, output: any) => {
        get().setEdgeOutput(edgeId, output);
      },
      onEdgeStatusUpdate: (edgeId: string, status: 'executing' | 'success' | 'failure') => {
        if (status === 'executing') {
          get().setEdgeExecuting(edgeId, true);
        } else if (status === 'success') {
          get().setEdgeSuccess(edgeId, true);
        } else if (status === 'failure') {
          get().setEdgeFailure(edgeId, true);
        }
      },
      onWorkflowComplete: (success: boolean, errorNodes?: string[]) => {
        // ??ũ??��????�� ó��??runWorkflow??�� ó��
      },
      onNodeDataUpdate: (nodeId: string, dataUpdate: Partial<NodeData>) => {
        get().updateNodeData(nodeId, dataUpdate);
      },
      onManualEdgeSelect: (nodeId: string, edgeId: string | null) => {
        get().setManuallySelectedEdge(nodeId, edgeId);
      },
      onNodeOutputSet: (nodeId: string, output: any) => {
        get().setNodeOutput(nodeId, output);
      },
      getNodeById: (nodeId: string) => {
        return get().getNodeById(nodeId);
      },
      getEdges: () => {
        return get().edges;
      },
      getNodes: () => {
        return get().nodes;
      },
      isConditionConvergenceNode: (nodeId: string, nodes: Node<NodeData>[], edges: Edge[]) => {
        return get().isConditionConvergenceNode(nodeId, nodes, edges);
      },
      getManuallySelectedEdge: (nodeId: string) => {
        return get().manuallySelectedEdges[nodeId] || null;
      }
    };

    // ���� ??��????�� ??�� ????????��??�ʱ�??
    const isWorkflowRunning = get().isWorkflowRunning;
    if (!isWorkflowRunning) {
      const outgoingEdges = get().edges.filter(edge => edge.source === nodeId);
      const outgoingIds = outgoingEdges.map(e => e.id);
      get().resetAllEdgeStatuses(outgoingIds);
    }

    // ??�� ??�� ??��
    await executionEngine.executeNode(nodeId, callbacks, chatId);
  },

  runWorkflow: async (chatId?: string) => {
    // �ߺ� ���� ����
    if (get().isWorkflowRunning) {
      console.log('?? [RunWorkflow] Workflow is already running, skipping...');
      return;
    }
    
    get().setWorkflowRunning(true);
    
    // ���� ���� ����� ���� �ݹ� ����
    const callbacks: ExecutionCallbacks = {
      onNodeStart: (nodeId: string, nodeName: string) => {
        // ��ũ�÷ο� ���� �˸��� Ư�� ó��
        if (nodeId === 'workflow') {
          window.dispatchEvent(new CustomEvent('nodeExecutionStarted', {
            detail: { nodeId: 'workflow', nodeName: 'Workflow' }
          }));
        } else {
          get().setNodeExecuting(nodeId, true, true, nodeName, true); // isWorkflowExecution = true
        }
      },
      onNodeComplete: (nodeId: string, output: any, success: boolean, nodeName: string) => {
        if (nodeId !== 'workflow') {
          get().setNodeExecuting(nodeId, false, success, nodeName, true); // isWorkflowExecution = true
        }
      },
      onEdgeUpdate: (edgeId: string, output: any) => {
        get().setEdgeOutput(edgeId, output);
      },
      onEdgeStatusUpdate: (edgeId: string, status: 'executing' | 'success' | 'failure') => {
        if (status === 'executing') {
          get().setEdgeExecuting(edgeId, true);
        } else if (status === 'success') {
          get().setEdgeSuccess(edgeId, true);
        } else if (status === 'failure') {
          get().setEdgeFailure(edgeId, true);
        }
      },
      onWorkflowComplete: (success: boolean, errorNodes?: string[]) => {
        get().setWorkflowRunning(false);
        
        // �Ϸ� �佺Ʈ
        if (errorNodes && errorNodes.length > 0) {
          window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', {
            detail: { nodeId: 'workflow', success: false, nodeName: 'Workflow', failedNodeName: errorNodes[0] }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', {
            detail: { nodeId: 'workflow', success: true, nodeName: 'Workflow' }
          }));
        }
      },
      onNodeDataUpdate: (nodeId: string, dataUpdate: Partial<NodeData>) => {
        get().updateNodeData(nodeId, dataUpdate);
      },
      onManualEdgeSelect: (nodeId: string, edgeId: string | null) => {
        get().setManuallySelectedEdge(nodeId, edgeId);
      },
      onNodeOutputSet: (nodeId: string, output: any) => {
        get().setNodeOutput(nodeId, output);
      },
      getNodeById: (nodeId: string) => {
        return get().getNodeById(nodeId);
      },
      getEdges: () => {
        return get().edges;
      },
      getNodes: () => {
        return get().nodes;
      },
      isConditionConvergenceNode: (nodeId: string, nodes: Node<NodeData>[], edges: Edge[]) => {
        return get().isConditionConvergenceNode(nodeId, nodes, edges);
      },
      getManuallySelectedEdge: (nodeId: string) => {
        return get().manuallySelectedEdges[nodeId] || null;
      }
    };
    
    // ��ü ���� ���� �ʱ�ȭ
    get().resetAllEdgeStatuses([]);
    
    // ���� ���� ȣ��
    await executionEngine.runWorkflow(callbacks, chatId);
  },

  saveWorkflow: async () => {
    set({ isSaving: true, saveError: null });
    const { projectName, nodes, edges, viewport, manuallySelectedEdges } = get();

    if (!projectName || projectName.trim() === "") {
      const errorMsg = "Project name cannot be empty.";
      set({ isSaving: false, saveError: errorMsg });
      console.error("FlowStore: Project name is empty. Cannot save.");
      throw new Error(errorMsg);
    }
    
    console.log(`FlowStore: Saving workflow "${projectName}" to MongoDB...`);

    const nodesToSave = nodes.map(node => {
      const { icon, ...restOfData } = node.data;
      return {
        ...node,
        data: restOfData,
      };
    });

    try {
      const workflowData = {
        projectName,
        nodes: nodesToSave,
        edges,
        viewport,
        manuallySelectedEdges,
        lastModified: new Date().toISOString(),
      };

      // MongoDB API ??�� (upsert)
      await storageService.updateWorkflow(projectName, workflowData);
      
      set({ isSaving: false, lastSaved: new Date(), saveError: null });
      console.log(`FlowStore: Workflow "${projectName}" saved successfully to MongoDB.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ isSaving: false, saveError: errorMessage });
      console.error('FlowStore: Failed to save workflow to MongoDB:', error);
      throw error;
    }
  },

  loadWorkflow: async (projectName: string) => {
    set({ isLoading: true, loadError: null });
    console.log(`FlowStore: Loading workflow "${projectName}" from MongoDB...`);

    try {
      const workflowData = await storageService.getWorkflowByName(projectName);
      
      if (workflowData) {
        set({
          projectName: workflowData.projectName,
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          viewport: workflowData.viewport || { x: 0, y: 0, zoom: 1 },
          manuallySelectedEdges: workflowData.manuallySelectedEdges || {},
          isLoading: false, 
          loadError: null,
          lastSaved: workflowData.lastModified ? new Date(workflowData.lastModified) : null,
        });
        console.log(`FlowStore: Workflow "${projectName}" loaded successfully.`);
      } else {
        const errorMsg = `Workflow "${projectName}" not found.`;
        set({ isLoading: false, loadError: errorMsg });
        console.warn(`FlowStore: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ isLoading: false, loadError: errorMessage });
      console.error('FlowStore: Failed to load workflow from MongoDB:', error);
      throw error;
    }
  },

  getWorkflowAsJSONString: (deploymentData?: Workflow) => {

    // deployment ??��???? ??��??�� ??�� ??��???? ??��, �׷��� ??��????�� ??�� ??��
    const { projectName, nodes, edges, viewport } = deploymentData ? {
      projectName: deploymentData.projectName,
      nodes: deploymentData.nodes,
      edges: deploymentData.edges,
      viewport: deploymentData.viewport,
          } : get();

    // saveWorkflow?? ??��??�� ����??�� ??�� ??��???? �غ���??��.
    // 'icon' ??��??React ����??Ʈ??????�� JSON ����??????��??��??
    const nodesToSave = nodes.map((currentNode: Node<NodeData>) => {
      const { icon, ...restOfNodeData } = currentNode.data; // ??��??data ??�� (icon ??��)
      const finalNodeData = { ...restOfNodeData }; // ����??��????��??????�� data ��ü

      // ���� ??�� ??�尡 conditionNode ????��??��, config??���� ??��??��????��??
      if (currentNode.type === 'conditionNode') {
        const outgoingEdges = edges
          .filter((edge: Edge) => edge.source === currentNode.id)
          .sort((a: Edge, b: Edge) => (a.data?.conditionOrderIndex ?? Infinity) - (b.data?.conditionOrderIndex ?? Infinity));

        const conditionsSummary = outgoingEdges.map((edge: Edge) => {
          const targetNode = nodes.find((n: Node<NodeData>) => n.id === edge.target);
          return {
            edgeId: edge.id,
            targetNodeId: edge.target,
            targetNodeLabel: targetNode?.data.label || edge.target,
            condition: edge.data?.label, // ?? "if data['value'] > 0", "else"
            description: edge.data?.conditionDescription, // ?? "Rule #1"
            orderIndex: edge.data?.conditionOrderIndex,
          };
        });

        // ���� config????????��??conditions �迭??��????��??
        finalNodeData.config = {
          ...(finalNodeData.config || {}), // ���� config ??�� ����
          conditions: conditionsSummary,   // ���� ??�� ??�� ��??
        };
      }

      // Agent ??��??���, ??��??��????�� ??��??ã�� `config.model`??ä�� ??��??��.
      if (currentNode.type === 'agentNode' && finalNodeData.config?.model && typeof finalNodeData.config.model === 'object') {
        // AgentSettings??�� ???? AIConnection ��ü ??ü??????��??�� ��??��??��.
        const modelDetails = finalNodeData.config.model as any;

        if (modelDetails) {
          // ????�� ��ü????���� ??��??�� ���� ??��??�� ��??��??��.
          const modelConfigForExport: any = {
            connName: modelDetails.name,
            providerName: modelDetails.provider,
            modelName: modelDetails.model,
          };
          if (modelDetails.provider.toLowerCase() === 'aws') {
            modelConfigForExport.accessKeyId = modelDetails.accessKeyId;
            modelConfigForExport.secretAccessKey = modelDetails.secretAccessKey;
            modelConfigForExport.region = modelDetails.region;
          } else {
            modelConfigForExport.apiKey = modelDetails.apiKey;
          }
          
          // Memory Group ??��????�� ���� ??��??��??
          let memoryConfigForExport: any = undefined;
          if (finalNodeData.config?.memoryGroup) {
            const toolsMemoryNode = nodes.find(n => n.type === 'toolsMemoryNode');
            if (toolsMemoryNode && toolsMemoryNode.data.config?.groups) {
              const allGroups = toolsMemoryNode.data.config.groups as Array<{ id: string; name: string; type: string; description?: string; memoryType?: string; windowSize?: number; [key: string]: any }>;
              const selectedMemoryGroup = allGroups.find(g => g.id === finalNodeData.config!.memoryGroup && g.type === 'memory');
              if (selectedMemoryGroup) {
                memoryConfigForExport = {
                  id: selectedMemoryGroup.id,
                  name: selectedMemoryGroup.name,
                  description: selectedMemoryGroup.description || '',
                  memoryType: selectedMemoryGroup.memoryType || 'ConversationBufferMemory',
                  modelConfig: selectedMemoryGroup.memoryType === 'ConversationBufferWindowMemory' ? { windowSize: selectedMemoryGroup.windowSize || 5 } : undefined
                };
              }
            }
          }

          // Tools ??��????�� ���� ??��??��??
          const toolsConfigForExport: Array<{ id: string; name: string; description: string; code: string }> = [];
          if (finalNodeData.config?.tools && Array.isArray(finalNodeData.config.tools)) {
            const toolsMemoryNode = nodes.find(n => n.type === 'toolsMemoryNode');
            if (toolsMemoryNode && toolsMemoryNode.data.config?.groups) {
              const allGroups = toolsMemoryNode.data.config.groups as Array<{ id: string; name: string; type: string; description?: string; code?: string; [key: string]: any }>;
              finalNodeData.config.tools.forEach((toolId: string) => {
                const selectedToolGroup = allGroups.find(g => g.id === toolId && g.type === 'tools');
                if (selectedToolGroup) {
                  toolsConfigForExport.push({
                    id: selectedToolGroup.id,
                    name: selectedToolGroup.name,
                    description: selectedToolGroup.description || '',
                    code: selectedToolGroup.code || ''
                  });
                }
              });
            }
          }

          // OpenAI mini �� üũ (provider�� openai??�� model name??mini�� ??��??���)
          const isOpenAiMiniModel = modelConfigForExport.providerName === 'openai' && 
                                    modelConfigForExport.modelName?.toLowerCase().includes('mini');

          // �� ??������????��??�� ��??�� ��ü??���� config????ü��??��.
          // �ߺ�??��??����??�� ??��??�� ??��??�� ���??����??����??��.
          finalNodeData.config = {
            model: modelConfigForExport,
            memoryGroup: memoryConfigForExport, // ID ??????�� ���� ??��
            tools: toolsConfigForExport as any, // ID �迭 ??????�� ���� ??�� �迭
            // ??��??Ʈ ��????��
            userPromptInputKey: finalNodeData.config.userPromptInputKey || 'user_input',
            systemPromptInputKey: finalNodeData.config.systemPromptInputKey || 'system_message',
            agentOutputVariable: finalNodeData.config.agentOutputVariable || 'agent_response',
            // �� ??������ (OpenAI mini �� ??�� ó��)
            topK: finalNodeData.config.topK ?? 40,
            topP: finalNodeData.config.topP ?? 1,
            temperature: isOpenAiMiniModel ? 1 : (finalNodeData.config.temperature ?? 0.7),
            maxTokens: isOpenAiMiniModel ? null : (finalNodeData.config.maxTokens ?? 1000) as any,
          };

          // Agent ??��??���� JSON ??��???? �ܼ�??���
          console.log(`[Export] Agent Node "${currentNode.data.label}" (ID: ${currentNode.id}) JSON ??��??`, JSON.stringify({
            id: currentNode.id,
            type: currentNode.type,
            label: currentNode.data.label,
            config: finalNodeData.config
          }, null, 2));
        }
      }

      // UserNode??��� parameters??matchData ��?? ??inputData ��??
      if (currentNode.type === 'userNode' && finalNodeData.config?.parameters) {
        // config ��ü??deep copy??�� ??�� ��??��??
        finalNodeData.config = { ...finalNodeData.config };
        
        // parameters??matchData ��?? (??��??API ??��????��??���)
        // ??�� �迭??�������� ??�� ??��??�迭????��
        const parametersWithMatchData = (finalNodeData.config.parameters || []).map((param: any) => {
          let matchData;
          if (param.inputType === 'select box') {
            // select box??��� ���� ��� ???? (inputData??�� ????��??��??
            matchData = finalNodeData.config?.inputData?.[param.name] || '';
          } else if (param.inputType === 'text box') {
            // text box??��� settings??�� ���� ��??????��??????��
            const textValue = finalNodeData.config?.settings?.[param.name] || '';
            matchData = textValue; // ??????��????��
          } else if (param.inputType === 'radio button') {
            // radio button??��� settings??�� ??��??���� ��??????��??????��
            const radioValue = finalNodeData.config?.settings?.[param.name] || '';
            matchData = radioValue; // ??????��????��
          } else if (param.inputType === 'checkbox') {
            // checkbox??��� settings??�� ??��??����??�迭????��
            const checkboxValues = finalNodeData.config?.settings?.[param.name] || [];
            matchData = checkboxValues; // �迭 ??ü????��
          } else {
            matchData = '';
          }
          return {
            ...param,
            matchData: matchData
          };
        });
        
        // ??��??parameters �迭????�� (??�� ��????��)
        finalNodeData.config.parameters = parametersWithMatchData;

        // inputData??funcArgs ���??�� ��??
        if (finalNodeData.config?.inputData && Object.keys(finalNodeData.config.inputData).length > 0) {
          const newInputData: any = {};
          finalNodeData.config.parameters.forEach((param: any) => {
            if (param.funcArgs && finalNodeData.config?.inputData?.[param.name]) {
              newInputData[param.funcArgs] = finalNodeData.config.inputData[param.name];
            }
          });
          if (Object.keys(newInputData).length > 0) {
            finalNodeData.config.inputData = newInputData;
          }
        }

        // outputVariable????��???? ???? ��� �⺻????��
        if (!finalNodeData.config.outputVariable) {
          finalNodeData.config.outputVariable = 'result';
        }
      }

      return {
        ...currentNode, // ??��????���� ??��??(id, type, position ??
        data: finalNodeData, // ó��??data ��ü ??��
      };
    });

    const workflowData = {
      projectName,
      nodes: nodesToSave,
      edges,
      viewport,
      lastModified: deploymentData?.lastModified || new Date().toISOString(),
    };

    try {
      return JSON.stringify(workflowData, getCircularReplacer(), 2);
    } catch (error) {
      console.error("Error serializing workflow to JSON:", error);
      return null;
    }
  },


  setFocusedElement: (type: 'node' | 'edge' | null, id: string | null) => set({ focusedElement: { type, id } }),

}));
