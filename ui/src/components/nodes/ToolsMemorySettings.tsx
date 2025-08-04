import React, { useState, useEffect, useCallback, memo } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Maximize2, X, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import CodeEditor from '../CodeEditor';
import { Group, NodeData } from '../../types/node';

// 그룹 카드 컴포넌트 (메모이제이션)
const GroupCard = memo(({ 
  group, 
  isSelected, 
  onSelect,
  onDelete
}: { 
  group: Group; 
  isSelected: boolean; 
  onSelect: (groupId: string) => void;
  onDelete: (groupId: string) => void;
}) => {
  const cardClassName = isSelected
    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
    : 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600';
  
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${cardClassName}`}
      onClick={() => onSelect(group.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm mb-1">
            {group.name}
          </h4>
          {group.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 overflow-hidden">
              {group.description}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(group.id);
          }}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2"
          title="Delete Group"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
});

interface ToolsMemorySettingsProps {
  nodeId: string;
}

const ToolsMemorySettings: React.FC<ToolsMemorySettingsProps> = ({ nodeId }) => {
  const { nodes, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const groups = (node?.data.config?.groups as Group[]) || [];
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [tempCodeValue, setTempCodeValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 0, ch: 0 });
  const [setCursorPositionFn, setSetCursorPositionFn] = useState<((position: { line: number; ch: number }) => void) | null>(null);
  const [modalSelectedGroupId, setModalSelectedGroupId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showGroupList, setShowGroupList] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'code' | 'description'>('code');
  const [tempDescriptionValue, setTempDescriptionValue] = useState<string>('');
  const [tempGroupNameValue, setTempGroupNameValue] = useState<string>('');
  
  useEffect(() => {
    // Tools 노드에서는 기본적으로 그룹이 선택되지 않은 상태로 시작
    setSelectedGroupId(null);
    setShowGroupList(false);
  }, [nodeId]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = groups.find((g: Group) => g.id === selectedGroupId);

  const checkNameExists = (name: string, currentGroupId: string): boolean => {
    return groups.some(g => 
      g.id !== currentGroupId && 
      g.name.toLowerCase() === name.toLowerCase()
    );
  };

  const handleCodeModalOpen = () => {
    setTempCodeValue(selectedGroup?.code || '# Write your Python code here\n');
    setTempDescriptionValue(selectedGroup?.description || '');
    setTempGroupNameValue(selectedGroup?.name || '');
    setModalSelectedGroupId(selectedGroupId);
    setHasUnsavedChanges(false);
    setActiveModalTab('code');
    setIsCodeModalOpen(true);
  };

  const handleGroupChange = useCallback((newGroupId: string) => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('현재 코드에 저장되지 않은 변경사항이 있습니다. 저장하시겠습니까?');
      if (shouldSave) {
        handleUpdateGroup(modalSelectedGroupId!, { code: tempCodeValue, description: tempDescriptionValue });
      }
    }
    
    const newGroup = groups.find(g => g.id === newGroupId);
    setModalSelectedGroupId(newGroupId);
    setTempCodeValue(newGroup?.code || '# Write your Python code here\n');
    setTempDescriptionValue(newGroup?.description || '');
    setTempGroupNameValue(newGroup?.name || '');
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, modalSelectedGroupId, tempCodeValue, tempDescriptionValue, groups]);

  const handleCodeChange = (value: string) => {
    setTempCodeValue(value);
    setHasUnsavedChanges(true);
  };

  const handleDescriptionChange = (value: string) => {
    setTempDescriptionValue(value);
    setHasUnsavedChanges(true);
  };

  const handleGroupNameChange = (value: string) => {
    setTempGroupNameValue(value);
    setHasUnsavedChanges(true);
  };

  const handleCursorChange = useCallback((position: { line: number; ch: number }) => {
    setCursorPosition(position);
  }, []);

  const handleSetCursorPosition = useCallback((setFn: (position: { line: number; ch: number }) => void) => {
    setSetCursorPositionFn(() => setFn);
  }, []);

  const handleUpdateGroup = (groupId: string, updates: Partial<Group>) => {
    if ('name' in updates) {
      const newName = updates.name as string;
      if (checkNameExists(newName, groupId)) {
        setNameError('A group with this name already exists');
        return;
      }
      setNameError(null);
    }

    const updatedGroups = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, ...updates };
      }
      return g;
    });

    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        groups: updatedGroups
      }
    });
  };

  const handleRemoveGroup = (groupId: string) => {
    if (window.confirm('Are you sure you want to remove this group?')) {
      updateNodeData(nodeId, {
        ...node?.data,
        selectedGroupId: null,
        config: {
          ...node?.data.config,
          groups: groups.filter(g => g.id !== groupId)
        }
      } as NodeData);
      setSelectedGroupId(null);
    }
  };

  const handleAddGroup = () => {
    const defaultName = 'NewToolsGroup';
    let newName = defaultName;
    let counter = 1;
    
    // 중복되지 않는 이름 찾기
    while (groups.some(g => g.name.toLowerCase() === newName.toLowerCase())) {
      newName = `${defaultName}${counter}`;
      counter++;
    }

    const newGroup = {
      id: `group-${Date.now()}`,
      name: newName,
      description: '',
      code: '# Write your Python code here\n',
      type: 'tools'
    };

    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        groups: [...groups, newGroup]
      }
    });
  };

  const handleSelectGroup = (groupId: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      selectedGroupId: groupId
    } as NodeData);
    setSelectedGroupId(groupId);
  };

  // Tools 노드에서는 항상 그룹 리스트를 기본으로 보여줌
  if (!selectedGroup || selectedGroupId === null) {
    // 그룹이 선택되지 않은 경우 그룹 리스트를 보여줌
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tools Groups</h3>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-4">No tools groups available</p>
                <button
                  onClick={handleAddGroup}
                  className="flex items-center justify-center px-4 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-dashed border-blue-300 dark:border-blue-600 transition-colors mx-auto"
                >
                  <Plus size={16} className="mr-2" />
                  Add New Group
                </button>
              </div>
            ) : (
              <>
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroupId === group.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => handleSelectGroup(group.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">{group.name}</h4>
                        {group.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3 overflow-hidden">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to remove this group?')) {
                            updateNodeData(nodeId, {
                              ...node?.data,
                              config: {
                                ...node?.data.config,
                                groups: groups.filter(g => g.id !== group.id)
                              }
                            });
                            if (selectedGroupId === group.id) {
                              setSelectedGroupId(null);
                            }
                          }
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={handleAddGroup}
                  className="w-full flex items-center justify-center px-4 py-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-dashed border-blue-300 dark:border-blue-600 transition-colors"
                >
                  <Plus size={16} className="mr-2" />
                  Add New Group
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 그룹 리스트 보기 모드
  if (showGroupList) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tools Groups</h3>
            <button
              onClick={() => setShowGroupList(false)}
              className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => handleSelectGroup(group.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">{group.name}</h4>
                    {group.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3 overflow-hidden">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to remove this group?')) {
                        updateNodeData(nodeId, {
                          ...node?.data,
                          config: {
                            ...node?.data.config,
                            groups: groups.filter(g => g.id !== group.id)
                          }
                        });
                        if (selectedGroupId === group.id) {
                          setSelectedGroupId(null);
                        }
                      }
                    }}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={handleAddGroup}
              className="w-full flex items-center justify-center px-4 py-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-dashed border-blue-300 dark:border-blue-600 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Add New Group
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowGroupList(true)}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Groups
          </button>
          <button
            onClick={() => handleRemoveGroup(selectedGroup.id)}
            className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm"
          >
            Delete Group
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={selectedGroup.name}
              onChange={(e) => {
                // 영문, 언더스코어, 숫자만 허용
                const filteredValue = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                handleUpdateGroup(selectedGroup.id, { name: filteredValue });
              }}
              className={`w-full px-3 py-2 border ${
                nameError ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md focus:outline-none focus:ring-2 ${
                nameError ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              } text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              placeholder="Enter group name (English letters, numbers, underscore only)"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only English letters, numbers, and underscore (_) are allowed
            </p>
            {nameError && (
              <p className="mt-1 text-xs text-red-500 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {nameError}
              </p>
            )}
          </div>



          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={selectedGroup.description}
              onChange={(e) => handleUpdateGroup(selectedGroup.id, { description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter group description"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Python Code</h3>
            <button
              onClick={handleCodeModalOpen}
              className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              title="Expand code editor"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
        <div className="h-[calc(100vh-380px)]">
          <CodeEditor
            value={selectedGroup.code || '# Write your Python code here\n'}
            onChange={(value) => handleUpdateGroup(selectedGroup.id, { code: value })}
            language="python"
          />
        </div>
      </div>

      {/* 전체화면 코드 편집 모달 */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full h-full max-w-7xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Python Code Editor</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Write your Python code for tools and memory management
                </p>
                
                {/* 그룹 이름 편집 */}
                {modalSelectedGroupId && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={tempGroupNameValue}
                      onChange={(e) => {
                        // 영문, 언더스코어, 숫자만 허용
                        const filteredValue = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                        handleGroupNameChange(filteredValue);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter group name (English letters, numbers, underscore only)"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors ml-4"
                title="Close editor"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* 모달 본문 - 왼쪽 그룹 선택 카드와 오른쪽 에디터 */}
            <div className="flex-1 p-4 overflow-hidden">
              <div className="h-full flex gap-4">
                {/* 왼쪽 그룹 선택 카드 */}
                <div className="w-64 flex-shrink-0">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 h-full overflow-y-auto">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Group
                    </h3>
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <GroupCard
                          key={group.id}
                          group={group}
                          isSelected={modalSelectedGroupId === group.id}
                          onSelect={handleGroupChange}
                          onDelete={(groupId) => {
                            if (window.confirm('Are you sure you want to remove this group?')) {
                              updateNodeData(nodeId, {
                                ...node?.data,
                                config: {
                                  ...node?.data.config,
                                  groups: groups.filter(g => g.id !== groupId)
                                }
                              });
                              if (modalSelectedGroupId === groupId) {
                                setModalSelectedGroupId(null);
                                setTempCodeValue('# Write your Python code here\n');
                                setTempDescriptionValue('');
                                setTempGroupNameValue('');
                              }
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 오른쪽 에디터 영역 */}
                <div className="flex-1 flex flex-col">
                  {/* 탭 헤더 */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeModalTab === 'code' 
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setActiveModalTab('code')}
                    >
                      Python Code
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeModalTab === 'description' 
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setActiveModalTab('description')}
                    >
                      Description
                    </button>
                  </div>
                  
                  {/* 탭 콘텐츠 */}
                  <div className="flex-1 overflow-hidden">
                    {activeModalTab === 'code' && (
                      <div className="h-full">
                        <CodeEditor
                          value={tempCodeValue}
                          onChange={handleCodeChange}
                          language="python"
                          onCursorChange={handleCursorChange}
                          setCursorPosition={handleSetCursorPosition}
                        />
                      </div>
                    )}
                    
                    {activeModalTab === 'description' && (
                      <div className="h-full">
                        <CodeEditor
                          value={tempDescriptionValue}
                          onChange={handleDescriptionChange}
                          language="markdown"
                          onCursorChange={handleCursorChange}
                          setCursorPosition={handleSetCursorPosition}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {hasUnsavedChanges ? (
                  <span className="text-amber-600 dark:text-amber-400">⚠️ 저장되지 않은 변경사항이 있습니다</span>
                ) : (
                  'Python code for tools and memory management'
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      const shouldSave = window.confirm('저장되지 않은 변경사항이 있습니다. 저장하시겠습니까?');
                      if (shouldSave) {
                        handleUpdateGroup(modalSelectedGroupId!, { 
                          code: tempCodeValue, 
                          description: tempDescriptionValue,
                          name: tempGroupNameValue 
                        });
                      }
                    }
                    setIsCodeModalOpen(false);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateGroup(modalSelectedGroupId!, { 
                      code: tempCodeValue, 
                      description: tempDescriptionValue,
                      name: tempGroupNameValue 
                    });
                    setHasUnsavedChanges(false);
                    setIsCodeModalOpen(false);
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
    </div>
  );
};

export default ToolsMemorySettings;