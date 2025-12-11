import { Node } from 'reactflow';
import { NodeData } from '../types/node';

/**
 * 노드 이름 중복을 방지하기 위해 고유한 이름을 생성합니다.
 * 
 * @param nodes - 현재 워크플로우의 모든 노드 배열
 * @param baseLabel - 기본 라벨 (띄어쓰기는 언더스코어로 변환됨)
 * @returns 고유한 노드 이름
 */
export const getUniqueNodeName = (nodes: Node<NodeData>[], baseLabel: string): string => {
  const existingNames = nodes.map(node => node.data.label);
  // 띄어쓰기를 언더스코어로 변환
  const sanitizedBaseLabel = baseLabel.replace(/\s+/g, '_');
  let newName = sanitizedBaseLabel;
  let counter = 1;

  while (existingNames.includes(newName)) {
    newName = `${sanitizedBaseLabel}_${counter}`;
    counter++;
  }

  return newName;
};

/**
 * Start 노드의 설정값을 검증합니다.
 * 
 * @param node - 검증할 Start 노드
 * @returns 에러 메시지 (유효한 경우 null)
 */
export const validateStartNode = (node: Node<NodeData>): string | null => {
  if (!node.data.config?.className?.trim()) {
    return 'Class Name is required';
  }

  const variables = node.data.config?.variables || [];
  for (let i = 0; i < variables.length; i++) {
    if (!variables[i].name.trim()) {
      return `Variable Name is required for variable ${i + 1}`;
    }
  }

  return null;
};

/**
 * Start 노드의 출력 데이터 구조를 생성합니다.
 */
interface TransformedStartNodeVariable {
  variableName: string;
  variableType: string;
  defaultValue: any;
  selectVariable: string;
}

interface TransformedStartNodeOutput {
  className: string;
  classType: 'TypedDict' | 'BaseModel';
  variables: TransformedStartNodeVariable[];
}

/**
 * Start 노드의 설정을 기반으로 출력 데이터를 생성합니다.
 * 
 * @param node - Start 노드
 * @returns 변환된 출력 데이터
 */
export const generateStartNodeOutput = (node: Node<NodeData>): TransformedStartNodeOutput => {
  const config = node.data.config || {};
  const inputVariables = config.variables || [];

  const processedVariables: TransformedStartNodeVariable[] = inputVariables.map(variable => {
    let processedDefaultValue: any = variable.defaultValue;
    switch (variable.type) {
      case 'int':
        processedDefaultValue = typeof variable.defaultValue === 'number' ? variable.defaultValue : parseInt(variable.defaultValue, 10) || 0;
        break;
      case 'float':
        processedDefaultValue = typeof variable.defaultValue === 'number' ? variable.defaultValue : parseFloat(variable.defaultValue) || 0.0;
        break;
      case 'list':
        try {
          processedDefaultValue = Array.isArray(variable.defaultValue) ? variable.defaultValue : JSON.parse(variable.defaultValue || '[]');
        } catch {
          processedDefaultValue = [];
        }
        break;
      case 'dict':
        try {
          processedDefaultValue = typeof variable.defaultValue === 'object' && !Array.isArray(variable.defaultValue) ? variable.defaultValue : JSON.parse(variable.defaultValue || '{}');
        } catch {
          processedDefaultValue = {};
        }
        break;
      default:
        processedDefaultValue = variable.defaultValue || '';
    }
    return {
      variableName: variable.name,
      variableType: variable.type,
      defaultValue: processedDefaultValue,
      selectVariable: variable.selectVariable,
    };
  });

  return {
    className: config.className || '',
    classType: config.classType || 'TypedDict',
    variables: processedVariables,
  };
};
