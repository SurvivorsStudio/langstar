import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { useUserNodeStore } from '../../store/userNodeStore';
import { AlertCircle, Code, Maximize2, X } from 'lucide-react';
import CodeEditor from '../CodeEditor';
import CodeEditorPopup from './CodeEditorPopup';
import UserNodeCodeViewerModal from './UserNodeCodeViewerModal';
import { Group, NodeData } from '../../types/node';
import CustomSelect from '../Common/CustomSelect';

interface ToolsMemorySettingsProps {
  nodeId: string;
}

const ToolsMemorySettings: React.FC<ToolsMemorySettingsProps> = ({ nodeId }) => {
  const { nodes, updateNodeData } = useFlowStore();
  const { userNodes, fetchUserNodes } = useUserNodeStore();
  const node = nodes.find(n => n.id === nodeId);
  const groups = (node?.data.config?.groups as Group[]) || [];
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);
  
  // 컴포넌트 마운트 시 사용자 노드 목록 가져오기
  useEffect(() => {
    fetchUserNodes();
  }, [fetchUserNodes]);
  
  useEffect(() => {
    const selectedGroupId = (node?.data as NodeData)?.selectedGroupId;
    if (selectedGroupId) {
      setSelectedGroupId(selectedGroupId);
      // 그룹이 변경될 때 에러 상태 초기화
      setNameError(null);
      setNameValidationError(null);
    }
  }, [(node?.data as NodeData)?.selectedGroupId]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>((node?.data as NodeData)?.selectedGroupId || null);
  const [isCodePopupOpen, setIsCodePopupOpen] = useState<boolean>(false);
  const [isUserNodeCodeViewerOpen, setIsUserNodeCodeViewerOpen] = useState<boolean>(false);
  const selectedGroup = groups.find((g: Group) => g.id === selectedGroupId);

  const checkNameExists = (name: string, currentGroupId: string): boolean => {
    return groups.some(g => 
      g.id !== currentGroupId && 
      g.name.toLowerCase() === name.toLowerCase()
    );
  };

  const validateEnglishName = (name: string): boolean => {
    // 영어 문자, 숫자, 공백, 언더스코어만 허용
    const englishRegex = /^[a-zA-Z0-9_\s]+$/;
    return englishRegex.test(name);
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<Group>) => {
    if ('name' in updates) {
      const newName = updates.name as string;
      
      // 영어 이름 검증
      if (!validateEnglishName(newName)) {
        setNameValidationError('Group name must contain only English letters, numbers, spaces, and underscores');
        return;
      }
      setNameValidationError(null);
      
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

  const handleUserNodeCodeChange = (code: string) => {
    if (selectedGroup) {
      handleUpdateGroup(selectedGroup.id, { code });
    }
  };

  if (!selectedGroup) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div />
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
              onChange={(e) => handleUpdateGroup(selectedGroup.id, { name: e.target.value })}
              className={`w-full px-3 py-2 border ${
                nameError || nameValidationError ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md focus:outline-none focus:ring-2 ${
                nameError || nameValidationError ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              } text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              placeholder="Enter group name (English only)"
            />
            {nameValidationError && (
              <p className="mt-1 text-xs text-red-500 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {nameValidationError}
              </p>
            )}
            {nameError && (
              <p className="mt-1 text-xs text-red-500 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {nameError}
              </p>
            )}
          </div>

          {selectedGroup.type === 'memory' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Memory Type
              </label>
              <CustomSelect
                value={selectedGroup.memoryType || 'ConversationBufferMemory'}
                onChange={value => handleUpdateGroup(selectedGroup.id, { memoryType: value as 'ConversationBufferMemory' | 'ConversationBufferWindowMemory' })}
                options={[
                  { value: 'ConversationBufferMemory', label: 'Conversation Buffer Memory' },
                  { value: 'ConversationBufferWindowMemory', label: 'Conversation Buffer Window Memory' }
                ]}
                placeholder="Select memory type"
              />
            </div>
          )}

          {selectedGroup.type === 'memory' && selectedGroup.memoryType === 'ConversationBufferWindowMemory' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Window Size
              </label>
              <input
                type="number"
                min="1"
                value={selectedGroup.windowSize || 5}
                onChange={(e) => handleUpdateGroup(selectedGroup.id, { windowSize: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter window size (default: 5)"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Number of conversation turns to keep in memory
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              {selectedGroup.type === 'tools' ? 'Tools Description' : 'Description'}
            </label>
            <textarea
              value={selectedGroup.description}
              onChange={(e) => handleUpdateGroup(selectedGroup.id, { description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder={selectedGroup.type === 'tools' ? 'Enter tools description' : 'Enter description'}
              rows={2}
            />
          </div>
        </div>
      </div>

      {selectedGroup.type === 'tools' && (
        <>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Source Type
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
              {selectedGroup.sourceType === 'userNode' ? 'User Node (사용자 노드 선택)' : 'Custom Code (직접 작성)'}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Source type cannot be modified after creation
            </p>
          </div>

          {selectedGroup.sourceType === 'userNode' && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                  Select User Node(s)
                </label>
                {(selectedGroup.selectedUserNodeIds?.length > 0 || selectedGroup.selectedUserNodeId) && (
                  <button
                    onClick={() => setIsUserNodeCodeViewerOpen(true)}
                    className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center"
                    title="View and edit code"
                  >
                    <Maximize2 size={14} className="mr-1" />
                    View Code
                  </button>
                )}
              </div>
              
              {/* 멀티 선택이 있는 경우 멀티 선택 UI 표시 (읽기 전용) */}
              {selectedGroup.selectedUserNodeIds && selectedGroup.selectedUserNodeIds.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Selected {selectedGroup.selectedUserNodeIds.length} user node(s):
                  </div>
                  <div className="space-y-2">
                    {selectedGroup.selectedUserNodeIds.map(nodeId => {
                      const userNode = userNodes.find(un => un.id === nodeId);
                      return userNode ? (
                        <div key={nodeId} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {userNode.name}
                          </span>
                          {userNode.functionDescription && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              - {userNode.functionDescription}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    User node selection cannot be modified after creation
                  </p>
                </div>
              ) : selectedGroup.selectedUserNodeId ? (
                /* 단일 선택 UI (읽기 전용) */
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                    <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                      {userNodes.find(un => un.id === selectedGroup.selectedUserNodeId)?.name || 'Unknown Node'}
                    </div>
                    {(() => {
                      const userNode = userNodes.find(un => un.id === selectedGroup.selectedUserNodeId);
                      return userNode?.functionDescription ? (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {userNode.functionDescription}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    User node selection cannot be modified after creation
                  </p>
                </div>
              ) : (
                /* 선택된 노드가 없는 경우 */
                <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No user node selected
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    User node selection cannot be modified after creation
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedGroup.type === 'tools' && (!selectedGroup.sourceType || selectedGroup.sourceType === 'customCode') && (
        <div className="flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Python Code
              </span>
            </div>
            <button
              onClick={() => setIsCodePopupOpen(true)}
              className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center"
              title="Open in full screen editor"
            >
              <Maximize2 size={14} className="mr-1" />
              Full Screen
            </button>
          </div>
          <div className="h-[calc(100vh-480px)]">
            <CodeEditor
              value={selectedGroup.code || '# Write your Python code here\n'}
              onChange={(value) => handleUpdateGroup(selectedGroup.id, { code: value })}
              language="python"
            />
          </div>
        </div>
      )}
      
      {/* Code Editor Popup */}
      <CodeEditorPopup
        isOpen={isCodePopupOpen}
        onClose={() => setIsCodePopupOpen(false)}
        value={selectedGroup?.code || '# Write your Python code here\n'}
        onChange={(value) => {
          if (selectedGroup) {
            handleUpdateGroup(selectedGroup.id, { code: value });
          }
        }}
        edgeData={{}}
        sourceNode={null}
        availableVariables={[]}
        hideInputVariables={true}
      />
      
      {/* User Node Code Viewer Modal */}
      <UserNodeCodeViewerModal
        isOpen={isUserNodeCodeViewerOpen}
        onClose={() => setIsUserNodeCodeViewerOpen(false)}
        selectedUserNodeIds={selectedGroup?.selectedUserNodeIds || []}
        selectedUserNodeId={selectedGroup?.selectedUserNodeId}
        groupCode={selectedGroup?.code}
        onCodeChange={handleUserNodeCodeChange}
      />
    </div>
  );
};

export default ToolsMemorySettings;