import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Save, Database, Variable, Search, TreePine } from 'lucide-react';
import CodeEditor from '../CodeEditor';
import HierarchicalKeySelector from '../Common/HierarchicalKeySelector';

interface PromptTemplatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  edgeData?: any;
  sourceNode?: any;
  availableVariables?: string[];
}

const PromptTemplatePopup: React.FC<PromptTemplatePopupProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  edgeData,
  sourceNode,
  availableVariables = []
}) => {
  const [tempValue, setTempValue] = useState(value);
  const [hasChanges, setHasChanges] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const cursorPositionRef = useRef(0);
  const isInsertingVariable = useRef(false);
  const [showTreeView, setShowTreeView] = useState(true);
  const [isHierarchicalSelectorOpen, setIsHierarchicalSelectorOpen] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320); // 초기 사이드바 너비
  const [isResizing, setIsResizing] = useState(false);

  // 팝업이 열릴 때마다 초기값으로 리셋
  useEffect(() => {
    if (isOpen) {
      setTempValue(value);
      setHasChanges(false);
      
      // 트리를 기본으로 모두 펼치기
      if (edgeData && Object.keys(edgeData).length > 0) {
        const allPaths = getAllPaths(edgeData);
        setExpandedPaths(new Set(allPaths));
        setAllExpanded(true);
      } else {
        setExpandedPaths(new Set());
        setAllExpanded(false);
      }
    }
  }, [isOpen, value, edgeData]);

  // 임시 값이 변경될 때마다 변경사항 체크
  useEffect(() => {
    setHasChanges(tempValue !== value);
  }, [tempValue, value]);

  // expandedPaths가 변경될 때마다 allExpanded 상태 업데이트
  useEffect(() => {
    if (edgeData && Object.keys(edgeData).length > 0) {
      const allPaths = getAllPaths(edgeData);
      const isAllExpanded = allPaths.length > 0 && allPaths.every(path => expandedPaths.has(path));
      setAllExpanded(isAllExpanded);
    }
  }, [expandedPaths, edgeData]);

  const handleSave = () => {
    onChange(tempValue);
    setHasChanges(false);
  };

  const insertVariableAtCursor = (variableName: string) => {
    const currentPosition = cursorPositionRef.current;
    const beforeCursor = tempValue.substring(0, currentPosition);
    const afterCursor = tempValue.substring(currentPosition);
    const newValue = beforeCursor + `{{${variableName}}}` + afterCursor;
    
    // 커서 위치를 삽입된 변수 뒤로 이동
    const newCursorPosition = currentPosition + variableName.length + 4; // {{variableName}}의 길이
    
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

  const handleHierarchicalSelect = (key: string) => {
    insertVariableAtCursor(key);
    setIsHierarchicalSelectorOpen(false);
  };

  // 모든 경로를 수집하는 함수
  const getAllPaths = (obj: any, path: string[] = []): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    const paths: string[] = [];
    const entries = Array.isArray(obj) 
      ? obj.map((item, index) => [index.toString(), item] as [string, any])
      : Object.entries(obj);
    
    entries.forEach(([key, value]) => {
      const isArray = Array.isArray(obj);
      const currentPath = [...path, isArray ? `[${key}]` : key];
      const pathString = currentPath.join('.');
      
      if (value && typeof value === 'object') {
        paths.push(pathString);
        paths.push(...getAllPaths(value, currentPath));
      }
    });
    
    return paths;
  };

  // 모두 펼치기/접기 토글
  const toggleExpandAll = () => {
    if (allExpanded) {
      // 모두 접기
      setExpandedPaths(new Set());
      setAllExpanded(false);
    } else {
      // 모두 펼치기
      const allPaths = getAllPaths(edgeData);
      setExpandedPaths(new Set(allPaths));
      setAllExpanded(true);
    }
  };

  // 사이드바 리사이즈 핸들러
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = Math.max(250, Math.min(600, e.clientX - 20)); // 최소 250px, 최대 600px
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Python 스타일 경로 생성 함수
  const buildPythonPath = (pathArray: string[]): string => {
    if (pathArray.length === 0) return '';
    
    let result = pathArray[0];
    for (let i = 1; i < pathArray.length; i++) {
      const segment = pathArray[i];
      if (segment.startsWith('[') && segment.endsWith(']')) {
        // 배열 인덱스인 경우: [1]
        result += segment;
      } else {
        // 일반 객체 키인 경우: ['key']
        result += `['${segment}']`;
      }
    }
    return result;
  };

  // 대화형 트리 렌더링 함수
  const renderInteractiveTree = (obj: any, path: string[] = [], level: number = 0): JSX.Element[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    const entries = Array.isArray(obj) 
      ? obj.map((item, index) => [index.toString(), item] as [string, any])
      : Object.entries(obj);
    
    return entries.map(([key, value], index) => {
      const isArray = Array.isArray(obj);
      const currentPath = [...path, isArray ? `[${key}]` : key];
      const pathString = currentPath.join('.');
      const isExpanded = expandedPaths.has(pathString);
      const displayKey = isArray ? `[${key}]` : key;
      const fullPythonPath = buildPythonPath(currentPath);
      
      if (Array.isArray(value)) {
        return (
          <div key={pathString} style={{ marginLeft: `${level * 10}px` }}>
            <div className="flex items-center py-1">
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedPaths);
                  if (isExpanded) {
                    newExpanded.delete(pathString);
                  } else {
                    newExpanded.add(pathString);
                  }
                  setExpandedPaths(newExpanded);
                }}
                className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <button
                onClick={() => insertVariableAtCursor(fullPythonPath)}
                className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-1 rounded font-mono text-sm font-semibold"
                title={`클릭하여 {{${fullPythonPath}}} 삽입`}
              >
                {displayKey}
              </button>
              <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                [{value.length}개 항목]
              </span>
            </div>
            {isExpanded && renderInteractiveTree(value, currentPath, level + 1)}
          </div>
        );
      } else if (value && typeof value === 'object') {
        return (
          <div key={pathString} style={{ marginLeft: `${level * 10}px` }}>
            <div className="flex items-center py-1">
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedPaths);
                  if (isExpanded) {
                    newExpanded.delete(pathString);
                  } else {
                    newExpanded.add(pathString);
                  }
                  setExpandedPaths(newExpanded);
                }}
                className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <button
                onClick={() => insertVariableAtCursor(fullPythonPath)}
                className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-1 rounded font-mono text-sm font-semibold"
                title={`클릭하여 {{${fullPythonPath}}} 삽입`}
              >
                {displayKey}
              </button>
              <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                {`{${Object.keys(value).length}개 키}`}
              </span>
            </div>
            {isExpanded && renderInteractiveTree(value, currentPath, level + 1)}
          </div>
        );
      } else {
        return (
          <div key={pathString} style={{ marginLeft: `${level * 10}px` }} className="py-1">
            <button
              onClick={() => insertVariableAtCursor(fullPythonPath)}
              className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 px-1 rounded font-mono text-sm font-semibold"
              title={`클릭하여 {${fullPythonPath}} 삽입`}
            >
              {displayKey}
            </button>
            <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
              : {typeof value === 'string' ? `"${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}"` : String(value)}
            </span>
          </div>
        );
      }
    });
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
            <Maximize2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Prompt Template Editor
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Use {`{{variable}}`} syntax to insert variables from input
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
          <div className="h-full flex gap-2">
            {/* Edge Data Card */}
            <div className="flex-shrink-0 relative" style={{ width: `${sidebarWidth}px` }}>
              <div className="h-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col">
                <div className="flex items-center space-x-2 mb-4">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Input Data
                  </h3>
                </div>

                {sourceNode && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Source Node
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-400">
                      {sourceNode.data?.label || sourceNode.id}
                    </div>
                  </div>
                )}

