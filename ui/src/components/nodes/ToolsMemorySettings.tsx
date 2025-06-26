import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, ChevronLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import CodeEditor from '../CodeEditor';
import { Group, NodeData } from '../../types/node';
import CustomSelect from '../Common/CustomSelect';

interface ToolsMemorySettingsProps {
  nodeId: string;
}

const ToolsMemorySettings: React.FC<ToolsMemorySettingsProps> = ({ nodeId }) => {
  const { nodes, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const groups = (node?.data.config?.groups as Group[]) || [];
  const [nameError, setNameError] = useState<string | null>(null);
  
  useEffect(() => {
    const selectedGroupId = (node?.data as NodeData)?.selectedGroupId;
    if (selectedGroupId) {
      setSelectedGroupId(selectedGroupId);
    }
  }, [(node?.data as NodeData)?.selectedGroupId]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>((node?.data as NodeData)?.selectedGroupId || null);
  const selectedGroup = groups.find((g: Group) => g.id === selectedGroupId);

  const checkNameExists = (name: string, currentGroupId: string): boolean => {
    return groups.some(g => 
      g.id !== currentGroupId && 
      g.name.toLowerCase() === name.toLowerCase()
    );
  };

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

  const handleBack = () => {
    setSelectedGroupId(null);
    updateNodeData(nodeId, {
      ...node?.data,
      selectedGroupId: null
    } as NodeData);
  };

  if (!selectedGroup) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          >
            <ChevronLeft size={16} className="mr-1" />
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
              onChange={(e) => handleUpdateGroup(selectedGroup.id, { name: e.target.value })}
              className={`w-full px-3 py-2 border ${
                nameError ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md focus:outline-none focus:ring-2 ${
                nameError ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              } text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              placeholder="Enter group name"
            />
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

      {selectedGroup.type === 'tools' && (
        <div className="flex-1 overflow-hidden">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Python Code</h3>
          </div>
          <div className="h-[calc(100vh-380px)]">
            <CodeEditor
              value={selectedGroup.code || '# Write your Python code here\n'}
              onChange={(value) => handleUpdateGroup(selectedGroup.id, { code: value })}
              language="python"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsMemorySettings;