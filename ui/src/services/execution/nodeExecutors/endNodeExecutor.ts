/**
 * End 노드 실행자
 * 
 * End 노드는 워크플로우의 종료점입니다.
 * 입력 데이터를 그대로 출력으로 전달합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';

export class EndNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { input } = context;
    
    // End 노드는 입력을 그대로 출력으로 전달
    return {
      success: true,
      output: input
    };
  }
}
