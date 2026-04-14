/**
 * Merge 노드 실행자
 * 
 * Merge 노드는 여러 입력을 병합하여 하나의 출력을 생성합니다.
 * 모든 입력 엣지에 데이터가 준비될 때까지 대기합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { executeMergeNode, MergeNodeConfig } from '../../nodeApi/mergeNodeApi';
import { hasValidEdgeData } from '../../../utils/edgeUtils';
import { EDGE_STATES } from '../../../types/edge';

export class MergeNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, nodeId, edges, nodes } = context;
    
    // 1단계: 들어오는 엣지들 확인
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    const edgeIds = incomingEdges.map(edge => edge.id);
    
    console.log(`[MergeNode ${nodeId}] 총 ${edgeIds.length}개 edge 확인 시작`);
    
    // 2단계: 각 엣지의 데이터 존재 여부 확인
    const edgeDataCheck = edgeIds.map(edgeId => {
      const edge = edges.find(e => e.id === edgeId);
      const hasRealData = hasValidEdgeData(edge);
      
      return {
        edgeId,
        sourceNode: edge?.source || 'unknown',
        hasData: hasRealData,
        currentOutput: edge?.data?.output,
        isPending: edge?.data?.output === EDGE_STATES.PENDING,
        isNull: edge?.data?.output === EDGE_STATES.NULL || edge?.data?.output === null,
        timestamp: edge?.data?.timestamp || 0
      };
    });
    
    // 3단계: 데이터 준비 상태 확인
    const edgesWithRealData = edgeDataCheck.filter(check => check.hasData);
    const pendingEdgesCount = edgeDataCheck.filter(check => check.isPending).length;
    const nullEdgesCount = edgeDataCheck.filter(check => check.isNull).length;
    
    console.log(`[MergeNode ${nodeId}] Edge 데이터 상태:`, {
      총Edge수: edgeIds.length,
      실제데이터있음: edgesWithRealData.length,
      PENDING상태: pendingEdgesCount,
      NULL상태: nullEdgesCount
    });
    
    // 4단계: 모든 엣지에 데이터가 있는지 확인
    const allEdgesHaveData = edgesWithRealData.length === edgeIds.length;
    
    if (!allEdgesHaveData) {
      const missingDataEdges = edgeDataCheck.filter(check => !check.hasData);
      
      console.log(`[MergeNode ${nodeId}] 대기 중: ${edgesWithRealData.length}/${edgeIds.length} edges ready`);
      
      return {
        success: false,
        output: {
          status: 'waiting',
          message: `Edge 데이터 대기 중: ${edgesWithRealData.length}/${edgeIds.length} ready`,
          waitingReason: 'edge_data_insufficient',
          edgeAnalysis: {
            totalEdges: edgeIds.length,
            readyEdges: edgesWithRealData.length,
            pendingEdges: pendingEdgesCount,
            nullEdges: nullEdgesCount,
            missingDataEdges: missingDataEdges.map(check => ({
              id: check.edgeId,
              source: check.sourceNode,
              reason: check.isPending ? 'PENDING' : check.isNull ? 'NULL' : 'NO_DATA',
              timestamp: check.timestamp
            }))
          }
        }
      };
    }
    
    // 5단계: 모든 데이터 준비 완료 - merge 실행
    console.log(`[MergeNode ${nodeId}] 모든 edge 데이터 준비 완료 - merge 실행`);
    
    // 엣지 데이터를 노드별로 그룹화
    const mergedData: Record<string, any> = {};
    
    edgesWithRealData.forEach(check => {
      const edge = edges.find(e => e.id === check.edgeId);
      if (edge) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const sourceNodeName = sourceNode ? sourceNode.data.label : edge.source;
        mergedData[sourceNodeName] = edge.data.output;
      }
    });
    
    // Merge 설정 준비
    const config: MergeNodeConfig = {
      mergeMappings: (node.data.config?.mergeMappings || []).map((m: any) => {
        const sourceNode = nodes.find(n => n.id === m.sourceNodeId);
        const sourceNodeName = sourceNode ? sourceNode.data.label : m.sourceNodeId;
        
        return {
          outputKey: m.outputKey,
          sourceNodeId: sourceNodeName,
          sourceNodeKey: m.sourceNodeKey
        };
      })
    };
    
    if (!config.mergeMappings || config.mergeMappings.length === 0) {
      console.warn(`[MergeNode ${nodeId}] No merge mappings defined`);
      return {
        success: false,
        output: { error: 'No merge mappings configured' },
        error: 'No merge mappings configured'
      };
    }
    
    try {
      const output = await executeMergeNode(nodeId, config, mergedData);
      
      if (output.error) {
        return {
          success: false,
          output: { error: output.error, details: output.details },
          error: output.error,
          details: output.details
        };
      }
      
      console.log(`[MergeNode ${nodeId}] Merge 성공`);
      return {
        success: true,
        output
      };
    } catch (error) {
      console.error(`[MergeNode ${nodeId}] 실행 실패:`, error);
      return {
        success: false,
        output: { error: 'Failed to execute merge node' },
        error: 'Failed to execute merge node',
        details: (error as Error).message
      };
    }
  }
}
