/**
 * Agent 노드 API 서비스
 * LLM 에이전트를 실행하는 API를 호출합니다.
 */

import { makeApiRequest, handleApiError, ApiResponse } from './types';

/**
 * Agent 노드 모델 설정
 */
export interface AgentModelConfig {
  connName: string;
  providerName: string;
  modelName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  apiKey?: string;
}

/**
 * Agent 노드 모델 설정값
 */
export interface AgentModelSettings {
  topK: number;
  topP: number;
  temperature: number;
  maxTokens: number;
}

/**
 * Agent 노드 Tool 정보
 */
export interface AgentTool {
  tool_name: string;
  tool_description: string;
  tool_code: string;
}

/**
 * Agent 노드 API 요청 페이로드
 */
export interface AgentNodePayload {
  model: AgentModelConfig;
  modelSetting: AgentModelSettings;
  system_prompt: string;
  user_prompt: string;
  data: Record<string, any>;
  memory_group?: string;
  memory_group_name?: string;
  tools: AgentTool[];
  memory_type?: string;
  memory_window_size?: number;
  return_key: string;
  chat_id?: string;
}

/**
 * Agent 노드 API를 호출하여 LLM 에이전트를 실행합니다.
 * 
 * @param payload - Agent 노드 설정 및 입력 데이터
 * @returns 에이전트 실행 결과
 */
export const executeAgentNode = async (
  payload: AgentNodePayload
): Promise<ApiResponse> => {
  try {
    console.log('[AgentNode] API request payload:', JSON.stringify(payload, null, 2));
    
    const response = await makeApiRequest('/workflow/node/agentnode', payload);
    
    console.log('[AgentNode] API response:', response);
    return response;
  } catch (error) {
    return handleApiError(error, 'AgentNode');
  }
};
