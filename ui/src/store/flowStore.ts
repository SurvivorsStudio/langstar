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
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  Viewport,
} from 'reactflow';
import { nanoid } from 'nanoid';
import { Deployment, DeploymentVersion, DeploymentFormData } from '../types/deployment';
import { apiService } from '../services/apiService';
import * as storageService from '../services/storageService';
import { getCollaborationService, CollaborationService, UserInfo as CollabUserInfo, CollaborationEvent } from '../services/collaborationService';
import { createNodesSlice } from './slices/nodesSlice';
import { createEdgesSlice } from './slices/edgesSlice';
import { EDGE_STATES } from './constants/edges';
import { getCircularReplacer, safeCompare } from './helpers/flowHelpers';
import { createPersistenceSlice } from './slices/persistenceSlice';
import { getUniqueNodeName } from './helpers/flowHelpers';
import { initialNodes, initialEdges } from './initialState';

// Edge 상태 상수 정의 - 순환 구조에서 명확한 대기 상태 구분
// EDGE_STATES는 constants/edges.ts에서 관리

// 🔧 공통 함수: Edge 데이터 검증 로직 (중복 제거)
const hasValidEdgeData = (edge: Edge | undefined): boolean => {
  return edge?.data?.output && 
         typeof edge.data.output === 'object' && 
         edge.data.output !== EDGE_STATES.PENDING &&
         edge.data.output !== EDGE_STATES.NULL &&
         edge.data.output !== null &&
         edge.data.output !== undefined;
};

export interface NodeData {
  label: string;
  code?: string;
  description?: string;
  icon?: React.ReactNode;
  config?: {
    className?: string;
    classType?: 'TypedDict' | 'BaseModel';
    variables?: Array<{
      name: string;
      type: string;
      defaultValue: any;
      selectVariable: string;
    }>;
    repetitions?: number;
    template?: string;
    model?: string | AIConnection | { connName: string; providerName: string; modelName: string; apiKey: string | undefined; };
    inputColumn?: string;
    outputColumn?: string;
    [key: string]: any;
    receiveKey?: string; // For EndNode: to select a key from inputData
  };
  mergeMappings?: Array<{ // MergeNode 전용 설정
    id: string;
    outputKey: string;
    sourceNodeId: string;
    sourceNodeKey: string;
  }>;
  inputData?: any; // 노드로 들어온 입력 데이터를 저장할 필드 (특히 endNode용)
  output?: any;
  isExecuting?: boolean;
}

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

// 초기 상태는 initialState.ts에서 관리

// moved to helpers/flowHelpers.ts

// validateStartNode removed (unused)

// moved to helpers/flowHelpers.ts

interface TransformedStartNodeVariable {
  variableName: string;
  variableType: string;
  defaultValue: any; // 처리된 기본값
  selectVariable: string;
}

interface TransformedStartNodeOutput {
  className: string;
  classType: 'TypedDict' | 'BaseModel';
  variables: TransformedStartNodeVariable[];
}

const generateStartNodeOutput = (node: Node<NodeData>): TransformedStartNodeOutput => {
  const config = node.data.config || {};
  const inputVariables = config.variables || [];

  const processedVariables: TransformedStartNodeVariable[] = inputVariables.map(variable => {
    let processedDefaultValue: any = variable.defaultValue;
    switch (variable.type) {
      case 'int':
        processedDefaultValue = typeof variable.defaultValue === 'number' ? variable.defaultValue : parseInt(variable.defaultValue, 10) || 0;
        break;
      case 'float':
        processedDefaultValue = typeof variable.defaultValue === 'number' ? variable.defaultValue : parseFloat(variable.defaultValue) || 0.0;
        break;
      case 'list':
        try {
          processedDefaultValue = Array.isArray(variable.defaultValue) ? variable.defaultValue : JSON.parse(variable.defaultValue || '[]');
        } catch {
          processedDefaultValue = [];
        }
        break;
      case 'dict':
        try {
          processedDefaultValue = typeof variable.defaultValue === 'object' && !Array.isArray(variable.defaultValue) ? variable.defaultValue : JSON.parse(variable.defaultValue || '{}');
        } catch {
          processedDefaultValue = {};
        }
        break;
      default:
        processedDefaultValue = variable.defaultValue || '';
    }
    return {
      variableName: variable.name,
      variableType: variable.type,
      defaultValue: processedDefaultValue,
      selectVariable: variable.selectVariable,
    };
  });

  return {
    className: config.className || '',
    classType: config.classType || 'TypedDict',
    variables: processedVariables,
  };
};

// processPromptTemplate removed (unused)

// Helper to prepare a condition string from an edge label for evaluation
const prepareConditionForEvaluation = (edgeLabel: string | undefined): { body: string } => {
  const label = (edgeLabel || '').trim();
  const lowerLabel = label.toLowerCase();

  if (lowerLabel === 'else') {
    return { body: 'return true;' };
  }

  let coreCondition = label;
  if (lowerLabel.startsWith('if ')) {
    coreCondition = label.substring(3).trim();
  } else if (lowerLabel.startsWith('elif ')) {
    coreCondition = label.substring(5).trim();
  }

  // If, after stripping, coreCondition is empty (e.g. "if " was the label), it's an invalid if/elif.
  if (!coreCondition && (lowerLabel.startsWith('if ') || lowerLabel.startsWith('elif '))) {
    console.warn(`Invalid condition: Label "${edgeLabel}" is an if/elif without an expression. Evaluating as false.`);
    return { body: 'return false;' };
  }
  // If coreCondition is still empty (e.g. label was empty or just "if" without space), evaluate as false.
  if (!coreCondition) {
    console.warn(`Invalid condition: Label "${edgeLabel}" is empty or invalid. Evaluating as false.`);
    return { body: 'return false;' };
  }

  // At this point, coreCondition is the expression part, e.g., "data['value'] > 0"
  return { body: `return ${coreCondition};` };
};

const evaluateCondition = (conditionBody: string, input: Record<string, any>, argumentName: string): boolean => {
  try {
    // argumentName is the name of the first argument to the function (e.g., 'data').
    // input is the value for that argument.
    // conditionBody is the string of code to execute (e.g., "return data['value'] > 10;").
    const evalFunction = new Function(argumentName, conditionBody);
    return evalFunction.call(null, input);
  } catch (error) {
    console.error(`Error evaluating condition body: "${conditionBody}" with argumentName "${argumentName}"`, error);
    return false;
  }
};

// 점 표기법을 Python 딕셔너리 접근 방식으로 변환하는 함수
const convertToPythonNotation = (keyPath: string): string => {
  if (!keyPath || keyPath.trim() === '') {
    return keyPath;
  }

  // 이미 배열 인덱스가 포함된 경우를 고려하여 처리
  // 예: "mm.api_response.data.users[2].data" -> "mm['api_response']['data']['users'][2]['data']"
  
  let result = keyPath;
  
  // 점(.)으로 분리하되, 배열 인덱스는 보존
  const parts = result.split('.');
  
  if (parts.length === 1) {
    // 단일 키인 경우 그대로 반환 (예: "system_prompt")
    return keyPath;
  }
  
  // 첫 번째 부분은 그대로 두고, 나머지는 ['key'] 형식으로 변환
  let pythonNotation = parts[0];
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // 배열 인덱스가 있는지 확인 (예: "users[2]")
    const arrayMatch = part.match(/^([^[\]]+)(\[.+\])$/);
    
    if (arrayMatch) {
      // 배열 인덱스가 있는 경우: "users[2]" -> "['users'][2]"
      const keyPart = arrayMatch[1];
      const indexPart = arrayMatch[2];
      pythonNotation += `['${keyPart}']${indexPart}`;
    } else {
      // 일반 키인 경우: "data" -> "['data']"
      pythonNotation += `['${part}']`;
    }
  }
  
  return pythonNotation;
};

// generateEmbedding removed (unused)

// Deep merge 유틸리티 함수 (MergeNode에서 사용)
const deepMerge = (target: any, source: any): any => {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
};

const isObject = (item: any): boolean => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

// MongoDB Storage 설정 (IndexedDB 제거됨)
export const DEFAULT_PROJECT_NAME = 'New Workflow'; // 기본 프로젝트 이름 상수화

