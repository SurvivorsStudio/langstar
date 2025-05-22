import React, { useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { Plus, X, AlertCircle } from 'lucide-react';

interface Variable {
  name: string;
  type: string;
  defaultValue: string;
  selectVariable: string;
}

type NodeClassType = "TypedDict" | "BaseModel";

interface StartSettingsProps {
  nodeId: string;
}

const StartSettings: React.FC<StartSettingsProps> = ({ nodeId }) => {
  const { nodes, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const config = node?.data.config || {};

  const [variables, setVariables] = useState<Variable[]>(config.variables || []);
  const [className, setClassName] = useState(config.className || '');
  const [classType, setClassType] = useState<NodeClassType>(config.classType || 'TypedDict');
  const [showClassNameError, setShowClassNameError] = useState(false);

  const handleAddVariable = () => {
    setVariables([
      ...variables,
      { name: '', type: 'string', defaultValue: '', selectVariable: '' }
    ]);
  };

  const handleRemoveVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
    updateConfig({ variables: newVariables });
  };

  const handleVariableChange = (index: number, field: keyof Variable, value: string) => {
    const newVariables = variables.map((variable, i) => {
      if (i === index) {
        return { ...variable, [field]: value };
      }
      return variable;
    });
    setVariables(newVariables);
    updateConfig({ variables: newVariables });
  };

  const updateConfig = (newConfig: Partial<typeof config>) => {
    // 1. node와 node.data가 존재하는지 확인합니다.
    if (!node || !node.data) {
      console.warn(`[StartSettings] Node data for node ID ${nodeId} is not available. Cannot update config.`);
      return;
    }

    // 2. label이 string 타입인지 확인하고, undefined일 경우 기본값을 설정합니다.
    //    node.id는 항상 string이므로 안전한 기본값이 될 수 있습니다.
    const label = typeof node.data.label === 'string' ? node.data.label : node.id;

    updateNodeData(nodeId, {
      ...node.data, // node.data가 존재함을 보장받았으므로 직접 전개합니다.
      label,        // 명시적으로 string 타입의 label을 설정합니다.
      config: {
        ...(node.data.config || {}), // node.data.config가 undefined일 수 있으므로 || {} 처리합니다.
        ...newConfig,
      }
    });
  };

  const handleClassNameChange = (value: string) => {
    setClassName(value);
    setShowClassNameError(!value.trim());
    updateConfig({ className: value });
  };

  const handleClassTypeChange = (value: string) => {
    // value는 <select>의 옵션에서 오므로 "TypedDict" 또는 "BaseModel" 중 하나입니다.
    const newClassType = value as NodeClassType;
    setClassType(newClassType);
    updateConfig({ classType: newClassType });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Default Settings</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Class Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => handleClassNameChange(e.target.value)}
            placeholder="Enter class name"
            className={`w-full px-3 py-2 border ${
              showClassNameError ? 'border-red-300 ring-red-200' : 'border-gray-300'
            } rounded-md focus:outline-none focus:ring-2 ${
              showClassNameError ? 'focus:ring-red-500' : 'focus:ring-blue-500'
            } text-sm`}
          />
          {showClassNameError && (
            <div className="flex items-center mt-1 text-red-500 text-xs">
              <AlertCircle size={12} className="mr-1" />
              Class Name is required
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Class Type
          </label>
          <select
            value={classType}
            onChange={(e) => handleClassTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="TypedDict">TypedDict</option>
            <option value="BaseModel">BaseModel</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Variables</h3>
          <button
            onClick={handleAddVariable}
            className="flex items-center px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            <Plus size={16} className="mr-1" />
            Add Variable
          </button>
        </div>

        <div className="space-y-4">
          {variables.map((variable, index) => (
            <div key={index} className="relative p-4 bg-gray-50 rounded-lg border border-gray-200">
              <button
                onClick={() => handleRemoveVariable(index)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">
                    Variable Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={variable.name}
                    onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                    placeholder="Enter variable name"
                    className={`w-full px-3 py-2 border ${
                      !variable.name.trim() ? 'border-red-300 ring-red-200' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 ${
                      !variable.name.trim() ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                    } text-sm`}
                  />
                  {!variable.name.trim() && (
                    <div className="flex items-center mt-1 text-red-500 text-xs">
                      <AlertCircle size={12} className="mr-1" />
                      Variable Name is required
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">
                    Variable Type
                  </label>
                  <select
                    value={variable.type}
                    onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="string">string</option>
                    <option value="int">int</option>
                    <option value="float">float</option>
                    <option value="list">list</option>
                    <option value="dict">dict</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={variable.defaultValue}
                    onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                    placeholder="Enter default value"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">
                    Select Variable
                  </label>
                  <select
                    value={variable.selectVariable}
                    onChange={(e) => handleVariableChange(index, 'selectVariable', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">None</option>
                    <option value="question">question</option>
                    <option value="chat_history">chat_history</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StartSettings;