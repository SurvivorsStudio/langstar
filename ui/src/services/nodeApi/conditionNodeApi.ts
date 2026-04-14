/**
 * Condition 노드 API 서비스
 * 조건 분기를 평가하는 API를 호출합니다.
 */

import { makeApiRequest, handleApiError, ApiResponse } from './types';

/**
 * Condition 노드 조건 정의
 */
export interface ConditionDefinition {
  edge_id: string;
  condition: string;
  target_node_id: string;
}

/**
 * Condition 노드 API 요청 페이로드
 */
export interface ConditionNodePayload {
  input_data: Record<string, any>;
  conditions: ConditionDefinition[];
  argument_name: string;
}

/**
 * Condition 노드 API 응답
 */
export interface ConditionNodeResponse {
  success: boolean;
  evaluation_results: Array<{
    edge_id: string;
    is_matched: boolean;
    condition: string;
  }>;
  error?: string;
}

/**
 * Condition 노드 API를 호출하여 조건을 평가합니다.
 * 
 * @param inputData - 입력 데이터
 * @param conditions - 평가할 조건 목록
 * @param argumentName - 조건 평가에 사용할 인자 이름
 * @returns 조건 평가 결과
 */
export const executeConditionNode = async (
  inputData: Record<string, any>,
  conditions: ConditionDefinition[],
  argumentName: string
): Promise<ConditionNodeResponse> => {
  try {
    const payload: ConditionNodePayload = {
      input_data: inputData,
      conditions: conditions,
      argument_name: argumentName
    };
    
    const response = await makeApiRequest<ConditionNodeResponse>(
      '/workflow/node/conditionnode',
      payload
    );
    
    return response;
  } catch (error) {
    console.warn('[ConditionNode] API failed, will use fallback:', error);
    throw error; // 호출자가 fallback 로직을 처리하도록 에러를 다시 던짐
  }
};
