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
  Viewport, // Viewport 타입을 가져옵니다.
} from 'reactflow';
import { nanoid } from 'nanoid';
import { Deployment, DeploymentVersion, DeploymentStatus, DeploymentEnvironment, DeploymentFormData } from '../types/deployment';
import { deploymentStore } from './deploymentStore';
import { apiService } from '../services/apiService';

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

export interface AIConnection {
  id: string; // nanoid로 생성
  name: string;
  type: 'language' | 'embedding';
  provider: string;
  model: string;
  apiKey?: string; // API 키는 선택적으로 저장 (보안 고려)
  accessKeyId?: string; // AWS Access Key ID
  secretAccessKey?: string; // AWS Secret Access Key
  region?: string; // AWS Region
  temperature?: number; // Language model 전용
  maxTokens?: number;   // Language model 전용
  status: 'active' | 'draft' | 'archived';
  lastModified: string; // ISO string
}

export interface UserNode {
  id: string; // nanoid로 생성
  name: string; // Node Name
  type: 'UserNode';
  code: string; // 파이썬 코드
  parameters: Array<{
    name: string;
    inputType: string; // 'select box' 또는 'text box'
    required: boolean;

    funcArgs?: string; // 매개변수별 funcArgs 추가
    matchData?: string; // 매개변수별 matchData 추가

  }>;
  functionName: string;
  returnType: string;
  functionDescription: string;
  outputVariable?: string; // 출력 변수명 추가
  lastModified: string; // ISO string
}

export interface Workflow {
  projectId: string;
  projectName: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport: Viewport;
  lastModified: string;
}


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
  updateEdgeLabel: (edgeId: string, label: string) => void; // 추가
  updateEdgeDescription: (edgeId: string, description: string) => void; // 추가
  updateEdgeData: (edgeId: string, data: Partial<Edge['data']>) => void; // 엣지 데이터 업데이트 통합
  setNodeExecuting: (nodeId: string, isExecuting: boolean, success?: boolean, nodeName?: string, isWorkflowExecution?: boolean) => void;
  runWorkflow: (chatId?: string) => Promise<void>; // chatId 파라미터 추가
  isWorkflowRunning: boolean;
  setWorkflowRunning: (isRunning: boolean) => void;
  viewport: Viewport; // viewport 상태 추가
  setViewport: (viewport: Viewport) => void; // viewport 업데이트 함수 추가

  // 노드 선택 상태
  selectedNode: string | null;
  setSelectedNode: (id: string | null) => void;

  // IndexedDB 저장 및 불러오기 관련 상태 및 함수
  isSaving: boolean;
  saveError: string | null;
  lastSaved: Date | null;
  isLoading: boolean;
  loadError: string | null;
  availableWorkflows: Workflow[];
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (projectName: string) => Promise<void>;
  fetchAvailableWorkflows: () => Promise<void>;
  deleteWorkflow: (projectName: string) => Promise<void>; // 워크플로 삭제 함수 추가
  renameWorkflow: (oldName: string, newName: string) => Promise<void>; // 워크플로 이름 변경 함수 추가

  getWorkflowAsJSONString: (deploymentData?: Workflow) => string | null; // 워크플로우를 JSON 문자열로 가져오는 함수
  
  // AI Connections 관련 상태 및 함수
  aiConnections: AIConnection[];
  isLoadingAIConnections: boolean;
  loadErrorAIConnections: string | null;
  fetchAIConnections: () => Promise<void>;
  addAIConnection: (connection: Omit<AIConnection, 'id' | 'lastModified'>) => Promise<AIConnection>;
  updateAIConnection: (connectionId: string, updates: Partial<Omit<AIConnection, 'id' | 'lastModified'>>) => Promise<AIConnection>;
  deleteAIConnection: (connectionId: string) => Promise<void>;
  
  // UserNode 관련 상태 및 함수
  userNodes: UserNode[];
  isLoadingUserNodes: boolean;
  loadErrorUserNodes: string | null;
  fetchUserNodes: () => Promise<void>;
  addUserNode: (userNode: Omit<UserNode, 'id' | 'lastModified'>) => Promise<UserNode>;
  updateUserNode: (userNodeId: string, updates: Partial<Omit<UserNode, 'id' | 'lastModified'>>) => Promise<UserNode>;
  deleteUserNode: (userNodeId: string) => Promise<void>;
  
  // 포커스 관리
  focusedElement: { type: 'node' | 'edge' | null; id: string | null };
  setFocusedElement: (type: 'node' | 'edge' | null, id: string | null) => void;


  // 수동 선택된 edge 정보
  manuallySelectedEdges: Record<string, string | null>; // nodeId -> edgeId
  setManuallySelectedEdge: (nodeId: string, edgeId: string | null) => void;



  // 배포 관련 상태 및 함수
  deployments: Deployment[];
  activeDeployment: Deployment | null;
  deploymentVersions: DeploymentVersion[];
  isLoadingDeployments: boolean;
  loadErrorDeployments: string | null;
  
  // 배포 관련 함수들
  createDeployment: (deploymentData: DeploymentFormData) => Promise<Deployment>;
  updateDeployment: (id: string, updates: Partial<Omit<Deployment, 'id' | 'createdAt'>>) => Promise<Deployment>;
  deleteDeployment: (id: string) => Promise<void>;
  activateDeployment: (id: string) => Promise<void>;
  deactivateDeployment: (id: string) => Promise<void>;
  fetchDeployments: () => Promise<void>;
  getDeploymentVersions: (deploymentId: string) => Promise<DeploymentVersion[]>;
  createDeploymentVersion: (deploymentId: string, workflowSnapshot: Workflow, version: string, changelog?: string) => Promise<DeploymentVersion>;
  activateDeploymentVersion: (deploymentId: string, versionId: string) => Promise<void>;
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
    position: { x: 100, y: 300 },
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

