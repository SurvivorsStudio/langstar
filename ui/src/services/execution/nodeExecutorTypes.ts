/**
 * 노드 실행자 타입 정의
 * 
 * 이 파일은 노드 실행자의 공통 인터페이스와 실행 컨텍스트를 정의합니다.
 */

import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/node';

/**
 * 노드 실행 컨텍스트
 * 노드 실행에 필요한 모든 정보를 포함합니다.
 */
export interface ExecutionContext {
  /** 실행할 노드 */
  node: Node<NodeData>;
  /** 입력 데이터 */
  input: Record<string, any>;
  /** 전체 노드 목록 (참조용) */
  nodes: Node<NodeData>[];
  /** 전체 엣지 목록 (참조용) */
  edges: Edge[];
  /** 채팅 ID (선택적, Agent 노드에서 사용) */
  chatId?: string;
  /** 노드 ID */
  nodeId: string;
}

/**
 * 노드 실행 결과
 */
export interface ExecutionResult {
  /** 실행 성공 여부 */
  success: boolean;
  /** 출력 데이터 */
  output: any;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 에러 상세 정보 (실패 시) */
  details?: string;
}

/**
 * 노드 실행자 인터페이스
 * 모든 노드 타입 실행자는 이 인터페이스를 구현해야 합니다.
 */
export interface NodeExecutor {
  /**
   * 노드를 실행합니다.
   * 
   * @param context - 실행 컨텍스트
   * @returns 실행 결과
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

/**
 * 노드 실행자 레지스트리 타입
 */
export type NodeExecutorRegistry = Record<string, NodeExecutor>;
