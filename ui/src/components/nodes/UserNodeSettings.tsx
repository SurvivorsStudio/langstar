import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Pencil, Check, Search } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';
import HierarchicalKeySelector from '../Common/HierarchicalKeySelector';

interface UserNodeSettingsProps {
  nodeId: string;
}

const UserNodeSettings: React.FC<UserNodeSettingsProps> = ({ nodeId }) => {
  const { getNodeById, updateNodeData, nodes, edges } = useFlowStore();
  const node = getNodeById(nodeId);
  

  
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);
  const [isKeySelectorOpen, setIsKeySelectorOpen] = useState(false);
  const [currentSelectingParam, setCurrentSelectingParam] = useState<string | null>(null);
  
  // Input Data에서 사용 가능한 키 값들을 가져오기
  const getAvailableInputKeys = () => {
    if (!node) return [];
    
    // 현재 노드로 들어오는 엣지들 찾기
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    
    // 가장 최근의 유효한 input data 찾기
    const validEdges = incomingEdges
      .filter(edge => edge.data?.output && typeof edge.data.output === 'object')
      .sort((a, b) => (b.data?.timestamp || 0) - (a.data?.timestamp || 0));
    
    if (validEdges.length > 0) {
      const latestOutput = validEdges[0].data.output;
      return Object.keys(latestOutput);
    }
    
    return [];
  };
  
  const availableInputKeys = getAvailableInputKeys();

  // 새로운 트리뷰 팝업을 사용할지 확인
  const shouldUseTreeView = () => {
    const incomingEdge = edges.find(edge => edge.target === nodeId);
    if (!incomingEdge?.data?.output) return false;
    
    const output = incomingEdge.data.output;
    // 데이터가 있으면 항상 새로운 트리뷰 사용 (훨씬 좋은 UX)
    return Object.keys(output).length > 0;
  };

  // 전체 input data 가져오기 (계층적 선택을 위해)
  const getFullInputData = () => {
    const incomingEdge = edges.find(edge => edge.target === nodeId);
    return incomingEdge?.data?.output || {};
  };

  // 계층적 선택기 열기
  const openKeySelector = (paramName: string) => {
    setCurrentSelectingParam(paramName);
    setIsKeySelectorOpen(true);
  };

  // 계층적 선택기에서 키 선택 처리
  const handleKeySelect = (key: string) => {
    if (currentSelectingParam) {
      handleInputDataChange(currentSelectingParam, key);
    }
    setIsKeySelectorOpen(false);
    setCurrentSelectingParam(null);
  };

  // Get available variables from source node output
  const incomingEdge = edges.find(edge => edge.target === nodeId);
  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  useEffect(() => {
    if (node?.data.config?.parameters) {
      // 기존 설정값을 불러오거나 초기화
      const existingSettings = node.data.config.settings || {};
      const existingInputData = node.data.config.inputData || {};
      
      const initialSettings: Record<string, any> = {};
      const initialInputData: Record<string, any> = {};
      
      node.data.config.parameters.forEach(param => {
        if (param.inputType === 'select box') {
          // select box의 경우 기존 값이 있으면 사용, 없으면 빈 문자열
          initialInputData[param.name] = existingInputData[param.name] || '';
        } else if (param.inputType === 'text box') {
          // text box의 경우 기존 값이 있으면 사용, 없으면 빈 문자열
          initialSettings[param.name] = existingSettings[param.name] || '';
        }
      });
      
      // 현재 상태와 새로운 초기값을 비교하여 변경이 있을 때만 업데이트
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

  }, [node?.id, node?.data.config?.parameters]); // inputData 제거하고 parameters만 감지


  const handleSettingChange = (paramName: string, value: any) => {
    // 값이 실제로 변경되었는지 확인
    if (settings[paramName] === value) {
      return;
    }
    
    const newSettings = { ...settings, [paramName]: value };
    setSettings(newSettings);
    
    // 노드 데이터 업데이트
    updateNodeData(nodeId, {
      config: {
        ...node?.data.config,
        settings: newSettings
      }
    });
  };

  const handleInputDataChange = (paramName: string, value: any) => {
    // 값이 실제로 변경되었는지 확인
    if (inputData[paramName] === value) {
      return;
    }
    
    const newInputData = { ...inputData, [paramName]: value };
    setInputData(newInputData);
    
    // 노드 데이터 업데이트
    updateNodeData(nodeId, {
      config: {
        ...node?.data.config,
        inputData: newInputData
      }
    });
  };

  const handleOutputVariableChange = (value: string) => {
    if (!node || !node.data) {
      console.warn(`[UserNodeSettings] Node data for node ID ${nodeId} is not available. Cannot update outputVariable.`);
      return;
    }
    
    // 값이 실제로 변경되었는지 확인
    if (node.data.config?.outputVariable === value) {
      return;
    }
    
    updateNodeData(nodeId, {
      ...node.data,
      config: {
        ...(node.data.config || {}),
        outputVariable: value
      }
    });
  };

  if (!node) {
    return (
      <div className="p-4">
        <p className="text-gray-500 dark:text-gray-400">노드를 찾을 수 없습니다.</p>
        <pre className="text-xs mt-2">{JSON.stringify({ nodeId }, null, 2)}</pre>
      </div>
    );
  }

  if (!node.data.config?.parameters) {
    return (
      <div className="p-4">
        <p className="text-gray-500 dark:text-gray-400">UserNode 설정을 불러올 수 없습니다.</p>
        <p className="text-xs text-gray-400 mt-2">Node type: {node.type}</p>
        <p className="text-xs text-gray-400">Node data: {JSON.stringify(node.data, null, 2)}</p>
        <p className="text-xs text-gray-400">Config: {JSON.stringify(node.data.config, null, 2)}</p>
        <p className="text-xs text-gray-400">Parameters: {JSON.stringify(node.data.config?.parameters, null, 2)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          UserNode Settings
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure your custom node parameters here.
        </p>
      </div>

      {/* Output Variable 설정 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
          Output Variable
        </label>
        <div className="relative">
          <div className="flex items-center space-x-2">
            {isEditingOutputVariable ? (
              <>
                <input
                  type="text"
                  value={node?.data.config?.outputVariable || 'result'}
                  onChange={(e) => handleOutputVariableChange(e.target.value)}
                  placeholder="Enter output variable name"
                  className={`flex-grow px-3 py-2 border ${
                    !hasValidOutput && availableVariables.length === 0 
                      ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                  disabled={!hasValidOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable}
                />
                <button
                  onClick={() => setIsEditingOutputVariable(false)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0"
                  aria-label="Confirm output variable"
                >
                  <Check size={18} />
                </button>
              </>
            ) : (
              <>
                <CustomSelect
                  value={node?.data.config?.outputVariable || 'result'}
                  onChange={handleOutputVariableChange}
                  options={[
                    { value: 'result', label: 'result (Default)' },
                    ...(node?.data.config?.outputVariable && !availableVariables.includes(node.data.config.outputVariable) && node.data.config.outputVariable !== 'result'
                      ? [{ value: node.data.config.outputVariable, label: `${node.data.config.outputVariable} (Custom)` }]
                      : []),
                    ...availableVariables.map(variable => ({ value: variable, label: variable }))
                  ]}
                  placeholder="Select output variable"
                  disabled={!hasValidOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable}
                />
                <button 
                  onClick={() => setIsEditingOutputVariable(true)} 
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0" 
                  aria-label="Edit output variable"
                >
                  <Pencil size={18} />
                </button>
              </>
            )}
          </div>
          {!incomingEdge && (
            <div className="flex items-center mt-1 text-amber-500 text-xs">
              <AlertCircle size={12} className="mr-1" />
              Connect an input node to access variables
            </div>
          )}
          {incomingEdge && !hasValidOutput && (
            <div className="flex items-center mt-1 text-amber-500 text-xs">
              <AlertCircle size={12} className="mr-1" />
              Execute the connected node to access its output variables
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {node.data.config.parameters.map((param, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {param.name}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {param.inputType === 'select box' ? (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {param.description || 'Input Data에서 사용 가능한 키 값을 선택하세요.'}
                </p>
                
                {shouldUseTreeView() ? (
                  /* 데이터가 있는 경우 - 향상된 트리뷰 선택기 사용 */
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => openKeySelector(param.name)}
                      disabled={availableInputKeys.length === 0 && !inputData[param.name]}
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center justify-between ${
                        availableInputKeys.length === 0 && !inputData[param.name]
                          ? 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>
                        {inputData[param.name] || '키를 선택하세요'}
                      </span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    {/* 기존 설정값 표시 */}
                    {inputData[param.name] && !availableInputKeys.includes(inputData[param.name]) && (
                      <p className="text-xs text-amber-500 dark:text-amber-400">
                        선택된 키: {inputData[param.name]} (더 이상 사용할 수 없음)
                      </p>
                    )}
                  </div>
                ) : (
                  /* 데이터가 없는 경우 - 기존 select 사용 */
                  <select
                    value={inputData[param.name] || ''}
                    onChange={(e) => handleInputDataChange(param.name, e.target.value)}
                    disabled={availableInputKeys.length === 0 && !inputData[param.name]}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                      availableInputKeys.length === 0 && !inputData[param.name]
                        ? 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <option value="">
                      {availableInputKeys.length === 0 ? '키를 선택하세요' : '키를 선택하세요'}
                    </option>
                    {availableInputKeys.map(key => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}

                    {/* 기존 설정값이 있지만 현재 사용 가능한 키에 없으면 표시 */}
                    {inputData[param.name] && !availableInputKeys.includes(inputData[param.name]) && (
                      <option value={inputData[param.name]} disabled>
                        {inputData[param.name]}
                      </option>
                    )}
                  </select>
                )}

                {availableInputKeys.length === 0 && !inputData[param.name] && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    이전 노드에서 데이터가 전달되지 않았습니다.
                  </p>
                )}

              </div>
            ) : param.inputType === 'text box' ? (
              <input
                type="text"
                value={settings[param.name] || ''}
                onChange={(e) => handleSettingChange(param.name, e.target.value)}
                placeholder={`${param.name} 입력`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
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
            {JSON.stringify({ settings, inputData }, null, 2)}
          </pre>
        </div>
      </div>

      {/* 계층적 키 선택기 팝업 */}
      <HierarchicalKeySelector
        isOpen={isKeySelectorOpen}
        onClose={() => {
          setIsKeySelectorOpen(false);
          setCurrentSelectingParam(null);
        }}
        data={getFullInputData()}
        onSelect={handleKeySelect}
        title={`키 선택 - ${currentSelectingParam || ''}`}
        selectedKey={currentSelectingParam ? inputData[currentSelectingParam] : undefined}
      />
    </div>
  );
};

export default UserNodeSettings; 