// 새 워크플로우를 위한 기본 초기 상태 (Start, End 노드 포함)
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
    position: { x: 100, y: 300 },
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

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (key === 'icon' || typeof value === 'function') {
      return undefined;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};

const safeCompare = (obj1: any, obj2: any): boolean => {
  try {
    return JSON.stringify(obj1, getCircularReplacer()) === JSON.stringify(obj2, getCircularReplacer());
  } catch (error) {
    console.error('Error comparing objects:', error);
    return false;
  }
};

const validateStartNode = (node: Node<NodeData>): string | null => {
  if (!node.data.config?.className?.trim()) {
    return 'Class Name is required';
  }

  const variables = node.data.config?.variables || [];
  for (let i = 0; i < variables.length; i++) {
    if (!variables[i].name.trim()) {
      return `Variable Name is required for variable ${i + 1}`;
    }
  }

  return null;
};

const getUniqueNodeName = (nodes: Node<NodeData>[], baseLabel: string): string => {
  const existingNames = nodes.map(node => node.data.label);
  // 띄어쓰기를 언더스코어로 변환
  const sanitizedBaseLabel = baseLabel.replace(/\s+/g, '_');
  let newName = sanitizedBaseLabel;
  let counter = 1;

  while (existingNames.includes(newName)) {
    newName = `${sanitizedBaseLabel}_${counter}`;
    counter++;
  }

  return newName;
};

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

const processPromptTemplate = (template: string, input: Record<string, any>, outputVariable: string): Record<string, any> => {
  const output = { ...input };
  let processedTemplate = template || '';
  
  processedTemplate = processedTemplate.replace(/\{([^}]+)\}/g, (match, key) => {
    return input[key] !== undefined ? String(input[key]) : match;
  });

  if (outputVariable) {
    output[outputVariable] = processedTemplate;
  }

  return output;
};

