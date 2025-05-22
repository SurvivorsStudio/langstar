import React, { useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react';
import { NodeCategory, nodeCategories } from '../data/nodeCategories';

interface NodeSidebarProps {
  onClose: () => void;
}

const NodeSidebar: React.FC<NodeSidebarProps> = ({ onClose }) => {
  const { addNode } = useFlowStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Sequential Agents': true
  });

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

  const handleAddNode = (type: string, label: string) => {
    addNode({
      type,
      position: { x: 250, y: 150 },
      data: { label, code: '', config: {} }
    });
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
    <div className="w-72 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col shadow-md z-10">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Add Nodes</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search nodes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {filteredCategories.map((category) => (
          <div key={category.id} className="border-b border-gray-200">
            <button
              onClick={() => toggleCategory(category.title)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">{category.title}</span>
              {expandedCategories[category.title] ? (
                <ChevronUp size={18} className="text-gray-500" />
              ) : (
                <ChevronDown size={18} className="text-gray-500" />
              )}
            </button>
            {expandedCategories[category.title] && (
              <div className="px-4 pb-3">
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer mb-2"
                    draggable
                    onDragStart={(event) => handleNodeDragStart(event, node.type, node.label)}
                    onClick={() => handleAddNode(node.type, node.label)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center mr-3">
                      {node.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-800">{node.label}</div>
                      <div className="text-xs text-gray-500">{node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodeSidebar;