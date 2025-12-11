/**
 * Merge 노드 API 서비스
 * 여러 입력을 병합하는 API를 호출합니다.
 */

import { makeApiRequest, handleApiError, ApiResponse } from './types';

/**
 * Merge 노드 매핑 정의
 */
export interface MergeMapping {
  outputKey: string;
  sourceNodeId: string;
  sourceNodeKey: string;
}

/**
 * Merge 노드 설정
 */
export interface MergeNodeConfig {
  mergeMappings: MergeMapping[];
}

/**
 * Merge 노드 API 요청 페이로드
 */
export interface MergeNodePayload {
  nodeId: string;
  nodeType: string;
  config: MergeNodeConfig;
  data: Record<string, any>;
}

/**
 * Merge 노드 API를 호출하여 데이터를 병합합니다.
 * 
 * @param nodeId - 노드 ID
 * @param config - Merge 노드 설정
 * @param mergedData - 병합할 데이터 (노드 이름을 키로 사용)
 * @returns 병합된 결과
 */
export const executeMergeNode = async (
  nodeId: string,
  config: MergeNodeConfig,
  mergedData: Record<string, any>
): Promise<ApiResponse> => {
  if (!config.mergeMappings || config.mergeMappings.length === 0) {
    console.warn(`[MergeNode ${nodeId}] No merge mappings defined. Output will be empty.`);
    return { error: 'No merge mappings configured' };
  }

  try {
    const payload: MergeNodePayload = {
      nodeId,
      nodeType: 'mergeNode',
      config,
      data: mergedData
    };

    console.log(`[MergeNode ${nodeId}] API request payload:`, JSON.stringify(payload, null, 2));

    const response = await makeApiRequest('/workflow/node/mergenode', payload);
    
    console.log(`[MergeNode ${nodeId}] Backend response:`, response);
    return response;
  } catch (error) {
    return handleApiError(error, `MergeNode ${nodeId}`);
  }
};
