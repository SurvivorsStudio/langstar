/**
 * @module types/workflow
 * @description 워크플로우 관련 타입 정의
 * 
 * 이 파일은 워크플로우 전체 구조와 관련된 타입 정의를 포함합니다.
 */

import { Node, Edge, Viewport } from 'reactflow';
import { NodeData } from './node';

/**
 * 워크플로우 인터페이스
 * 저장 및 로드되는 워크플로우의 전체 데이터 구조
 */
export interface Workflow {
  /** 프로젝트 고유 ID */
  projectId: string;
  
  /** 프로젝트 이름 (워크플로우 이름) */
  projectName: string;
  
  /** 워크플로우의 모든 노드 */
  nodes: Node<NodeData>[];
  
  /** 워크플로우의 모든 엣지 (연결선) */
  edges: Edge[];
  
  /** 캔버스 뷰포트 (위치 및 줌 레벨) */
  viewport: Viewport;
  
  /** 노드별 수동 선택된 엣지 정보 (nodeId -> edgeId) */
  manuallySelectedEdges?: Record<string, string | null>;
  
  /** 마지막 수정 시간 (ISO 문자열) */
  lastModified: string;
}
