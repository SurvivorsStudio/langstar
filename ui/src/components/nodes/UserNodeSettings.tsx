import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../../store/flowStore';

interface UserNodeSettingsProps {
  nodeId: string;
}

const UserNodeSettings: React.FC<UserNodeSettingsProps> = ({ nodeId }) => {
  const { getNodeById, updateNodeData, nodes, edges } = useFlowStore();
  const node = getNodeById(nodeId);
  

  
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [inputData, setInputData] = useState<Record<string, any>>({});
  
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
      
      setSettings(initialSettings);
      setInputData(initialInputData);
    }
  }, [node?.id]); // node.id로 변경하여 노드가 변경될 때만 실행

  const handleSettingChange = (paramName: string, value: any) => {
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
                  Input Data에서 사용 가능한 키 값을 선택하세요.
                </p>
                <select
                  value={inputData[param.name] || ''}
                  onChange={(e) => handleInputDataChange(param.name, e.target.value)}
                  disabled={availableInputKeys.length === 0}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    availableInputKeys.length === 0 
                      ? 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <option value="">
                    {availableInputKeys.length === 0 ? '사용 가능한 키가 없습니다' : '키를 선택하세요'}
                  </option>
                  {availableInputKeys.map(key => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                {availableInputKeys.length === 0 && (
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
    </div>
  );
};

export default UserNodeSettings; 