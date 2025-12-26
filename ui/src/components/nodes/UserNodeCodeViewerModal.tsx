import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code } from 'lucide-react';
import CodeEditor from '../CodeEditor';
import { useUserNodeStore } from '../../store/userNodeStore';

interface UserNodeCodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserNodeIds: string[];
  selectedUserNodeId?: string;
  groupCode?: string;
  onCodeChange: (code: string) => void;
}

const UserNodeCodeViewerModal: React.FC<UserNodeCodeViewerModalProps> = ({
  isOpen,
  onClose,
  selectedUserNodeIds,
  selectedUserNodeId,
  groupCode,
  onCodeChange
}) => {
  const { userNodes } = useUserNodeStore();
  const [activeNodeId, setActiveNodeId] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // 활성 노드 결정 (멀티 선택이 있으면 첫 번째, 단일 선택이 있으면 그것 사용)
  useEffect(() => {
    if (isOpen) {
      let nodeId = '';
      if (selectedUserNodeIds && selectedUserNodeIds.length > 0) {
        nodeId = selectedUserNodeIds[0];
      } else if (selectedUserNodeId) {
        nodeId = selectedUserNodeId;
      }
      
      if (nodeId) {
        setActiveNodeId(nodeId);
        // 그룹에 저장된 코드가 있으면 그것을 사용, 없으면 원본 노드 코드 사용
        const userNode = userNodes.find(un => un.id === nodeId);
        const initialCode = groupCode || userNode?.code || '';
        setCode(initialCode);
        setHasChanges(false);
      }
    }
  }, [isOpen, selectedUserNodeIds, selectedUserNodeId, groupCode, userNodes]);

  if (!isOpen) return null;

  const activeUserNode = userNodes.find(un => un.id === activeNodeId);
  const availableNodes = selectedUserNodeIds && selectedUserNodeIds.length > 0 
    ? userNodes.filter(un => selectedUserNodeIds.includes(un.id))
    : selectedUserNodeId 
      ? userNodes.filter(un => un.id === selectedUserNodeId)
      : [];

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setHasChanges(newCode !== (groupCode || activeUserNode?.code || ''));
  };

  const handleSave = () => {
    onCodeChange(code);
    setHasChanges(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleNodeSwitch = (nodeId: string) => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Save before switching nodes?')) {
        handleSave();
      }
    }
    
    setActiveNodeId(nodeId);
    const userNode = userNodes.find(un => un.id === nodeId);
    const initialCode = groupCode || userNode?.code || '';
    setCode(initialCode);
    setHasChanges(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[900px] h-[700px] max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Eye size={20} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              User Node Code Viewer
            </h2>
            {hasChanges && (
              <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Node Selection Sidebar (if multiple nodes) */}
          {availableNodes.length > 1 && (
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available Nodes ({availableNodes.length})
                </h3>
              </div>
              <div className="overflow-y-auto">
                {availableNodes.map((userNode) => (
                  <button
                    key={userNode.id}
                    onClick={() => handleNodeSwitch(userNode.id)}
                    className={`w-full p-3 text-left border-b border-gray-200 dark:border-gray-700 transition-colors ${
                      activeNodeId === userNode.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{userNode.name}</div>
                    {userNode.functionDescription && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {userNode.functionDescription}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Code Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Active Node Info */}
            {activeUserNode && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center space-x-3">
                  <Code size={16} className="text-gray-600 dark:text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {activeUserNode.name}
                    </h3>
                    {activeUserNode.functionDescription && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activeUserNode.functionDescription}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <strong>Note:</strong> Changes made here will only affect this tools group, not the original custom node.
                </div>
              </div>
            )}

            {/* Code Editor */}
            <div className="flex-1">
              <CodeEditor
                value={code}
                onChange={handleCodeChange}
                language="python"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {activeUserNode && (
              <>Editing: <span className="font-medium">{activeUserNode.name}</span></>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Save size={16} className="mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNodeCodeViewerModal;