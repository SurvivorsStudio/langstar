/**
 * Prompt 노드 API 서비스
 * 프롬프트 템플릿을 처리하는 API를 호출합니다.
 */

import { makeApiRequest, handleApiError, ApiResponse } from './types';

/**
 * Prompt 노드 API 요청 페이로드
 */
export interface PromptNodePayload {
  prompt: string;
  param: Record<string, any>;
  return_key: string;
}

/**
 * Prompt 노드 API를 호출하여 템플릿을 처리합니다.
 * 
 * @param template - 프롬프트 템플릿
 * @param input - 입력 데이터
 * @param outputVariable - 출력 변수 이름
 * @returns 처리된 프롬프트 결과
 */
export const executePromptNode = async (
  template: string,
  input: Record<string, any>,
  outputVariable: string
): Promise<ApiResponse> => {
  try {
    const payload: PromptNodePayload = {
      prompt: template,
      param: input,
      return_key: outputVariable,
    };
    
    const output = await makeApiRequest('/workflow/node/promptnode', payload);
    return output;
  } catch (error) {
    return handleApiError(error, 'PromptNode');
  }
};
