import { ReactNode } from 'react';

export type VariableValue = string | number | boolean | null | undefined | VariableValue[] | { [key: string]: VariableValue };

export interface NodeData {
  label: string;
  code?: string;
  description?: string;
  icon?: ReactNode;
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
    [key: string]: any;
    receiveKey?: string;
  };
  mergeMappings?: Array<{
    id: string;
    outputKey: string;
    sourceNodeId: string;
    sourceNodeKey: string;
  }>;
  inputData?: VariableValue;
  output?: VariableValue;
  isExecuting?: boolean;
} 