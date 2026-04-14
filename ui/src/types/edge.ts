/**
 * @module types/edge
 * @description 엣지 관련 타입 정의
 * 
 * 이 파일은 워크플로우의 엣지(연결선)와 관련된 모든 타입 정의를 포함합니다.
 * - EDGE_STATES: 엣지 상태 상수
 * - EdgeData: 엣지 데이터 구조
 */

/**
 * 엣지 상태 상수
 * 순환 구조에서 명확한 대기 상태를 구분하기 위해 사용
 */
export const EDGE_STATES = {
  /** 대기 중 (merge 노드가 기다려야 함) */
  PENDING: 'PENDING',
  
  /** 조건 불만족 또는 비활성화 */
  NULL: null,
  
  // 실제 데이터는 객체 형태로 저장
} as const;

/**
 * 엣지 데이터 인터페이스
 * ReactFlow Edge의 data 속성 타입
 */
export interface EdgeData {
  /** 엣지를 통해 전달되는 데이터 */
  output?: any;
  
  /** 엣지 실행 중 여부 */
  isExecuting?: boolean;
  
  /** 엣지 실행 성공 여부 */
  isSuccess?: boolean;
  
  /** 엣지 실행 실패 여부 */
  isFailure?: boolean;
  
  /** 데이터 전달 시간 (타임스탬프) */
  timestamp?: number;
  
  /** 엣지 레이블 (Condition 노드에서 조건식으로 사용) */
  label?: string;
  
  /** Condition 노드의 규칙 설명 */
  conditionDescription?: string;
  
  /** Condition 노드의 조건 순서 인덱스 */
  conditionOrderIndex?: number;
  
  /** 경고 상태 (연결 규칙 위반 시) */
  isWarning?: boolean;
  
  /** 성공 시간 (타임스탬프) */
  successTimestamp?: number;
  
  /** 실패 시간 (타임스탬프) */
  failureTimestamp?: number;
  
  /** 실행 시작 시간 (타임스탬프) */
  executingTimestamp?: number;
}
