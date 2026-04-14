/**
 * Condition 노드 실행자
 * 
 * Condition 노드는 조건 분기를 평가하여 적절한 경로로 데이터를 전달합니다.
 * 
 * 주의: Condition 노드는 엣지 출력을 직접 설정해야 하므로,
 * 실행 엔진에서 특별한 처리가 필요합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { executeConditionNode, ConditionDefinition } from '../../nodeApi/conditionNodeApi';
import { prepareConditionForEvaluation, evaluateCondition } from '../../../utils/dataTransform';
import { EDGE_STATES } from '../../../types/edge';

/**
 * Condition 노드 실행 결과 (엣지별 출력 포함)
 */
export interface ConditionExecutionResult extends ExecutionResult {
  /** 각 엣지별 출력 데이터 */
  edgeOutputs?: Map<string, any>;
}

export class ConditionNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ConditionExecutionResult> {
    const { nodeId, input, edges, nodes } = context;
    
    // 나가는 엣지들을 정렬
    const allOutgoingEdges = edges.filter(edge => edge.source === nodeId);
    const sortedEdges = [...allOutgoingEdges].sort((a, b) => {
      const orderA = a.data?.conditionOrderIndex ?? Infinity;
      const orderB = b.data?.conditionOrderIndex ?? Infinity;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.id.localeCompare(b.id);
    });
    
    const startNode = nodes.find(node => node.type === 'startNode');
    const argumentNameForEval = startNode?.data.config?.className || 'data';
    
    // 조건 데이터 구성
    const conditions: ConditionDefinition[] = sortedEdges.map(edge => ({
      edge_id: edge.id,
      condition: edge.data?.label || '',
      target_node_id: edge.target
    }));
    
    const edgeOutputs = new Map<string, any>();
    
    try {
      // API 호출 시도
      const apiResponse = await executeConditionNode(input, conditions, argumentNameForEval);
      
      if (apiResponse.success) {
        // API 응답으로 엣지 출력 설정
        let anyConditionMet = false;
        let matchedEdgeId: string | null = null;
        
        for (const edge of sortedEdges) {
          const evalResult = apiResponse.evaluation_results.find(
            result => result.edge_id === edge.id
          );
          
          if (evalResult && evalResult.is_matched && !anyConditionMet) {
            anyConditionMet = true;
            matchedEdgeId = edge.id;
            break;
          }
        }
        
        // 엣지별 출력 설정
        for (const edge of sortedEdges) {
          const isLastEdge = edge === sortedEdges[sortedEdges.length - 1];
          
          if (edge.id === matchedEdgeId) {
            edgeOutputs.set(edge.id, input);
          } else if (isLastEdge && !anyConditionMet) {
            edgeOutputs.set(edge.id, input);
            console.log(`🔀 [ConditionNode] Else 경로: ${edge.id}`);
          } else {
            edgeOutputs.set(edge.id, EDGE_STATES.NULL);
          }
        }
        
        return {
          success: true,
          output: input,
          edgeOutputs
        };
      }
    } catch (error) {
      console.warn('[ConditionNode] API failed, using fallback:', error);
    }
    
    // Fallback: 클라이언트 측 평가
    let anyConditionMet = false;
    let matchedEdgeId: string | null = null;
    
    for (const edge of sortedEdges) {
      const { body: conditionBodyForEval } = prepareConditionForEvaluation(
        edge.data?.label,
        argumentNameForEval
      );
      const isTrue = evaluateCondition(conditionBodyForEval, input, argumentNameForEval);
      
      if (isTrue && !anyConditionMet) {
        anyConditionMet = true;
        matchedEdgeId = edge.id;
        break;
      }
    }
    
    // 엣지별 출력 설정
    for (const edge of sortedEdges) {
      const isLastEdge = edge === sortedEdges[sortedEdges.length - 1];
      
      if (edge.id === matchedEdgeId) {
        edgeOutputs.set(edge.id, input);
        console.log(`🔀 [ConditionNode] If 조건 매칭: ${edge.data?.label} -> ${edge.id}`);
      } else if (isLastEdge && !anyConditionMet) {
        edgeOutputs.set(edge.id, input);
        console.log(`🔀 [ConditionNode] Else 경로: ${edge.id}`);
      } else {
        edgeOutputs.set(edge.id, EDGE_STATES.NULL);
      }
    }
    
    return {
      success: true,
      output: input,
      edgeOutputs
    };
  }
}
