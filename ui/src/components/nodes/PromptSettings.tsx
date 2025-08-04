import React, { useState, useCallback } from 'react';
import CodeEditor from '../CodeEditor';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Pencil, Check, Maximize2, X, Variable } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';

interface PromptSettingsProps {
  nodeId: string;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateValue, setTemplateValue] = useState('');
  const [tempTemplateValue, setTempTemplateValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 0, ch: 0 });
  const [setCursorPositionFn, setSetCursorPositionFn] = useState<((position: { line: number; ch: number }) => void) | null>(null);
  const incomingEdge = edges.find(edge => edge.target === nodeId);

  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  // Get available variables from source node output
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  const handleOutputVariableChange = (value: string) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot update outputVariable.`);
      return;
    }
    updateNodeData(nodeId, {
      // node.data is now guaranteed to be defined here
      ...node.data,
      config: {
        // node.data.config might still be undefined, so handle it
        ...(node.data.config || {}),
        outputVariable: value
      }
    });
  };

  const handleTemplateChange = (value: string) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot update template.`);
      return;
    }
    setTemplateValue(value);
    updateNodeData(nodeId, {
      // node.data is now guaranteed to be defined here
      ...node.data,
      config: {
        // node.data.config might still be undefined, so handle it
        ...(node.data.config || {}),
        template: value
      }
    });
  };

  const handleModalOpen = () => {
    setTemplateValue(node?.data.config?.template || '');
    setTempTemplateValue(node?.data.config?.template || '');
    setIsTemplateModalOpen(true);
  };

  const handleCursorChange = useCallback((position: { line: number; ch: number }) => {
    setCursorPosition(position);
  }, []);

  const handleSetCursorPosition = useCallback((setFn: (position: { line: number; ch: number }) => void) => {
    setSetCursorPositionFn(() => setFn);
  }, []);

  const handleVariableDoubleClick = (variable: string) => {
    const variableTemplate = `{${variable}}`;
    
    // 현재 커서 위치에 변수 삽입
    const lines = tempTemplateValue.split('\n');
    const currentLine = lines[cursorPosition.line] || '';
    
    // 현재 라인에서 커서 위치 앞뒤로 텍스트 분할
    const beforeCursor = currentLine.substring(0, cursorPosition.ch);
    const afterCursor = currentLine.substring(cursorPosition.ch);
    
    // 새로운 라인 생성
    const newLine = beforeCursor + variableTemplate + afterCursor;
    lines[cursorPosition.line] = newLine;
    
    // 새로운 템플릿 값 생성
    const newTemplateValue = lines.join('\n');
    
    // 임시 템플릿 값 업데이트 (모달에서만 사용)
    setTempTemplateValue(newTemplateValue);
    
    // 커서 위치 업데이트 (변수 길이만큼 이동)
    const newCursorPosition = {
      line: cursorPosition.line,
      ch: cursorPosition.ch + variableTemplate.length
    };
    
    // 약간의 지연 후 커서 위치 설정 (텍스트 업데이트 후)
    setTimeout(() => {
      if (setCursorPositionFn) {
        setCursorPositionFn(newCursorPosition);
      }
    }, 10);
  };

  const getVariableValue = (variable: string) => {
    if (!sourceOutput || !sourceOutput[variable]) return 'undefined';
    
    const value = sourceOutput[variable];
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                Output Variable
              </label>
              <div className="relative"> {/* Container for input/select and warnings */}
                <div className="flex items-center space-x-2">
                  {isEditingOutputVariable ? (
                    <>
                      <input
                        type="text"
                        id="promptOutputVariableInput"
                        value={node?.data.config?.outputVariable || ''}
                        onChange={(e) => handleOutputVariableChange(e.target.value)}
                        placeholder="Enter output variable name"
                        className={`flex-grow px-3 py-2 border ${
                          !hasValidOutput && availableVariables.length === 0 
                            ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                        disabled={!hasValidOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable} // Disable if no source and no current value
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
                        value={node?.data.config?.outputVariable || ''}
                        onChange={handleOutputVariableChange}
                        options={[
                          ...(node?.data.config?.outputVariable && !availableVariables.includes(node.data.config.outputVariable)
                            ? [{ value: node.data.config.outputVariable, label: `${node.data.config.outputVariable} (Custom)` }]
                            : []),
                          ...availableVariables.map(variable => ({ value: variable, label: variable }))
                        ]}
                        placeholder="Select output variable"
                        disabled={!hasValidOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable}
                      />
                      <button onClick={() => setIsEditingOutputVariable(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0" aria-label="Edit output variable">
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
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Prompt Template</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Use {'{variable}'} syntax to insert variables from input
                </p>
              </div>
              <button
                onClick={handleModalOpen}
                className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md transition-colors"
                title="Expand template editor"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
          <div className="h-[calc(100%-180px)]">
            <CodeEditor
              value={node?.data.config?.template || ''}
              onChange={handleTemplateChange}
              language="markdown"
            />
          </div>
        </div>
      </div>

      {/* 전체화면 템플릿 편집 모달 */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full h-full max-w-7xl max-h-[95vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prompt Template Editor</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Double-click variables to insert them into the template
                </p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Close editor"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* 모달 본문 - 사이드바와 에디터 */}
            <div className="flex-1 flex">
              {/* 변수 사이드바 */}
              <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <Variable size={16} className="mr-2" />
                    Available Variables
                  </h3>
                  
                  {!incomingEdge ? (
                    <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                      <AlertCircle size={14} className="mr-1 inline" />
                      Connect an input node to access variables
                    </div>
                  ) : !hasValidOutput ? (
                    <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                      <AlertCircle size={14} className="mr-1 inline" />
                      Execute the connected node to access variables
                    </div>
                  ) : availableVariables.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                      No variables available
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableVariables.map((variable) => (
                        <div
                          key={variable}
                          className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                          onDoubleClick={() => handleVariableDoubleClick(variable)}
                          title={`Double-click to insert {${variable}}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                              {variable}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {`{${variable}}`}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono max-h-20 overflow-y-auto">
                            {getVariableValue(variable)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 에디터 영역 */}
              <div className="flex-1 p-4">
                <div className="h-full">
                  <CodeEditor
                    value={tempTemplateValue}
                    onChange={setTempTemplateValue}
                    language="markdown"
                    onCursorChange={handleCursorChange}
                    setCursorPosition={handleSetCursorPosition}
                  />
                </div>
              </div>
            </div>
            
            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {availableVariables.length > 0 ? `${availableVariables.length} variables available` : 'No variables available'}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    // 원래 값으로 되돌리기 (저장하지 않음)
                    setTempTemplateValue(templateValue);
                    setIsTemplateModalOpen(false);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // 실제로 저장하기
                    handleTemplateChange(tempTemplateValue);
                    setTemplateValue(tempTemplateValue);
                    setIsTemplateModalOpen(false);
                  }}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromptSettings;