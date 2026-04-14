/**
 * Start 노드 실행자
 * 
 * Start 노드는 워크플로우의 시작점으로, 초기 데이터를 생성합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { generateStartNodeOutput } from '../../../utils/nodeUtils';
import { executeStartNode } from '../../nodeApi/startNodeApi';

export class StartNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node } = context;
    
    try {
      const payload = generateStartNodeOutput(node);
      const output = await executeStartNode(payload);
      
      console.log('[StartNodeExecutor] Output:', output);
      
      return {
        success: !output.error,
        output: output.error ? { error: output.error, details: output.details } : output
      };
    } catch (error) {
      console.error('[StartNodeExecutor] Execution failed:', error);
      return {
        success: false,
        output: { error: 'Failed to execute start node' },
        error: 'Failed to execute start node',
        details: (error as Error).message
      };
    }
  }
}
