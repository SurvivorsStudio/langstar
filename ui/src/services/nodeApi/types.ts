/**
 * 노드 API 공통 타입 정의
 */

/**
 * API 응답의 기본 구조
 */
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * API 오류 클래스
 */
export class NodeApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'NodeApiError';
  }
}

/**
 * API 기본 URL
 */
export const API_BASE_URL = 'http://localhost:8000';

/**
 * 공통 API 오류 처리 함수
 * 
 * @param error - 발생한 오류
 * @param nodeName - 노드 이름 (로깅용)
 * @returns 오류 응답 객체
 */
export const handleApiError = (error: unknown, nodeName: string): ApiResponse => {
  console.error(`[${nodeName}] API call failed:`, error);
  
  if (error instanceof NodeApiError) {
    return {
      error: error.message,
      details: error.details
    };
  }
  
  if (error instanceof Error) {
    return {
      error: `Failed to connect to ${nodeName} API`,
      details: error.message
    };
  }
  
  return {
    error: `Unknown error in ${nodeName}`,
    details: String(error)
  };
};

/**
 * API 요청을 수행하는 공통 함수
 * 
 * @param endpoint - API 엔드포인트 경로
 * @param payload - 요청 페이로드
 * @returns API 응답
 */
export const makeApiRequest = async <T = any>(
  endpoint: string,
  payload: any
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new NodeApiError(
      `API request failed with status ${response.status}`,
      response.status,
      errorText
    );
  }

  return await response.json();
};
