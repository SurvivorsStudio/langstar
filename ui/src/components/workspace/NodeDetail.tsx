import React, { useState } from 'react';
import { ArrowLeft, Edit, Save, X, Code, Trash2 } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import CodeEditor from '../CodeEditor';

interface NodeDetailProps {
  nodeId: string;
  onBack: () => void;
}

const NodeDetail: React.FC<NodeDetailProps> = ({ nodeId, onBack }) => {
  const { userNodes, updateUserNode, deleteUserNode } = useFlowStore();
  const [isEditing, setIsEditing] = useState(false);
  
  const node = userNodes.find(n => n.id === nodeId);
  
  // 편집용 상태
  const [editName, setEditName] = useState(node?.name || '');
  const [editDescription, setEditDescription] = useState(node?.functionDescription || '');
  const [editCode, setEditCode] = useState(node?.code || '');
  const [editParameters, setEditParameters] = useState(node?.parameters || []);
  
  // 이름 유효성 검사 함수
  const validateName = (name: string): boolean => {
    // 띄어쓰기 금지, 특수문자는 언더스코어(_)만 허용
    const validNameRegex = /^[a-zA-Z0-9_]+$/;
    return validNameRegex.test(name);
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
      // 노드 이름 유효성 검사
      if (!editName.trim()) {
        alert('노드 이름을 입력해주세요.');
        return;
      }
      
      if (!validateName(editName.trim())) {
        alert('노드 이름에는 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다. 띄어쓰기와 특수문자는 사용할 수 없습니다.');
        return;
      }
      
      await updateUserNode(nodeId, {
        name: editName.trim(),
        functionDescription: editDescription,
        code: editCode,
        parameters: editParameters,
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

    setEditParameters([...editParameters, { name: '', inputType: 'select box', required: false, funcArgs: '', matchData: '' }]);

  };

  const updateParameter = (index: number, field: string, value: string | boolean) => {
    let processedValue = value;
    
    // 매개변수 이름인 경우 유효성 검사 적용
    if (field === 'name' && typeof value === 'string') {
      // 유효한 문자만 입력 허용 (띄어쓰기, 특수문자 금지, 언더스코어만 허용)
      processedValue = value.replace(/[^a-zA-Z0-9_]/g, '');
    }
    
    const newParameters = [...editParameters];
    newParameters[index] = { ...newParameters[index], [field]: processedValue };
    setEditParameters(newParameters);
  };

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isEditing ? 'Edit Node' : node.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEditing ? 'Modify your custom node' : 'Node details and configuration'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
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
                    Function Name
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{node.functionName}</p>
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
                  <p className="text-gray-900 dark:text-gray-100">{node.returnType}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Modified
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(node.lastModified).toLocaleString()}
                  </p>
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
                {(isEditing ? editParameters : node.parameters).map((param, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    {isEditing ? (

                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">

                          <input
                            type="text"
                            value={param.name}
                            onChange={(e) => updateParameter(index, 'name', e.target.value)}
                            placeholder="영문자, 숫자, _만 사용"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          />
                          <input
                            type="text"
                            value={param.funcArgs || ''}
                            onChange={(e) => updateParameter(index, 'funcArgs', e.target.value)}
                            placeholder="Func Args"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          />
                          <input
                            type="text"
                            value={param.matchData || ''}
                            onChange={(e) => updateParameter(index, 'matchData', e.target.value)}
                            placeholder="Match Data"
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
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{param.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {param.inputType} • {param.required ? 'Required' : 'Optional'}

                            {param.funcArgs && ` • Func Args: ${param.funcArgs}`}
                            {param.matchData && ` • Match Data: ${param.matchData}`}

                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Code */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Python Code
            </h3>
            
            {isEditing ? (
              <div className="h-96">
                <CodeEditor
                  value={editCode}
                  onChange={setEditCode}
                  language="python"
                />
              </div>
            ) : (
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-sm">{node.code}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetail; 