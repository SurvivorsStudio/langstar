import type { NodeData } from '../flowStore';
import { nodeDefinitions } from './nodeDefinitions';

export function allowsMultipleInputs(nodeType: string): boolean {
  const def = nodeDefinitions[nodeType as keyof typeof nodeDefinitions];
  return !!def?.allowsMultipleInputs;
}

export function resetConfigOnConnect(nodeType: string, prev: NonNullable<NodeData['config']>): NonNullable<NodeData['config']> {
  const cfg = { ...prev };
  switch (nodeType) {
    case 'endNode':
      cfg.receiveKey = '';
      break;
    case 'promptNode':
      if (cfg.inputVariable) cfg.inputVariable = '';
      if (cfg.selectedKeyName) cfg.selectedKeyName = '';
      break;
    case 'agentNode':
      if (cfg.userPromptInputKey) cfg.userPromptInputKey = '';
      if (cfg.systemPromptInputKey) cfg.systemPromptInputKey = '';
      break;
    case 'userNode':
      if (cfg.inputData) cfg.inputData = {};
      break;
    case 'mergeNode':
      // 유지
      break;
    default:
      if (cfg.inputKey) cfg.inputKey = '';
      if (cfg.selectedInput) cfg.selectedInput = null as any;
      break;
  }
  return cfg;
}

export function resetConfigOnRemove(nodeType: string, prev: NonNullable<NodeData['config']>, removedEdgeSourceId?: string): NonNullable<NodeData['config']> {
  const cfg = { ...prev };
  switch (nodeType) {
    case 'endNode':
      cfg.receiveKey = '';
      break;
    case 'promptNode':
      if (cfg.inputVariable) cfg.inputVariable = '';
      if (cfg.selectedKeyName) cfg.selectedKeyName = '';
      break;
    case 'agentNode':
      if (cfg.userPromptInputKey) cfg.userPromptInputKey = '';
      if (cfg.systemPromptInputKey) cfg.systemPromptInputKey = '';
      break;
    case 'userNode':
      if (cfg.inputData) cfg.inputData = {};
      break;
    case 'mergeNode':
      if (cfg.mergeMappings && removedEdgeSourceId) {
        cfg.mergeMappings = cfg.mergeMappings.filter((m: any) => m.sourceNodeId !== removedEdgeSourceId);
      }
      break;
    default:
      if (cfg.inputKey) cfg.inputKey = '';
      if (cfg.selectedInput) cfg.selectedInput = null as any;
      break;
  }
  return cfg;
}


