/**
 * Prompt 노드 실행자
 * 
 * Prompt 노드는 템플릿을 처리하여 프롬프트를 생성합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { executePromptNode } from '../../nodeApi/promptNodeApi';

export class PromptNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, input } = context;
    
    const template = node.data.config?.template || '';
    const outputVariable = node.data.config?.outputVariable || '';
    
    if (!outputVariable) {
      return {
        success: false,
        output: { error: 'Output variable name is required' },
        error: 'Output variable name is required'
      };
    }
    
    try {
      const output = await executePromptNode(template, input, outputVariable);
      
      return {
        success: !output.error,
        output: output.error ? { error: output.error, details: output.details } : output
      };
    } catch (error) {
      console.error('[PromptNodeExecutor] Execution failed:', error);
      return {
        success: false,
        output: { error: 'Failed to execute prompt node' },
        error: 'Failed to execute prompt node',
        details: (error as Error).message
      };
    }
  }
}
