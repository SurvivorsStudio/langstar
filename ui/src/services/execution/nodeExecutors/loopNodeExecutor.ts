/**
 * Loop 노드 실행자
 * 
 * Loop 노드는 반복 실행을 위한 메타데이터를 생성합니다.
 * 실제 반복 로직은 워크플로우 실행 엔진에서 처리됩니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';

export class LoopNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, input } = context;
    
    const repetitions = node.data.config?.repetitions || 1;
    
    const output = {
      message: `Loop will execute ${repetitions} times`,
      repetitions: repetitions,
      currentIteration: 0,
      input
    };
    
    return {
      success: true,
      output
    };
  }
}
