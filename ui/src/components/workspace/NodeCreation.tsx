import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import CodeEditor from '../CodeEditor';
import { useFlowStore } from '../../store/flowStore';

interface NodeCreationProps {
  onSave?: () => void;
}

const NodeCreation: React.FC<NodeCreationProps> = ({ onSave }) => {
  const { addUserNode } = useFlowStore();
  const [nodeName, setNodeName] = useState('my_function');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('code');
  
  // 노드 이름 유효성 검사 함수
  const validateNodeName = (name: string): boolean => {
    // 띄어쓰기 금지, 특수문자는 언더스코어(_)만 허용
    const validNameRegex = /^[a-zA-Z0-9_]+$/;
    return validNameRegex.test(name);
  };
  const [nodeType, setNodeType] = useState('UserNode');

  const [parameters, setParameters] = useState([

    { name: 'Menu Name', inputType: 'select box', required: true, funcArgs: 'input_data', matchData: '', description: 'Input Data에서 사용 가능한 키 값을 선택하세요.' }

  ]);
  const [functionName, setFunctionName] = useState('my_function');
  const [returnType, setReturnType] = useState('str');
  const [functionDescription, setFunctionDescription] = useState('새로운 파이썬 함수');
  const [code, setCode] = useState(`import numpy
import pandas

def my_function(input_data) -> str:
    """새로운 파이썬 함수
    Args:

    Returns:
        str: 새로운 파이썬 함수
    """
    #여기에 함수 로직을 작성하세요
    pass`);

  // Parameters가 변경될 때 함수 파라미터를 자동으로 업데이트하는 함수
  const updateFunctionParameters = (newParameters: any[]) => {
    const requiredParams = newParameters
      .filter(param => param.required && param.name.trim())
      .map(param => param.funcArgs && param.funcArgs.trim() ? param.funcArgs.trim() : param.name.trim());
    
    const optionalParams = newParameters
      .filter(param => !param.required && param.name.trim())
      .map(param => param.funcArgs && param.funcArgs.trim() ? param.funcArgs.trim() : param.name.trim());
    
    // 모든 파라미터를 required 먼저, 그 다음 optional 순으로 정렬
    const allParams = [...requiredParams, ...optionalParams];
    
    // 함수 파라미터 문자열 생성
    const paramString = allParams.length > 0 ? allParams.join(', ') : 'input_data';
    
    // 기존 코드에서 함수 정의 부분을 찾아서 파라미터만 업데이트
    const functionRegex = /def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*(\w+))?:/;
    const match = code.match(functionRegex);
    
    if (match) {
      const functionName = match[1];
      const newFunctionDef = `def ${functionName}(${paramString}):`;
      
      const updatedCode = code.replace(functionRegex, newFunctionDef);
      setCode(updatedCode);
    }
  };

  // Function Name이 변경될 때 함수 이름을 업데이트하는 함수
  const updateFunctionName = (newFunctionName: string) => {
    // 빈 문자열인 경우 함수 이름 업데이트를 건너뛰기
    if (!newFunctionName.trim()) {
      return;
    }
    
    const functionRegex = /def\s+([^\s(]+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/;
    const match = code.match(functionRegex);
    
    if (match) {
      const currentFunctionName = match[1];
      const newFunctionDef = code.replace(
        new RegExp(`def\\s+${currentFunctionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`, 'g'),
        `def ${newFunctionName}(`
      );
      setCode(newFunctionDef);
    }
  };

  // Parameters가 변경될 때마다 함수 파라미터 업데이트
  React.useEffect(() => {
    updateFunctionParameters(parameters);
  }, [parameters]);

  // Function Name이 변경될 때마다 함수 이름 업데이트
  React.useEffect(() => {
    updateFunctionName(functionName);
  }, [functionName]);

  const addParameter = () => {
    const newParam = {
      name: `Menu Name${parameters.length + 1}`,
      inputType: 'select box',
      required: false,
      funcArgs: `input_data${parameters.length + 1}`,
      matchData: '',
      description: 'Input Data에서 사용 가능한 키 값을 선택하세요.'
    };
    setParameters([...parameters, newParam]);
  };

  const updateParameter = (index: number, field: string, value: string | boolean) => {
    const newParameters = [...parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setParameters(newParameters);
    
    // 파라미터 이름이나 funcArgs가 변경되면 함수 파라미터도 업데이트
    if (field === 'name' || field === 'funcArgs') {
      updateFunctionParameters(newParameters);
    }
    // description이 변경되면 즉시 상태 업데이트를 위해 강제 리렌더링
    if (field === 'description') {
      setParameters([...newParameters]);
    }
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      // 노드 이름 유효성 검사
      if (!nodeName.trim()) {
        alert('노드 이름을 입력해주세요.');
        return;
      }
      
      if (!validateNodeName(nodeName.trim())) {
        alert('노드 이름에는 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다. 띄어쓰기와 특수문자는 사용할 수 없습니다.');
        return;
      }
      
      // UserNode로 저장
      const savedUserNode = await addUserNode({
        name: nodeName.trim(),
        type: 'UserNode',
        code: code,
        parameters: parameters,
        functionName: functionName,
        returnType: returnType,
        functionDescription: functionDescription,
      });

      console.log('UserNode 저장 완료:', {
        nodeName,
        nodeType,
        parameters,
        functionName,
        returnType,
        functionDescription,
        code
      });
      

      // 이름이 자동으로 변경된 경우 사용자에게 알림
      if (savedUserNode.name !== nodeName) {
        alert(`${nodeName} 노드가 카탈로그에 추가되었습니다!\n\n참고: 이름이 "${savedUserNode.name}"로 자동 변경되었습니다. (기존에 동일한 이름의 노드가 있었습니다.)`);
      } else {
        alert(`${nodeName} 노드가 카탈로그에 추가되었습니다!`);
      }
      

      onSave?.(); // 저장 후 콜백 호출
    } catch (error) {
      console.error('노드 저장 중 오류:', error);
      alert('노드 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create New Node
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create a new custom node
          </p>
        </div>
        
        <button
          onClick={handleSave}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
          </button>
        </div>
        
      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Node Info */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
             Node Name
           </label>
                       <input
              type="text"
              value={nodeName}
              onChange={(e) => {
                const value = e.target.value;
                // 유효한 문자만 입력 허용 (띄어쓰기, 특수문자 금지, 언더스코어만 허용)
                const filteredValue = value.replace(/[^a-zA-Z0-9_]/g, '');
                setNodeName(filteredValue);
              }}
              placeholder="영문자, 숫자, _만 사용"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
         </div>

                <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
             Node Type
           </label>
           <input
             type="text"
             value={nodeType}
             onChange={(e) => setNodeType(e.target.value)}
             disabled
             className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
           />
         </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Function Name
                  </label>
                  <input
                    type="text"
                    value={functionName}
                    onChange={(e) => setFunctionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={functionDescription}
                    onChange={(e) => setFunctionDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Return Type
                  </label>
                  <input
                    type="text"
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

                        {/* Parameters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Parameters
                </h3>
                <button
                  onClick={addParameter}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                >
                  + Add Parameter
                </button>
              </div>
              
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => updateParameter(index, 'name', e.target.value)}
                          placeholder="Node Inspector menu name (letters, numbers, _ only)"
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                        <input
                          type="text"
                          value={param.funcArgs || ''}
                          onChange={(e) => updateParameter(index, 'funcArgs', e.target.value)}
                          placeholder="Func Args"
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={param.required}
                            onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">필수</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <textarea
                          value={param.description || ''}
                          onChange={(e) => updateParameter(index, 'description', e.target.value)}
                          placeholder="파라미터에 대한 설명을 입력하세요"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={param.inputType}
                          onChange={(e) => updateParameter(index, 'inputType', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        >
                          <option value="select box">Select Box</option>
                          <option value="text box">Text Box</option>
                        </select>
                        <button
                          onClick={() => removeParameter(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Code Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'code' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-700'
                }`}
                onClick={() => setActiveTab('code')}
              >
                Python Code
              </button>
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'preview' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-700'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                Node Inspector Preview
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      UserNode Settings
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Configure your custom node parameters here.
                    </p>
                  </div>

                  {/* Output Variable Preview */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                      Output Variable
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                        disabled
                      >
                        <option value="result">result (Default)</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Parameters Preview */}
                  {parameters.length > 0 && (
                    <div className="space-y-3">
                      {parameters.map((param, index) => (
                        <div key={index}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {param.name || 'Parameter Name'}
                            {param.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          
                          {param.inputType === 'select box' ? (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                {param.description || 'Input Data에서 사용 가능한 키 값을 선택하세요.'}
                              </p>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed text-sm"
                                disabled
                              >
                                <option value="">키를 선택하세요</option>
                              </select>
                              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                이전 노드에서 데이터가 전달되지 않았습니다.
                              </p>
                            </div>
                          ) : param.inputType === 'text box' ? (
                            <input
                              type="text"
                              placeholder={`${param.name || 'Parameter Name'} 입력`}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                              disabled
                            />
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              지원하지 않는 입력 타입: {param.inputType}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Current Settings Preview */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      현재 설정값
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <pre className="text-xs text-gray-600 dark:text-gray-400">
                        {JSON.stringify({ 
                          settings: {}, 
                          inputData: {} 
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'code' && (
                <div className="h-96">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language="python"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeCreation; 