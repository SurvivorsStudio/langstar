import { ReactNode } from 'react';

export type VariableValue = string | number | boolean | null | undefined | VariableValue[] | { [key: string]: VariableValue } | Group[];

export interface Group {
  id: string;
  name: string;
  description: string;
  type: 'memory' | 'tools';
  memoryType?: 'ConversationBufferMemory' | 'ConversationBufferWindowMemory';
  windowSize?: number;
  code?: string;
}

export interface NodeData {
  label: string;
  code?: string;
  description?: string;
  icon?: ReactNode;
  selectedGroupId?: string | null;
  config?: {
    className?: string;
    classType?: 'TypedDict' | 'BaseModel';
    variables?: Array<{
      name: string;
      type: string;
      defaultValue: VariableValue;
      selectVariable: string;
    }>;
    repetitions?: number;
    template?: string;
    model?: string;
    inputColumn?: string;
    outputColumn?: string;
    groups?: Group[];
    mergeMappings?: Array<{
      id: string;
      outputKey: string;
      sourceNodeId: string;
      sourceNodeKey: string;
    }>;
    receiveKey?: string;
    [key: string]: VariableValue;
  };
  inputData?: VariableValue;
  output?: VariableValue;
  isExecuting?: boolean;
} 