// Helper to prepare a condition string from an edge label for evaluation
const prepareConditionForEvaluation = (edgeLabel: string | undefined, defaultArgumentName: string): { body: string } => {
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
  // The condition string must use the 'defaultArgumentName' for the input object.
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

const generateEmbedding = (input: Record<string, any>, config: NodeData['config']): Record<string, any> => {
  if (!config?.inputColumn || !config?.outputColumn) {
    throw new Error('Input and output columns must be specified');
  }

  const result = { ...input };
  result[config.outputColumn] = [1, 2, 3, 4];
  return result;
};

// IndexedDB 설정
const DB_NAME = 'WorkflowDatabase';
const WORKFLOWS_STORE_NAME = 'WorkflowsStore';
const AI_CONNECTIONS_STORE_NAME = 'AIConnectionsStore'; // AI 연결 정보 저장소 이름
const USER_NODES_STORE_NAME = 'UserNodesStore'; // UserNode 저장소 이름
const DB_VERSION = 3; // 데이터베이스 스키마 변경 시 이 버전을 올려야 합니다. (새로운 저장소 추가)
export const DEFAULT_PROJECT_NAME = 'New Workflow'; // 기본 프로젝트 이름 상수화

// IndexedDB 열기/초기화 헬퍼 함수
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(WORKFLOWS_STORE_NAME)) {
        // 'projectName'을 키로 사용합니다.
        db.createObjectStore(WORKFLOWS_STORE_NAME, { keyPath: 'projectName' });
        console.log(`Object store "${WORKFLOWS_STORE_NAME}" created.`);
      }      
      if (!db.objectStoreNames.contains(AI_CONNECTIONS_STORE_NAME)) {
        db.createObjectStore(AI_CONNECTIONS_STORE_NAME, { keyPath: 'id' });
        console.log(`Object store "${AI_CONNECTIONS_STORE_NAME}" created.`);
      }
      if (!db.objectStoreNames.contains(USER_NODES_STORE_NAME)) {
        db.createObjectStore(USER_NODES_STORE_NAME, { keyPath: 'id' });
        console.log(`Object store "${USER_NODES_STORE_NAME}" created.`);
      }
      // 예: if (event.oldVersion < 2) { /* 스키마 변경 로직 */ }
    };

    request.onsuccess = (event) => {
      console.log(`Database "${DB_NAME}" opened successfully.`);
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  projectName: DEFAULT_PROJECT_NAME,
  viewport: { x: 0, y: 0, zoom: 1 }, // viewport 초기값
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

  // 노드 선택 상태
  selectedNode: null,
  setSelectedNode: (id: string | null) => set({ selectedNode: id }),

  // IndexedDB 관련 상태 초기값
  isSaving: false,
  saveError: null,
  lastSaved: null,
  isLoading: false,
  loadError: null,
  availableWorkflows: [],
  // AI Connections 관련 초기 상태
  aiConnections: [],
  isLoadingAIConnections: false,
  loadErrorAIConnections: null,
  
  // UserNode 관련 초기 상태
  userNodes: [],
  isLoadingUserNodes: false,
  loadErrorUserNodes: null,
  
  // 포커스 관리 초기 상태
  focusedElement: { type: null, id: null },


  // 수동 선택된 edge 정보
  manuallySelectedEdges: {},
  setManuallySelectedEdge: (nodeId: string, edgeId: string | null) => set({ manuallySelectedEdges: { ...get().manuallySelectedEdges, [nodeId]: edgeId } }),

  setViewport: (viewport: Viewport) => {
    set({ viewport });
  },
  
  onConnect: (connection: Connection) => {
    const { nodes, edges } = get(); // Get current nodes and edges
    const sourceNode = nodes.find(node => node.id === connection.source);
    const isConditionNode = sourceNode?.type === 'conditionNode';
    const startNode = nodes.find(node => node.type === 'startNode');
    const className = startNode?.data.config?.className || 'data';

    const edgeData: any = { output: null };

    if (isConditionNode) {
      // Count existing outgoing edges from this source before adding the new one
      const existingSourceEdgesCount = edges.filter(e => e.source === connection.source).length;
      edgeData.label = `if ${className}['value'] > 0`; // Default 'if' condition label
      edgeData.conditionOrderIndex = existingSourceEdgesCount; // 초기 순서 인덱스 설정
      edgeData.conditionDescription = `Rule #${existingSourceEdgesCount + 1}`; // Default rule description
    }
    
    set({
      edges: addEdge({ 
        ...connection, 
        animated: true,
        data: edgeData
      }, edges), // Use the initially fetched edges
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
    } : type === 'functionNode' ? { // functionNode (Custom Python Function) 기본 설정
      outputVariable: 'python_function_output',
      // code는 newNode 생성 시 data에 직접 설정합니다.
    } : type === 'loopNode' ? {
      repetitions: 1
    } : type === 'promptNode' ? { // promptNode에 outputVariable 기본값 추가
      template: 'User: {{user_input}}\n\nAssistant:',
      outputVariable: 'user_input'
    } : type === 'agentNode' ? {
      model: '',
      userPromptInputKey: 'user_input',
      systemPromptInputKey: 'system_message',
      memoryGroup: '',
      tools: [],
      agentOutputVariable: 'agent_response'
    } : type === 'mergeNode' ? {
      mergeMappings: []
    } : type === 'endNode' ? {
      receiveKey: ''
    } : type === 'userNode' ? {
      // UserNode의 경우 data.config에서 가져온 설정을 사용하되, 기본값도 제공
      outputVariable: 'result',
      ...data.config
    } : {};

    // functionNode의 경우 data.code에 기본 스켈레톤 코드를 제공합니다.
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
        ...initialNodeData, // 기본 코드가 포함될 수 있는 initialNodeData 사용
        label: uniqueLabel,
        output: null,
        inputData: null, // inputData 초기화
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

      // config 객체는 얕은 복사되므로, 내부 속성도 병합해줘야 합니다.
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

      // output이 변경되었는지 확인하고, 변경되었다면 연결된 엣지도 업데이트
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
        if (node.id === edge.source) {
          return {
            ...node,
            data: { ...node.data, output: null }
          };
        }
        return node;
      });

      return {
        nodes: updatedNodes,
        edges: state.edges.filter(e => e.id !== edgeId)
      };
    });
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
              timestamp: output ? Date.now() : 0 // output이 있을 때만 timestamp 저장
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
              timestamp: output ? Date.now() : 0 // output이 있을 때만 timestamp 저장
            }
          };
        }
        return edge;
      });

      return { edges: updatedEdges };
    });
  },

  setNodeExecuting: (nodeId: string, isExecuting: boolean, success: boolean = true, nodeName?: string, isWorkflowExecution?: boolean) => {
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
    
    // 실행 완료 시 토스트 이벤트 발생 (워크플로우 실행 중이 아닐 때만)
    if (!isExecuting && !isWorkflowExecution) {
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

  executeNode: async (nodeId: string, chatId?: string) => { // chatId 파라미터 추가
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 노드 이름 가져오기
    const nodeName = node.data?.label || node.type || 'Node';

    get().updateNodeData(nodeId, { ...node.data, inputData: null }); // 실행 전 inputData 초기화 (선택적)
    // Check if workflow is running
    const isWorkflowRunning = get().isWorkflowRunning;
    get().setNodeExecuting(nodeId, true, true, nodeName, isWorkflowRunning);
    
    // Node Inspector와 동일한 방식으로 input data 선택
    const incomingEdges = get().edges.filter(edge => edge.target === nodeId);
    let input: Record<string, any> = {};
    
    if (incomingEdges.length > 0) {
      // 수동으로 선택된 edge가 있는지 확인
      const manuallySelectedEdgeId = get().manuallySelectedEdges[nodeId];
      
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
          // 설정에서 가져온 키 또는 기본 키를 사용합니다.
          const actualSystemPromptKey = systemPromptInputKey || 'system_message';
          const actualUserPromptKey = userPromptInputKey || 'user_input';

          console.log(`[AgentNode ${nodeId}] Memory Group 설정값:`, memoryGroup); // memoryGroup 값 로깅 추가
          console.log(`[AgentNode ${nodeId}] 사용할 System Prompt Key: '${actualSystemPromptKey}' (설정값: '${systemPromptInputKey}')`);
          console.log(`[AgentNode ${nodeId}] 사용할 User Prompt Key: '${actualUserPromptKey}' (설정값: '${userPromptInputKey}')`);

          // 키 경로를 API로 전달하기 위해 실제 키 값을 사용합니다.
          // 백엔드에서 data를 파싱할 수 있도록 키 경로를 전송합니다.
          const systemPromptRawValue = actualSystemPromptKey && input && input.hasOwnProperty(actualSystemPromptKey) ? input[actualSystemPromptKey] : undefined;
          const userPromptRawValue = actualUserPromptKey && input && input.hasOwnProperty(actualUserPromptKey) ? input[actualUserPromptKey] : undefined;

          // 키 경로를 Python 표기법으로 변환하여 전송 (예: "a['b']" 형식)
          const systemPromptForAPI = convertToPythonNotation(actualSystemPromptKey || "");
          const userPromptForAPI = convertToPythonNotation(actualUserPromptKey || "");

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
            const response = await fetch('http://localhost:8000/workflow/node/agentnode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            console.log(`[AgentNode ${nodeId}] API 응답 상태: ${response.status}`);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[AgentNode ${nodeId}] API 요청 실패. 상태: ${response.status}, 메시지: ${errorText}`);
              throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }

            const apiResponse = await response.json(); 
            // input 받은 데이터에 Output Variable에 지정한 key 값에 api가 전달한 값을 추가하여 output 생성
            output = { ...input, [finalAgentOutputVariable]: apiResponse };

            console.log(`[AgentNode ${nodeId}] API 응답 성공. 출력:`, output);
          } catch (apiError) {
            console.error(`[AgentNode ${nodeId}] API 호출 실패:`, apiError);
            output = { error: 'Failed to connect to agent node API', details: (apiError as Error).message };
          }
        }
          break;
        case 'embeddingNode': {
          if (!node.data.config?.model) {
            output = { error: 'Embedding model must be selected' };
            break;
          }
          if (!node.data.config?.inputColumn) {
            output = { error: 'Input column must be selected' };
            break;
          }
          if (!node.data.config?.outputColumn) {
            output = { error: 'Output column must be selected' };
            break;
          }
          output = generateEmbedding(input, node.data.config);
          break;
        }
        case 'conditionNode': {
          const allOutgoingEdges = get().edges.filter(edge => edge.source === nodeId);
          
          // conditionOrderIndex를 기준으로 엣지 정렬
          // conditionOrderIndex가 없는 경우를 대비해 기본값(Infinity) 사용
          const sortedEdges = [...allOutgoingEdges].sort((a, b) => {
            const orderA = a.data?.conditionOrderIndex ?? Infinity;
            const orderB = b.data?.conditionOrderIndex ?? Infinity;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            // conditionOrderIndex가 같으면 id로 정렬하여 일관성 유지
            return a.id.localeCompare(b.id);
          });

          let conditionMetInChain = false; // 해당 조건 체인에서 이미 참인 조건이 발생했는지 여부
          const inputForBranch = input; // 조건 노드로 들어온 입력값
          
          const startNode = get().nodes.find(node => node.type === 'startNode');
          const argumentNameForEval = startNode?.data.config?.className || 'data';
          
          for (const edge of sortedEdges) {
            if (conditionMetInChain) {
              // 이미 이 체인에서 참인 조건이 발생했으므로, 현재 엣지 및 이후 엣지들은 
              // 평가하지 않고 output을 null로 설정합니다.
              get().setEdgeOutput(edge.id, null);
              continue;
            }

            // 아직 참인 조건을 만나지 못했으므로, 현재 엣지의 조건을 평가합니다.
            const { body: conditionBodyForEval } = prepareConditionForEvaluation(edge.data?.label, argumentNameForEval);
            const isTrue = evaluateCondition(conditionBodyForEval, inputForBranch, argumentNameForEval);
            
            if (isTrue) {
              get().setEdgeOutput(edge.id, inputForBranch);
              conditionMetInChain = true; // 참인 조건을 만났음을 표시
            } else {
              get().setEdgeOutput(edge.id, null);
            }
          }
          // ConditionNode 자체의 output은 들어온 input 그대로 설정하거나, 특별한 의미를 부여할 수 있음
          output = input; 
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
          const incomingEdges = get().edges.filter(edge => edge.target === nodeId);
          const allInputsFromEdges: Record<string, any> = {};
          
          // 모든 source node가 완료되었는지 확인
          const sourceNodeIds = [...new Set(incomingEdges.map(edge => edge.source))];
          const completedSourceNodes = sourceNodeIds.filter(sourceId => {
            const sourceNode = get().nodes.find(n => n.id === sourceId);
            return sourceNode && sourceNode.data.output && !sourceNode.data.isExecuting;
          });
          
          // 모든 source node가 완료되지 않았다면 대기
          if (completedSourceNodes.length < sourceNodeIds.length) {
            console.log(`[MergeNode ${nodeId}] Waiting for all source nodes to complete. Completed: ${completedSourceNodes.length}/${sourceNodeIds.length}`);
            output = { 
              status: 'waiting',
              message: `Waiting for all source nodes to complete (${completedSourceNodes.length}/${sourceNodeIds.length})`,
              completedNodes: completedSourceNodes,
              totalNodes: sourceNodeIds.length
            };
            break;
          }
          
          // 모든 source node가 완료되었으므로 merge 처리
          console.log(`[MergeNode ${nodeId}] All source nodes completed. Processing merge.`);
          
          incomingEdges.forEach(edge => {
            if (edge.data?.output && typeof edge.data.output === 'object') {
              // Store all outputs keyed by their source node ID for easy lookup
              // This helps if multiple edges come from the same source, though less common for merge
              allInputsFromEdges[edge.source!] = { ...(allInputsFromEdges[edge.source!] || {}), ...edge.data.output };
            }
          });

          // Store a simplified list of inputs for display in NodeInspector's "Input Data" tab
          const displayInputs = incomingEdges.map(edge => edge.data?.output).filter(o => o);
          get().updateNodeData(nodeId, { ...node.data, inputData: displayInputs });

          const mergedOutput: Record<string, any> = {};
          const mappings = node.data.config?.mergeMappings;

          if (mappings && Array.isArray(mappings) && mappings.length > 0) {
            mappings.forEach(mapping => {
              if (mapping.outputKey && mapping.sourceNodeId && mapping.sourceNodeKey) {
                const sourceNodeOutput = allInputsFromEdges[mapping.sourceNodeId];
                if (sourceNodeOutput && sourceNodeOutput.hasOwnProperty(mapping.sourceNodeKey)) {
                  mergedOutput[mapping.outputKey] = sourceNodeOutput[mapping.sourceNodeKey];
                } else {
                  console.warn(`MergeNode (${nodeId}): Could not find key '${mapping.sourceNodeKey}' in output of source node '${mapping.sourceNodeId}' for output key '${mapping.outputKey}'.`);
                }
              }
            });
          } else {
            // Fallback or error if no mappings? For now, empty if no valid mappings.
            console.warn(`MergeNode (${nodeId}): No merge mappings defined or mappings are empty. Output will be empty.`);
          }
          
          console.log(`[MergeNode ${nodeId}] Merge completed successfully:`, mergedOutput);
          output = mergedOutput;
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
            const matchData = node.data.config?.inputData?.[param.name] || '';
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
    } catch (error) {
      console.error('Error executing node:', error);
      get().setNodeOutput(nodeId, { error: 'Execution failed' });
      get().setNodeExecuting(nodeId, false, false, nodeName, isWorkflowRunning); // 실패로 표시
    }
  },

  runWorkflow: async (chatId?: string) => { 
    const { nodes, edges, getNodeById, executeNode, setWorkflowRunning } = get();
    setWorkflowRunning(true);
    
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

    const executionQueue: string[] = [startNode.id];
    let head = 0; // 큐 처리를 위한 포인터

    while(head < executionQueue.length) {
      const currentNodeId = executionQueue[head++];
      console.log(`\nProcessing queue item: ${currentNodeId}`);

      const nodeToExecute = getNodeById(currentNodeId);
      if (!nodeToExecute) {
        console.warn(`⚠️ 실행 중 ID ${currentNodeId}를 가진 노드를 찾을 수 없습니다. 이 노드는 건너뜁니다.`);
        continue;
      }
      
      console.log(`⚙️ 노드 실행 중: ${nodeToExecute.data.label} (ID: ${currentNodeId}, 타입: ${nodeToExecute.type})`);
      await executeNode(currentNodeId, chatId); // executeNode 호출 시 chatId 전달

      const executedNode = getNodeById(currentNodeId); // 실행 후 최신 노드 정보 가져오기
      
      // 에러 확인
      if (executedNode?.data.output?.error) {
        console.error(`❌ Workflow execution stopped: Error occurred in node ${executedNode.data.label}:`, executedNode.data.output.error);
        setWorkflowRunning(false);
        
        // Workflow failure toast (including failed node information)
        window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', { 
          detail: { 
            nodeId: 'workflow', 
            success: false, 
            nodeName: 'Workflow',
            failedNodeName: executedNode.data.label // Failed node name
          } 
        }));
        
        return; // Workflow stopped
      }
      
      console.log(`✅ Node ${currentNodeId} (${executedNode?.data.label}) execution completed. Output:`, executedNode?.data.output);

      const latestEdges = get().edges; 
      const outgoingEdges = latestEdges.filter(edge => edge.source === currentNodeId);
      console.log(`  🔎 Checking ${outgoingEdges.length} outgoing edges from node ${currentNodeId}...`);

      for (const edge of outgoingEdges) {
        if (edge.data?.output !== null && edge.data?.output !== undefined) {
          // 순환 참조 허용: 이미 큐에 있는 노드도 다시 추가 가능
          executionQueue.push(edge.target);
          console.log(`    ➕ 다음 실행을 위해 엣지 ${edge.id}의 타겟 노드 ${edge.target}을 큐에 추가합니다.`);
        } else {
          console.log(`    ➖ 엣지 ${edge.id} (타겟: ${edge.target})로 데이터가 전달되지 않았습니다. (조건: ${edge.data?.label || 'N/A'}, 출력: ${edge.data?.output})`);
        }
      }
      
      // Merge node가 대기 상태인지 확인하고 재실행
      const currentExecutedNode = getNodeById(currentNodeId);
      if (currentExecutedNode?.type === 'mergeNode' && currentExecutedNode.data.output?.status === 'waiting') {
        console.log(`🔄 Merge node ${currentNodeId} is waiting. Re-adding to queue for retry.`);
        executionQueue.push(currentNodeId);
      }
    }
    console.log("\n=========================================");
    console.log("🏁 Workflow execution completed.");
    console.log("=========================================");
    setWorkflowRunning(false);
    
    // Workflow success toast
    window.dispatchEvent(new CustomEvent('nodeExecutionCompleted', { 
      detail: { 
        nodeId: 'workflow', 
        success: true, 
        nodeName: 'Workflow' 
      } 
    }));
  },

  saveWorkflow: async () => {
    set({ isSaving: true, saveError: null });
    const { projectName, nodes, edges, viewport } = get();

    if (!projectName || projectName.trim() === "") {
      const errorMsg = "Project name cannot be empty.";
      set({ isSaving: false, saveError: errorMsg });
      console.error("FlowStore: Project name is empty. Cannot save.");
      throw new Error(errorMsg);
    }
    
    console.log(`FlowStore: Saving workflow "${projectName}" to IndexedDB...`);

    const nodesToSave = nodes.map(node => {
      const { icon, ...restOfData } = node.data;
      return {
        ...node,
        data: restOfData,
      };
    });

    try {
      const db = await openDB();
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);

      const workflowData = {
        projectName,
        nodes: nodesToSave,
        edges,
        viewport,
        lastModified: new Date().toISOString(),
      };

      const request = store.put(workflowData);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          set({ isSaving: false, lastSaved: new Date(), saveError: null });
          console.log(`FlowStore: Workflow "${projectName}" saved successfully to IndexedDB.`);
          get().fetchAvailableWorkflows(); // 저장 후 목록 새로고침
          resolve();
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ isSaving: false, saveError: error?.message || 'Failed to save workflow' });
          console.error('FlowStore: Error saving workflow to IndexedDB:', error);
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ isSaving: false, saveError: errorMessage });
      console.error('FlowStore: Failed to initiate save operation or open DB:', error);
      throw error;
    }
  },

  loadWorkflow: async (projectName: string) => {
    set({ isLoading: true, loadError: null });
    console.log(`FlowStore: Loading workflow "${projectName}" from IndexedDB...`);

    try {
      const db = await openDB();
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);
      const request = store.get(projectName);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const workflowData = request.result;
          if (workflowData) {
            set({
              projectName: workflowData.projectName,
              nodes: workflowData.nodes || [],
              edges: workflowData.edges || [],
              viewport: workflowData.viewport || { x: 0, y: 0, zoom: 1 },
              isLoading: false, loadError: null,
              lastSaved: workflowData.lastModified ? new Date(workflowData.lastModified) : null,
            });
            console.log(`FlowStore: Workflow "${projectName}" loaded successfully.`);
            resolve();
          } else {
            const errorMsg = `Workflow "${projectName}" not found.`;
            set({ isLoading: false, loadError: errorMsg });
            console.warn(`FlowStore: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ isLoading: false, loadError: error?.message || 'Failed to load workflow' });
          console.error('FlowStore: Error loading workflow from IndexedDB:', error);
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ isLoading: false, loadError: errorMessage });
      console.error('FlowStore: Failed to initiate load operation or open DB:', error);
      throw error;
    }
  },

  fetchAvailableWorkflows: async () => {
    set({ isLoading: true, loadError: null }); // 로딩 시작 상태 설정
    console.log('[FlowStore/fetch] ➡️ 워크플로우 목록 로딩을 시작합니다...');
    try {
      const db = await openDB();
      // 'readwrite' 트랜잭션을 사용하여 오래된 데이터에 projectId를 추가하는 마이그레이션을 수행합니다.
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawWorkflows = request.result as Workflow[];
        console.log(`[FlowStore/fetch] ✅ IndexedDB에서 데이터를 성공적으로 가져왔습니다. (총 ${rawWorkflows.length}개)`);
        // 보기 쉬운 테이블 형태로 주요 정보를 출력합니다.
        console.table(rawWorkflows.map(wf => ({ projectName: wf.projectName, projectId: wf.projectId || 'N/A', lastModified: wf.lastModified })));
        // 전체 값(value)을 확인하기 위해 객체 전체를 로그로 남깁니다.
        console.log('[FlowStore/fetch] 🕵️  가져온 전체 워크플로우 값(value) 목록:', JSON.parse(JSON.stringify(rawWorkflows)));

        console.log('[FlowStore/fetch] 🔄 데이터 마이그레이션을 확인하고 필요한 경우 projectId를 할당합니다...');
        // projectId가 없는 워크플로우가 있는지 확인하고, 있다면 새로 할당하고 DB를 업데이트합니다.
        const migratedWorkflows = rawWorkflows.map(wf => {
          if (!wf.projectId) {
            console.warn(`[FlowStore/fetch] ⚠️ 워크플로우 "${wf.projectName}"에 projectId가 없습니다. 새로 할당하고 DB를 업데이트합니다.`);
            const newWf = { ...wf, projectId: nanoid() };
            store.put(newWf); // IndexedDB에 업데이트된 레코드 저장
            return newWf;
          }
          return wf;
        });

        set({ availableWorkflows: migratedWorkflows, isLoading: false, loadError: null });
        console.log(`[FlowStore/fetch] ✅ 상태 업데이트 완료. 최종 워크플로우 목록:`, migratedWorkflows);
      };
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        set({ loadError: error?.message || 'Failed to fetch workflow list', isLoading: false });
        console.error('[FlowStore/fetch] ❌ 워크플로우 목록을 가져오는 중 오류 발생:', error);
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage || 'Failed to open DB to fetch list', isLoading: false });
      console.error('[FlowStore/fetch] ❌ DB를 열거나 트랜잭션을 시작하는 중 오류 발생:', error);
    }
  },

  fetchAIConnections: async () => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log('FlowStore: Fetching AI connections...');
    try {
      const db = await openDB();
      const transaction = db.transaction(AI_CONNECTIONS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(AI_CONNECTIONS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // 마이그레이션: type 필드 소문자화 및 기본값 보정
        const normalized = (request.result as AIConnection[]).map(conn => {
          let type = (conn.type || '').toLowerCase();
          if (type !== 'language' && type !== 'embedding') {
            type = 'embedding'; // 잘못된 값이면 기본값
          }
          return { ...conn, type: type as 'language' | 'embedding' };
        });
        set({ aiConnections: normalized, isLoadingAIConnections: false, loadErrorAIConnections: null });
        console.log(`FlowStore: Found ${normalized.length} AI connections:`, normalized);
      };
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        set({ loadErrorAIConnections: error?.message || 'Failed to fetch AI connections list', isLoadingAIConnections: false });
        console.error('FlowStore: Error fetching AI connections list:', error);
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage || 'Failed to open DB to fetch AI connections list', isLoadingAIConnections: false });
      console.error('FlowStore: Error opening DB for fetching AI connections list:', error);
    }
  },
    getWorkflowAsJSONString: (deploymentData?: Workflow) => {

    // deployment 데이터가 전달되면 해당 데이터를 사용, 그렇지 않으면 현재 상태 사용
    const { projectName, nodes, edges, viewport, aiConnections } = deploymentData ? {
      projectName: deploymentData.projectName,
      nodes: deploymentData.nodes,
      edges: deploymentData.edges,
      viewport: deploymentData.viewport,
      aiConnections: get().aiConnections // AI 연결 정보는 여전히 flowStore에서 가져옴
    } : get();

    // saveWorkflow와 유사하게 직렬화할 노드 데이터를 준비합니다.
    // 'icon' 필드는 React 컴포넌트일 수 있어 JSON 직렬화 시 제외합니다.
    const nodesToSave = nodes.map((currentNode: Node<NodeData>) => {
      const { icon, ...restOfNodeData } = currentNode.data; // 노드의 data 필드 (icon 제외)
      const finalNodeData = { ...restOfNodeData }; // 최종적으로 노드에 저장될 data 객체

      // 만약 현재 노드가 conditionNode 타입이라면, config에 조건 정보를 추가합니다.
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
            condition: edge.data?.label, // 예: "if data['value'] > 0", "else"
            description: edge.data?.conditionDescription, // 예: "Rule #1"
            orderIndex: edge.data?.conditionOrderIndex,
          };
        });

        // 기존 config를 유지하면서 conditions 배열을 추가합니다.
        finalNodeData.config = {
          ...(finalNodeData.config || {}), // 기존 config 내용 보존
          conditions: conditionsSummary,   // 조건 요약 정보 추가
        };
      }

      // Agent 노드일 경우, 연결된 모델의 상세 정보를 찾아 `config.model`에 채워 넣습니다.
      if (currentNode.type === 'agentNode' && finalNodeData.config?.model && typeof finalNodeData.config.model === 'object') {
        // AgentSettings에서 이미 AIConnection 객체 전체를 저장했다고 가정합니다.
        const modelDetails = finalNodeData.config.model as AIConnection;

        if (modelDetails) {
          // 저장된 객체를 서버가 요구하는 최종 포맷으로 변환합니다.
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
          
          // Memory Group 정보를 실제 구성 정보로 변환
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

          // Tools 정보를 실제 구성 정보로 변환
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

          // 모델 설정값들을 포함하여 변환된 객체로 기존 config를 대체합니다.
          // 중복되거나 불필요한 필드들을 제거하고 깔끔한 구조로 만듭니다.
          finalNodeData.config = {
            model: modelConfigForExport,
            memoryGroup: memoryConfigForExport, // ID 대신 실제 구성 정보
            tools: toolsConfigForExport, // ID 배열 대신 실제 구성 정보 배열
            // 프롬프트 관련 설정
            userPromptInputKey: finalNodeData.config.userPromptInputKey || 'user_input',
            systemPromptInputKey: finalNodeData.config.systemPromptInputKey || 'system_message',
            agentOutputVariable: finalNodeData.config.agentOutputVariable || 'agent_response',
            // 모델 설정값들
            topK: finalNodeData.config.topK ?? 40,
            topP: finalNodeData.config.topP ?? 1,
            temperature: finalNodeData.config.temperature ?? 0.7,
            maxTokens: finalNodeData.config.maxTokens ?? 1000,
          };

          // Agent 노드의 최종 JSON 데이터를 콘솔에 출력
          console.log(`[Export] Agent Node "${currentNode.data.label}" (ID: ${currentNode.id}) JSON 데이터:`, JSON.stringify({
            id: currentNode.id,
            type: currentNode.type,
            label: currentNode.data.label,
            config: finalNodeData.config
          }, null, 2));
        }
      }

      // UserNode의 경우 parameters에 matchData 추가 및 inputData 변환
      if (currentNode.type === 'userNode' && finalNodeData.config?.parameters) {
        // parameters에 matchData 추가
        finalNodeData.config.parameters = finalNodeData.config.parameters.map((param: any) => {
          const matchData = finalNodeData.config?.inputData?.[param.name] || '';
          return {
            ...param,
            matchData: matchData
          };
        });

        // inputData를 funcArgs 기반으로 변환
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

        // outputVariable이 설정되지 않은 경우 기본값 설정
        if (!finalNodeData.config.outputVariable) {
          finalNodeData.config.outputVariable = 'result';
        }
      }

      return {
        ...currentNode, // 노드의 나머지 속성들 (id, type, position 등)
        data: finalNodeData, // 처리된 data 객체 할당
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
      const db = await openDB();
      const transaction = db.transaction(AI_CONNECTIONS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(AI_CONNECTIONS_STORE_NAME);
      const request = store.add(newConnection);

      return new Promise<AIConnection>((resolve, reject) => {
        request.onsuccess = () => {
          console.log('FlowStore: AI connection added successfully.');
          get().fetchAIConnections(); // 목록 새로고침
          resolve(newConnection);
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ loadErrorAIConnections: error?.message || 'Failed to add AI connection', isLoadingAIConnections: false });
          console.error('FlowStore: Error adding AI connection:', error);
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('FlowStore: Failed to initiate add AI connection operation:', error);
      throw error;
    }
  },

  

  updateAIConnection: async (connectionId: string, updates: Partial<Omit<AIConnection, 'id' | 'lastModified'>>) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log(`FlowStore: Updating AI connection ID ${connectionId} with:`, updates);

    try {
      const db = await openDB();
      const transaction = db.transaction(AI_CONNECTIONS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(AI_CONNECTIONS_STORE_NAME);
      const getRequest = store.get(connectionId);

      return new Promise<AIConnection>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const existingConnection = getRequest.result as AIConnection | undefined;
          if (!existingConnection) {
            const errorMsg = `AI connection with ID ${connectionId} not found.`;
            set({ loadErrorAIConnections: errorMsg, isLoadingAIConnections: false });
            console.error(`FlowStore: ${errorMsg}`);
            return reject(new Error(errorMsg));
          }

          const updatedConnection: AIConnection = {
            ...existingConnection,
            ...updates,
            lastModified: new Date().toISOString(),
          };

          const putRequest = store.put(updatedConnection);
          putRequest.onsuccess = () => {
            console.log('FlowStore: AI connection updated successfully.');
            get().fetchAIConnections(); // 목록 새로고침
            resolve(updatedConnection);
          };
          putRequest.onerror = (event) => reject((event.target as IDBRequest).error);
        };
        getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('FlowStore: Failed to initiate update AI connection operation:', error);
      throw error;
    }
  },

  deleteAIConnection: async (connectionId: string) => {
    set({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log(`FlowStore: Deleting AI connection ID ${connectionId}...`);
    try {
      const db = await openDB();
      const transaction = db.transaction(AI_CONNECTIONS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(AI_CONNECTIONS_STORE_NAME);
      const request = store.delete(connectionId);
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          console.log('FlowStore: AI connection deleted successfully.');
          get().fetchAIConnections();
          resolve();
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ loadErrorAIConnections: error?.message || 'Failed to delete AI connection', isLoadingAIConnections: false });
          console.error('FlowStore: Error deleting AI connection:', error);
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('FlowStore: Failed to initiate delete AI connection operation:', error);
      throw error;
    }
  },

  deleteWorkflow: async (projectName: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);
      const request = store.delete(projectName);
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          // 삭제 후 워크플로우 목록 새로고침
          get().fetchAvailableWorkflows();
          resolve();
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ loadError: error?.message || 'Failed to delete workflow' });
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage });
      throw error;
    }
  },

  renameWorkflow: async (oldName: string, newName: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);
      
      const getRequest = store.get(oldName);
      return new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const data = getRequest.result;
          
          if (!data) {
            // 이미 변경된 경우 성공으로 처리 (race condition 방지)
            if (oldName !== newName) {
              get().fetchAvailableWorkflows();
              resolve();
              return;
            }
            set({ loadError: `Workflow '${oldName}' not found.` });
            return reject(new Error(`Workflow '${oldName}' not found.`));
          }
          
          // 이름 변경
          data.projectName = newName;
          
          const addRequest = store.add(data);
          addRequest.onsuccess = () => {
            // 기존 워크플로우 삭제
            const deleteRequest = store.delete(oldName);
            deleteRequest.onsuccess = () => {
              get().fetchAvailableWorkflows();
              resolve();
            };
            deleteRequest.onerror = (event) => {
              const error = (event.target as IDBRequest).error;
              set({ loadError: error?.message || 'Failed to delete old workflow after rename' });
              reject(error);
            };
          };
          addRequest.onerror = (event) => {
            const error = (event.target as IDBRequest).error;
            set({ loadError: error?.message || 'Failed to add renamed workflow' });
            reject(error);
          };
        };
        getRequest.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ loadError: error?.message || 'Failed to get workflow for rename' });
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage });
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

  // UserNode 관련 함수들
  fetchUserNodes: async () => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log('FlowStore: Fetching user nodes...');
    try {
      const db = await openDB();
      const transaction = db.transaction(USER_NODES_STORE_NAME, 'readonly');
      const store = transaction.objectStore(USER_NODES_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const userNodes = request.result as UserNode[];
        set({ userNodes, isLoadingUserNodes: false, loadErrorUserNodes: null });
        console.log(`FlowStore: Found ${userNodes.length} user nodes:`, userNodes);
      };
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        set({ loadErrorUserNodes: error?.message || 'Failed to fetch user nodes list', isLoadingUserNodes: false });
        console.error('FlowStore: Error fetching user nodes list:', error);
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage || 'Failed to open DB to fetch user nodes list', isLoadingUserNodes: false });
      console.error('FlowStore: Error opening DB for fetching user nodes list:', error);
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
      const db = await openDB();
      const transaction = db.transaction(USER_NODES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(USER_NODES_STORE_NAME);
      const request = store.add(newUserNode);

      return new Promise<UserNode>((resolve, reject) => {
        request.onsuccess = () => {
          console.log('FlowStore: User node added successfully.');
          get().fetchUserNodes(); // 목록 새로고침
          resolve(newUserNode);
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ loadErrorUserNodes: error?.message || 'Failed to add user node', isLoadingUserNodes: false });
          console.error('FlowStore: Error adding user node:', error);
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('FlowStore: Failed to initiate add user node operation:', error);
      throw error;
    }
  },

  updateUserNode: async (userNodeId: string, updates: Partial<Omit<UserNode, 'id' | 'lastModified'>>) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log(`FlowStore: Updating user node ID ${userNodeId} with:`, updates);

    try {
      const db = await openDB();
      const transaction = db.transaction(USER_NODES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(USER_NODES_STORE_NAME);
      const getRequest = store.get(userNodeId);

      return new Promise<UserNode>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const existingUserNode = getRequest.result as UserNode | undefined;
          if (!existingUserNode) {
            const errorMsg = `User node with ID ${userNodeId} not found.`;
            set({ loadErrorUserNodes: errorMsg, isLoadingUserNodes: false });
            console.error(`FlowStore: ${errorMsg}`);
            return reject(new Error(errorMsg));
          }

          const updatedUserNode: UserNode = {
            ...existingUserNode,
            ...updates,
            lastModified: new Date().toISOString(),
          };

          const putRequest = store.put(updatedUserNode);
          putRequest.onsuccess = () => {
            console.log('FlowStore: User node updated successfully.');
            get().fetchUserNodes(); // 목록 새로고침
            resolve(updatedUserNode);
          };
          putRequest.onerror = (event) => reject((event.target as IDBRequest).error);
        };
        getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('FlowStore: Failed to initiate update user node operation:', error);
      throw error;
    }
  },

  deleteUserNode: async (userNodeId: string) => {
    set({ isLoadingUserNodes: true, loadErrorUserNodes: null });
    console.log(`FlowStore: Deleting user node ID ${userNodeId}...`);
    try {
      const db = await openDB();
      const transaction = db.transaction(USER_NODES_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(USER_NODES_STORE_NAME);
      const request = store.delete(userNodeId);
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          console.log('FlowStore: User node deleted successfully.');
          get().fetchUserNodes();
          resolve();
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          set({ loadErrorUserNodes: error?.message || 'Failed to delete user node', isLoadingUserNodes: false });
          console.error('FlowStore: Error deleting user node:', error);
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadErrorUserNodes: errorMessage, isLoadingUserNodes: false });
      console.error('FlowStore: Failed to initiate delete user node operation:', error);
      throw error;
    }
  },
}));