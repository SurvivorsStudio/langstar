import type { Node } from 'reactflow';
import type { NodeData } from '../flowStore';
import { nodeDefinitions } from './nodeDefinitions';
import { getUniqueNodeName } from '../helpers/flowHelpers';

interface CreateNodeParams {
  type: keyof typeof nodeDefinitions;
  position: { x: number; y: number };
  data: NodeData;
  existingNodes: Node<NodeData>[];
}

export function createNode(params: CreateNodeParams): Node<NodeData> {
  const { type, position, data, existingNodes } = params;
  const def = nodeDefinitions[type];
  const uniqueLabel = getUniqueNodeName(existingNodes, data.label || def.label);

  // 기본 config 생성 및 병합
  const defaultConfig = def.defaultConfig({
    outputVariable: uniqueLabel,
    agentOutputVariable: uniqueLabel,
  });
  const finalConfig =
    type === 'userNode'
      ? { ...defaultConfig, ...(data.config || {}) }
      : { ...defaultConfig };

  // functionNode 스켈레톤 코드
  const initialNodeData: NodeData = { ...data };
  if (type === 'functionNode' && !initialNodeData.code) {
    initialNodeData.code =
      'def exce_code(state):\n' +
      "    # value = state['variable_name']\n" +
      '    # Your code here...\n' +
      '    return state';
  }

  return {
    id: cryptoRandomId(),
    type,
    position,
    data: {
      ...initialNodeData,
      label: uniqueLabel,
      output: null,
      inputData: null,
      isExecuting: false,
      config: finalConfig,
    },
  };
}

function cryptoRandomId(): string {
  // 환경에 따라 crypto 랜덤 또는 Date.now 대체
  try {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return `n_${arr[0].toString(16)}${arr[1].toString(16)}`;
  } catch {
    return `n_${Date.now().toString(16)}`;
  }
}


