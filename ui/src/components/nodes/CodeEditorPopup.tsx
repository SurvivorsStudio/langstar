import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Save, Database, Variable } from 'lucide-react';
import CodeEditor from '../CodeEditor';

interface CodeEditorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  edgeData?: any;
  sourceNode?: any;
  availableVariables?: string[];
  hideInputVariables?: boolean; // Input Variables 영역을 숨길지 여부
}

const CodeEditorPopup: React.FC<CodeEditorPopupProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  edgeData,
  sourceNode,
  availableVariables = [],
  hideInputVariables = false
}) => {
  const [tempValue, setTempValue] = useState(value);
  const [hasChanges, setHasChanges] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const cursorPositionRef = useRef(0);
  const isInsertingVariable = useRef(false);

  // 팝업이 열릴 때마다 초기값으로 리셋
  useEffect(() => {
    if (isOpen) {
      setTempValue(value);
      setHasChanges(false);
    }
  }, [isOpen, value]);

  // 임시 값이 변경될 때마다 변경사항 체크
  useEffect(() => {
    setHasChanges(tempValue !== value);
  }, [tempValue, value]);

  const handleSave = () => {
    onChange(tempValue);
    setHasChanges(false);
  };

  const insertVariableAtCursor = (variableName: string) => {
    const currentPosition = cursorPositionRef.current;
    const beforeCursor = tempValue.substring(0, currentPosition);
    const afterCursor = tempValue.substring(currentPosition);
    const newValue = beforeCursor + `state['${variableName}']` + afterCursor;
    
    // 커서 위치를 삽입된 변수 뒤로 이동
    const newCursorPosition = currentPosition + `state['${variableName}']`.length;
    
    // 변수 삽입 플래그 설정
    isInsertingVariable.current = true;
    setTempValue(newValue);
    
    // 다음 렌더링 사이클에서 커서 위치를 설정
    setTimeout(() => {
      if (editorInstance) {
        const model = editorInstance.getModel();
        const position = model.getPositionAt(newCursorPosition);
        editorInstance.setPosition(position);
        editorInstance.focus();
        cursorPositionRef.current = newCursorPosition;
        setCursorPosition(newCursorPosition);
        isInsertingVariable.current = false;
      }
    }, 10);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Ctrl+S 또는 Cmd+S로 저장
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
      
      // Escape로 닫기
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Maximize2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Python Code Editor
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Use state['variable'] syntax to access input variables
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          <div className={`h-full ${!hideInputVariables ? 'flex gap-6' : ''}`}>
            {/* Edge Data Card - hideInputVariables가 false일 때만 표시 */}
            {!hideInputVariables && (
              <div className="w-80 flex-shrink-0">
                <div className="h-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center space-x-2 mb-4">
                    <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Input Variables
                    </h3>
                  </div>

                  {sourceNode && (
                    <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
                      <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
                        Source Node
                      </div>
                      <div className="text-sm text-purple-700 dark:text-purple-400">
                        {sourceNode.data?.label || sourceNode.id}
                      </div>
                    </div>
                  )}

                  {availableVariables.length > 0 ? (
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center space-x-2">
                        <Variable className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Available Variables ({availableVariables.length})
                        </span>
                      </div>
                      
                      <div className="space-y-2 flex-1 overflow-y-auto">
                        {availableVariables.map((variable) => (
                          <div
                            key={variable}
                            className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            onClick={() => insertVariableAtCursor(variable)}
                            title={`Click to insert state['${variable}'] at cursor position`}
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                              {variable}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {typeof edgeData[variable] === 'object' 
                                ? JSON.stringify(edgeData[variable]).substring(0, 50) + '...'
                                : String(edgeData[variable] || 'null')
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 flex-1 flex flex-col justify-center">
                      <Database className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No input variables available
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Execute the connected node to see variables
                      </p>
                    </div>
                  )}

                  {/* Python Code Template */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Code Template
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-400 font-mono">
                      <div>def exce_code(state):</div>
                      <div className="ml-4"># Access input variables:</div>
                      <div className="ml-4"># value = state['variable_name']</div>
                      <div className="ml-4"># </div>
                      <div className="ml-4"># Your code here...</div>
                      <div className="ml-4"># </div>
                      <div className="ml-4">return state</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Code Editor */}
            <div className={`${!hideInputVariables ? 'flex-1' : 'h-full'} border border-gray-300 dark:border-gray-600 rounded-md`}>
              <CodeEditor
                value={tempValue}
                onChange={setTempValue}
                language="python"
                onCursorPositionChange={(position) => {
                  // 변수 삽입 중이 아닐 때만 커서 위치 업데이트
                  if (!isInsertingVariable.current) {
                    cursorPositionRef.current = position;
                    setCursorPosition(position);
                  }
                }}
                onMount={(editor) => {
                  setEditorInstance(editor);
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {hasChanges ? (
                  <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
                ) : (
                  <span>All changes saved</span>
                )}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Ctrl+S Save | Esc Close
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save size={16} className="mr-2" />
                Save
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditorPopup;
