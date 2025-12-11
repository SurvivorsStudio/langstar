/**
 * 프롬프트 템플릿을 처리하여 변수를 치환합니다.
 * 
 * @param template - 프롬프트 템플릿 문자열 (예: "User: {{user_input}}")
 * @param input - 입력 데이터 객체
 * @param outputVariable - 결과를 저장할 변수 이름
 * @returns 처리된 결과를 포함한 객체
 */
export const processPromptTemplate = (
  template: string, 
  input: Record<string, any>, 
  outputVariable: string
): Record<string, any> => {
  const output = { ...input };
  let processedTemplate = template || '';
  
  processedTemplate = processedTemplate.replace(/\{([^}]+)\}/g, (match, key) => {
    return input[key] !== undefined ? String(input[key]) : match;
  });

  if (outputVariable) {
    output[outputVariable] = processedTemplate;
  }

  return output;
};

/**
 * 점 표기법을 Python 딕셔너리 접근 방식으로 변환합니다.
 * 예: "mm.api_response.data" -> "mm['api_response']['data']"
 * 
 * @param keyPath - 점 표기법 키 경로
 * @returns Python 딕셔너리 표기법 문자열
 */
export const convertToPythonNotation = (keyPath: string): string => {
  if (!keyPath || keyPath.trim() === '') {
    return keyPath;
  }

  // 이미 배열 인덱스가 포함된 경우를 고려하여 처리
  // 예: "mm.api_response.data.users[2].data" -> "mm['api_response']['data']['users'][2]['data']"
  
  let result = keyPath;
  
  // 점(.)으로 분리하되, 배열 인덱스는 보존
  const parts = result.split('.');
  
  if (parts.length === 1) {
    // 단일 키인 경우 그대로 반환 (예: "system_prompt")
    return keyPath;
  }
  
  // 첫 번째 부분은 그대로 두고, 나머지는 ['key'] 형식으로 변환
  let pythonNotation = parts[0];
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // 배열 인덱스가 있는지 확인 (예: "users[2]")
    const arrayMatch = part.match(/^([^[\]]+)(\[.+\])$/);
    
    if (arrayMatch) {
      // 배열 인덱스가 있는 경우: "users[2]" -> "['users'][2]"
      const keyPart = arrayMatch[1];
      const indexPart = arrayMatch[2];
      pythonNotation += `['${keyPart}']${indexPart}`;
    } else {
      // 일반 키인 경우: "data" -> "['data']"
      pythonNotation += `['${part}']`;
    }
  }
  
  return pythonNotation;
};

/**
 * Edge 라벨에서 조건식을 추출하여 평가 가능한 형태로 변환합니다.
 * 
 * @param edgeLabel - Edge의 라벨 (예: "if data['value'] > 0", "else")
 * @param _defaultArgumentName - 기본 인자 이름 (예: "data") - 현재 미사용
 * @returns 평가 가능한 함수 본문
 */
export const prepareConditionForEvaluation = (
  edgeLabel: string | undefined, 
  _defaultArgumentName: string
): { body: string } => {
  const label = (edgeLabel || '').trim();
  const lowerLabel = label.toLowerCase();

  if (lowerLabel === 'else') {
    return { body: 'return true;' };
  }

  let coreCondition = label;
  if (lowerLabel.startsWith('if ')) {
    coreCondition = label.substring(3).trim();
  } else if (lowerLabel.startsWith('elif ')) {
    coreCondition = label.substring(5).trim();
  }

  // If, after stripping, coreCondition is empty (e.g. "if " was the label), it's an invalid if/elif.
  if (!coreCondition && (lowerLabel.startsWith('if ') || lowerLabel.startsWith('elif '))) {
    console.warn(`Invalid condition: Label "${edgeLabel}" is an if/elif without an expression. Evaluating as false.`);
    return { body: 'return false;' };
  }
  // If coreCondition is still empty (e.g. label was empty or just "if" without space), evaluate as false.
  if (!coreCondition) {
    console.warn(`Invalid condition: Label "${edgeLabel}" is empty or invalid. Evaluating as false.`);
    return { body: 'return false;' };
  }

  // At this point, coreCondition is the expression part, e.g., "data['value'] > 0"
  // The condition string must use the 'defaultArgumentName' for the input object.
  return { body: `return ${coreCondition};` };
};

/**
 * 조건식을 평가합니다.
 * 
 * @param conditionBody - 평가할 조건식 본문
 * @param input - 입력 데이터
 * @param argumentName - 인자 이름
 * @returns 조건식 평가 결과
 */
export const evaluateCondition = (
  conditionBody: string, 
  input: Record<string, any>, 
  argumentName: string
): boolean => {
  try {
    // argumentName is the name of the first argument to the function (e.g., 'data').
    // input is the value for that argument.
    // conditionBody is the string of code to execute (e.g., "return data['value'] > 10;").
    const evalFunction = new Function(argumentName, conditionBody);
    return evalFunction.call(null, input);
  } catch (error) {
    console.error(`Error evaluating condition body: "${conditionBody}" with argumentName "${argumentName}"`, error);
    return false;
  }
};

/**
 * 두 객체를 깊게 병합합니다 (MergeNode에서 사용).
 * 
 * @param target - 대상 객체
 * @param source - 소스 객체
 * @returns 병합된 객체
 */
export const deepMerge = (target: any, source: any): any => {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
};

/**
 * 값이 객체인지 확인합니다 (배열 제외).
 * 
 * @param item - 확인할 값
 * @returns 객체이면 true
 */
export const isObject = (item: any): boolean => {
  return item && typeof item === 'object' && !Array.isArray(item);
};
