/**
 * @module types/userNode
 * @description 사용자 노드 관련 타입 정의
 * 
 * 이 파일은 사용자가 생성한 커스텀 Python 함수 노드와 관련된 타입을 포함합니다.
 */

/**
 * 사용자 노드 매개변수 인터페이스
 */
export interface UserNodeParameter {
  /** 매개변수 이름 */
  name: string;
  
  /** 입력 타입 ('select box', 'text box', 'radio button', 'checkbox' 등) */
  inputType: string;
  
  /** 필수 여부 */
  required: boolean;
  
  /** 함수 인자 (매개변수별) */
  funcArgs?: string;
  
  /** 매칭 데이터 (매개변수별) */
  matchData?: string;
}

/**
 * 사용자 노드 인터페이스
 * 사용자가 생성한 커스텀 Python 함수 노드
 */
export interface UserNode {
  /** 노드 고유 ID (nanoid로 생성) */
  id: string;
  
  /** 노드 이름 */
  name: string;
  
  /** 노드 타입 (항상 'UserNode') */
  type: 'UserNode';
  
  /** Python 코드 */
  code: string;
  
  /** 함수 매개변수 목록 */
  parameters: UserNodeParameter[];
  
  /** 함수 이름 */
  functionName: string;
  
  /** 반환 타입 */
  returnType: string;
  
  /** 함수 설명 */
  functionDescription: string;
  
  /** 출력 변수명 */
  outputVariable?: string;
  
  /** 마지막 수정 시간 (ISO 문자열) */
  lastModified: string;
}
