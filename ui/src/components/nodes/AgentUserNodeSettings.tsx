import React, { useState, useEffect, useRef } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Pencil, Check } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';
import * as storageService from '../../services/storageService';

interface AgentUserNodeSettingsProps {
  agentNodeId: string;
  userNode: any;
}

const AgentUserNodeSettings: React.FC<AgentUserNodeSettingsProps> = ({ agentNodeId, userNode }) => {
  const { getNodeById, updateNodeData } = useFlowStore();
  const agentNode = getNodeById(agentNodeId);
  
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);
  const outputVariableInputRef = useRef<HTMLInputElement>(null);
  
  // MongoDB에서 가져온 전체 UserNode 데이터
  const [fullUserNode, setFullUserNode] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // AgentNodePopup의 UserNode이므로 입력 데이터가 없음 (Agent 내부에서 사용되므로)
  const availableInputKeys: string[] = [];
  const hasValidOutput = false;
  const availableVariables: string[] = [];
  
  // MongoDB에서 UserNode 전체 정보 가져오기
  useEffect(() => {
    const fetchUserNodeData = async () => {
      if (!userNode?.name && !userNode?.id) {
        setLoadError('UserNode name 또는 ID가 없습니다.');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // name으로 먼저 조회 시도
        if (userNode.name) {
          console.log('[AgentUserNodeSettings] Fetching UserNode from MongoDB by name:', userNode.name);
          try {
            const nodeData = await storageService.getUserNodeByName(userNode.name);
            console.log('[AgentUserNodeSettings] Fetched UserNode data by name:', nodeData);
            setFullUserNode(nodeData);
            setLoadError(null);
            setIsLoading(false);
            return;
          } catch (nameError) {
            console.warn('[AgentUserNodeSettings] Failed to fetch by name, trying by ID:', nameError);
          }
        }
        
        // name으로 실패하면 id로 조회 시도 (fallback)
        if (userNode.id) {
          console.log('[AgentUserNodeSettings] Fetching UserNode from MongoDB by ID:', userNode.id);
          const nodeData = await storageService.getUserNodeById(userNode.id);
          console.log('[AgentUserNodeSettings] Fetched UserNode data by ID:', nodeData);
          setFullUserNode(nodeData);
          setLoadError(null);
        } else {
          throw new Error('ID로도 조회할 수 없습니다.');
        }
      } catch (error) {
        console.error('[AgentUserNodeSettings] Failed to fetch UserNode:', error);
        setLoadError('UserNode 정보를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserNodeData();
  }, [userNode?.id, userNode?.name]);
  
  // Auto focus and position cursor at the end when editing starts
  useEffect(() => {
    if (isEditingOutputVariable && outputVariableInputRef.current) {
      requestAnimationFrame(() => {
        if (outputVariableInputRef.current) {
          outputVariableInputRef.current.focus();
          const value = outputVariableInputRef.current.value;
          outputVariableInputRef.current.setSelectionRange(value.length, value.length);
        }
      });
    }
  }, [isEditingOutputVariable]);

  // parameters의 실질적인 내용 변경만 감지하기 위한 안정적인 키 생성
  const parametersKey = fullUserNode?.parameters
    ? fullUserNode.parameters.map((p: any) => `${p.name}-${p.inputType}-${p.required}`).join('|')
    : '';

  useEffect(() => {
    if (fullUserNode?.parameters && !isLoading) {
      // AgentNode의 userNodes 배열에서 현재 userNode의 설정 찾기
      const savedUserNode = agentNode?.data.userNodes?.find((un: any) => un.id === userNode.id);
      const existingSettings = savedUserNode?.config?.settings || {};
      const existingInputData = savedUserNode?.config?.inputData || {};
      
      const initialSettings: Record<string, any> = {};
      const initialInputData: Record<string, any> = {};
      
      fullUserNode.parameters.forEach((param: any) => {
        if (param.inputType === 'select box') {
          // 기존 설정값이 있으면 사용, 없으면 MongoDB의 matchData 사용
          initialInputData[param.name] = existingInputData[param.name] || param.matchData || '';
        } else if (param.inputType === 'text box') {
          // 기존 설정값이 있으면 사용, 없으면 MongoDB의 matchData 사용
          initialSettings[param.name] = existingSettings[param.name] || param.matchData || '';
        } else if (param.inputType === 'checkbox') {
          // 기존 설정값이 있으면 사용, 없으면 MongoDB의 matchData를 배열로 변환
          if (existingSettings[param.name]) {
            initialSettings[param.name] = existingSettings[param.name];
          } else if (param.matchData) {
            // matchData가 문자열이면 배열로 변환 (쉼표로 분리)
            initialSettings[param.name] = typeof param.matchData === 'string' 
              ? param.matchData.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [];
          } else {
            initialSettings[param.name] = [];
          }
        } else if (param.inputType === 'radio button') {
          // 기존 설정값이 있으면 사용, 없으면 MongoDB의 matchData 사용
          initialSettings[param.name] = existingSettings[param.name] || param.matchData || '';
        }
      });
      
      const currentSettingsStr = JSON.stringify(settings);
      const currentInputDataStr = JSON.stringify(inputData);
      const newSettingsStr = JSON.stringify(initialSettings);
      const newInputDataStr = JSON.stringify(initialInputData);
      
      if (currentSettingsStr !== newSettingsStr) {
        setSettings(initialSettings);
      }
      if (currentInputDataStr !== newInputDataStr) {
        setInputData(initialInputData);
      }
    }
  }, [fullUserNode?.id, parametersKey, isLoading]);

  const handleSettingChange = (paramName: string, value: any) => {
    if (settings[paramName] === value) {
      return;
    }
    
    const newSettings = { ...settings, [paramName]: value };
    setSettings(newSettings);
    
    // AgentNode의 userNodes 배열 업데이트
    updateUserNodeInAgent(newSettings, inputData);
  };

  const handleInputDataChange = (paramName: string, value: any) => {
    if (inputData[paramName] === value) {
      return;
    }
    
    const newInputData = { ...inputData, [paramName]: value };
    setInputData(newInputData);
    
    // AgentNode의 userNodes 배열 업데이트
    updateUserNodeInAgent(settings, newInputData);
  };

  const handleOutputVariableChange = (value: string) => {
    if (!agentNode || !agentNode.data) {
      console.warn(`[AgentUserNodeSettings] AgentNode data for node ID ${agentNodeId} is not available.`);
      return;
    }
    
    // AgentNode의 userNodes 배열에서 현재 userNode 찾아서 업데이트
    const updatedUserNodes = (agentNode.data.userNodes || []).map((un: any) => {
      if (un.id === userNode.id) {
        return {
          ...un,
          config: {
            ...(un.config || {}),
            outputVariable: value,
            settings,
            inputData
          }
        };
      }
      return un;
    });
    
    console.log('[AgentUserNodeSettings] Updating output variable:', value);
    
    updateNodeData(agentNodeId, {
      ...agentNode.data,
      userNodes: updatedUserNodes
    });
  };

  const updateUserNodeInAgent = (newSettings: Record<string, any>, newInputData: Record<string, any>) => {
    if (!agentNode || !agentNode.data || !fullUserNode) {
      console.warn(`[AgentUserNodeSettings] AgentNode data for node ID ${agentNodeId} is not available.`);
      return;
    }
    
    // matchData 업데이트: parameters의 matchData를 현재 설정값으로 업데이트
    const updatedParameters = fullUserNode.parameters.map((param: any) => {
      const newParam = { ...param };
      
      if (param.inputType === 'select box') {
        // select box는 inputData에서 가져옴
        newParam.matchData = newInputData[param.name] || param.matchData || '';
      } else if (param.inputType === 'text box') {
        // text box는 settings에서 가져옴
        newParam.matchData = newSettings[param.name] || param.matchData || '';
      } else if (param.inputType === 'checkbox') {
        // checkbox는 배열을 쉼표로 연결된 문자열로 변환
        const checkboxValues = newSettings[param.name] || [];
        newParam.matchData = Array.isArray(checkboxValues) ? checkboxValues.join(', ') : param.matchData || '';
      } else if (param.inputType === 'radio button') {
        // radio button은 settings에서 가져옴
        newParam.matchData = newSettings[param.name] || param.matchData || '';
      }
      
      return newParam;
    });
    
    // AgentNode의 userNodes 배열에서 현재 userNode 찾아서 업데이트
    const updatedUserNodes = (agentNode.data.userNodes || []).map((un: any) => {
      if (un.id === userNode.id) {
        return {
          ...un,
          parameters: updatedParameters, // 업데이트된 parameters (matchData 포함)
          config: {
            ...(un.config || {}),
            settings: newSettings,
            inputData: newInputData
          }
        };
      }
      return un;
    });
    
    console.log('[AgentUserNodeSettings] Updating AgentNode with new settings:', {
      settings: newSettings,
      inputData: newInputData,
      parameters: updatedParameters
    });
    
    updateNodeData(agentNodeId, {
      ...agentNode.data,
      userNodes: updatedUserNodes
    });
  };

  const handleCheckboxChange = (paramName: string, optionValue: string, checked: boolean) => {
    const currentValues = settings[paramName] || [];
    let newValues;
    
    if (checked) {
      newValues = [...currentValues, optionValue];
    } else {
      newValues = currentValues.filter((value: string) => value !== optionValue);
    }
    
    handleSettingChange(paramName, newValues);
  };

  const handleRadioChange = (paramName: string, value: string) => {
    handleSettingChange(paramName, value);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">UserNode 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (loadError || !fullUserNode) {
    return (
      <div className="p-4">
        <div className="text-red-500 dark:text-red-400 mb-2">
          <AlertCircle size={20} className="inline mr-2" />
          {loadError || 'UserNode를 찾을 수 없습니다.'}
        </div>
        <p className="text-xs text-gray-400 mt-2">UserNode Name: {userNode?.name}</p>
        <p className="text-xs text-gray-400 mt-1">UserNode ID: {userNode?.id}</p>
        <p className="text-xs text-gray-400 mt-1">MongoDB에서 데이터를 가져올 수 없습니다.</p>
        
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-2">💡 해결 방법:</p>
          <ol className="text-xs text-yellow-700 dark:text-yellow-300 list-decimal list-inside space-y-1">
            <li>이 UserNode를 AgentNode에서 삭제합니다</li>
            <li>왼쪽 사이드바에서 UserNode를 다시 AgentNode로 드래그합니다</li>
            <li>이렇게 하면 올바른 정보가 저장됩니다</li>
          </ol>
        </div>
        
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-1">
            현재 저장된 정보:
          </p>
          <pre className="text-xs text-gray-500 dark:text-gray-400 overflow-auto max-h-40">
            {JSON.stringify(userNode, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (!fullUserNode.parameters || fullUserNode.parameters.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-500 dark:text-gray-400">이 UserNode에는 설정 가능한 파라미터가 없습니다.</p>
        <p className="text-xs text-gray-400 mt-2">Parameters가 정의되지 않았습니다.</p>
      </div>
    );
  }

  const savedUserNode = agentNode?.data.userNodes?.find((un: any) => un.id === userNode.id);
  const outputVariable = savedUserNode?.config?.outputVariable || 'result';

  return (
    <div className="space-y-4">
      {/* Output Variable 설정 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
          Output Variable
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          이 UserNode는 Agent 내부에서 실행됩니다.
        </p>
        <div className="relative">
          <div className="flex items-center space-x-2">
            {isEditingOutputVariable ? (
              <>
                <input
                  ref={outputVariableInputRef}
                  type="text"
                  value={outputVariable}
                  onChange={(e) => handleOutputVariableChange(e.target.value)}
                  placeholder="Enter output variable name"
                  className="flex-grow px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
                <button
                  onClick={() => setIsEditingOutputVariable(false)}
                  className="p-2 rounded-md flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Confirm output variable"
                >
                  <Check size={18} />
                </button>
              </>
            ) : (
              <>
                <div>
                  <CustomSelect
                    value={outputVariable}
                    onChange={handleOutputVariableChange}
                    options={[
                      { value: 'result', label: 'result (Default)' },
                      ...(outputVariable !== 'result'
                        ? [{ value: outputVariable, label: `${outputVariable} (Custom)` }]
                        : [])
                    ]}
                    placeholder="Select output variable"
                    disabled={false}
                  />
                </div>
                <button 
                  onClick={() => setIsEditingOutputVariable(true)} 
                  className="p-2 rounded-md flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Edit output variable"
                >
                  <Pencil size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {fullUserNode.parameters.map((param: any, index: number) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {param.name}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {param.inputType === 'select box' ? (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {param.description || 'Agent 내부에서 사용되는 파라미터입니다.'}
                </p>
                
                <select
                  value={inputData[param.name] || ''}
                  onChange={(e) => handleInputDataChange(param.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">키를 선택하세요</option>
                  {availableInputKeys.map(key => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>

                <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">
                  <AlertCircle size={12} className="inline mr-1" />
                  Agent 내부에서 실행되므로 입력 데이터가 제한됩니다.
                </p>
              </div>
            ) : param.inputType === 'text box' ? (
              <input
                type="text"
                value={settings[param.name] || ''}
                onChange={(e) => handleSettingChange(param.name, e.target.value)}
                placeholder={`${param.name} 입력`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            ) : param.inputType === 'checkbox' ? (
              <div>
                {param.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {param.description}
                  </p>
                )}
                <div className="space-y-2">
                  {param.options && param.options.length > 0 ? (
                    param.options.map((option: string, optionIndex: number) => (
                      <label key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={(settings[param.name] || []).includes(option)}
                          onChange={(e) => handleCheckboxChange(param.name, option, e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {option}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-red-500 dark:text-red-400">
                      체크박스 옵션이 설정되지 않았습니다.
                    </p>
                  )}
                </div>
              </div>
            ) : param.inputType === 'radio button' ? (
              <div>
                {param.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {param.description}
                  </p>
                )}
                <div className="space-y-2">
                  {param.options && param.options.length > 0 ? (
                    param.options.map((option: string, optionIndex: number) => (
                      <label key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`radio_${param.name}_${index}`}
                          checked={settings[param.name] === option}
                          onChange={() => handleRadioChange(param.name, option)}
                          className="border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {option}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-red-500 dark:text-red-400">
                      라디오 버튼 옵션이 설정되지 않았습니다.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                지원하지 않는 입력 타입: {param.inputType}
              </p>
            )}
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          현재 설정값
        </h4>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <pre className="text-xs text-gray-600 dark:text-gray-400">
            {JSON.stringify({ settings, inputData, outputVariable }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AgentUserNodeSettings;

