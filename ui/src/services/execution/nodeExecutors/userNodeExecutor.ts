/**
 * User 노드 실행자
 * 
 * User 노드는 사용자 정의 Python 함수를 실행합니다.
 * 다양한 입력 타입(select box, text box, radio button, checkbox)을 지원합니다.
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from '../nodeExecutorTypes';
import { executeUserNode, UserNodeParameter } from '../../nodeApi/userNodeApi';

export class UserNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, input, nodeId } = context;
    
    const pythonCode = node.data.code || '';
    const functionName = node.data.config?.functionName || 'user_function';
    const parameters = node.data.config?.parameters || [];
    const outputVariable = node.data.config?.outputVariable || 'result';
    
    if (!pythonCode.trim()) {
      return {
        success: false,
        output: { error: 'Python code is empty' },
        error: 'Python code is empty'
      };
    }
    
    // parameters에 matchData 추가
    const parametersWithMatchData: UserNodeParameter[] = parameters.map((param: any) => {
      let matchData;
      
      if (param.inputType === 'select box') {
        // select box: inputData에서 키 값 가져오기
        matchData = node.data.config?.inputData?.[param.name] || '';
      } else if (param.inputType === 'text box') {
        // text box: settings에서 값 가져오기
        const textValue = node.data.config?.settings?.[param.name] || '';
        matchData = textValue;
      } else if (param.inputType === 'radio button') {
        // radio button: settings에서 선택된 값 가져오기
        const radioValue = node.data.config?.settings?.[param.name] || '';
        matchData = radioValue;
      } else if (param.inputType === 'checkbox') {
        // checkbox: settings에서 선택된 값들을 배열로 가져오기
        const checkboxValues = node.data.config?.settings?.[param.name] || [];
        matchData = checkboxValues;
      } else {
        matchData = '';
      }
      
      return {
        ...param,
        matchData: matchData
      };
    });
    
    // 현재 노드의 inputData 사용
    const currentInputData = node.data.inputData || {};
    
    try {
      const apiResponse = await executeUserNode(
        pythonCode,
        functionName,
        parametersWithMatchData,
        currentInputData,
        outputVariable
      );
      
      if (apiResponse.error) {
        return {
          success: false,
          output: { error: apiResponse.error, details: apiResponse.details },
          error: apiResponse.error,
          details: apiResponse.details
        };
      }
      
      // input에 API 응답을 추가하여 output 생성
      const output = { ...input, [outputVariable]: apiResponse };
      
      return {
        success: true,
        output
      };
    } catch (error) {
      console.error(`[UserNode ${nodeId}] 실행 실패:`, error);
      return {
        success: false,
        output: { error: 'Failed to execute user node' },
        error: 'Failed to execute user node',
        details: (error as Error).message
      };
    }
  }
}
