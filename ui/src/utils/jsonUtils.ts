/**
 * 중첩된 JSON 객체를 dot notation으로 평면화하여 모든 키 경로를 추출합니다.
 * 
 * @param obj - 평면화할 객체
 * @param prefix - 현재 키 경로의 접두사
 * @param maxDepth - 최대 중첩 깊이 (무한 루프 방지)
 * @returns dot notation 형태의 키 배열
 * 
 * @example
 * const data = {
 *   "a": "value1",
 *   "b": {
 *     "c": "value2",
 *     "d": {
 *       "e": "value3"
 *     }
 *   }
 * };
 * 
 * flattenObjectKeys(data) 
 * // Returns: ["a", "b.c", "b.d.e"]
 */
export function flattenObjectKeys(
  obj: any, 
  prefix: string = '', 
  maxDepth: number = 10
): string[] {
  if (maxDepth <= 0 || obj === null || obj === undefined) {
    return [];
  }

  // 객체가 아닌 경우 (primitive value), 현재 prefix를 반환
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }

  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    
    // 값이 객체이고 null이 아닌 경우 재귀적으로 처리
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // 객체가 비어있지 않은 경우에만 재귀 호출
      if (Object.keys(value).length > 0) {
        keys.push(...flattenObjectKeys(value, currentPath, maxDepth - 1));
      } else {
        // 빈 객체인 경우 현재 경로를 추가
        keys.push(currentPath);
      }
    } else {
      // primitive value, array, null인 경우 현재 경로를 추가
      keys.push(currentPath);
    }
  }
  
  return keys;
}

/**
 * dot notation 경로를 사용하여 중첩된 객체에서 값을 안전하게 추출합니다.
 * 
 * @param obj - 값을 추출할 객체
 * @param path - dot notation 경로 (예: "a.b.c")
 * @returns 해당 경로의 값 또는 undefined
 * 
 * @example
 * const data = { a: { b: { c: "value" } } };
 * getValueByPath(data, "a.b.c") // Returns: "value"
 * getValueByPath(data, "a.b.x") // Returns: undefined
 */
export function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * 중첩된 객체에서 사용 가능한 모든 키 경로와 해당 값의 타입 정보를 반환합니다.
 * 
 * @param obj - 분석할 객체
 * @returns 키 경로와 타입 정보의 배열
 */
export interface KeyInfo {
  path: string;
  value: any;
  type: string;
  isLeaf: boolean; // 최종 값인지 여부
}

export function getKeyInfoList(obj: any): KeyInfo[] {
  const flatKeys = flattenObjectKeys(obj);
  
  return flatKeys.map(path => {
    const value = getValueByPath(obj, path);
    const type = Array.isArray(value) ? 'array' : typeof value;
    const isLeaf = type !== 'object' || value === null;
    
    return {
      path,
      value,
      type,
      isLeaf
    };
  });
}

/**
 * 키 경로들을 계층적으로 그룹화합니다.
 * Select box에서 그룹화된 옵션으로 표시할 때 유용합니다.
 */
export interface GroupedKeys {
  [group: string]: string[];
}

export function groupKeysByPrefix(keys: string[]): GroupedKeys {
  const grouped: GroupedKeys = {};
  
  keys.forEach(key => {
    if (key.includes('.')) {
      const firstPart = key.split('.')[0];
      if (!grouped[firstPart]) {
        grouped[firstPart] = [];
      }
      grouped[firstPart].push(key);
    } else {
      if (!grouped['Direct Keys']) {
        grouped['Direct Keys'] = [];
      }
      grouped['Direct Keys'].push(key);
    }
  });
  
  return grouped;
}
