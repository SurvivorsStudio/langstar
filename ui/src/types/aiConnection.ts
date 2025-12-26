/**
 * @module types/aiConnection
 * @description AI 연결 관련 타입 정의
 * 
 * 이 파일은 LLM 제공자(AWS Bedrock, OpenAI 등)와의 연결 설정에 관련된 타입을 포함합니다.
 */

/**
 * AI 연결 인터페이스
 * LLM 모델 연결 설정 정보
 */
export interface AIConnection {
  /** 연결 고유 ID (nanoid로 생성) */
  id: string;
  
  /** 연결 이름 */
  name: string;
  
  /** 모델 타입 */
  type: 'language' | 'embedding';
  
  /** 제공자 (AWS, OpenAI, Google, Anthropic 등) */
  provider: string;
  
  /** 모델 이름 */
  model: string;
  
  /** API 키 (선택적, 보안 고려) */
  apiKey?: string;
  
  /** AWS Access Key ID (AWS 제공자용) */
  accessKeyId?: string;
  
  /** AWS Secret Access Key (AWS 제공자용) */
  secretAccessKey?: string;
  
  /** AWS Region (AWS 제공자용) */
  region?: string;
  
  /** Temperature 설정 (Language 모델 전용) */
  temperature?: number;
  
  /** Max Tokens 설정 (Language 모델 전용) */
  maxTokens?: number;
  
  /** 연결 상태 */
  status: 'active' | 'draft' | 'archived';
  
  /** 마지막 수정 시간 (ISO 문자열) */
  lastModified: string;
}

/**
 * AI 연결 폼 인터페이스
 * AI 연결 생성/수정 시 사용되는 폼 데이터
 */
export interface AIConnectionForm {
  /** 연결 이름 */
  name: string;
  
  /** 제공자 (AWS, OpenAI, Google, Anthropic 등) */
  provider: string;
  
  /** 모델 이름 */
  model: string;
  
  /** API 키 (선택적) */
  apiKey?: string;
  
  /** AWS Access Key ID (AWS 제공자용) */
  accessKeyId?: string;
  
  /** AWS Secret Access Key (AWS 제공자용) */
  secretAccessKey?: string;
  
  /** AWS Region (AWS 제공자용) */
  region?: string;
  
  /** 연결 상태 */
  status: 'active' | 'draft' | 'archived';
  
  /** 모델 타입 (선택적, 저장 시 추가됨) */
  type?: 'language' | 'embedding';
}
