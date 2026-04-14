/**
 * User 노드 API 서비스
 * 사용자 정의 노드를 실행하는 API를 호출합니다.
 */

import { makeApiRequest, handleApiError, ApiResponse } from './types';

/**
 * User 노드 파라미터 정의
 */
export interface UserNodeParameter {
  name: string;
  funcArgs: string;
  inputType: string;
  matchData: any;
  [key: string]: any;
}

/**
 * User 노드 API 요청 페이로드
 */
export interface UserNodePayload {
  code: string;
  functionName: string;
  parameters: UserNodeParameter[];
  inputData: Record<string, any>;
  return_key: string;
}

/**
 * User 노드 API를 호출하여 사용자 정의 함수를 실행합니다.
 * 
 * @param code - Python 코드
 * @param functionName - 함수 이름
 * @param parameters - 파라미터 목록
 * @param inputData - 입력 데이터
 * @param outputVariable - 출력 변수 이름
 * @returns 실행 결과
 */
export const executeUserNode = async (
  code: string,
  functionName: string,
  parameters: UserNodeParameter[],
  inputData: Record<string, any>,
  outputVariable: string
): Promise<ApiResponse> => {
  if (!code.trim()) {
    return { error: 'Python code is empty' };
  }

  try {
    const payload: UserNodePayload = {
      code,
      functionName,
      parameters,
      inputData,
      return_key: outputVariable
    };
    
    const response = await makeApiRequest('/workflow/node/usernode', payload);
    return response;
  } catch (error) {
    return handleApiError(error, 'UserNode');
  }
};
