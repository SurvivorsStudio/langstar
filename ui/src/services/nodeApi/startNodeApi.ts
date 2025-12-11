/**
 * Start 노드 API 서비스
 * Start 노드의 초기 데이터를 생성하는 API를 호출합니다.
 */

import { makeApiRequest, handleApiError, ApiResponse } from './types';

/**
 * Start 노드 변수 정의
 */
interface StartNodeVariable {
  variableName: string;
  variableType: string;
  defaultValue: any;
  selectVariable: string;
}

/**
 * Start 노드 API 요청 페이로드
 */
export interface StartNodePayload {
  className: string;
  classType: 'TypedDict' | 'BaseModel';
  variables: StartNodeVariable[];
}

/**
 * Start 노드 API를 호출하여 초기 데이터를 생성합니다.
 * 
 * @param payload - Start 노드 설정 정보
 * @returns 생성된 초기 데이터
 */
export const executeStartNode = async (
  payload: StartNodePayload
): Promise<ApiResponse> => {
  try {
    const output = await makeApiRequest('/workflow/node/startnode', payload);
    console.log('[StartNode] API response:', output);
    return output;
  } catch (error) {
    return handleApiError(error, 'StartNode');
  }
};
