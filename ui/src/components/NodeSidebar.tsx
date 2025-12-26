import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Search, Code } from 'lucide-react';
import { getNodeCategories } from '../data/nodeCategories';
import { useFlowStore } from '../store/flowStore';

import { useUserNodeStore } from '../store/userNodeStore';


import { useTranslation } from '../hooks/useTranslation';

interface NodeSidebarProps {
  onClose: () => void;
}

const NodeSidebar: React.FC<NodeSidebarProps> = ({ onClose }) => {

  const { nodes, isWorkflowRunning } = useFlowStore();
  const { userNodes, fetchUserNodes } = useUserNodeStore();

  const { t, language } = useTranslation();
  
  // 다른 노드가 실행 중인지 확인
  const isAnyNodeExecuting = nodes.some(node => node.data?.isExecuting);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Sequential Agents': true,
    'User Nodes': false
  });

  // 언어가 변경될 때마다 노드 카테고리 재생성
  const currentNodeCategories = React.useMemo(() => getNodeCategories(), [language]);

  // UserNode 목록 로드
  useEffect(() => {
    fetchUserNodes();
  }, [fetchUserNodes]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleNodeDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    // 실행 중일 때는 드래그 비활성화
    if (isWorkflowRunning || isAnyNodeExecuting) {
      event.preventDefault();
      alert(t('alert.cannotAddNodeWhileRunning'));
      return;
    }
    
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredCategories = searchTerm.trim() 
    ? currentNodeCategories.map(category => ({
        ...category,
        nodes: category.nodes.filter(node => 
          node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.nodes.length > 0)
    : currentNodeCategories;

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto flex flex-col shadow-md z-10">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('sidebar.addNodes')}</h2>
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
            placeholder={t('sidebar.searchNodes')}
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
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    className={`flex flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md mb-2 ${
                      isWorkflowRunning || isAnyNodeExecuting 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer'
                    }`}
                    draggable={!(isWorkflowRunning || isAnyNodeExecuting)}
                    onDragStart={(event) => handleNodeDragStart(event, node.type, node.label)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-start mr-3">
                      {node.icon('text-gray-700')}
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-200 text-left">{node.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-left">{node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* UserNode 섹션 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleCategory('User Nodes')}
            className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="font-medium text-gray-700 dark:text-gray-300">{t('sidebar.userNodes')}</span>
            {expandedCategories['User Nodes'] ? (
              <ChevronUp size={18} className="text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
            )}
          </button>
          {expandedCategories['User Nodes'] && (
            <div className="px-4 pb-3">
              {userNodes.length === 0 ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('sidebar.noUserNodes')}
                </div>
              ) : (
                userNodes.map((userNode) => (
                  <div
                    key={userNode.id}
                    className={`flex flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md mb-2 ${
                      isWorkflowRunning || isAnyNodeExecuting 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer'
                    }`}
                    draggable={!(isWorkflowRunning || isAnyNodeExecuting)}
                    onDragStart={(event) => handleNodeDragStart(event, 'userNode', userNode.name)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-start mr-3">
                      <Code className="h-6 w-6 text-gray-700" />
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-200 text-left">{userNode.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-left">{userNode.functionDescription}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default NodeSidebar;