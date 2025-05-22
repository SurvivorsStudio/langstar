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
      defaultValue: string;
      selectVariable: string;
    }>;
    repetitions?: number;
    template?: string;
    model?: string;
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
  temperature?: number; // Language model 전용
  maxTokens?: number;   // Language model 전용
  status: 'active' | 'draft' | 'archived';
  lastModified: string; // ISO string
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
  updateNodeData: (nodeId: string, data: NodeData) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  getNodeById: (nodeId: string) => Node<NodeData> | undefined;
  setNodeOutput: (nodeId: string, output: any) => void;
  setEdgeOutput: (edgeId: string, output: any) => void;
  executeNode: (nodeId: string) => Promise<void>;
  setNodeExecuting: (nodeId: string, isExecuting: boolean) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  runWorkflow: () => Promise<void>;
  isWorkflowRunning: boolean;
  setWorkflowRunning: (isRunning: boolean) => void;
  viewport: Viewport; // viewport 상태 추가
  setViewport: (viewport: Viewport) => void; // viewport 업데이트 함수 추가

  // IndexedDB 저장 및 불러오기 관련 상태 및 함수
  isSaving: boolean;
  saveError: string | null;
  lastSaved: Date | null;
  isLoading: boolean;
  loadError: string | null;
  availableWorkflows: string[];
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (projectName: string) => Promise<void>;
  fetchAvailableWorkflows: () => Promise<void>;
  deleteWorkflow: (projectName: string) => Promise<void>; // 워크플로 삭제 함수 추가
  renameWorkflow: (oldName: string, newName: string) => Promise<void>; // 워크플로 이름 변경 함수 추가

  // AI Connections 관련 상태 및 함수
  aiConnections: AIConnection[];
  isLoadingAIConnections: boolean;
  loadErrorAIConnections: string | null;
  fetchAIConnections: () => Promise<void>;
  addAIConnection: (connection: Omit<AIConnection, 'id' | 'lastModified'>) => Promise<AIConnection>;
  updateAIConnection: (connectionId: string, updates: Partial<Omit<AIConnection, 'id' | 'lastModified'>>) => Promise<AIConnection>;
  deleteAIConnection: (connectionId: string) => Promise<void>;
}

const initialNodes: Node<NodeData>[] = [
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
  }
];

const initialEdges: Edge[] = [];

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
  let newName = baseLabel;
  let counter = 1;

  while (existingNames.includes(newName)) {
    newName = `${baseLabel} ${counter}`;
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
    let processedDefaultValue = variable.defaultValue;

    switch (variable.type) {
      case 'int':
        processedDefaultValue = parseInt(variable.defaultValue, 10) || 0;
        break;
      case 'float':
        processedDefaultValue = parseFloat(variable.defaultValue) || 0.0;
        break;
      case 'list':
        try {
          processedDefaultValue = JSON.parse(variable.defaultValue || '[]');
        } catch {
          processedDefaultValue = [];
        }
        break;
      case 'dict':
        try {
          processedDefaultValue = JSON.parse(variable.defaultValue || '{}');
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

const evaluateCondition = (condition: string, input: Record<string, any>, className: string): boolean => {
  try {
    const context = { [className]: input };
    const evalFunction = new Function(className, `return ${condition};`);
    return evalFunction.call(null, input);
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
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
const DB_VERSION = 2; // 데이터베이스 스키마 변경 시 이 버전을 올려야 합니다. (새로운 저장소 추가)
const DEFAULT_PROJECT_NAME = 'New Workflow'; // 기본 프로젝트 이름 상수화

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


  setViewport: (viewport: Viewport) => {
    set({ viewport });
  },
  
  onConnect: (connection: Connection) => {
    const sourceNode = get().nodes.find(node => node.id === connection.source);
    const isConditionNode = sourceNode?.type === 'conditionNode';
    const startNode = get().nodes.find(node => node.type === 'startNode');
    const className = startNode?.data.config?.className || 'data';
    
    set({
      edges: addEdge({ 
        ...connection, 
        animated: true,
        data: { 
          output: null,
          label: isConditionNode ? `${className}['value'] > 0` : undefined
        }
      }, get().edges),
    });
  },
  
  setProjectName: (name: string) => set({ projectName: name }),
  
  addNode: ({ type, position, data }) => {
    const id = nanoid();
    const uniqueLabel = getUniqueNodeName(get().nodes, data.label);
    const defaultConfig = type === 'startNode' ? {
      className: '',
      classType: 'TypedDict',
      variables: []
    } : type === 'loopNode' ? {
      repetitions: 1
    } : type === 'promptNode' ? { // promptNode에 outputVariable 기본값 추가
      template: '# Enter your prompt template here\n\nSystem: You are a helpful AI assistant.\n\nUser: {user_input}\n\nAssistant:',
      outputVariable: 'user_input' // agentNode의 기본 userPromptInputKey와 맞춤
    } : type === 'agentNode' ? { // agentNode에 대한 기본 설정 추가
      model: '', // 사용자가 UI에서 모델을 선택해야 함
      userPromptInputKey: 'user_input', // 입력에서 사용자 프롬프트를 찾을 기본 키
      systemPromptInputKey: 'system_message', // 시스템 프롬프트를 찾을 기본 키
      memoryGroup: '',
      tools: [], // 이 부분은 addNode 시점에서는 빈 배열로 초기화됩니다.
                 // 사용자가 UI를 통해 GroupsNode에서 정의된 Tool들을 선택하면,
                 // 해당 Tool들의 ID 배열이 여기에 저장됩니다.
      agentOutputVariable: 'agent_response' // Agent Node의 API 응답이 저장될 기본 키
    } : type === 'mergeNode' ? { // mergeNode에 대한 기본 설정 추가
      mergeMappings: []
    } : type === 'endNode' ? { // endNode에 대한 기본 설정 추가
      receiveKey: '' // 기본으로 선택된 키 없음
    } : {}; // 다른 노드 타입은 빈 객체로 시작

    const newNode: Node<NodeData> = {
      id,
      type,
      position,
      data: {
        ...data,
        label: uniqueLabel,
        output: null,
        inputData: null, // inputData 초기화
        isExecuting: false,
        config: defaultConfig
      },
    };
    
    set({
      nodes: [...get().nodes, newNode],
    });
    
    return id;
  },
  
  updateNodeData: (nodeId: string, data: NodeData) => {
    const currentNode = get().nodes.find(node => node.id === nodeId);
    if (!currentNode) return;

    if (safeCompare(currentNode.data, data)) return;

    set(state => {
      const updatedNodes = state.nodes.map(node => {
        if (node.id === nodeId) {
          // AgentNode 업데이트 시 전달받은 data.config.tools 값을 로깅합니다.
          if (node.type === 'agentNode') {
            console.log(`[FlowStore.updateNodeData] AgentNode (ID: ${nodeId}) 업데이트 중. 전달된 data.config.tools:`, JSON.parse(JSON.stringify(data.config?.tools !== undefined ? data.config.tools : 'undefined (tools 키 없음)')));
          }
          return { ...node, data };
        }
        return node;
      });

      if (!safeCompare(currentNode.data.output, data.output)) {
        const updatedEdges = state.edges.map(edge => {
          if (edge.source === nodeId) {
            return {
              ...edge,
              data: { ...edge.data, output: data.output }
            };
          }
          return edge;
        });
        return { nodes: updatedNodes, edges: updatedEdges };
      }

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
            const condition = edge.data?.label || '';
            const startNode = state.nodes.find(node => node.type === 'startNode');
            const className = startNode?.data.config?.className || 'data';
            const isTrue = evaluateCondition(condition, output, className);
            return {
              ...edge,
              data: { ...edge.data, output: isTrue ? output : null }
            };
          }
          return {
            ...edge,
            data: { ...edge.data, output }
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
            data: { ...edge.data, output }
          };
        }
        return edge;
      });

      return { edges: updatedEdges };
    });
  },

  setNodeExecuting: (nodeId: string, isExecuting: boolean) => {
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
  },

  updateEdgeLabel: (edgeId: string, label: string) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: { ...edge.data, label }
          };
        }
        return edge;
      })
    });
  },

  executeNode: async (nodeId: string) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;

    get().updateNodeData(nodeId, { ...node.data, inputData: null }); // 실행 전 inputData 초기화 (선택적)
    get().setNodeExecuting(nodeId, true);

    const incomingEdge = get().edges.find(edge => edge.target === nodeId);
    const input = incomingEdge?.data?.output || {};

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
        case 'functionNode':
          output = { result: 'Function executed', input };
          break;
        case 'agentNode': { // Node ID를 로그에 포함시키기 위해 nodeId 변수 사용
          console.log(`[AgentNode ${nodeId}] 실행 시작. 입력 데이터:`, JSON.parse(JSON.stringify(input || {})));
          const agentConfig = node.data.config || {};
          const {
            model, // 필수: API 요청에 사용될 모델 이름
            systemPromptInputKey, // 설정에서 system_prompt를 가져올 input의 키 이름
            userPromptInputKey,   // 설정에서 user_prompt를 가져올 input의 키 이름
            memoryGroup,          // config에서 직접 가져올 memory_group 값
            tools,                // config에서 직접 가져올 tools 값 (예: 파이썬 코드 문자열 배열)
            agentOutputVariable   // Agent Node의 API 응답이 저장될 키 이름 (사용자가 설정)
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
            const groupsNode = get().nodes.find(n => n.type === 'groupsNode');
            if (groupsNode && groupsNode.data.config?.groups) {
              const allGroups = groupsNode.data.config.groups as Array<{ id: string; name: string; type: string; description?: string; code?: string; [key: string]: any }>;
              
              selectedToolIds.forEach(toolId => {
                const toolGroup = allGroups.find(g => g.id === toolId);
                if (toolGroup) {
                  console.log(`[AgentNode ${nodeId}]   Tool ID: ${toolId}`);
                  console.log(`[AgentNode ${nodeId}]     - 이름 (Name): ${toolGroup.name || 'N/A'}`);
                  console.log(`[AgentNode ${nodeId}]     - 설명 (Description): ${toolGroup.description || 'N/A'}`);
                  console.log(`[AgentNode ${nodeId}]     - Python 코드 (Code): \n${toolGroup.code || 'N/A'}`);
                } else {
                  console.warn(`[AgentNode ${nodeId}]   ⚠️ 경고: 선택된 Tool ID '${toolId}'에 해당하는 그룹을 GroupsNode에서 찾을 수 없습니다.`);
                }
              });
            } else {
              console.warn(`[AgentNode ${nodeId}]   ⚠️ 경고: GroupsNode를 찾을 수 없거나 그룹 데이터가 없어 Tool 상세 정보를 로드할 수 없습니다.`);
            }
            console.log(`[AgentNode ${nodeId}] --- 🛠️ Tool 상세 정보 종료 ---`);
          } else {
            console.log(`[AgentNode ${nodeId}] 선택된 Tool이 없습니다.`);
          }

          // 필수 설정값 확인 (예시: model)
          if (!model) {
            console.error(`[AgentNode ${nodeId}] 오류: Agent model이 설정에 필요합니다.`);
            output = { error: 'Agent model is required in configuration.' };
            break;
          }

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

          // 입력으로부터 실제 프롬프트 값을 가져옵니다.
          // input 객체에 해당 키가 있고, 그 값이 문자열인 경우 해당 값을 사용합니다.
          // 그렇지 않으면 빈 문자열을 API 전송용 값으로 사용합니다.
          const systemPromptRawValue = actualSystemPromptKey && input && input.hasOwnProperty(actualSystemPromptKey) ? input[actualSystemPromptKey] : undefined;
          const userPromptRawValue = actualUserPromptKey && input && input.hasOwnProperty(actualUserPromptKey) ? input[actualUserPromptKey] : undefined;

          const systemPromptForAPI = typeof systemPromptRawValue === 'string' ? systemPromptRawValue : "";
          const userPromptForAPI = typeof userPromptRawValue === 'string' ? userPromptRawValue : "";

          console.log(`[AgentNode ${nodeId}] 입력에서 가져온 Raw System Prompt (input['${actualSystemPromptKey}']):`, systemPromptRawValue);
          console.log(`[AgentNode ${nodeId}] API로 전송될 System Prompt:`, systemPromptForAPI);
          console.log(`[AgentNode ${nodeId}] 입력에서 가져온 Raw User Prompt (input['${actualUserPromptKey}']):`, userPromptRawValue);
          console.log(`[AgentNode ${nodeId}] API로 전송될 User Prompt:`, userPromptForAPI);

          let memoryTypeForAPI: string | undefined = undefined;
          if (memoryGroup) { // memoryGroup is the ID of the selected group
            const groupsNode = get().nodes.find(n => n.type === 'groupsNode');
            if (groupsNode && groupsNode.data.config?.groups) {
              const allGroups = groupsNode.data.config.groups as Array<{ id: string; name: string; type: string; memoryType?: string; [key: string]: any }>;
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
                console.log(`[AgentNode ${nodeId}] 선택된 Memory Group: ${selectedGroupDetails.name}, Memory Type: ${memoryTypeForAPI}`);
              } else {
                console.log(`[AgentNode ${nodeId}] Selected group ID ${memoryGroup} is not a memory type or not found.`);
              }
            }
          }

          // API 페이로드용 tools_for_api 구성
          let tools_for_api: Array<{ tool_name: string; tool_description: string; tool_code: string }> = []; // 'python_code' -> 'tool_code'로 변경
          if (selectedToolIds.length > 0) {
            const groupsNode = get().nodes.find(n => n.type === 'groupsNode');
            if (groupsNode && groupsNode.data.config?.groups) {
              const allGroups = groupsNode.data.config.groups as Array<{ id: string; name: string; type: string; description?: string; code?: string; [key: string]: any }>;
              selectedToolIds.forEach(toolId => {
                const toolGroup = allGroups.find(g => g.id === toolId);
                if (toolGroup && toolGroup.type === 'tools') { // groupsNode에서 가져온 그룹이 'tools' 타입인지 확인
                  tools_for_api.push({
                    tool_name: toolGroup.name || 'Unnamed Tool',
                    tool_description: toolGroup.description || 'No description',
                    tool_code: toolGroup.code || '' // 'python_code' -> 'tool_code'로 변경
                  });
                } else {
                  console.warn(`[AgentNode ${nodeId}] API Payload: Tool ID '${toolId}'에 해당하는 Tool 정보를 GroupsNode에서 찾을 수 없거나 타입이 'tools'가 아닙니다. API 요청에서 제외됩니다.`);
                }
              });
            } else {
              console.warn(`[AgentNode ${nodeId}] API Payload: GroupsNode를 찾을 수 없거나 그룹 데이터가 없어 Tool 정보를 API 페이로드에 포함할 수 없습니다.`);
            }
          }

          const payload = {
            model,
            system_prompt: systemPromptForAPI,
            user_prompt: userPromptForAPI,
            memory_group: memoryGroup ? memoryGroup : undefined, 
            tools: tools_for_api, // 수정된 tools 형식으로 전송
            memory_type: memoryTypeForAPI, // This sends the actual memory type string
            return_key: finalAgentOutputVariable // API에 Output Variable 값을 "return_key"로 전달
          };
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
          const edges = get().edges.filter(edge => edge.source === nodeId);
          output = input;
          
          const startNode = get().nodes.find(node => node.type === 'startNode');
          const className = startNode?.data.config?.className || 'data';
          
          edges.forEach(edge => {
            const condition = edge.data?.label || '';
            const isTrue = evaluateCondition(condition, input, className);
            if (isTrue) {
              get().setEdgeOutput(edge.id, input);
            } else {
              get().setEdgeOutput(edge.id, null);
            }
          });
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
          output = mergedOutput;
          break;
        }
        default:
          output = input;
      }

      get().setNodeOutput(nodeId, output);
    } catch (error) {
      console.error('Error executing node:', error);
      get().setNodeOutput(nodeId, { error: 'Execution failed' });
    } finally {
      get().setNodeExecuting(nodeId, false);
    }
  },

  runWorkflow: async () => {
    const { nodes, executeNode, getNodeById, setWorkflowRunning } = get();

    setWorkflowRunning(true);
    console.log("=========================================");
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
    const visitedInThisRun = new Set<string>(); // 현재 실행에서 방문한 노드 추적
    let head = 0; // 큐 처리를 위한 포인터

    while(head < executionQueue.length) {
      const currentNodeId = executionQueue[head++];
      console.log(`\nProcessing queue item: ${currentNodeId}`);

      if (visitedInThisRun.has(currentNodeId)) {
        console.log(`⏭️ 노드 ${currentNodeId}는 이번 실행에서 이미 방문했습니다. 건너<0xEB><0x81><0xB5>니다.`);
        continue; 
      }

      const nodeToExecute = getNodeById(currentNodeId);
      if (!nodeToExecute) {
        console.warn(`⚠️ 실행 중 ID ${currentNodeId}를 가진 노드를 찾을 수 없습니다. 이 노드는 건너<0xEB><0x81><0xB5>니다.`);
        continue;
      }
      
      console.log(`⚙️ 노드 실행 중: ${nodeToExecute.data.label} (ID: ${currentNodeId}, 타입: ${nodeToExecute.type})`);
      await executeNode(currentNodeId); // executeNode는 노드 실행 및 출력 전파를 처리합니다.
      visitedInThisRun.add(currentNodeId);

      const executedNode = getNodeById(currentNodeId); // 실행 후 최신 노드 정보 가져오기
      console.log(`✅ 노드 ${currentNodeId} (${executedNode?.data.label}) 실행 완료. 출력:`, executedNode?.data.output);

      const latestEdges = get().edges; 
      const outgoingEdges = latestEdges.filter(edge => edge.source === currentNodeId);
      console.log(`  🔎 노드 ${currentNodeId}의 나가는 엣지 ${outgoingEdges.length}개 확인 중...`);

      for (const edge of outgoingEdges) {
        if (edge.data?.output !== null && edge.data?.output !== undefined) {
          if (!visitedInThisRun.has(edge.target) && !executionQueue.slice(head).includes(edge.target)) {
            executionQueue.push(edge.target);
            console.log(`    ➕ 다음 실행을 위해 엣지 ${edge.id}의 타겟 노드 ${edge.target}을 큐에 추가합니다.`);
          }
        } else {
          console.log(`    ➖ 엣지 ${edge.id} (타겟: ${edge.target})로 데이터가 전달되지 않았습니다. (조건: ${edge.data?.label || 'N/A'}, 출력: ${edge.data?.output})`);
        }
      }
    }
    console.log("\n=========================================");
    console.log("🏁 워크플로우 실행 완료.");
    console.log("=========================================");
    setWorkflowRunning(false);
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
    set({ isLoading: true, loadError: null });
    console.log('FlowStore: Fetching available workflows...');
    try {
      const db = await openDB();
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        set({ availableWorkflows: request.result as string[], isLoading: false, loadError: null });
        console.log(`FlowStore: Found ${request.result.length} workflows:`, request.result);
      };
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        set({ loadError: error?.message || 'Failed to fetch workflow list', isLoading: false });
        console.error('FlowStore: Error fetching workflow list:', error);
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ loadError: errorMessage || 'Failed to open DB to fetch list', isLoading: false });
      console.error('FlowStore: Error opening DB for fetching list:', error);
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
        set({ aiConnections: request.result as AIConnection[], isLoadingAIConnections: false, loadErrorAIConnections: null });
        console.log(`FlowStore: Found ${request.result.length} AI connections:`, request.result);
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
    // 이 함수는 아래 useFlowStore.setState 외부에서 정의된 deleteWorkflow와 유사하게 구현됩니다.
  },
}));

