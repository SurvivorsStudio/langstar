/**
 * @module types/node
 * @description 노드 관련 타입 정의
 * 
 * 이 파일은 워크플로우의 노드와 관련된 모든 타입 정의를 포함합니다.
 * - NodeData: 노드의 데이터 구조
 * - NodeConfig: 노드 설정 구조
 * - Variable: 노드 변수 구조
 * - MergeMapping: Merge 노드 매핑 구조
 */

import { AIConnection } from './aiConnection';

/**
 * 노드 변수 인터페이스
 * Start 노드에서 사용되는 변수 정의
 */
export interface Variable {
  name: string;
  type: string;
  defaultValue: any;
  selectVariable: string;
}

/**
 * Merge 노드 매핑 인터페이스
 * 여러 입력을 하나의 출력으로 병합하는 설정
 */
export interface MergeMapping {
  id: string;
  outputKey: string;
  sourceNodeId: string;
  sourceNodeKey: string;
}

/**
 * Tools & Memory 그룹 인터페이스
 * Tools & Memory 노드에서 사용되는 그룹 정의
 */
export interface Group {
  /** 그룹 고유 ID */
  id: string;
  /** 그룹 이름 */
  name: string;
  /** 그룹 타입 (memory 또는 tools) */
  type: 'memory' | 'tools';
  /** 그룹 설명 */
  description?: string;
  /** Tools 그룹의 코드 (customCode일 때) */
  code?: string;
  /** Memory 타입 */
  memoryType?: 'ConversationBufferMemory' | 'ConversationBufferWindowMemory';
  /** Window Size (ConversationBufferWindowMemory일 때) */
  windowSize?: number;
  /** Tools 그룹의 소스 타입 (userNode: 사용자 노드 선택, customCode: 직접 코드 작성) */
  sourceType?: 'userNode' | 'customCode';
  /** 선택된 사용자 노드 ID (sourceType이 userNode일 때) - 단일 선택용 */
  selectedUserNodeId?: string;
  /** 선택된 사용자 노드 ID들 (sourceType이 userNode일 때) - 멀티 선택용 */
  selectedUserNodeIds?: string[];
  /** 노드 목록 (deprecated) */
  nodes?: any[];
}

/**
 * 모델 설정 인터페이스
 * Agent 노드에서 사용되는 모델 정보
 */
export interface ModelConfig {
  connName: string;
  providerName: string;
  modelName: string;
  apiKey: string | undefined;
}

/**
 * 노드 설정 인터페이스
 * 각 노드 타입별로 다른 설정을 가질 수 있음
 */
export interface NodeConfig {
  // Start 노드 설정
  className?: string;
  classType?: 'TypedDict' | 'BaseModel';
  variables?: Variable[];
  
  // Loop 노드 설정
  repetitions?: number;
  
  // Prompt 노드 설정
  template?: string;
  outputVariable?: string;
  inputVariable?: string;
  selectedKeyName?: string;
  
  // Agent 노드 설정
  model?: string | AIConnection | ModelConfig;
  userPromptInputKey?: string;
  systemPromptInputKey?: string;
  memoryGroup?: string;
  tools?: string[];
  agentOutputVariable?: string;
  topK?: number;
  topP?: number;
  temperature?: number;
  maxTokens?: number;
  
  // Embedding 노드 설정
  inputColumn?: string;
  outputColumn?: string;
  
  // End 노드 설정
  receiveKey?: string;
  
  // Merge 노드 설정
  mergeMappings?: MergeMapping[];
  
  // User 노드 설정
  functionName?: string;
  parameters?: Array<{
    name: string;
    inputType: string;
    required: boolean;
    funcArgs?: string;
    matchData?: string;
  }>;
  returnType?: string;
  functionDescription?: string;
  inputData?: any;
  settings?: Record<string, any>;
  
  // 공통 설정
  inputKey?: string;
  selectedInput?: any;
  
  // 확장 가능한 설정
  [key: string]: any;
}

/**
 * 노드 데이터 인터페이스
 * ReactFlow Node의 data 속성 타입
 */
export interface NodeData {
  /** 노드 레이블 (화면에 표시되는 이름) */
  label: string;
  
  /** Python 코드 (Function 노드, User 노드에서 사용) */
  code?: string;
  
  /** 노드 설명 */
  description?: string;
  
  /** 노드 아이콘 (React 컴포넌트) */
  icon?: React.ReactNode;
  
  /** 노드 타입별 설정 */
  config?: NodeConfig;
  
  /** Merge 노드 전용 매핑 설정 (deprecated: config.mergeMappings 사용 권장) */
  mergeMappings?: MergeMapping[];
  
  /** 노드로 들어온 입력 데이터 */
  inputData?: any;
  
  /** 노드 실행 결과 출력 데이터 */
  output?: any;
  
  /** 노드 실행 중 여부 */
  isExecuting?: boolean;
}
