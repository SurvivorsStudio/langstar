import React, { useState, useRef, useEffect } from 'react';
import CodeEditor from '../CodeEditor';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Pencil, Check, Maximize2, FileText, Plus, Trash2 } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';
import PromptTemplatePopup from './PromptTemplatePopup';

interface PromptSettingsProps {
  nodeId: string;
}

interface PromptConfig {
  template: string;
}

interface PromptsData {
  [key: string]: PromptConfig;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [activePromptKey, setActivePromptKey] = useState<string | null>(null);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [editingKeyValue, setEditingKeyValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const incomingEdge = edges.find(edge => edge.target === nodeId);

  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  // Get available variables from source node output
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  // Get source node info
  const sourceNode = nodes.find(n => n.id === incomingEdge?.source);

  // Get prompts data from node config
  const prompts: PromptsData = node?.data?.config?.prompts || {};
  const promptKeys = Object.keys(prompts);

  // Initialize active prompt key
  useEffect(() => {
    if (promptKeys.length > 0 && !activePromptKey) {
      setActivePromptKey(promptKeys[0]);
    } else if (promptKeys.length === 0) {
      // Initialize with default prompt
      const defaultKey = 'prompt_1';
      updateNodeData(nodeId, {
        ...node?.data,
        config: {
          ...(node?.data?.config || {}),
          prompts: {
            [defaultKey]: {
              template: node?.data?.config?.template || ''
            }
          },
          outputVariable: node?.data?.config?.outputVariable || ''
        }
      });
      setActivePromptKey(defaultKey);
    }
  }, []);

  const activePrompt = activePromptKey ? prompts[activePromptKey] : null;

  // Auto focus and position cursor at the end when editing starts
  useEffect(() => {
    if (isEditingOutputVariable && inputRef.current) {
      inputRef.current.focus();
      // Position cursor at the end of the text
      const value = inputRef.current.value;
      inputRef.current.setSelectionRange(value.length, value.length);
    }
  }, [isEditingOutputVariable]);

  // Auto focus for key editing
  useEffect(() => {
    if (isEditingKey && keyInputRef.current) {
      keyInputRef.current.focus();
      const value = keyInputRef.current.value;
      keyInputRef.current.setSelectionRange(value.length, value.length);
    }
  }, [isEditingKey]);

  const handleAddPrompt = () => {
    const newKey = `prompt_${promptKeys.length + 1}`;
    const newPrompts = {
      ...prompts,
      [newKey]: {
        template: ''
      }
    };
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...(node?.data?.config || {}),
        prompts: newPrompts
      }
    });
    setActivePromptKey(newKey);
  };

  const handleDeletePrompt = (key: string) => {
    if (promptKeys.length <= 1) {
      alert('최소 1개의 프롬프트가 필요합니다.');
      return;
    }
    
    const newPrompts = { ...prompts };
    delete newPrompts[key];
    
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...(node?.data?.config || {}),
        prompts: newPrompts
      }
    });
    
    // Set active key to first remaining prompt
    const remainingKeys = Object.keys(newPrompts);
    if (remainingKeys.length > 0) {
      setActivePromptKey(remainingKeys[0]);
    }
  };

  const handleRenamePromptKey = (oldKey: string, newKey: string) => {
    // 먼저 편집 모드를 종료하여 onBlur 이벤트 반복 방지
    setIsEditingKey(false);
    
    if (oldKey === newKey) {
      return;
    }
    
    if (prompts[newKey]) {
      // 에러 발생 시 원래 값으로 복원
      setEditingKeyValue(oldKey);
      alert('이미 존재하는 key입니다.');
      return;
    }
    
    if (!newKey.trim()) {
      // 에러 발생 시 원래 값으로 복원
      setEditingKeyValue(oldKey);
      alert('key는 비어있을 수 없습니다.');
      return;
    }
    
    const newPrompts: PromptsData = {};
    Object.keys(prompts).forEach(k => {
      if (k === oldKey) {
        newPrompts[newKey] = prompts[k];
      } else {
        newPrompts[k] = prompts[k];
      }
    });
    
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...(node?.data?.config || {}),
        prompts: newPrompts
      }
    });
    
    setActivePromptKey(newKey);
  };

  const handleOutputVariableChange = (value: string) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot update outputVariable.`);
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

  // 단일 프롬프트 템플릿 변경 (메인 화면 CodeEditor용)
  const handleTemplateChange = (promptKey: string, value: string) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot update template.`);
      return;
    }
    
    const newPrompts = {
      ...prompts,
      [promptKey]: {
        ...prompts[promptKey],
        template: value
      }
    };
    
    updateNodeData(nodeId, {
      ...node.data,
      config: {
        ...(node.data.config || {}),
        prompts: newPrompts
      }
    });
  };

  // 여러 프롬프트 템플릿 일괄 변경 (Popup Save용 - 템플릿만)
  const handleBulkTemplateChange = (updates: Record<string, string>) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot update templates.`);
      return;
    }
    
    const newPrompts = { ...prompts };
    Object.entries(updates).forEach(([key, template]) => {
      newPrompts[key] = {
        ...newPrompts[key],
        template
      };
    });
    
    console.log('[PromptSettings] Bulk updating prompts:', updates);
    updateNodeData(nodeId, {
      ...node.data,
      config: {
        ...(node.data.config || {}),
        prompts: newPrompts
      }
    });
  };

  // 전체 프롬프트 구조 저장 (Popup Save용 - 추가/삭제/이름변경/내용변경 모두 포함)
  const handleBulkSave = (newPrompts: PromptsData) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot save prompts.`);
      return;
    }
    
    console.log('[PromptSettings] Saving entire prompts structure:', Object.keys(newPrompts));
    updateNodeData(nodeId, {
      ...node.data,
      config: {
        ...(node.data.config || {}),
        prompts: newPrompts
      }
    });
    
    // activePromptKey가 삭제된 경우 첫 번째 키로 변경
    const newKeys = Object.keys(newPrompts);
    if (activePromptKey && !newPrompts[activePromptKey] && newKeys.length > 0) {
      setActivePromptKey(newKeys[0]);
    }
  };

  if (!node) {
    return <div>Node not found</div>;
  }

  if (!activePromptKey) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      
      {/* Node Type Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Node Type
        </label>
        <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {node.type}
        </div>
      </div>

      {/* Output Variable Section */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          !incomingEdge 
            ? 'text-gray-400 dark:text-gray-500' 
            : 'text-gray-700 dark:text-gray-300'
        }`}>
          Output Variable
        </label>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          결과 형식: {'{'}
          {promptKeys.map((key, idx) => (
            <span key={key}>
              {key}: 'result'
              {idx < promptKeys.length - 1 ? ', ' : ''}
            </span>
          ))}
          {'}'}
        </div>
        <div className="relative">
          <div className="flex items-center space-x-2">
            {isEditingOutputVariable ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  id="promptOutputVariableInput"
                  value={node?.data?.config?.outputVariable || ''}
                  onChange={(e) => handleOutputVariableChange(e.target.value)}
                  placeholder="Enter output variable name"
                  className={`flex-grow px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    !incomingEdge
                      ? 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600'
                  }`}
                />
                <button
                  onClick={() => setIsEditingOutputVariable(false)}
                  className={`p-2 rounded-md flex-shrink-0 ${
                    !incomingEdge
                      ? 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label="Confirm output variable"
                >
                  <Check size={18} />
                </button>
              </>
            ) : (
              <>
                <div className={`flex-grow ${!incomingEdge ? 'opacity-60' : ''}`}>
                  <CustomSelect
                    value={node?.data?.config?.outputVariable || ''}
                    onChange={handleOutputVariableChange}
                    options={[
                      ...(node?.data?.config?.outputVariable && !availableVariables.includes(node.data.config.outputVariable)
                        ? [{ value: node.data.config.outputVariable, label: `${node.data.config.outputVariable} (Custom)` }]
                        : []),
                      ...availableVariables.map(variable => ({ value: variable, label: variable }))
                    ]}
                    placeholder="Select output variable"
                    disabled={!incomingEdge}
                  />
                </div>
                <button 
                  onClick={() => setIsEditingOutputVariable(true)} 
                  className={`p-2 rounded-md flex-shrink-0 ${
                    !incomingEdge
                      ? 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`} 
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

      {/* Prompts Tabs Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Prompts
        </label>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {promptKeys.map((key) => (
            <div
              key={key}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                activePromptKey === key
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActivePromptKey(key)}
            >
              {isEditingKey && activePromptKey === key ? (
                <input
                  ref={keyInputRef}
                  type="text"
                  value={editingKeyValue}
                  onChange={(e) => setEditingKeyValue(e.target.value)}
                  onBlur={() => handleRenamePromptKey(key, editingKeyValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRenamePromptKey(key, editingKeyValue);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsEditingKey(false);
                      setEditingKeyValue(key);
                    }
                  }}
                  className="w-24 px-2 py-1 text-sm border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-sm font-medium"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingKey(true);
                    setEditingKeyValue(key);
                  }}
                >
                  {key}
                </span>
              )}
              {activePromptKey === key && promptKeys.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePrompt(key);
                  }}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title="Delete prompt"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddPrompt}
            className="flex items-center space-x-1 px-3 py-2 rounded-md border border-dashed border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-500 dark:hover:border-gray-400 transition-colors"
            title="Add new prompt"
          >
            <Plus size={16} />
            <span className="text-sm">추가</span>
          </button>
        </div>
      </div>

      {/* Prompt Template Section */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Prompt Template</span>
          </label>
          <button
            onClick={() => setIsPopupOpen(true)}
            className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center"
            title="Open in full screen editor"
          >
            <Maximize2 size={14} className="mr-1" />
            Full Screen
          </button>
        </div>
        <div className="h-64 border border-gray-300 dark:border-gray-600 rounded-md">
          <CodeEditor
            value={activePrompt?.template || ''}
            onChange={(value) => handleTemplateChange(activePromptKey, value)}
            language="markdown"
          />
        </div>
      </div>

      {/* Prompt Template Popup */}
      <PromptTemplatePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        prompts={prompts}
        activePromptKey={activePromptKey || ''}
        onChange={handleTemplateChange}
        onBulkChange={handleBulkTemplateChange}
        onBulkSave={handleBulkSave}
        onChangeActivePrompt={setActivePromptKey}
        edgeData={sourceOutput}
        sourceNode={sourceNode}
        availableVariables={availableVariables}
      />
    </div>
  );
};

export default PromptSettings;