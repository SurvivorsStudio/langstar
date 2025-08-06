import React, { useState } from 'react';
import { Plus, Code, Edit, Trash2 } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import NodeCreation from './NodeCreation';
import NodeDetail from './NodeDetail';

interface NodeManagementProps {
  onBack: () => void;
}

const NodeManagement: React.FC<NodeManagementProps> = ({ onBack }) => {
  const { userNodes, fetchUserNodes, deleteUserNode } = useFlowStore();
  const [showNodeCreation, setShowNodeCreation] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  React.useEffect(() => {
    fetchUserNodes();
  }, [fetchUserNodes]);

  const handleAddNode = () => {
    setShowNodeCreation(true);
  };

  const handleBackToManagement = () => {
    setShowNodeCreation(false);
    setSelectedNode(null);
  };

  const handleBackFromDetail = () => {
    setSelectedNode(null);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleDeleteNode = async (nodeId: string, nodeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the node "${nodeName}"?`)) {
      try {
        await deleteUserNode(nodeId);
      } catch (error) {
        alert(`Error deleting node: ${(error as Error).message}`);
      }
    }
  };

  if (showNodeCreation) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBackToManagement}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Back to Node Management
          </button>
        </div>
        <NodeCreation onSave={handleBackToManagement} />
      </div>
    );
  }

  if (selectedNode) {
    return <NodeDetail nodeId={selectedNode} onBack={handleBackFromDetail} />;
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Node Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your custom nodes
          </p>
        </div>
        <button
          onClick={handleAddNode}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Node
        </button>
      </div>

      <div className="p-6">
        {userNodes.length === 0 ? (
          <div className="text-center py-12">
            <Code className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No custom nodes yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first custom node to get started
            </p>
            <button
              onClick={handleAddNode}
              className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Node
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userNodes.map((node) => (
                             <div
                 key={node.id}
                 onClick={() => handleNodeClick(node.id)}
                 className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer group"
               >
                <div className="flex items-start justify-between mb-4">
                                     <div className="flex items-center">
                     <Code className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
                     <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                       {node.name}
                     </h3>
                   </div>
                  <button
                    onClick={(e) => handleDeleteNode(node.id, node.name, e)}
                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {node.functionDescription || 'No description provided'}
                </p>
                
                                 <div className="space-y-2">
                   <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                     <span className="font-medium">Function:</span>
                     <span className="ml-1">{node.functionName}</span>
                   </div>
                   <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                     <span className="font-medium">Parameters:</span>
                     <span className="ml-1">{node.parameters.length}</span>
                   </div>
                   <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                     <span className="font-medium">Last modified:</span>
                     <span className="ml-1">
                       {new Date(node.lastModified).toLocaleDateString()}
                     </span>
                   </div>
                   <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600">
                     <p className="text-xs text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                       Click to view details →
                     </p>
                   </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeManagement; 