/**
 * 노드 실행자 레지스트리
 * 
 * 모든 노드 타입별 실행자를 등록하고 조회하는 중앙 레지스트리입니다.
 */

import { NodeExecutor, NodeExecutorRegistry } from '../nodeExecutorTypes';
import { StartNodeExecutor } from './startNodeExecutor';
import { PromptNodeExecutor } from './promptNodeExecutor';
import { AgentNodeExecutor } from './agentNodeExecutor';
import { FunctionNodeExecutor } from './functionNodeExecutor';
import { ConditionNodeExecutor } from './conditionNodeExecutor';
import { MergeNodeExecutor } from './mergeNodeExecutor';
import { LoopNodeExecutor } from './loopNodeExecutor';
import { UserNodeExecutor } from './userNodeExecutor';
import { EndNodeExecutor } from './endNodeExecutor';

/**
 * 노드 타입별 실행자 레지스트리
 */
const nodeExecutorRegistry: NodeExecutorRegistry = {
  startNode: new StartNodeExecutor(),
  promptNode: new PromptNodeExecutor(),
  agentNode: new AgentNodeExecutor(),
  functionNode: new FunctionNodeExecutor(),
  conditionNode: new ConditionNodeExecutor(),
  mergeNode: new MergeNodeExecutor(),
  loopNode: new LoopNodeExecutor(),
  userNode: new UserNodeExecutor(),
  endNode: new EndNodeExecutor(),
};

/**
 * 노드 타입에 해당하는 실행자를 가져옵니다.
 * 
 * @param nodeType - 노드 타입
 * @returns 노드 실행자 (없으면 undefined)
 */
export function getNodeExecutor(nodeType: string): NodeExecutor | undefined {
  return nodeExecutorRegistry[nodeType];
}

/**
 * 새로운 노드 실행자를 등록합니다.
 * 
 * @param nodeType - 노드 타입
 * @param executor - 노드 실행자
 */
export function registerNodeExecutor(nodeType: string, executor: NodeExecutor): void {
  nodeExecutorRegistry[nodeType] = executor;
}

/**
 * 등록된 모든 노드 타입 목록을 가져옵니다.
 * 
 * @returns 노드 타입 배열
 */
export function getRegisteredNodeTypes(): string[] {
  return Object.keys(nodeExecutorRegistry);
}

// 레지스트리 export
export { nodeExecutorRegistry };

// 개별 실행자 export (필요시 직접 사용 가능)
export {
  StartNodeExecutor,
  PromptNodeExecutor,
  AgentNodeExecutor,
  FunctionNodeExecutor,
  ConditionNodeExecutor,
  MergeNodeExecutor,
  LoopNodeExecutor,
  UserNodeExecutor,
  EndNodeExecutor,
};
