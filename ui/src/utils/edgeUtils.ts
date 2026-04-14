import { Edge } from 'reactflow';
import { EDGE_STATES } from '../types/edge';

/**
 * Edge가 유효한 데이터를 가지고 있는지 검증합니다.
 * PENDING, NULL, null, undefined가 아닌 실제 객체 데이터를 가진 경우에만 true를 반환합니다.
 * 
 * @param edge - 검증할 Edge 객체
 * @returns 유효한 데이터를 가지고 있으면 true
 */
export const hasValidEdgeData = (edge: Edge | undefined): boolean => {
  return edge?.data?.output && 
         typeof edge.data.output === 'object' && 
         edge.data.output !== EDGE_STATES.PENDING &&
         edge.data.output !== EDGE_STATES.NULL &&
         edge.data.output !== null &&
         edge.data.output !== undefined;
};

/**
 * JSON 직렬화 시 순환 참조를 처리하기 위한 replacer 함수를 생성합니다.
 * icon 필드와 함수는 제외됩니다.
 * 
 * @returns JSON.stringify에서 사용할 replacer 함수
 */
export const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (key === 'icon' || typeof value === 'function') {
      return undefined;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};

/**
 * 두 객체를 안전하게 비교합니다.
 * 순환 참조를 처리하며, 비교 실패 시 false를 반환합니다.
 * 
 * @param obj1 - 첫 번째 객체
 * @param obj2 - 두 번째 객체
 * @returns 두 객체가 같으면 true
 */
export const safeCompare = (obj1: any, obj2: any): boolean => {
  try {
    return JSON.stringify(obj1, getCircularReplacer()) === JSON.stringify(obj2, getCircularReplacer());
  } catch (error) {
    console.error('Error comparing objects:', error);
    return false;
  }
};
