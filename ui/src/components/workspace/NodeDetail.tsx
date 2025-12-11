import React, { useState } from 'react';
import { ArrowLeft, Edit, Save, X, Trash2 } from 'lucide-react';
import { useUserNodeStore } from '../../store/userNodeStore';
import CodeEditor from '../CodeEditor';

interface Parameter {
  name: string;
  inputType: string;
  required: boolean;
  funcArgs?: string;
  type?: string;
  matchData?: string;
  description?: string;
  options?: string[];
}

interface NodeDetailProps {
  nodeId: string;
  onBack: () => void;
}

const NodeDetail: React.FC<NodeDetailProps> = ({ nodeId, onBack }) => {
  const { userNodes, updateUserNode, deleteUserNode } = useUserNodeStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('code');
  
  const node = userNodes.find(n => n.id === nodeId);
  
  // 편집용 상태
  const [editName, setEditName] = useState(node?.name || '');
  const [editDescription, setEditDescription] = useState(node?.functionDescription || '');
  const [editCode, setEditCode] = useState(node?.code || '');
  const [editParameters, setEditParameters] = useState<Parameter[]>((node?.parameters as Parameter[]) || []);
  const [editFunctionName, setEditFunctionName] = useState(node?.functionName || '');
  const [editReturnType, setEditReturnType] = useState(node?.returnType || 'str');
  
  // 경고 상태 관리
  const [codeWarnings, setCodeWarnings] = useState<string[]>([]);
  
  // 이름 유효성 검사 함수
  const validateName = (name: string): boolean => {
    // 띄어쓰기 금지, 특수문자는 언더스코어(_)만 허용
    const validNameRegex = /^[a-zA-Z0-9_]+$/;
    return validNameRegex.test(name);
  };

  // Python 코드에서 함수 정보를 파싱하는 함수
  const parseFunctionFromCode = (codeText: string) => {
    try {
      // 함수 정의를 찾는 정규식 (타입 힌트와 반환 타입 포함)
      const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/;
      const match = codeText.match(functionRegex);
      
      if (!match) {
        return null;
      }

      const funcName = match[1];
      const paramString = match[2] || '';
      const returnTypeStr = match[3] ? match[3].trim() : '';

      // 파라미터 파싱
      const parsedParams: { name: string; type: string }[] = [];
      
      if (paramString.trim()) {
        // 파라미터를 쉼표로 분리하되, 괄호 안의 쉼표는 무시
        const params = paramString.split(',').map(p => p.trim()).filter(p => p);
        
        params.forEach(param => {
          // 파라미터에서 이름과 타입 분리 (예: "input_data:int" -> name: "input_data", type: "int")
          const typeMatch = param.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^=]+)/);
          if (typeMatch) {
            parsedParams.push({
              name: typeMatch[1].trim(),
              type: typeMatch[2].trim()
            });
          } else {
            // 타입 힌트가 없는 경우
            const nameMatch = param.match(/([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (nameMatch) {
              parsedParams.push({
                name: nameMatch[1].trim(),
                type: 'any'
              });
            }
          }
        });
      }

      return {
        functionName: funcName,
        parameters: parsedParams,
        returnType: returnTypeStr || 'str'
      };
    } catch (error) {
      console.error('함수 파싱 오류:', error);
      return null;
    }
  };

  // 코드와 설정이 일치하는지 검증하는 함수
  const validateCodeConsistency = (codeText: string) => {
    const warnings: string[] = [];
    const parsedFunction = parseFunctionFromCode(codeText);

    if (!parsedFunction) {
      warnings.push('⚠️ Python 코드에서 유효한 함수 정의를 찾을 수 없습니다.');
      setCodeWarnings(warnings);
      return;
    }

    // 1. 함수 이름 검증
    if (parsedFunction.functionName !== editFunctionName) {
      warnings.push(`⚠️ 함수 이름이 일치하지 않습니다. (코드: "${parsedFunction.functionName}", 설정: "${editFunctionName}")`);
    }

    // 2. 반환 타입 검증
    if (parsedFunction.returnType !== editReturnType) {
      warnings.push(`⚠️ 반환 타입이 일치하지 않습니다. (코드: "${parsedFunction.returnType}", 설정: "${editReturnType}")`);
    }

    // 3. 파라미터 검증
    const settingsParams = editParameters
      .filter(param => param && param.name && param.name.trim())
      .map(param => ({
        name: param.funcArgs && param.funcArgs.trim() ? param.funcArgs.trim() : param.name.trim(),
        type: param.type || 'any'
      }));

    // 파라미터 개수 검증
    if (parsedFunction.parameters.length !== settingsParams.length) {
      warnings.push(`⚠️ 파라미터 개수가 일치하지 않습니다. (코드: ${parsedFunction.parameters.length}개, 설정: ${settingsParams.length}개)`);
    }

    // 각 파라미터 검증
    const maxLength = Math.max(parsedFunction.parameters.length, settingsParams.length);
    for (let i = 0; i < maxLength; i++) {
      const codeParam = parsedFunction.parameters[i];
      const settingParam = settingsParams[i];

      if (codeParam && settingParam) {
        // 파라미터 이름 검증
        if (codeParam.name !== settingParam.name) {
          warnings.push(`⚠️ ${i + 1}번째 파라미터 이름이 일치하지 않습니다. (코드: "${codeParam.name}", 설정: "${settingParam.name}")`);
        }

        // 파라미터 타입 검증 (any 타입은 타입 힌트가 없는 것으로 간주)
        const codeType = codeParam.type === 'any' ? 'any' : codeParam.type;
        const settingType = settingParam.type === 'any' ? 'any' : settingParam.type;
        
        if (codeType !== settingType) {
          warnings.push(`⚠️ ${i + 1}번째 파라미터 타입이 일치하지 않습니다. (코드: "${codeType}", 설정: "${settingType}")`);
        }
      } else if (codeParam) {
        warnings.push(`⚠️ 코드에 추가 파라미터가 있습니다: "${codeParam.name}:${codeParam.type}"`);
      } else if (settingParam) {
        warnings.push(`⚠️ 설정에 추가 파라미터가 있습니다: "${settingParam.name}:${settingParam.type}"`);
      }
    }

    setCodeWarnings(warnings);
  };

  if (!node) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Node not found
          </h2>
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Node Management
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      // 경고가 있으면 저장 금지
      if (codeWarnings.length > 0) {
        return;
      }
      
      // 노드 이름 유효성 검사
      if (!editName.trim()) {
        alert('노드 이름을 입력해주세요.');
        return;
      }
      
      if (!validateName(editName.trim())) {
        alert('노드 이름에는 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다. 띄어쓰기와 특수문자는 사용할 수 없습니다.');
        return;
      }
      
      // 중복 검사 (현재 노드 제외)
      const duplicateNode = userNodes.find(n => 
        n.name === editName.trim() && n.id !== nodeId
      );
      if (duplicateNode) {
        alert(`이미 "${editName.trim()}" 이름의 노드가 존재합니다. 다른 이름을 사용해주세요.`);
        return;
      }
      
      await updateUserNode(nodeId, {
        name: editName.trim(),
        functionName: editFunctionName,
        functionDescription: editDescription,
        code: editCode,
        parameters: editParameters,
        returnType: editReturnType,
      });
      setIsEditing(false);
      alert('Node updated successfully!');
    } catch (error) {
      alert(`Error updating node: ${(error as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${node.name}"?`)) {
      try {
        await deleteUserNode(nodeId);
        onBack();
      } catch (error) {
        alert(`Error deleting node: ${(error as Error).message}`);
      }
    }
  };

  const addParameter = () => {
    const newParam: Parameter = {
      name: `Menu Name${editParameters.length + 1}`,
      inputType: 'select box',
      required: false,
      funcArgs: `input_data${editParameters.length + 1}`,
      type: 'any',
      matchData: '',
      description: 'Input Data에서 사용 가능한 키 값을 선택하세요.',
      options: []
    };
    setEditParameters([...editParameters, newParam]);
  };

  const updateParameter = (index: number, field: string, value: string | boolean | string[]) => {
    let processedValue = value;
    
    // 매개변수 이름인 경우 유효성 검사 적용
    if (field === 'name' && typeof value === 'string') {
      // 유효한 문자만 입력 허용 (띄어쓰기, 특수문자 금지, 언더스코어만 허용)
      processedValue = value.replace(/[^a-zA-Z0-9_]/g, '');
    }
    
    const newParameters: Parameter[] = [...editParameters];
    newParameters[index] = { ...newParameters[index], [field]: processedValue } as Parameter;
    setEditParameters(newParameters);
    
    // 파라미터 이름이나 funcArgs가 변경되면 함수 파라미터도 업데이트
    if (field === 'name' || field === 'funcArgs') {
      updateFunctionParameters(newParameters);
    }
    // description이 변경되면 즉시 상태 업데이트를 위해 강제 리렌더링
    if (field === 'description') {
      setEditParameters([...newParameters]);
    }
  };

  const addOption = (paramIndex: number) => {
    const newParameters: Parameter[] = [...editParameters];
    if (!newParameters[paramIndex].options) {
      newParameters[paramIndex].options = [];
    }
    newParameters[paramIndex].options!.push(`옵션 ${newParameters[paramIndex].options!.length + 1}`);
    setEditParameters(newParameters);
  };

  const updateOption = (paramIndex: number, optionIndex: number, value: string) => {
    const newParameters: Parameter[] = [...editParameters];
    if (newParameters[paramIndex].options) {
      newParameters[paramIndex].options![optionIndex] = value;
      setEditParameters(newParameters);
    }
  };

  const removeOption = (paramIndex: number, optionIndex: number) => {
    const newParameters: Parameter[] = [...editParameters];
    if (newParameters[paramIndex].options) {
      newParameters[paramIndex].options!.splice(optionIndex, 1);
      setEditParameters(newParameters);
    }
  };

  // Parameters가 변경될 때 함수 파라미터를 자동으로 업데이트하는 함수
  const updateFunctionParameters = (newParameters: Parameter[]) => {
    // 파라미터 이름과 타입 힌트를 포함하여 생성
    const createParamString = (param: Parameter): string => {
      const paramName = param.funcArgs && param.funcArgs.trim() ? param.funcArgs.trim() : param.name.trim();
      const paramType = param.type && param.type !== 'any' ? param.type : '';
      
      if (paramType) {
        return `${paramName}: ${paramType}`;
      }
      return paramName;
    };
    
    const requiredParams = newParameters
      .filter(param => param.required && param.name.trim())
      .map(param => createParamString(param));
    
    const optionalParams = newParameters
      .filter(param => !param.required && param.name.trim())
      .map(param => createParamString(param));
    
    // 모든 파라미터를 required 먼저, 그 다음 optional 순으로 정렬
    const allParams = [...requiredParams, ...optionalParams];
    
    // 함수 파라미터 문자열 생성
    const paramString = allParams.length > 0 ? allParams.join(', ') : 'input_data';
    
    // 기존 코드에서 함수 정의 부분을 찾아서 파라미터만 업데이트
    const functionRegex = /def\s+([^\s(]+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/;
    const match = editCode.match(functionRegex);
    
    if (match) {
      const functionName = match[1];
      // 반환 타입이 있으면 포함
      const returnTypePart = editReturnType && editReturnType !== 'any' ? ` -> ${editReturnType}` : '';
      const newFunctionDef = `def ${functionName}(${paramString})${returnTypePart}:`;
      
      const updatedCode = editCode.replace(functionRegex, newFunctionDef);
      setEditCode(updatedCode);
    }
  };

  // Function Name이 변경될 때 함수 이름을 업데이트하는 함수
  const updateFunctionName = (newFunctionName: string) => {
    // 빈 문자열인 경우 함수 이름 업데이트를 건너뛰기
    if (!newFunctionName.trim()) {
      return;
    }
    
    const functionRegex = /def\s+([^\s(]+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/;
    const match = editCode.match(functionRegex);
    
    if (match) {
      const currentFunctionName = match[1];
      const newFunctionDef = editCode.replace(
        new RegExp(`def\\s+${currentFunctionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`, 'g'),
        `def ${newFunctionName}(`
      );
      setEditCode(newFunctionDef);
    }
  };

  // Parameters가 변경될 때마다 함수 파라미터 업데이트
  React.useEffect(() => {
    updateFunctionParameters(editParameters);
  }, [editParameters]);

  // Function Name이 변경될 때마다 함수 이름 업데이트
  React.useEffect(() => {
    if (editFunctionName) {
      updateFunctionName(editFunctionName);
    }
  }, [editFunctionName]);

  // Return Type이 변경될 때마다 함수 정의 업데이트
  React.useEffect(() => {
    updateFunctionParameters(editParameters);
  }, [editReturnType]);

  // 코드, 함수 이름, 반환 타입, 파라미터가 변경될 때마다 일치성 검증
  React.useEffect(() => {
    if (editCode && editFunctionName && editReturnType && editParameters) {
      validateCodeConsistency(editCode);
    }
  }, [editCode, editFunctionName, editReturnType, editParameters]);

  const removeParameter = (index: number) => {
    setEditParameters(editParameters.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Edit Node' : node.name}
              </h1>
              {isEditing && codeWarnings.length > 0 && (
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  ⚠️ {codeWarnings.length}개 문제
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEditing 
                ? (codeWarnings.length > 0 
                    ? '코드와 설정을 일치시켜야 저장할 수 있습니다.'
                    : 'Modify your custom node')
                : 'Node details and configuration'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={codeWarnings.length > 0}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  codeWarnings.length > 0
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={codeWarnings.length > 0 ? '코드와 설정이 일치하지 않아 저장할 수 없습니다.' : '저장'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
                {codeWarnings.length > 0 && (
                  <span className="ml-2 text-xs">({codeWarnings.length}개 문제)</span>
                )}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </>
          )}
        </div>
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
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        const value = e.target.value;
                        // 유효한 문자만 입력 허용 (띄어쓰기, 특수문자 금지, 언더스코어만 허용)
                        const filteredValue = value.replace(/[^a-zA-Z0-9_]/g, '');
                        setEditName(filteredValue);
                      }}
                      placeholder="영문자, 숫자, _만 사용"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100">{node.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Node Type
                  </label>
                  <input
                    type="text"
                    value="UserNode"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Function Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFunctionName}
                      onChange={(e) => setEditFunctionName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100">{node.functionName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100">{node.functionDescription}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Return Type
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editReturnType}
                      onChange={(e) => setEditReturnType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100">{node.returnType}</p>
                  )}
                </div>
              </div>
            </div>



            {/* Parameters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Parameters
                </h3>
                {isEditing && (
                  <button
                    onClick={addParameter}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    + Add Parameter
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {(isEditing ? editParameters : (node.parameters as Parameter[])).map((param, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    {isEditing ? (
                      <div className="space-y-4">
                        {/* Menu Name */}
                        <div className="flex items-center space-x-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                            Menu Name
                          </label>
                          <input
                            type="text"
                            value={param.name}
                            onChange={(e) => updateParameter(index, 'name', e.target.value)}
                            placeholder="Node Inspector menu name (letters, numbers, _ only)"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          />
                        </div>

                        {/* Function Args */}
                        <div className="flex items-center space-x-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                            Function Args
                          </label>
                          <input
                            type="text"
                            value={param.funcArgs || ''}
                            onChange={(e) => updateParameter(index, 'funcArgs', e.target.value)}
                            placeholder="Func Args"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          />
                        </div>

                        {/* Type */}
                        <div className="flex items-center space-x-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                            Type
                          </label>
                          <select
                            value={param.type || 'any'}
                            onChange={(e) => updateParameter(index, 'type', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          >
                            <option value="any">any</option>
                            <option value="str">str</option>
                            <option value="int">int</option>
                            <option value="float">float</option>
                            <option value="bool">bool</option>
                            <option value="list">list</option>
                            <option value="dict">dict</option>
                          </select>
                        </div>

                        {/* Required */}
                        <div className="flex items-center space-x-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                            Required
                          </label>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={param.required}
                              onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">필수</span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="flex items-start space-x-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0 pt-2">
                            Description
                          </label>
                          <textarea
                            value={param.description || ''}
                            onChange={(e) => updateParameter(index, 'description', e.target.value)}
                            placeholder="파라미터에 대한 설명을 입력하세요"
                            rows={2}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          />
                        </div>

                        {/* Input Type and Actions */}
                        <div className="flex items-center space-x-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                            Input Type
                          </label>
                          <select
                            value={param.inputType}
                            onChange={(e) => updateParameter(index, 'inputType', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          >
                            <option value="select box">Select Box</option>
                            <option value="text box">Text Box</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="radio button">Radio Button</option>
                          </select>
                          <button
                            onClick={() => removeParameter(index)}
                            className="text-red-500 hover:text-red-700 p-2"
                            title="파라미터 삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Options management for radio button and checkbox */}
                        {(param.inputType === 'radio button' || param.inputType === 'checkbox') && (
                          <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                옵션 관리
                              </span>
                              <button
                                onClick={() => addOption(index)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs"
                              >
                                + 옵션 추가
                              </button>
                            </div>
                            <div className="space-y-2">
                              {param.options && param.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                    placeholder={`옵션 ${optionIndex + 1}`}
                                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  />
                                  <button
                                    onClick={() => removeOption(index, optionIndex)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {(!param.options || param.options.length === 0) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  옵션을 추가해주세요.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{param.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {param.inputType} • {param.required ? 'Required' : 'Optional'}
                            {param.funcArgs && ` • Func Args: ${param.funcArgs}`}
                          </p>
                          {param.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {param.description}
                            </p>
                          )}
                          {(param.inputType === 'checkbox' || param.inputType === 'radio button') && param.options && param.options.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">옵션:</p>
                              <div className="flex flex-wrap gap-1">
                                {param.options.map((option, optionIndex) => (
                                  <span key={optionIndex} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                    {option}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                className={`px-6 py-3 text-sm font-medium relative ${
                  activeTab === 'code' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-700'
                }`}
                onClick={() => setActiveTab('code')}
              >
                Python Code
                {isEditing && codeWarnings.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
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
                  {(isEditing ? editParameters : (node.parameters as Parameter[])).length > 0 && (
                    <div className="space-y-3">
                      {(isEditing ? editParameters : (node.parameters as Parameter[])).map((param, index) => (
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
                          ) : param.inputType === 'checkbox' ? (
                            <div>
                              {param.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                  {param.description}
                                </p>
                              )}
                              <div className="space-y-2">
                                {param.options && param.options.length > 0 ? (
                                  param.options.map((option, optionIndex) => (
                                    <label key={optionIndex} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        disabled
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
                                  param.options.map((option, optionIndex) => (
                                    <label key={optionIndex} className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        name={`radio_${index}`}
                                        className="border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        disabled
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
                <div className="space-y-4">
                  {/* 경고 메시지 표시 */}
                  {isEditing && codeWarnings.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                            코드와 설정이 일치하지 않습니다
                          </h3>
                          <div className="space-y-1">
                            {codeWarnings.map((warning, index) => (
                              <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                                {warning}
                              </p>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                            💡 Basic Information과 Parameters를 수정하거나 Python 코드를 수정하여 일치시켜주세요.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 일치 상태 표시 */}
                  {isEditing && codeWarnings.length === 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                      <div className="flex items-center">
                        <span className="text-green-600 dark:text-green-400 text-sm mr-2">✅</span>
                        <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                          코드와 설정이 일치합니다
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 코드 에디터 */}
                  <div className="h-96">
                    {isEditing ? (
                      <CodeEditor
                        value={editCode}
                        onChange={setEditCode}
                        language="python"
                      />
                    ) : (
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto h-full">
                        <pre className="text-sm">{node.code}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetail; 