{(edgeData && Object.keys(edgeData).length > 0) ? (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Variable className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          데이터 구조
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowTreeView(true)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            showTreeView 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          트리
                        </button>
                        <button
                          onClick={() => setShowTreeView(false)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            !showTreeView 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          목록
                        </button>

                        <button
                          onClick={() => setIsHierarchicalSelectorOpen(true)}
                          className="px-2 py-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center"
                          title="고급 선택기 열기"
                        >
                          <Search className="h-3 w-3 mr-1" />
                          검색
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                      {showTreeView ? (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md p-3 flex-1 flex flex-col min-h-0">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <span>💡 원하는 키를 클릭하면 Python 스타일로 삽입됩니다</span>
                              <button
                                onClick={toggleExpandAll}
                                className="px-2 py-1 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                title={allExpanded ? "모두 접기" : "모두 펼치기"}
                              >
                                {allExpanded ? '➖' : '➕'}
                              </button>
                            </div>
                          </div>
                          <div className="text-sm overflow-x-auto flex-1 overflow-y-auto min-h-0">
                            {renderInteractiveTree(edgeData)}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 flex-1 overflow-y-auto">
                          {availableVariables.map((variable) => (
                            <div
                              key={variable}
                              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                              onClick={() => insertVariableAtCursor(variable)}
                              title={`클릭하여 {{${variable}}} 삽입`}
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
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 flex-1 flex flex-col justify-center min-h-0">
                    <Database className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      사용 가능한 입력 데이터가 없습니다
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      연결된 노드를 실행하여 변수를 확인하세요
                    </p>
                  </div>
                )}
              </div>
              
              {/* Resize Handle */}
              <div
                className={`absolute top-0 right-0 w-2 h-full cursor-col-resize transition-all duration-200 
                  ${isResizing 
                    ? 'bg-blue-500 dark:bg-blue-400 opacity-100' 
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-500 opacity-30 hover:opacity-70'
                  } 
                  flex items-center justify-center`}
                onMouseDown={startResize}
                title="드래그하여 크기 조절"
              >
                <div className="w-0.5 h-8 bg-white dark:bg-gray-800 rounded-full opacity-60" />
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md">
              <CodeEditor
                value={tempValue}
                onChange={setTempValue}
                language="markdown"
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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

      {/* Hierarchical Key Selector */}
      <HierarchicalKeySelector
        isOpen={isHierarchicalSelectorOpen}
        onClose={() => setIsHierarchicalSelectorOpen(false)}
        data={edgeData || {}}
        onSelect={handleHierarchicalSelect}
        title="변수 선택기 (Python 스타일)"
        pathStyle="python"
      />
    </div>
  );
};

export default PromptTemplatePopup;
