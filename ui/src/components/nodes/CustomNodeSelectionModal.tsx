import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, Check, Search } from 'lucide-react';
import { useUserNodeStore } from '../../store/userNodeStore';

interface CustomNodeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedUserNodeIds: string[]) => void;
  usedUserNodeIds: string[];
}

const CustomNodeSelectionModal: React.FC<CustomNodeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  usedUserNodeIds
}) => {
  const { userNodes, fetchUserNodes } = useUserNodeStore();
  const [selectedUserNodeIds, setSelectedUserNodeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchUserNodes();
      setSearchQuery(''); // Reset search when modal opens
    }
  }, [isOpen, fetchUserNodes]);

  // Filter nodes based on search query
  const filteredUserNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return userNodes;
    }

    const query = searchQuery.toLowerCase().trim();
    return userNodes.filter(node => 
      node.name.toLowerCase().includes(query) ||
      (node.functionDescription && node.functionDescription.toLowerCase().includes(query))
    );
  }, [userNodes, searchQuery]);

  if (!isOpen) return null;

  const handleUserNodeToggle = (userNodeId: string) => {
    // 이미 사용된 노드는 선택할 수 없음
    if (usedUserNodeIds.includes(userNodeId)) {
      return;
    }

    setSelectedUserNodeIds(prev => {
      if (prev.includes(userNodeId)) {
        return prev.filter(id => id !== userNodeId);
      } else {
        return [...prev, userNodeId];
      }
    });
  };

  const handleSave = () => {
    if (selectedUserNodeIds.length === 0) {
      alert('Please select at least one custom node');
      return;
    }

    onSave(selectedUserNodeIds);

    // Reset form
    setSelectedUserNodeIds([]);
  };

  const handleClose = () => {
    // Reset form
    setSelectedUserNodeIds([]);
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[600px] h-[700px] max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Tools Group - Custom Nodes
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search custom nodes by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Found {filteredUserNodes.length} node(s) matching "{searchQuery}"
              </p>
            )}
          </div>

          {/* Custom Nodes Selection */}
          <div className="flex-1 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                Select Custom Nodes ({selectedUserNodeIds.length} selected)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Each selected node will create a separate tools group using the node's name, description, and code.
                {usedUserNodeIds.length > 0 && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    {usedUserNodeIds.length} node(s) already used and cannot be selected again.
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {filteredUserNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AlertCircle size={48} className="text-gray-400 mb-4" />
                  {searchQuery ? (
                    <>
                      <p className="text-gray-600 dark:text-gray-400">
                        No custom nodes found matching "{searchQuery}"
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Try adjusting your search terms or{' '}
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          clear search
                        </button>
                      </p>
                    </>
                  ) : userNodes.length === 0 ? (
                    <>
                      <p className="text-gray-600 dark:text-gray-400">
                        No custom nodes available
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Create custom nodes first to use them in tools groups
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 dark:text-gray-400">
                        All custom nodes are already used
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Each custom node can only be used once per tools & memory node
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredUserNodes.map((userNode) => {
                    const isSelected = selectedUserNodeIds.includes(userNode.id);
                    const isUsed = usedUserNodeIds.includes(userNode.id);
                    
                    return (
                      <div
                        key={userNode.id}
                        onClick={() => handleUserNodeToggle(userNode.id)}
                        className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                          isUsed
                            ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isUsed
                                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                  : isSelected 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {isUsed ? (
                                  <X size={16} />
                                ) : isSelected ? (
                                  <Check size={16} />
                                ) : (
                                  <span className="text-sm font-medium">
                                    {userNode.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h3 className={`font-medium truncate ${
                                    isUsed 
                                      ? 'text-gray-500 dark:text-gray-500' 
                                      : 'text-gray-900 dark:text-gray-100'
                                  }`}>
                                    {userNode.name}
                                  </h3>
                                  {isUsed && (
                                    <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                      Already used
                                    </span>
                                  )}
                                </div>
                                {userNode.functionDescription && (
                                  <p className={`text-sm truncate ${
                                    isUsed 
                                      ? 'text-gray-400 dark:text-gray-500' 
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {userNode.functionDescription}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedUserNodeIds.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <Save size={16} className="mr-2" />
            Create {selectedUserNodeIds.length > 0 ? `${selectedUserNodeIds.length} ` : ''}Tools Group{selectedUserNodeIds.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomNodeSelectionModal;