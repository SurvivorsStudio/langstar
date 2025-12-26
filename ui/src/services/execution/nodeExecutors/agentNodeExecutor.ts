/**
 * Agent 노드 실행자
 * 
 * Agent 노드는 LLM 에이전트를 실행하여 AI 응답을 생성합니다.
 * 메모리, 도구, 프롬프트 설정을 지원합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { executeAgentNode, AgentNodePayload, AgentTool } from '../../nodeApi/agentNodeApi';
import { convertToPythonNotation } from '../../../utils/dataTransform';
import { AIConnection } from '../../../types/aiConnection';

export class AgentNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, input, nodes, chatId, nodeId } = context;
    
    console.log(`🤖 [AgentNode ${nodeId}] ===== AGENT NODE EXECUTION START =====`);
    console.log(`[AgentNode ${nodeId}] 실행 시작. 입력 데이터:`, JSON.parse(JSON.stringify(input || {})));
    
    const agentConfig = node.data.config || {};
    const {
      model: modelConnection,
      systemPromptInputKey,
      userPromptInputKey,
      memoryGroup,
      tools,
      agentOutputVariable,
      topK,
      topP,
      temperature,
      maxTokens,
    } = agentConfig;

    // 필수 설정값 확인
    if (!modelConnection || typeof modelConnection !== 'object') {
      console.error(`[AgentNode ${nodeId}] 오류: Agent model이 올바르게 설정되지 않았습니다.`);
      return {
        success: false,
        output: { error: 'Agent model is not configured correctly.' },
        error: 'Agent model is not configured correctly.'
      };
    }

    if (!systemPromptInputKey || !userPromptInputKey) {
      console.error(`[AgentNode ${nodeId}] 오류: System Prompt Input Key와 User Prompt Input Key를 모두 설정해야 합니다.`);
      return {
        success: false,
        output: { 
          error: 'System Prompt Input Key와 User Prompt Input Key를 모두 설정해야 합니다.',
          systemPromptInputKey: systemPromptInputKey || null,
          userPromptInputKey: userPromptInputKey || null
        },
        error: 'System Prompt Input Key와 User Prompt Input Key를 모두 설정해야 합니다.'
      };
    }

    // 모델 정보 변환
    const modelForAPI: any = {
      connName: (modelConnection as AIConnection).name,
      providerName: (modelConnection as AIConnection).provider,
      modelName: (modelConnection as AIConnection).model,
    };
    
    if ((modelConnection as AIConnection).provider.toLowerCase() === 'aws') {
      modelForAPI.accessKeyId = (modelConnection as AIConnection).accessKeyId;
      modelForAPI.secretAccessKey = (modelConnection as AIConnection).secretAccessKey;
      modelForAPI.region = (modelConnection as AIConnection).region;
    } else {
      modelForAPI.apiKey = (modelConnection as AIConnection).apiKey;
    }

    const modelSetting = {
      topK: topK ?? 40,
      topP: topP ?? 1,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 1000,
    };

    const finalAgentOutputVariable = agentOutputVariable || 'agent_response';
    
    // 프롬프트 키를 Python 표기법으로 변환
    const systemPromptForAPI = convertToPythonNotation(systemPromptInputKey);
    const userPromptForAPI = convertToPythonNotation(userPromptInputKey);

    console.log(`[AgentNode ${nodeId}] System Prompt Key: "${systemPromptInputKey}" → "${systemPromptForAPI}"`);
    console.log(`[AgentNode ${nodeId}] User Prompt Key: "${userPromptInputKey}" → "${userPromptForAPI}"`);

    // 메모리 설정 처리
    let memoryTypeForAPI: string | undefined = undefined;
    let memoryGroupNameForAPI: string | undefined = undefined;
    let memoryWindowSizeForAPI: number | undefined = undefined;
    
    if (memoryGroup) {
      const toolsMemoryNode = nodes.find(n => n.type === 'toolsMemoryNode');
      if (toolsMemoryNode && toolsMemoryNode.data.config?.groups) {
        const allGroups = toolsMemoryNode.data.config.groups as Array<{ 
          id: string; 
          name: string; 
          type: string; 
          memoryType?: string; 
          windowSize?: number; 
          [key: string]: any 
        }>;
        
        const selectedGroupDetails = allGroups.find(g => g.id === memoryGroup);
        if (selectedGroupDetails && selectedGroupDetails.type === 'memory') {
          memoryTypeForAPI = selectedGroupDetails.memoryType || 'ConversationBufferMemory';
          
          if (memoryTypeForAPI === 'ConversationBufferWindowMemory') {
            memoryWindowSizeForAPI = selectedGroupDetails.windowSize || 5;
          }
          
          memoryGroupNameForAPI = selectedGroupDetails.name;
          console.log(`[AgentNode ${nodeId}] Memory Group: ${selectedGroupDetails.name}, Type: ${memoryTypeForAPI}`);
        }
      }
    }

    // 도구 설정 처리
    const selectedToolIds = Array.isArray(tools) ? (tools as string[]) : [];
    const tools_for_api: AgentTool[] = [];
    
    if (selectedToolIds.length > 0) {
      const toolsMemoryNode = nodes.find(n => n.type === 'toolsMemoryNode');
      if (toolsMemoryNode && toolsMemoryNode.data.config?.groups) {
        const allGroups = toolsMemoryNode.data.config.groups as Array<{ 
          id: string; 
          name: string; 
          type: string; 
          description?: string; 
          code?: string; 
          [key: string]: any 
        }>;
        
        selectedToolIds.forEach(toolId => {
          const toolGroup = allGroups.find(g => g.id === toolId);
          if (toolGroup && toolGroup.type === 'tools') {
            tools_for_api.push({
              tool_name: toolGroup.name || 'Unnamed Tool',
              tool_description: toolGroup.description || 'No description',
              tool_code: toolGroup.code || ''
            });
          }
        });
      }
    }

    // API 페이로드 구성
    const payload: AgentNodePayload = {
      model: modelForAPI,
      modelSetting,
      system_prompt: systemPromptForAPI,
      user_prompt: userPromptForAPI,
      data: input,
      memory_group: memoryGroup || undefined,
      memory_group_name: memoryGroupNameForAPI,
      tools: tools_for_api,
      memory_type: memoryTypeForAPI,
      memory_window_size: memoryWindowSizeForAPI,
      return_key: finalAgentOutputVariable,
      chat_id: chatId
    };

    try {
      const apiResponse = await executeAgentNode(payload);
      
      if (apiResponse.error) {
        console.error(`❌ [AgentNode ${nodeId}] API 호출 실패:`, apiResponse.error);
        return {
          success: false,
          output: { error: apiResponse.error, details: apiResponse.details },
          error: apiResponse.error,
          details: apiResponse.details
        };
      }
      
      const output = { ...input, [finalAgentOutputVariable]: apiResponse };
      console.log(`✅ [AgentNode ${nodeId}] API 응답 성공`);
      console.log(`🤖 [AgentNode ${nodeId}] ===== AGENT NODE EXECUTION SUCCESS =====`);
      
      return {
        success: true,
        output
      };
    } catch (error) {
      console.error(`❌ [AgentNode ${nodeId}] 실행 실패:`, error);
      console.log(`🤖 [AgentNode ${nodeId}] ===== AGENT NODE EXECUTION FAILED =====`);
      return {
        success: false,
        output: { error: 'Failed to execute agent node' },
        error: 'Failed to execute agent node',
        details: (error as Error).message
      };
    }
  }
}
