import React from 'react';
import { useFlowStore } from '../../store/flowStore';

interface FunctionSettingsProps {
  nodeId: string;
}

const FunctionSettings: React.FC<FunctionSettingsProps> = ({ nodeId }) => {
  const { nodes, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);

  if (!node) {
    return <div>Node not found</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Function Settings
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure your function node settings here.
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Function Name
        </label>
        <input
          type="text"
          value={node.data.config?.functionName || 'sample_code'}
          onChange={(e) => {
            updateNodeData(nodeId, {
              ...node.data,
              config: {
                ...node.data.config,
                functionName: e.target.value
              }
            });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          placeholder="Enter function name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={node.data.description || ''}
          onChange={(e) => {
            updateNodeData(nodeId, {
              ...node.data,
              description: e.target.value
            });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          placeholder="Enter function description"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Timeout (seconds)
        </label>
        <input
          type="number"
          value={node.data.config?.timeout || 30}
          onChange={(e) => {
            updateNodeData(nodeId, {
              ...node.data,
              config: {
                ...node.data.config,
                timeout: parseInt(e.target.value) || 30
              }
            });
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          placeholder="30"
          min="1"
          max="300"
        />
      </div>
    </div>
  );
};

export default FunctionSettings; 