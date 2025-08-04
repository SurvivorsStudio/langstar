import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, Search, Sun, Moon } from 'lucide-react';
import { nodeCategories } from '../data/nodeCategories';
import { useThemeStore } from '../store/themeStore';
import { useFlowStore } from '../store/flowStore';

interface NodeSidebarProps {
  onClose: () => void;
}

const NodeSidebar: React.FC<NodeSidebarProps> = ({ onClose }) => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { nodes } = useFlowStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Sequential Agents': true
  });

  // 현재 워크플로우에 tool 노드가 이미 존재하는지 확인
  const hasToolsNode = nodes.some(node => node.type === 'toolsMemoryNode');

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleNodeDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredCategories = searchTerm.trim() 
    ? nodeCategories.map(category => ({
        ...category,
        nodes: category.nodes.filter(node => 
          node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.nodes.length > 0)
    : nodeCategories;

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto flex flex-col shadow-md z-10">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Add Nodes</h2>
        <button
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search nodes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {filteredCategories.map((category) => (
          <div key={category.id} className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleCategory(category.title)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">{category.title}</span>
              {expandedCategories[category.title] ? (
                <ChevronUp size={18} className="text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
              )}
            </button>
            {expandedCategories[category.title] && (
              <div className="px-4 pb-3">
                {category.nodes.map((node) => {
                  // tool 노드가 이미 존재하고 현재 노드가 tool 노드인 경우 비활성화
                  const isDisabled = node.type === 'toolsMemoryNode' && hasToolsNode;
                  
                  return (
                    <div
                      key={node.type}
                      className={`flex flex-row items-center p-2 rounded-md mb-2 ${
                        isDisabled 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                      }`}
                      draggable={!isDisabled}
                      onDragStart={isDisabled ? undefined : (event) => handleNodeDragStart(event, node.type, node.label)}
                      title={isDisabled ? 'Only one Tools node is allowed per workflow' : undefined}
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-start mr-3">
                        {node.icon(isDarkMode ? 'text-white' : 'text-gray-700')}
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="font-medium text-sm text-gray-800 dark:text-gray-200 text-left">{node.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-left">
                          {isDisabled ? 'Already exists in workflow' : node.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div 
        className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-800 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-200 cursor-pointer transition-colors"
        onClick={toggleDarkMode}
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <div className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-100 dark:text-gray-800">
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          {isDarkMode ? <Sun className="h-5 w-5 text-red-500" /> : <Moon className="h-5 w-5 text-yellow-500" />}
        </div>
      </div>
    </div>
  );
};

export default NodeSidebar;