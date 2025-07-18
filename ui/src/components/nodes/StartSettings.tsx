import React, { useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { Plus, X, AlertCircle } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';

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
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Settings</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Class Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => handleClassNameChange(e.target.value)}
            placeholder="Enter class name"
            className={`w-full px-3 py-2 border ${
              showClassNameError ? 'border-red-300 ring-red-200 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
            } rounded-md focus:outline-none focus:ring-2 ${
              showClassNameError ? 'focus:ring-red-500' : 'focus:ring-blue-500'
            } text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
          />
          {showClassNameError && (
            <div className="flex items-center mt-1 text-red-500 text-xs">
              <AlertCircle size={12} className="mr-1" />
              Class Name is required
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Class Type
          </label>
          <CustomSelect
            value={classType}
            onChange={handleClassTypeChange}
            options={[
              { value: 'TypedDict', label: 'TypedDict' },
              { value: 'BaseModel', label: 'BaseModel' }
            ]}
            placeholder="Select class type"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Variables</h3>
          <button
            onClick={handleAddVariable}
            className="flex items-center px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded"
          >
            <Plus size={16} className="mr-1" />
            Add Variable
          </button>
        </div>

        <div className="space-y-4">
          {variables.map((variable, index) => (
            <div key={index} className="relative p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => handleRemoveVariable(index)}
                className="absolute top-2 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Variable Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={variable.name}
                    onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                    placeholder="Enter variable name"
                    className={`w-full px-3 py-2 border ${
                      !variable.name.trim() ? 'border-red-300 ring-red-200 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md focus:outline-none focus:ring-2 ${
                      !variable.name.trim() ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                    } text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                  />
                  {!variable.name.trim() && (
                    <div className="flex items-center mt-1 text-red-500 text-xs">
                      <AlertCircle size={12} className="mr-1" />
                      Variable Name is required
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Variable Type
                  </label>
                  <CustomSelect
                    value={variable.type}
                    onChange={value => handleVariableChange(index, 'type', value)}
                    options={[
                      { value: 'string', label: 'string' },
                      { value: 'int', label: 'int' },
                      { value: 'float', label: 'float' },
                      { value: 'list', label: 'list' },
                      { value: 'dict', label: 'dict' }
                    ]}
                    placeholder="Select variable type"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={variable.defaultValue}
                    onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                    placeholder="Enter default value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Select Variable
                  </label>
                  <CustomSelect
                    value={variable.selectVariable}
                    onChange={value => handleVariableChange(index, 'selectVariable', value)}
                    options={[
                      { value: '', label: 'None' },
                      { value: 'question', label: 'question' },
                      { value: 'chat_history', label: 'chat_history' }
                    ]}
                    placeholder="Select variable"
                  />
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