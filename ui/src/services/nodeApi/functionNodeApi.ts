/**
 * Function 노드 API 서비스
 * 사용자 정의 Python 함수를 실행하는 API를 호출합니다.
 */

import { makeApiRequest, handleApiError, ApiResponse } from './types';

/**
 * Function 노드 API 요청 페이로드
 */
export interface FunctionNodePayload {
  py_code: string;
  param: Record<string, any>;
  return_key: string;
}

/**
 * Function 노드 API를 호출하여 Python 코드를 실행합니다.
 * 
 * @param pythonCode - 실행할 Python 코드
 * @param input - 입력 데이터
 * @param outputVariable - 출력 변수 이름
 * @returns 실행 결과
 */
export const executeFunctionNode = async (
  pythonCode: string,
  input: Record<string, any>,
  outputVariable: string
): Promise<ApiResponse> => {
  if (!pythonCode.trim()) {
    return { error: 'Python code is empty' };
  }

  try {
    const payload: FunctionNodePayload = {
      py_code: pythonCode,
      param: input,
      return_key: outputVariable
    };
    
    const output = await makeApiRequest('/workflow/node/pythonnode', payload);
    return output;
  } catch (error) {
    return handleApiError(error, 'FunctionNode');
  }
};
