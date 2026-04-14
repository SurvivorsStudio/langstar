import type { NodeData } from '../flowStore';

type NodeTypeKey =
  | 'startNode'
  | 'endNode'
  | 'promptNode'
  | 'agentNode'
  | 'mergeNode'
  | 'functionNode'
  | 'userNode'
  | 'conditionNode'
  | 'loopNode';

export interface NodeDefinition {
  type: NodeTypeKey;
  label: string;
  defaultConfig: (partial?: Record<string, any>) => NonNullable<NodeData['config']>;
  allowsMultipleInputs?: boolean;
  settingsKey?: string;
}

export const nodeDefinitions: Record<NodeTypeKey, NodeDefinition> = {
  startNode: {
    type: 'startNode',
    label: 'Start',
    defaultConfig: () => ({
      className: '',
      classType: 'TypedDict',
      variables: [],
    }),
    settingsKey: 'StartSettings',
  },
  endNode: {
    type: 'endNode',
    label: 'End',
    defaultConfig: () => ({
      receiveKey: '',
    }),
    settingsKey: 'EndNodeSettings',
  },
  promptNode: {
    type: 'promptNode',
    label: 'Prompt',
    defaultConfig: (partial) => ({
      template: 'User: {{user_input}}\n\nAssistant:',
      outputVariable: partial?.outputVariable || 'output',
    }),
    settingsKey: 'PromptSettings',
  },
  agentNode: {
    type: 'agentNode',
    label: 'Agent',
    defaultConfig: (partial) => ({
      model: '',
      userPromptInputKey: '',
      systemPromptInputKey: '',
      memoryGroup: '',
      tools: [],
      agentOutputVariable: partial?.agentOutputVariable || 'agent_response',
    }),
    settingsKey: 'AgentSettings',
  },
  mergeNode: {
    type: 'mergeNode',
    label: 'Merge',
    defaultConfig: () => ({
      mergeMappings: [],
    }),
    allowsMultipleInputs: true,
    settingsKey: 'MergeSettings',
  },
  functionNode: {
    type: 'functionNode',
    label: 'Function',
    defaultConfig: (partial) => ({
      outputVariable: partial?.outputVariable || 'func_output',
    }),
    settingsKey: 'FunctionSettings',
  },
  userNode: {
    type: 'userNode',
    label: 'User',
    defaultConfig: (partial) => ({
      outputVariable: partial?.outputVariable || 'user_output',
      ...(partial || {}),
    }),
    settingsKey: 'UserNodeSettings',
  },
  conditionNode: {
    type: 'conditionNode',
    label: 'Condition',
    defaultConfig: () => ({}),
    settingsKey: 'ConditionSettings',
  },
  loopNode: {
    type: 'loopNode',
    label: 'Loop',
    defaultConfig: () => ({
      repetitions: 1,
    }),
  },
};