export const useFlowStore = create<FlowState>((set, get, api) => ({
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

  // 퍼시스턴스 슬라이스 주입
  ...(createPersistenceSlice(set, get, api) as any),
  // 노드 슬라이스 주입
  ...(createNodesSlice(set, get, api) as any),
  // 엣지 슬라이스 주입
  ...(createEdgesSlice(set, get, api) as any),
  // AI Connections 관련 초기 상태
  aiConnections: [],
  isLoadingAIConnections: false,
  loadErrorAIConnections: null,
  
  // ��Ŀ�� ���� �ʱ� ����
  focusedElement: { type: null, id: null },


  // ??�� ??��??edge ??��
  manuallySelectedEdges: {},
  setManuallySelectedEdge: (nodeId: string, edgeId: string | null) => set({ manuallySelectedEdges: { ...get().manuallySelectedEdges, [nodeId]: edgeId } }),

  setViewport: (viewport: Viewport) => {
    set({ viewport });
  },

  // 노드 연결 제약 조건 검사 함수들
  
  // calculateInDegree moved to edgesSlice

  // 2. merge 노드인지 확인
  isMergeNode: (nodeId: string, nodes: Node<NodeData>[]) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.type === 'mergeNode';
  },

  // isConditionConvergenceNode moved to edgesSlice

  // hasPathFromTargetToSource moved to edgesSlice

  // canConnect moved to edgesSlice

  // findViolatingEdges moved to edgesSlice

  // updateEdgeWarnings moved to edgesSlice
  
  // onConnect moved to edgesSlice

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

  // updateEdgeLabel/Description/Data moved to edgesSlice

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
    }

    try {
      let output;
      // 현재 노드로 들어온 input을 inputData에 저장
      get().updateNodeData(nodeId, { ...node.data, inputData: { ...input } });

      switch (node.type) {
        case 'promptNode': {
          const template = node.data.config?.template || '';
          const outputVariable = node.data.config?.outputVariable || '';
          
          if (!outputVariable) {
            output = { error: 'Output variable name is required' };
            break;
          }
          // output = processPromptTemplate(template, input, outputVariable);
          try {
            const payload = {
              prompt: template,
              param: input,
              return_key: outputVariable,
            };
            const response = await fetch('http://localhost:8000/workflow/node/promptnode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });
            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`);
            }
            output = await response.json();
          } catch (apiError) {
            console.error('PromptNode API call failed:', apiError);
            output = { error: 'Failed to connect to prompt node API', details: (apiError as Error).message };
          }
          break;
        }
        case 'startNode':
          try {
            const payload = generateStartNodeOutput(node);
            const response = await fetch('http://localhost:8000/workflow/node/startnode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });
            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`);
            }
            output = await response.json();
            console.log(output)
          } catch (apiError) {
            console.error('StartNode API call failed:', apiError);
            output = { error: 'Failed to connect to start node API', details: (apiError as Error).message };
          }
          break;
        case 'functionNode': { // Custom Python Function Node
          const pythonCode = node.data.code || '';
          // config에서 outputVariable을 가져오거나 기본값을 사용합니다.
          // addNode에서 기본값이 설정되므로, || 'python_function_output'는 추가적인 안전장치입니다.
          const outputVariable = node.data.config?.outputVariable || 'python_function_output';

          if (!pythonCode.trim()) {
            output = { error: 'Python code is empty' };
            break;
          }

          try {
            const payload = {
              py_code: pythonCode, // API가 'py_code' 키로 Python 코드를 받도록 변경
              param: input,       // 이전 노드의 출력을 'param'으로 전송
              return_key: outputVariable // 백엔드가 이 키를 사용하여 결과를 반환할 수 있음
            };
            const response = await fetch('http://localhost:8000/workflow/node/pythonnode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }
            output = await response.json(); // API의 응답 전체를 output으로 사용
          } catch (apiError) {
            console.error('FunctionNode (Python API) call failed:', apiError);
            output = { error: 'Failed to execute Python function via API', details: (apiError as Error).message };
          }
          break;
        }
        case 'agentNode': { // Node ID를 로그에 포함시키기 위해 nodeId 변수 사용
          console.log(`🤖 [AgentNode ${nodeId}] ===== AGENT NODE EXECUTION START =====`);
          console.log(`[AgentNode ${nodeId}] 실행 시작. 입력 데이터:`, JSON.parse(JSON.stringify(input || {})));
          const agentConfig = node.data.config || {};
          const {
            model: modelConnection, // 모델 객체
            systemPromptInputKey, // 설정에서 system_prompt를 가져올 input의 키 이름
            userPromptInputKey,   // 설정에서 user_prompt를 가져올 input의 키 이름
            memoryGroup,          // config에서 직접 가져올 memory_group 값
            tools,                // config에서 직접 가져올 tools 값 (예: 파이썬 코드 문자열 배열)
            agentOutputVariable,   // Agent Node의 API 응답이 저장될 키 이름 (사용자가 설정)
            topK,
            topP,
            temperature,
            maxTokens,
          } = agentConfig;

          console.log(`[AgentNode ${nodeId}] Agent Node 설정 (config):`, JSON.parse(JSON.stringify(agentConfig)));
          // agentConfig에서 가져온 'tools'의 원시 값, 타입, 배열 여부 확인용 로그 추가
          console.log(`[AgentNode ${nodeId}] agentConfig에서 가져온 원시 'tools' 값:`, JSON.parse(JSON.stringify(tools)));
          console.log(`[AgentNode ${nodeId}] agentConfig 'tools'의 타입:`, typeof tools);
          console.log(`[AgentNode ${nodeId}] agentConfig 'tools'가 배열인가?:`, Array.isArray(tools));

          // Log details of selected tools
          // selectedToolIds를 좀 더 안전하게 추출 (tools가 배열인 경우에만 사용, 아니면 빈 배열)
          const selectedToolIds = Array.isArray(tools) ? (tools as string[]) : [];
          if (selectedToolIds.length > 0) {
            // 이 부분은 로그 출력을 위한 것이므로 API 페이로드 구성과는 별개입니다.
            console.log(`[AgentNode ${nodeId}] --- 🛠️ Tool 상세 정보 시작 ---`);
            const toolsMemoryNode = get().nodes.find(n => n.type === 'toolsMemoryNode');
            if (toolsMemoryNode && toolsMemoryNode.data.config?.groups) {
              const allGroups = toolsMemoryNode.data.config.groups as Array<{ id: string; name: string; type: string; description?: string; code?: string; [key: string]: any }>;
              
              selectedToolIds.forEach(toolId => {
                const toolGroup = allGroups.find(g => g.id === toolId);
                if (toolGroup) {
                  console.log(`[AgentNode ${nodeId}]   Tool ID: ${toolId}`);
                  console.log(`[AgentNode ${nodeId}]     - 이름 (Name): ${toolGroup.name || 'N/A'}`);
                  console.log(`[AgentNode ${nodeId}]     - 설명 (Description): ${toolGroup.description || 'N/A'}`);
                  console.log(`[AgentNode ${nodeId}]     - Python 코드 (Code): \n${toolGroup.code || 'N/A'}`);
                } else {
                  console.warn(`[AgentNode ${nodeId}]   ⚠️ 경고: 선택된 Tool ID '${toolId}'에 해당하는 그룹을 toolsMemoryNode에서 찾을 수 없습니다.`);
                }
              });
            } else {
              console.warn(`[AgentNode ${nodeId}]   ⚠️ 경고: toolsMemoryNode를 찾을 수 없거나 그룹 데이터가 없어 Tool 상세 정보를 로드할 수 없습니다.`);
            }
            console.log(`[AgentNode ${nodeId}] --- 🛠️ Tool 상세 정보 종료 ---`);
          } else {
            console.log(`[AgentNode ${nodeId}] 선택된 Tool이 없습니다.`);
          }

          // 필수 설정값 확인 (model)
          if (!modelConnection || typeof modelConnection !== 'object') {
            console.error(`[AgentNode ${nodeId}] 오류: Agent model이 올바르게 설정되지 않았습니다.`);
            output = { error: 'Agent model is not configured correctly.' };
            break;
          }

          // API 페이로드에 맞게 모델 정보 변환
          const modelForAPI: any = {
            connName: (modelConnection as AIConnection).name,
            providerName: (modelConnection as AIConnection).provider,
            modelName: (modelConnection as AIConnection).model,
          };
          if ((modelConnection as AIConnection).provider.toLowerCase() === 'aws') {
            modelForAPI.accessKeyId = (modelConnection as AIConnection).accessKeyId;
            modelForAPI.secretAccessKey = (modelConnection as AIConnection).secretAccessKey;
            modelForAPI.region = (modelConnection as AIConnection).region;
          } else {
            modelForAPI.apiKey = (modelConnection as AIConnection).apiKey;
          }

          const modelSetting = {
            topK: topK ?? 40,
            topP: topP ?? 1,
            temperature: temperature ?? 0.7,
            maxTokens: maxTokens ?? 1000,
          };

          // Agent Output Variable 확인
          // addNode에서 기본값이 설정되므로, || 'agent_response'는 추가적인 안전장치입니다.
          const finalAgentOutputVariable = agentOutputVariable || 'agent_response'; 
          if (!finalAgentOutputVariable) { // 사용자가 명시적으로 비운 경우 에러 처리
            console.error(`[AgentNode ${nodeId}] 오류: Agent output variable name이 필요합니다.`);
            output = { error: 'Agent output variable name is required.' };
            break;
          }
          // 사용자가 명시적으로 설정한 키만 사용합니다. 기본값 자동 매칭을 제거합니다.
          if (!systemPromptInputKey || !userPromptInputKey) {
            console.error(`[AgentNode ${nodeId}] 오류: System Prompt Input Key와 User Prompt Input Key를 모두 설정해야 합니다.`);
            output = { 
              error: 'System Prompt Input Key와 User Prompt Input Key를 모두 설정해야 합니다.',
              systemPromptInputKey: systemPromptInputKey || null,
              userPromptInputKey: userPromptInputKey || null
            };
            break;
          }

          const actualSystemPromptKey = systemPromptInputKey;
          const actualUserPromptKey = userPromptInputKey;

          console.log(`[AgentNode ${nodeId}] Memory Group 설정값:`, memoryGroup); // memoryGroup 값 로깅 추가
          console.log(`[AgentNode ${nodeId}] 사용할 System Prompt Key: '${actualSystemPromptKey}'`);
          console.log(`[AgentNode ${nodeId}] 사용할 User Prompt Key: '${actualUserPromptKey}'`);

          // 키 경로를 API로 전달하기 위해 실제 키 값을 사용합니다.
          // 백엔드에서 data를 파싱할 수 있도록 키 경로를 전송합니다.
          const systemPromptRawValue = actualSystemPromptKey && input && input.hasOwnProperty(actualSystemPromptKey) ? input[actualSystemPromptKey] : undefined;
          const userPromptRawValue = actualUserPromptKey && input && input.hasOwnProperty(actualUserPromptKey) ? input[actualUserPromptKey] : undefined;

          // 키 경로를 Python 표기법으로 변환하여 전송 (예: "a['b']" 형식)
          const systemPromptForAPI = convertToPythonNotation(actualSystemPromptKey);
          const userPromptForAPI = convertToPythonNotation(actualUserPromptKey);

          console.log(`[AgentNode ${nodeId}] 입력에서 가져온 Raw System Prompt (input['${actualSystemPromptKey}']):`, systemPromptRawValue);
          console.log(`[AgentNode ${nodeId}] 원본 System Prompt Key: "${actualSystemPromptKey}" → Python 표기법: "${systemPromptForAPI}"`);
          console.log(`[AgentNode ${nodeId}] 입력에서 가져온 Raw User Prompt (input['${actualUserPromptKey}']):`, userPromptRawValue);
          console.log(`[AgentNode ${nodeId}] 원본 User Prompt Key: "${actualUserPromptKey}" → Python 표기법: "${userPromptForAPI}"`);

          let memoryTypeForAPI: string | undefined = undefined;
          let memoryGroupNameForAPI: string | undefined = undefined; // 메모리 그룹 이름을 저장할 변수
          let memoryWindowSizeForAPI: number | undefined = undefined; // window size를 저장할 변수
          if (memoryGroup) { // memoryGroup is the ID of the selected group
            const toolsMemoryNode = get().nodes.find(n => n.type === 'toolsMemoryNode');
            if (toolsMemoryNode && toolsMemoryNode.data.config?.groups) {
              const allGroups = toolsMemoryNode.data.config.groups as Array<{ id: string; name: string; type: string; memoryType?: string; windowSize?: number; [key: string]: any }>;
              const selectedGroupDetails = allGroups.find(g => g.id === memoryGroup);
              if (selectedGroupDetails && selectedGroupDetails.type === 'memory') {
                // groupsNode에 저장된 memoryType 값을 우선 사용합니다.
                if (typeof selectedGroupDetails.memoryType !== 'undefined') {
                  memoryTypeForAPI = selectedGroupDetails.memoryType;
                } else {
                  // 만약 groupsNode에 memoryType이 undefined라면,
                  // GroupsSettings.tsx UI에서 기본으로 표시되는 'ConversationBufferMemory'를 사용합니다.
                  // 이는 저장된 데이터를 변경하는 것이 아니라, 실행 시점에 해석하는 방식입니다.
                  memoryTypeForAPI = 'ConversationBufferMemory'; 
                  console.log(`[AgentNode ${nodeId}] Memory Type for group '${selectedGroupDetails.name}' (ID: ${selectedGroupDetails.id}) was undefined in store. Using default '${memoryTypeForAPI}' (as per GroupsSettings.tsx display).`);
                }
                
                // ConversationBufferWindowMemory인 경우 window size 설정
                if (memoryTypeForAPI === 'ConversationBufferWindowMemory') {
                  memoryWindowSizeForAPI = selectedGroupDetails.windowSize || 5; // 기본값 5
                  console.log(`[AgentNode ${nodeId}] Window Size for ConversationBufferWindowMemory: ${memoryWindowSizeForAPI}`);
                }
                
                memoryGroupNameForAPI = selectedGroupDetails.name; // 메모리 그룹 이름 저장
                console.log(`[AgentNode ${nodeId}] 선택된 Memory Group: ${selectedGroupDetails.name}, Memory Type: ${memoryTypeForAPI}`);
              } else {
                console.log(`[AgentNode ${nodeId}] Selected group ID ${memoryGroup} is not a memory type or not found.`);
              }
            }
          }

          // API 페이로드용 tools_for_api 구성
          const tools_for_api: Array<{ tool_name: string; tool_description: string; tool_code: string }> = []; // 'python_code' -> 'tool_code'로 변경
          if (selectedToolIds.length > 0) {
            const toolsMemoryNode = get().nodes.find(n => n.type === 'toolsMemoryNode');
            if (toolsMemoryNode && toolsMemoryNode.data.config?.groups) {
              const allGroups = toolsMemoryNode.data.config.groups as Array<{ id: string; name: string; type: string; description?: string; code?: string; [key: string]: any }>;
              selectedToolIds.forEach(toolId => {
                const toolGroup = allGroups.find(g => g.id === toolId);
                if (toolGroup && toolGroup.type === 'tools') { // groupsNode에서 가져온 그룹이 'tools' 타입인지 확인
                  tools_for_api.push({
                    tool_name: toolGroup.name || 'Unnamed Tool',
                    tool_description: toolGroup.description || 'No description',
                    tool_code: toolGroup.code || '' // 'python_code' -> 'tool_code'로 변경
                  });
                } else {
                  console.warn(`[AgentNode ${nodeId}] API Payload: Tool ID '${toolId}'에 해당하는 Tool 정보를 toolsMemoryNode에서 찾을 수 없거나 타입이 'tools'가 아닙니다. API 요청에서 제외됩니다.`);
                }
              });
            } else {
              console.warn(`[AgentNode ${nodeId}] API Payload: toolsMemoryNode를 찾을 수 없거나 그룹 데이터가 없어 Tool 정보를 API 페이로드에 포함할 수 없습니다.`);
            }
          }

          const payload = {
            model: modelForAPI, // 변환된 모델 객체 사용
            modelSetting, // 모델 설정 추가
            system_prompt: systemPromptForAPI, // Python 표기법으로 변환된 키 경로 (예: "a['b']['c']")
            user_prompt: userPromptForAPI, // Python 표기법으로 변환된 키 경로 (예: "mm['api_response']['data']['users'][2]['data']")
            data: input, // 백엔드에서 파싱할 수 있도록 원본 데이터 전송
            memory_group: memoryGroup ? memoryGroup : undefined, 
            memory_group_name: memoryGroupNameForAPI, // 메모리 그룹 이름 추가
            tools: tools_for_api, // 수정된 tools 형식으로 전송
            memory_type: memoryTypeForAPI, // This sends the actual memory type string
            memory_window_size: memoryWindowSizeForAPI, // window size 추가
            return_key: finalAgentOutputVariable // API에 Output Variable 값을 "return_key"로 전달
          } as any; // chat_id를 동적으로 추가하기 위해 any 타입으로 캐스팅

          if (chatId) {
            payload.chat_id = chatId; // chatId가 있으면 페이로드에 추가
          }
          console.log(`[AgentNode ${nodeId}] API 요청 페이로드:`, JSON.stringify(payload, null, 2));

          try {
            console.log(`🌐 [AgentNode ${nodeId}] Making API call to agentnode endpoint`);
            const response = await fetch('http://localhost:8000/workflow/node/agentnode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });
            console.log(`📡 [AgentNode ${nodeId}] API response status: ${response.status}`);

            console.log(`[AgentNode ${nodeId}] API 응답 상태: ${response.status}`);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[AgentNode ${nodeId}] API 요청 실패. 상태: ${response.status}, 메시지: ${errorText}`);
              throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }

            const apiResponse = await response.json(); 
            // input 받은 데이터에 Output Variable에 지정한 key 값에 api가 전달한 값을 추가하여 output 생성
            output = { ...input, [finalAgentOutputVariable]: apiResponse };

            console.log(`✅ [AgentNode ${nodeId}] API 응답 성공. 출력:`, output);
            console.log(`🤖 [AgentNode ${nodeId}] ===== AGENT NODE EXECUTION SUCCESS =====`);
          } catch (apiError) {
            console.error(`❌ [AgentNode ${nodeId}] API 호출 실패:`, apiError);
            console.log(`🤖 [AgentNode ${nodeId}] ===== AGENT NODE EXECUTION FAILED =====`);
            output = { error: 'Failed to connect to agent node API', details: (apiError as Error).message };
          }
        }
          break;
        case 'conditionNode': {
          try {
            // ConditionNode API 호출을 시도
            const allOutgoingEdges = get().edges.filter(edge => edge.source === nodeId);
            
            // conditionOrderIndex를 기준으로 엣지 정렬
            const sortedEdges = [...allOutgoingEdges].sort((a, b) => {
              const orderA = a.data?.conditionOrderIndex ?? Infinity;
              const orderB = b.data?.conditionOrderIndex ?? Infinity;
              if (orderA !== orderB) {
                return orderA - orderB;
              }
              return a.id.localeCompare(b.id);
            });
            
            const startNode = get().nodes.find(node => node.type === 'startNode');
            const argumentNameForEval = startNode?.data.config?.className || 'data';
            
            // 서버로 보낼 조건 데이터 구성
            const conditions = sortedEdges.map(edge => ({
              edge_id: edge.id,
              condition: edge.data?.label || '',
              target_node_id: edge.target
            }));
            
            const payload = {
              input_data: input,
              conditions: conditions,
              argument_name: argumentNameForEval
            };
            
            // 서버 API 호출
            const response = await fetch('http://localhost:8000/workflow/node/conditionnode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
              throw new Error(`Condition API failed: ${response.status}`);
            }
            
            const apiResponse = await response.json();
            
            if (apiResponse.success) {
              // 서버에서 받은 평가 결과로 엣지 출력 설정
              let anyConditionMet = false;
              let matchedEdgeId = null;
              
              // 먼저 모든 조건을 체크하여 매칭되는 첫 번째 조건 찾기
              for (const edge of sortedEdges) {
                const evalResult = apiResponse.evaluation_results.find(
                  (result: any) => result.edge_id === edge.id
                );
                
                if (evalResult && evalResult.is_matched && !anyConditionMet) {
                  anyConditionMet = true;
                  matchedEdgeId = edge.id;
                  break;
                }
              }
              
              // 결과에 따라 edge 출력 설정
              for (const edge of sortedEdges) {
                const isLastEdge = edge === sortedEdges[sortedEdges.length - 1];
                
                if (edge.id === matchedEdgeId) {
                  // 매칭된 조건의 edge에만 데이터 전달
                  get().setEdgeOutput(edge.id, input);
                } else if (isLastEdge && !anyConditionMet) {
                  // 마지막 edge이고 모든 조건이 false인 경우 (else 경로)
                  get().setEdgeOutput(edge.id, input);
                  console.log(`🔀 [ConditionNode] Else 경로로 데이터 전달: ${edge.id}`);
                } else {
                  // 그 외의 경우 명시적으로 NULL 상태로 설정
                  get().setEdgeOutput(edge.id, EDGE_STATES.NULL);
                }
              }
              
              output = input;
            } else {
              // API 에러 - 기존 로직으로 폴백
              throw new Error(apiResponse.error || 'Unknown API error');
            }
            
          } catch (error) {
            // API 호출 실패 시 기존 클라이언트 로직으로 폴백
            console.warn('Condition API failed, falling back to client-side evaluation:', error);
            
            const allOutgoingEdges = get().edges.filter(edge => edge.source === nodeId);
            const sortedEdges = [...allOutgoingEdges].sort((a, b) => {
              const orderA = a.data?.conditionOrderIndex ?? Infinity;
              const orderB = b.data?.conditionOrderIndex ?? Infinity;
              if (orderA !== orderB) {
                return orderA - orderB;
              }
              return a.id.localeCompare(b.id);
            });

            let anyConditionMet = false;
            let matchedEdgeId = null;
            const inputForBranch = input;
            const startNode = get().nodes.find(node => node.type === 'startNode');
            const argumentNameForEval = startNode?.data.config?.className || 'data';
            
            // 먼저 모든 조건을 체크하여 매칭되는 첫 번째 조건 찾기
            for (const edge of sortedEdges) {
              const { body: conditionBodyForEval } = prepareConditionForEvaluation(edge.data?.label);
              const isTrue = evaluateCondition(conditionBodyForEval, inputForBranch, argumentNameForEval);
              
              if (isTrue && !anyConditionMet) {
                anyConditionMet = true;
                matchedEdgeId = edge.id;
                break;
              }
            }
            
            // 결과에 따라 edge 출력 설정
            for (const edge of sortedEdges) {
              const isLastEdge = edge === sortedEdges[sortedEdges.length - 1];
              
              if (edge.id === matchedEdgeId) {
                // 매칭된 조건의 edge에만 데이터 전달
                get().setEdgeOutput(edge.id, inputForBranch);
                console.log(`🔀 [ConditionNode] If 조건 매칭: ${edge.data?.label} -> ${edge.id}`);
              } else if (isLastEdge && !anyConditionMet) {
                // 마지막 edge이고 모든 조건이 false인 경우 (else 경로)
                get().setEdgeOutput(edge.id, inputForBranch);
                console.log(`🔀 [ConditionNode] Else 경로로 데이터 전달: ${edge.id}`);
              } else {
                // 그 외의 경우 명시적으로 NULL 상태로 설정
                get().setEdgeOutput(edge.id, EDGE_STATES.NULL);
              }
            }
            
            output = input;
          } 
          break;
        }
        case 'loopNode':
          output = { 
            message: `Loop will execute ${node.data.config?.repetitions || 1} times`,
            repetitions: node.data.config?.repetitions || 1,
            currentIteration: 0,
            input 
          };
          break;
        case 'mergeNode': {
          // 1단계: Merge 노드에 연결된 모든 incoming edge ID들 가져오기
          const incomingEdges = get().edges.filter(edge => edge.target === nodeId);
          const edgeIds = incomingEdges.map(edge => edge.id);
          
          console.log(`[MergeNode ${nodeId}] 총 ${edgeIds.length}개 edge 확인 시작`);
          
          // 2단계: 각 edge의 실제 데이터 존재 여부를 직접 확인
          const edgeDataCheck = edgeIds.map(edgeId => {
            const edge = get().edges.find(e => e.id === edgeId);
            
            // Edge 데이터 검증 (공통 함수 사용)
            const hasRealData = hasValidEdgeData(edge);
            
            const edgeStatus = {
              edgeId: edgeId,
              sourceNode: edge?.source || 'unknown',
              hasData: hasRealData,
              currentOutput: edge?.data?.output,
              outputType: typeof edge?.data?.output,
              isPending: edge?.data?.output === EDGE_STATES.PENDING,
              isNull: edge?.data?.output === EDGE_STATES.NULL || edge?.data?.output === null,
              timestamp: edge?.data?.timestamp || 0
            };
            
            // 디버깅 필요시에만 주석 해제
            // console.log(`[MergeNode ${nodeId}] Edge ${edgeId} 체크:`, edgeStatus);
            return edgeStatus;
          });
          
          // 3단계: Edge 데이터 기반으로 merge 시작 시점 결정
          const edgesWithRealData = edgeDataCheck.filter(check => check.hasData);
          const pendingEdgesCount = edgeDataCheck.filter(check => check.isPending).length;
          const nullEdgesCount = edgeDataCheck.filter(check => check.isNull).length;
          
          console.log(`[MergeNode ${nodeId}] Edge 데이터 상태 종합:`, {
            총Edge수: edgeIds.length,
            실제데이터있음: edgesWithRealData.length,
            PENDING상태: pendingEdgesCount,
            NULL상태: nullEdgesCount,
            준비완료비율: `${edgesWithRealData.length}/${edgeIds.length}`
          });
          
          // 4단계: 모든 edge에 실제 데이터가 있어야만 merge 시작
          const allEdgesHaveData = edgesWithRealData.length === edgeIds.length;
          
          if (!allEdgesHaveData) {
            const missingDataEdges = edgeDataCheck.filter(check => !check.hasData);
            
          console.log(`[MergeNode ${nodeId}] 대기 중: ${edgesWithRealData.length}/${edgeIds.length} edges ready`);
            
            output = { 
              status: 'waiting',
              message: `Edge 데이터 대기 중: ${edgesWithRealData.length}/${edgeIds.length} ready (롤백 감지)`,
              waitingReason: 'edge_data_insufficient',
              edgeAnalysis: {
                totalEdges: edgeIds.length,
                readyEdges: edgesWithRealData.length,
                pendingEdges: pendingEdgesCount,
                nullEdges: nullEdgesCount,
                rollbackDetected: missingDataEdges.length > 0,
                missingDataEdges: missingDataEdges.map(check => ({
                  id: check.edgeId,
                  source: check.sourceNode,
                  reason: check.isPending ? 'PENDING' : check.isNull ? 'NULL' : 'NO_DATA',
                  timestamp: check.timestamp,
                  description: check.isPending ? '이전 노드가 아직 실행되지 않음' : 
                              check.isNull ? '조건 불만족으로 데이터 없음' : 
                              '알 수 없는 이유로 데이터 없음'
                }))
              }
            };
            break;
          }
          
          // 모든 edge 데이터 확인 완료! merge 처리 시작
          console.log(`[MergeNode ${nodeId}] 모든 edge 데이터 준비 완료 - merge 실행`);
          
          // Edge 데이터를 실제 edge 객체로 변환하여 merge 처리
          const actualEdgesWithData = edgesWithRealData.map(check => {
            const edge = get().edges.find(e => e.id === check.edgeId);
            if (!edge) {
              console.warn(`[MergeNode ${nodeId}] ⚠️ Edge ${check.edgeId} not found in current edges`);
            }
            return edge;
          }).filter(edge => edge !== undefined) as Edge[];
          
          // 연결된 노드들의 출력 데이터를 노드별로 그룹화
          const mergedData: Record<string, any> = {};
          
          actualEdgesWithData.forEach(edge => {
              // 소스 노드 정보 가져오기
              const sourceNode = get().nodes.find(n => n.id === edge.source);
              const sourceNodeName = sourceNode ? sourceNode.data.label : edge.source;
              
              // 노드별로 그룹화하여 저장
              mergedData[sourceNodeName] = edge.data.output;
            
            // 디버깅 필요시에만 주석 해제
            // console.log(`[MergeNode ${nodeId}] 데이터 그룹화: ${sourceNodeName} = `, edge.data.output);
          });

          // Store a simplified list of inputs for display in NodeInspector's "Input Data" tab
          const displayInputs = actualEdgesWithData.map(edge => edge.data.output);
          get().updateNodeData(nodeId, { ...node.data, inputData: displayInputs });

          // MERGE 노드 설정 준비
          const config = {
            mergeMappings: (node.data.config?.mergeMappings || []).map((m: any) => {
              // sourceNodeId로 실제 노드를 찾아서 이름(label) 가져오기
              const sourceNode = get().nodes.find(n => n.id === m.sourceNodeId);
              const sourceNodeName = sourceNode ? sourceNode.data.label : m.sourceNodeId;
              
              return {
                outputKey: m.outputKey,
                sourceNodeId: sourceNodeName, // 노드 이름으로 변경
                sourceNodeKey: m.sourceNodeKey
              };
            })
          };

          // 매핑이 없으면 에러
          if (!config.mergeMappings || config.mergeMappings.length === 0) {
            console.warn(`[MergeNode ${nodeId}] No merge mappings defined. Output will be empty.`);
            output = { error: 'No merge mappings configured' };
            break;
          }

          // API 요청 페이로드 구성
          const requestData = {
            nodeId,
            nodeType: 'mergeNode',
            config,
            data: mergedData  // data 키로 감싸서 병합된 데이터 추가
          };

          console.log(`[MergeNode ${nodeId}] API 요청 페이로드:`, JSON.stringify(requestData, null, 2));

          try {
            const response = await fetch('http://localhost:8000/workflow/node/mergenode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestData),
            });

            console.log(`[MergeNode ${nodeId}] API 응답 상태: ${response.status}`);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[MergeNode ${nodeId}] API 요청 실패. 상태: ${response.status}, 메시지: ${errorText}`);
              throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }

            const apiResponse = await response.json();
            console.log(`[MergeNode ${nodeId}] 백엔드 응답:`, apiResponse);
            
            // 백엔드 응답을 그대로 전달
            output = apiResponse;
          } catch (apiError) {
            console.error(`[MergeNode ${nodeId}] API 호출 실패:`, apiError);
            output = { error: 'Failed to connect to merge node API', details: (apiError as Error).message };
          }
          break;
        }
        case 'userNode': {
          const pythonCode = node.data.code || '';
          const functionName = node.data.config?.functionName || 'user_function';
          const parameters = node.data.config?.parameters || [];
          const outputVariable = node.data.config?.outputVariable || 'result';

          if (!pythonCode.trim()) {
            output = { error: 'Python code is empty' };
            break;
          }

          // parameters에 matchData 추가
          const parametersWithMatchData = parameters.map((param: any) => {
            let matchData;
            if (param.inputType === 'select box') {
              // select box의 경우 기존 방식 유지 (inputData에서 키 값 가져오기)
              matchData = node.data.config?.inputData?.[param.name] || '';
            } else if (param.inputType === 'text box') {
              // text box의 경우 settings에서 값을 가져와서 그대로 전달
              const textValue = node.data.config?.settings?.[param.name] || '';
              matchData = textValue; // 작은따옴표 제거
            } else if (param.inputType === 'radio button') {
              // radio button의 경우 settings에서 선택된 값을 가져와서 그대로 전달
              const radioValue = node.data.config?.settings?.[param.name] || '';
              matchData = radioValue; // 작은따옴표 제거
            } else if (param.inputType === 'checkbox') {
              // checkbox의 경우 settings에서 선택된 값들을 배열로 전달
              const checkboxValues = node.data.config?.settings?.[param.name] || [];
              matchData = checkboxValues; // 배열 자체로 전송
            } else {
              matchData = '';
            }
            return {
              ...param,
              matchData: matchData
            };
          });

          // 현재 노드의 최신 inputData 가져오기
          const currentNode = get().nodes.find(n => n.id === nodeId);
          const currentInputData = currentNode?.data.inputData || {};

          try {
            const payload = {
              code: pythonCode,
              functionName: functionName,
              parameters: parametersWithMatchData,
              inputData: currentInputData,
              return_key: outputVariable
            };
            const response = await fetch('http://localhost:8000/workflow/node/usernode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }
            const apiResponse = await response.json();
            // input 받은 데이터에 Output Variable에 지정한 key 값에 api가 전달한 값을 추가하여 output 생성
            output = { ...input, [outputVariable]: apiResponse };
          } catch (apiError) {
            console.error('UserNode API call failed:', apiError);
            output = { error: 'Failed to execute user node via API', details: (apiError as Error).message };
          }
          break;
        }
        default:
          output = input;
      }

      get().setNodeOutput(nodeId, output);
      
      // output에 error가 있으면 실패로 처리
      const hasError = output && typeof output === 'object' && output.error;
      get().setNodeExecuting(nodeId, false, !hasError, nodeName, isWorkflowRunning); // error가 있으면 실패
      
      // 성공/실패에 따라 나가는 엣지들의 상태 설정
      const outgoingEdges = get().edges.filter(edge => edge.source === nodeId);
      
      // 성공적으로 실행된 경우, 연결된 타겟 노드들의 입력 소스를 자동으로 이 노드로 설정
      // 단, merge 노드는 예외 (여러 입력을 합치는 역할이므로 특정 입력 소스를 표시하지 않음)
      if (!hasError) {
        outgoingEdges.forEach(edge => {
          const targetNode = get().nodes.find(n => n.id === edge.target);
          if (targetNode?.type !== 'mergeNode') {
            get().setManuallySelectedEdge(edge.target, edge.id);
          }
        });
      }
      
      if (node.type === 'conditionNode') {
        // 조건 노드: 실제로 데이터가 전달된 엣지만 성공 처리, 나머지는 기본 상태 유지
        const latestEdges = get().edges.filter(edge => edge.source === nodeId);
        if (!hasError) {
          latestEdges.forEach(edge => {
            const flowed = !!(edge.data && edge.data.output);
            if (flowed) {
              get().setEdgeSuccess(edge.id, true);
            } else {
              // 기본 상태 유지: 실행/성공/실패 모두 false로 정리
              get().updateEdgeData(edge.id, { isExecuting: false, isSuccess: false, isFailure: false });
            }
          });
        } else {
          // 노드 자체가 실패한 경우: 어떤 엣지도 흐르지 않았으므로 상태를 리셋만 수행
          latestEdges.forEach(edge => {
            get().updateEdgeData(edge.id, { isExecuting: false, isSuccess: false, isFailure: false });
          });
        }
      } else {
        if (!hasError) {
          // 성공한 경우: 모든 나가는 엣지를 성공 처리 (일반 노드는 동일 출력 전달)
          outgoingEdges.forEach(edge => {
            get().setEdgeSuccess(edge.id, true);
          });
        } else {
          // 실패한 경우: 일반 노드는 나가는 엣지를 실패로 표시
          outgoingEdges.forEach(edge => {
            get().setEdgeFailure(edge.id, true);
          });
        }
      }
    } catch (error) {
      console.error('Error executing node:', error);
      get().setNodeOutput(nodeId, { error: 'Execution failed' });
      get().setNodeExecuting(nodeId, false, false, nodeName, isWorkflowRunning); // 실패로 표시
      
      // 실패한 경우 엣지 상태 처리
      const outgoingEdges = get().edges.filter(edge => edge.source === nodeId);
      if (node.type === 'conditionNode') {
        // 조건 노드는 어떤 엣지도 흐르지 않은 것으로 간주: 상태 리셋만
        outgoingEdges.forEach(edge => {
          get().updateEdgeData(edge.id, { isExecuting: false, isSuccess: false, isFailure: false });
        });
      } else {
        // 일반 노드: 실패로 표시
        outgoingEdges.forEach(edge => {
          get().setEdgeFailure(edge.id, true);
        });
      }
    }
  },

  runWorkflow: async (chatId?: string) => { 
    const { nodes, edges, getNodeById, executeNode, setWorkflowRunning, isWorkflowRunning } = get();
    
    // 중복 실행 방지: 이미 워크플로우가 실행 중이면 리턴
    if (isWorkflowRunning) {
      console.log('⚠️ [RunWorkflow] Workflow is already running, skipping...');
      return;
    }
    
    console.log('🚀 [RunWorkflow] Starting workflow execution');
    setWorkflowRunning(true);
    
    // 워크플로 시작 시 모든 edge를 PENDING 상태로 초기화 (순환 구조 지원)
    console.log("🔄 [RunWorkflow] Initializing all edges to PENDING state");
    edges.forEach(edge => {
      get().setEdgeOutput(edge.id, EDGE_STATES.PENDING);
    });
    
    // 전체 엣지 상태 초기화
    get().resetAllEdgeStatuses([]);
    
    // 워크플로우 실행 시작 토스트 이벤트 발생
    window.dispatchEvent(new CustomEvent('nodeExecutionStarted', {
      detail: { nodeId: 'workflow', nodeName: 'Workflow' }
    }));
    
    console.log("🚀 워크플로우 실행 시작");
    console.log("=========================================");

    const startNode = nodes.find(n => n.type === 'startNode');
    if (!startNode) {
      console.error("❌ 시작 노드를 찾을 수 없습니다. 워크플로우를 실행할 수 없습니다.");
      alert("워크플로우 실행 실패: 워크플로우에 시작 노드가 없습니다.");
      setWorkflowRunning(false);
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
        const node = get().getNodeById(nodeId);
        
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
        const nodeToExecute = getNodeById(nodeId);
        if (!nodeToExecute) {
          console.warn(`⚠️ 실행 중 ID ${nodeId}를 가진 노드를 찾을 수 없습니다. 건너뜁니다.`);
          return;
        }
        
        // 실행 횟수 증가
        const currentCount = nodeExecutionCount.get(nodeId) || 0;
        nodeExecutionCount.set(nodeId, currentCount + 1);
        console.log(`🔄 노드 ${nodeToExecute.data.label} (${nodeId}) 실행 횟수: ${currentCount + 1}/${MAX_NODE_EXECUTIONS}`);
        
        try {
          await executeNode(nodeId, chatId);
        } catch (e) {
          // 내부에서 상태 처리됨
        }
      }));

      // 다음 레벨 수집
      const next: string[] = [];
      for (const nodeId of executableNodes) {
        const executedNode = getNodeById(nodeId);
        const output = executedNode?.data.output;
        if (output && typeof output === 'object' && output.error) {
          errorNodes.push(executedNode?.data.label || nodeId);
        }

        const latestEdges = get().edges;
        const outgoingEdges = latestEdges.filter(edge => edge.source === nodeId);
        outgoingEdges.forEach(edge => {
          if (edge.data?.output !== null && edge.data?.output !== undefined) {
            const targetNodeId = edge.target;
            const targetNode = getNodeById(targetNodeId);
            
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
            } else if (get().isConditionConvergenceNode(targetNodeId, get().nodes, latestEdges)) {
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

    setWorkflowRunning(false);
    // 완료 토스트
    if (errorNodes.length > 0) {
      window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', {
        detail: { nodeId: 'workflow', success: false, nodeName: 'Workflow', failedNodeName: errorNodes[0] }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', {
        detail: { nodeId: 'workflow', success: true, nodeName: 'Workflow' }
      }));
    }
  },

  

  

  

  fetchAIConnections: async () => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log('FlowStore: Fetching AI connections...');
    try {
      const connections = await storageService.getAllAIConnections();
      
      // 마이그레이션: type 필드 소문자화 및 기본값 보정
      const normalized = connections.map(conn => {
        let type = (conn.type || '').toLowerCase();
        if (type !== 'language' && type !== 'embedding') {
          type = 'embedding'; // 잘못된 값이면 기본값
        }
        return { ...conn, type: type as 'language' | 'embedding' };
      });
      
      set({ aiConnections: normalized, isLoadingAIConnections: false, loadErrorAIConnections: null });
      console.log(`FlowStore: Found ${normalized.length} AI connections:`, normalized);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage || 'Failed to fetch AI connections list', isLoadingAIConnections: false });
      console.error('FlowStore: Error fetching AI connections list:', error);
    }
  },
    getWorkflowAsJSONString: (deploymentData?: Workflow) => {

    // deployment 데이터가 전달되면 해당 데이터를 사용, 그렇지 않으면 현재 상태 사용
    const { projectName, nodes, edges, viewport } = deploymentData ? {
      projectName: deploymentData.projectName,
      nodes: deploymentData.nodes,
      edges: deploymentData.edges,
      viewport: deploymentData.viewport
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

  addAIConnection: async (connectionData: Omit<AIConnection, 'id' | 'lastModified'>) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    const newConnection: AIConnection = {
      ...connectionData,
      id: nanoid(),
      lastModified: new Date().toISOString(),
    };
    console.log('FlowStore: Adding new AI connection:', newConnection);

    try {
      await storageService.createAIConnection(newConnection);
      console.log('FlowStore: AI connection added successfully.');
      get().fetchAIConnections(); // 목록 새로고침
      return newConnection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('FlowStore: Failed to add AI connection:', error);
      throw error;
    }
  },

  

  updateAIConnection: async (connectionId: string, updates: Partial<Omit<AIConnection, 'id' | 'lastModified'>>) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log(`FlowStore: Updating AI connection ID ${connectionId} with:`, updates);

    try {
      // 기존 연결 정보 가져오기
      const existingConnection = await storageService.getAIConnectionById(connectionId);
      if (!existingConnection) {
        const errorMsg = `AI connection with ID ${connectionId} not found.`;
        set({ loadErrorAIConnections: errorMsg, isLoadingAIConnections: false });
        throw new Error(errorMsg);
      }

      const updatedConnection: AIConnection = {
        ...existingConnection,
        ...updates,
        lastModified: new Date().toISOString(),
      };

      await storageService.updateAIConnection(connectionId, updatedConnection);
      console.log('FlowStore: AI connection updated successfully.');
      get().fetchAIConnections(); // 목록 새로고침
      return updatedConnection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('FlowStore: Failed to update AI connection:', error);
      throw error;
    }
  },

  deleteAIConnection: async (connectionId: string) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log(`FlowStore: Deleting AI connection ID ${connectionId}...`);
    try {
      await storageService.deleteAIConnection(connectionId);
      console.log('FlowStore: AI connection deleted successfully.');
      get().fetchAIConnections();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('FlowStore: Failed to delete AI connection:', error);
      throw error;
    }
  },

  

  setFocusedElement: (type: 'node' | 'edge' | null, id: string | null) => set({ focusedElement: { type, id } }),

  // ── 배포 관련 초기 상태 ─────────────────
  deployments: [],
  activeDeployment: null,
  deploymentVersions: [],
  isLoadingDeployments: false,
  loadErrorDeployments: null,

  // ── 배포 관련 함수들 ─────────────────
  createDeployment: async (deploymentData: DeploymentFormData) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      const { projectName, nodes, edges, viewport } = get();
      const workflowSnapshot: Workflow = {
        projectId: nanoid(),
        projectName,
        nodes,
        edges,
        viewport,
        lastModified: new Date().toISOString(),
      };

      // API를 통해 배포 생성
      const deployment = await apiService.createDeployment(deploymentData, workflowSnapshot);

      // 배포 목록 새로고침
      get().fetchDeployments();
      
      return deployment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  updateDeployment: async (id: string, updates: Partial<Omit<Deployment, 'id' | 'createdAt'>>) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      // API를 통해 배포 업데이트 (상태 업데이트만 지원)
      if (updates.status) {
        const deployment = await apiService.updateDeploymentStatus(id, updates.status);
        
        // 배포 목록 새로고침
        get().fetchDeployments();
        
        return deployment;
      } else {
        throw new Error('Only status updates are supported via API');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  deleteDeployment: async (id: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      await apiService.deleteDeployment(id);
      
      // 배포 목록 새로고침
      get().fetchDeployments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  activateDeployment: async (id: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      await apiService.activateDeployment(id);
      
      // 배포 목록 새로고침
      get().fetchDeployments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  deactivateDeployment: async (id: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      await apiService.deactivateDeployment(id);
      
      // 배포 목록 새로고침
      get().fetchDeployments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  fetchDeployments: async () => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      const deployments = await apiService.getDeployments();
      set({ deployments, isLoadingDeployments: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    }
  },

  getDeploymentVersions: async (deploymentId: string) => {
    try {
      const { versions } = await apiService.getDeploymentStatus(deploymentId);
      set({ deploymentVersions: versions });
      return versions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage });
      throw error;
    }
  },

  createDeploymentVersion: async (deploymentId: string, workflowSnapshot: Workflow, version: string, changelog?: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      const deploymentVersion = await apiService.createDeploymentVersion(
        deploymentId, 
        workflowSnapshot, 
        version, 
        changelog
      );
      
      // 버전 목록 새로고침
      get().getDeploymentVersions(deploymentId);
      
      return deploymentVersion;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  activateDeploymentVersion: async (deploymentId: string, versionId: string) => {
    try {
      set({ isLoadingDeployments: true, loadErrorDeployments: null });
      
      await apiService.rollbackDeployment(deploymentId, versionId);
      
      // 버전 목록 새로고침
      get().getDeploymentVersions(deploymentId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorDeployments: errorMessage, isLoadingDeployments: false });
      throw error;
    } finally {
      set({ isLoadingDeployments: false });
    }
  },

  // 협업 관련 함수들
  initializeCollaboration: (userId: string, username: string) => {
    console.log(`[Collaboration] Initializing collaboration for user: ${username} (${userId})`);
    const service = getCollaborationService(userId, username);
    set({ 
      collaborationService: service,
      currentUserId: userId,
      currentUsername: username
    });
  },

  connectCollaboration: async () => {
    const { collaborationService, projectName } = get();
    
    if (!collaborationService) {
      console.error('[Collaboration] Service not initialized');
      return;
    }

    if (!projectName || projectName === DEFAULT_PROJECT_NAME) {
      console.warn('[Collaboration] Cannot connect: invalid project name');
      return;
    }

    try {
      console.log(`[Collaboration] Connecting to workflow: ${projectName}`);
      await collaborationService.connect(projectName);

      // 이벤트 핸들러 등록
      collaborationService.on('user_joined', (event: CollaborationEvent) => {
        console.log('[Collaboration] User joined:', event.data.user_info);
        set({ activeUsers: event.data.active_users || [] });
      });

      collaborationService.on('user_left', (event: CollaborationEvent) => {
        console.log('[Collaboration] User left:', event.data.username);
        set({ activeUsers: event.data.active_users || [] });
      });

      collaborationService.on('initial_state', (event: CollaborationEvent) => {
        console.log('[Collaboration] Initial state received');
        set({ 
          activeUsers: event.data.active_users || [],
          lockedNodes: event.data.locked_nodes || {}
        });
      });

      collaborationService.on('node_locked', (event: CollaborationEvent) => {
        const { node_id } = event.data;
        const { user_id } = event;
        console.log(`[Collaboration] Node ${node_id} locked by ${user_id}`);
        set({ 
          lockedNodes: { 
            ...get().lockedNodes, 
            [node_id]: user_id 
          }
        });
      });

      collaborationService.on('node_unlocked', (event: CollaborationEvent) => {
        const { node_id } = event.data;
        console.log(`[Collaboration] Node ${node_id} unlocked`);
        const newLockedNodes = { ...get().lockedNodes };
        delete newLockedNodes[node_id];
        set({ lockedNodes: newLockedNodes });
      });

      collaborationService.on('node_change', (event: CollaborationEvent) => {
        const { node_id, changes } = event.data;
        console.log(`[Collaboration] Remote node change: ${node_id}`, changes);
        
        // 무한 루프 방지: 원격 변경 수신 중 플래그 설정
        set({ isReceivingRemoteChange: true });
        
        try {
          // 위치 변경인 경우 노드의 position을 직접 업데이트
          if (changes.position) {
            console.log(`[Collaboration] Updating node position: ${node_id}`, changes.position);
            set(state => ({
              nodes: state.nodes.map(node => 
                node.id === node_id 
                  ? { ...node, position: changes.position }
                  : node
              )
            }));
          }
          
          // 데이터 변경인 경우 (위치 제외한 나머지)
          const dataChanges = { ...changes };
          delete dataChanges.position;
          
          if (Object.keys(dataChanges).length > 0) {
            const { updateNodeData, getNodeById } = get();
            const node = getNodeById(node_id);
            if (node) {
              updateNodeData(node_id, dataChanges);
            }
          }
        } finally {
          // 플래그 해제
          set({ isReceivingRemoteChange: false });
        }
      });

      // 🆕 협업: 노드 추가 이벤트 핸들러
      collaborationService.on('node_added', (event: CollaborationEvent) => {
        const { node } = event.data;
        console.log(`✅ [Collaboration] Remote node added:`, node);
        
        // 무한 루프 방지
        set({ isReceivingRemoteChange: true });
        
        try {
          // 이미 존재하는 노드인지 확인
          const existingNode = get().nodes.find(n => n.id === node.id);
          if (!existingNode) {
            set(state => ({
              nodes: [...state.nodes, node]
            }));
            console.log(`✅ [Collaboration] Node ${node.id} added to local state`);
          } else {
            console.log(`⚠️ [Collaboration] Node ${node.id} already exists, skipping`);
          }
        } finally {
          set({ isReceivingRemoteChange: false });
        }
      });

      // 🆕 협업: 노드 삭제 이벤트 핸들러
      collaborationService.on('node_removed', (event: CollaborationEvent) => {
        const { node_id } = event.data;
        console.log(`🗑️ [Collaboration] Remote node removed: ${node_id}`);
        
        // 무한 루프 방지
        set({ isReceivingRemoteChange: true });
        
        try {
          set(state => ({
            nodes: state.nodes.filter(node => node.id !== node_id),
            edges: state.edges.filter(edge => 
              edge.source !== node_id && edge.target !== node_id
            )
          }));
          console.log(`✅ [Collaboration] Node ${node_id} removed from local state`);
        } finally {
          set({ isReceivingRemoteChange: false });
        }
      });

      console.log('[Collaboration] Successfully connected');
    } catch (error) {
      console.error('[Collaboration] Connection error:', error);
    }
  },

  disconnectCollaboration: () => {
    const { collaborationService } = get();
    if (collaborationService) {
      console.log('[Collaboration] Disconnecting');
      collaborationService.disconnect();
      set({ 
        activeUsers: [], 
        lockedNodes: {},
        collaborationService: null 
      });
    }
  },

  lockNodeForEdit: async (nodeId: string) => {
    const { collaborationService, currentUserId, lockedNodes } = get();
    
    if (!collaborationService || !collaborationService.isConnected()) {
      console.warn('[Collaboration] Service not connected, allowing local edit');
      return true;
    }

    // 이미 자신이 잠근 노드인지 확인
    if (lockedNodes[nodeId] === currentUserId) {
      return true;
    }

    // 다른 사용자가 잠근 노드인지 확인
    if (lockedNodes[nodeId]) {
      console.warn(`[Collaboration] Node ${nodeId} is locked by another user`);
      return false;
    }

    // 노드 잠금 요청
    const success = await collaborationService.lockNode(nodeId);
    console.log(`[Collaboration] Lock node ${nodeId}: ${success ? 'success' : 'failed'}`);
    return success;
  },

  unlockNodeAfterEdit: async (nodeId: string) => {
    const { collaborationService, currentUserId, lockedNodes } = get();
    
    if (!collaborationService || !collaborationService.isConnected()) {
      return;
    }

    // 자신이 잠근 노드인지 확인
    if (lockedNodes[nodeId] !== currentUserId) {
      return;
    }

    // 노드 잠금 해제
    await collaborationService.unlockNode(nodeId);
    console.log(`[Collaboration] Unlocked node ${nodeId}`);
  },

  // UserNode 관련 함수들
  fetchUserNodes: async () => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log('FlowStore: Fetching user nodes...');
    try {
      const userNodes = await storageService.getAllUserNodes();
      set({ userNodes, isLoadingUserNodes: false, loadErrorUserNodes: null });
      console.log(`FlowStore: Found ${userNodes.length} user nodes:`, userNodes);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage || 'Failed to fetch user nodes list', isLoadingUserNodes: false });
      console.error('FlowStore: Error fetching user nodes list:', error);
    }
  },

  addUserNode: async (userNodeData: Omit<UserNode, 'id' | 'lastModified'>) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    const newUserNode: UserNode = {
      ...userNodeData,
      id: nanoid(),
      lastModified: new Date().toISOString(),
    };
    console.log('FlowStore: Adding new user node:', newUserNode);

    try {
      await storageService.createUserNode(newUserNode);
      console.log('FlowStore: User node added successfully.');
      get().fetchUserNodes(); // 목록 새로고침
      return newUserNode;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('FlowStore: Failed to add user node:', error);
      throw error;
    }
  },

  updateUserNode: async (userNodeId: string, updates: Partial<Omit<UserNode, 'id' | 'lastModified'>>) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log(`FlowStore: Updating user node ID ${userNodeId} with:`, updates);

    try {
      const existingUserNode = await storageService.getUserNodeById(userNodeId);
      if (!existingUserNode) {
        const errorMsg = `User node with ID ${userNodeId} not found.`;
        set({ loadErrorUserNodes: errorMsg, isLoadingUserNodes: false });
        throw new Error(errorMsg);
      }

      const updatedUserNode: UserNode = {
        ...existingUserNode,
        ...updates,
        lastModified: new Date().toISOString(),
      };

      await storageService.updateUserNode(userNodeId, updatedUserNode);
      console.log('FlowStore: User node updated successfully.');
      get().fetchUserNodes(); // 목록 새로고침
      return updatedUserNode;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('FlowStore: Failed to update user node:', error);
      throw error;
    }
  },

  deleteUserNode: async (userNodeId: string) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log(`FlowStore: Deleting user node ID ${userNodeId}...`);
    try {
      await storageService.deleteUserNode(userNodeId);
      console.log('FlowStore: User node deleted successfully.');
      get().fetchUserNodes();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('FlowStore: Failed to delete user node:', error);
      throw error;
    }
  },

  // Export user nodes to JSON file
  exportUserNodes: async (nodeIds?: string[], customFileName?: string) => {
    try {
      const { userNodes } = get();
      
      // 특정 노드들만 export하거나 모든 노드 export
      const nodesToExport = nodeIds 
        ? userNodes.filter(node => nodeIds.includes(node.id))
        : userNodes;

      if (nodesToExport.length === 0) {
        throw new Error('No nodes to export');
      }

      // export용 데이터 구성 (id와 lastModified 제외)
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        nodes: nodesToExport.map(node => ({
          name: node.name,
          type: node.type,
          code: node.code,
          parameters: node.parameters,
          functionName: node.functionName,
          returnType: node.returnType,
          functionDescription: node.functionDescription
        }))
      };

      // 파일명 생성
      let fileName;
      if (customFileName) {
        fileName = `${customFileName}.json`;
      } else {
        fileName = `user-nodes-${new Date().toISOString().split('T')[0]}.json`;
      }

      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('FlowStore: User nodes exported successfully');
      return exportData;
    } catch (error) {
      console.error('FlowStore: Failed to export user nodes:', error);
      throw error;
    }
  },

  // Import user nodes from JSON file
  importUserNodes: async (file: File) => {
    try {
      const fileContent = await file.text();
      const importData = JSON.parse(fileContent);

      // 데이터 구조 검증
      if (!importData.nodes || !Array.isArray(importData.nodes)) {
        throw new Error('Invalid file format: nodes array not found');
      }

      const { userNodes, addUserNode } = get();
      const existingNames = userNodes.map(node => node.name);
      const importResults = [];

      for (const nodeData of importData.nodes) {
        // 필수 필드 검증
        if (!nodeData.name || !nodeData.code || !nodeData.functionName) {
          console.warn('Skipping invalid node data:', nodeData);
          continue;
        }

        // 이름 중복 처리
        let finalName = nodeData.name;
        let counter = 1;
        while (existingNames.includes(finalName)) {
          finalName = `${nodeData.name}_${counter}`;
          counter++;
        }

        try {
          const newNode = await addUserNode({
            name: finalName,
            type: 'UserNode',
            code: nodeData.code,
            parameters: nodeData.parameters || [],
            functionName: nodeData.functionName,
            returnType: nodeData.returnType || 'str',
            functionDescription: nodeData.functionDescription || ''
          });

          existingNames.push(finalName); // 추가된 이름을 목록에 추가
          importResults.push({
            originalName: nodeData.name,
            finalName: finalName,
            success: true,
            node: newNode
          });
        } catch (error) {
          importResults.push({
            originalName: nodeData.name,
            finalName: finalName,
            success: false,
            error: (error as Error).message
          });
        }
      }

      console.log('FlowStore: User nodes imported successfully:', importResults);
      return importResults;
    } catch (error) {
      console.error('FlowStore: Failed to import user nodes:', error);
      throw error;
    }
  },
})); 