// 워크플로 삭제 함수를 스토어 외부에 정의하거나, 스토어 액션으로 포함할 수 있습니다.
// 여기서는 스토어 액션으로 추가합니다.
useFlowStore.setState(state => ({
  ...state,
  deleteWorkflow: async (projectName: string) => {
    state.isLoading = true; // 또는 isDeleting 같은 별도 상태 사용
    state.loadError = null;
    console.log(`FlowStore: Deleting workflow "${projectName}" from IndexedDB...`);

    try {
      const db = await openDB();
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);
      const request = store.delete(projectName);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          console.log(`FlowStore: Workflow "${projectName}" deleted successfully.`);
          state.fetchAvailableWorkflows(); // 삭제 후 목록 새로고침
          resolve();
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error('FlowStore: Error deleting workflow:', error);
          // state.loadError = error?.message || 'Failed to delete workflow'; // 에러 상태 업데이트
          reject(error);
        };
      });
    } catch (error) {
      console.error('FlowStore: Failed to initiate delete operation or open DB:', error);
      // state.loadError = (error as Error).message || 'Failed to delete workflow'; // 에러 상태 업데이트
      throw error;
    } finally {
      // state.isLoading = false; // 로딩 상태 해제
    }
  }
}));

useFlowStore.setState(state => ({
  ...state,
  renameWorkflow: async (oldName: string, newName: string) => {
    if (!newName || newName.trim() === "") {
      console.error("FlowStore: New project name cannot be empty.");
      throw new Error("New project name cannot be empty.");
    }
    if (oldName === newName) {
      console.log("FlowStore: Old and new names are the same. No action taken.");
      return; // 이름이 같으면 아무 작업도 하지 않음
    }
    if (state.availableWorkflows.includes(newName)) {
      console.error(`FlowStore: Project name "${newName}" already exists.`);
      throw new Error(`Project name "${newName}" already exists.`);
    }

    // state.isLoading = true; // 또는 isRenaming 같은 별도 상태 사용
    // state.loadError = null;
    console.log(`FlowStore: Renaming workflow from "${oldName}" to "${newName}"...`);

    try {
      const db = await openDB();
      const transaction = db.transaction(WORKFLOWS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE_NAME);

      const getRequest = store.get(oldName);

      return new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const workflowData = getRequest.result;
          if (workflowData) {
            const updatedWorkflowData = { ...workflowData, projectName: newName, lastModified: new Date().toISOString() };
            const putRequest = store.put(updatedWorkflowData);
            putRequest.onsuccess = () => {
              const deleteRequest = store.delete(oldName);
              deleteRequest.onsuccess = () => {
                console.log(`FlowStore: Workflow renamed from "${oldName}" to "${newName}" successfully.`);
                state.fetchAvailableWorkflows(); // 이름 변경 후 목록 새로고침
                resolve();
              };
              deleteRequest.onerror = (event) => reject((event.target as IDBRequest).error || 'Failed to delete old workflow data');
            };
            putRequest.onerror = (event) => reject((event.target as IDBRequest).error || 'Failed to save new workflow data');
          } else {
            reject(new Error(`Workflow "${oldName}" not found.`));
          }
        };
        getRequest.onerror = (event) => reject((event.target as IDBRequest).error || `Failed to get workflow "${oldName}"`);
      });
    } catch (error) {
      console.error('FlowStore: Failed to initiate rename operation or open DB:', error);
      throw error;
    } finally {
      // state.isLoading = false;
    }
  }
}));

