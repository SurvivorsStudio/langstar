import React from 'react';
import { useFlowStore } from '../../store/flowStore';
import { Edge } from 'reactflow';

interface ConditionSettingsProps {
  nodeId: string;
}

const ConditionSettings: React.FC<ConditionSettingsProps> = ({ nodeId }) => {
  const { edges, nodes, updateEdgeLabel } = useFlowStore();
  const nodeEdges = edges.filter(edge => edge.source === nodeId);

  const handleConditionChange = (edge: Edge, newLabel: string) => {
    updateEdgeLabel(edge.id, newLabel);
  };

  const getTargetNodeName = (targetId: string) => {
    const targetNode = nodes.find(node => node.id === targetId);
    return targetNode?.data.label || targetId;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Conditions</h3>
      {nodeEdges.length === 0 ? (
        <p className="text-sm text-gray-500">No connections yet. Connect this node to others to set conditions.</p>
      ) : (
        nodeEdges.map((edge) => (
          <div key={edge.id} className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-600">
              Condition for connection to {getTargetNodeName(edge.target)}
            </label>
            <div className="relative">
              <input
                type="text"
                value={edge.data?.label || ''}
                onChange={(e) => handleConditionChange(edge, e.target.value)}
                placeholder="e.g., value > 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              />
              <div className="mt-1 text-xs text-gray-500">
                Enter a Python condition expression
              </div>
            </div>
          </div>
        ))
      )}
      {nodeEdges.length > 0 && (
        <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded-md">
          <p>Tips:</p>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>Use Python comparison operators: ==, !=, &gt;, &lt;, &gt;=, &lt;=</li>
            <li>Access input data using the 'input' variable</li>
            <li>Example: input['value'] &gt; 100</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConditionSettings;