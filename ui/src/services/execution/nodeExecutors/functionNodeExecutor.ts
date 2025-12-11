/**
 * Function 노드 실행자
 * 
 * Function 노드는 사용자 정의 Python 함수를 실행합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { executeFunctionNode } from '../../nodeApi/functionNodeApi';

export class FunctionNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, input } = context;
    
    const pythonCode = node.data.code || '';
    const outputVariable = node.data.config?.outputVariable || 'python_function_output';
    
    if (!pythonCode.trim()) {
      return {
        success: false,
        output: { error: 'Python code is empty' },
        error: 'Python code is empty'
      };
    }
    
    try {
      const output = await executeFunctionNode(pythonCode, input, outputVariable);
      
      return {
        success: !output.error,
        output: output.error ? { error: output.error, details: output.details } : output
      };
    } catch (error) {
      console.error('[FunctionNodeExecutor] Execution failed:', error);
      return {
        success: false,
        output: { error: 'Failed to execute function node' },
        error: 'Failed to execute function node',
        details: (error as Error).message
      };
    }
  }
}