// AI Connection 삭제 함수
useFlowStore.setState(state => ({
  ...state,
  deleteAIConnection: async (connectionId: string) => {
    useFlowStore.setState({ isLoadingAIConnections: true, loadErrorAIConnections: null });
    console.log(`FlowStore: Deleting AI connection ID ${connectionId}...`);

    try {
      const db = await openDB();
      const transaction = db.transaction(AI_CONNECTIONS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(AI_CONNECTIONS_STORE_NAME);
      const request = store.delete(connectionId);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          console.log('FlowStore: AI connection deleted successfully.');
          useFlowStore.getState().fetchAIConnections(); // 목록 새로고침
          resolve();
        };
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          useFlowStore.setState({ loadErrorAIConnections: error?.message || 'Failed to delete AI connection', isLoadingAIConnections: false });
          console.error('FlowStore: Error deleting AI connection:', error);
          reject(error);
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useFlowStore.setState({ loadErrorAIConnections: errorMessage, isLoadingAIConnections: false });
      console.error('FlowStore: Failed to initiate delete AI connection operation:', error);
      throw error;
    }
  }
}));

// 애플리케이션 시작 시 또는 스토어가 처음 사용될 때 저장된 워크플로 목록을 가져올 수 있습니다.
// 예: App.tsx 등에서 useEffect를 사용하여 호출
// useEffect(() => {
//   useFlowStore.getState().fetchAvailableWorkflows();
// }, []);