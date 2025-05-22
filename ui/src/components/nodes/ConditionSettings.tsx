import React from 'react';
import { useFlowStore } from '../../store/flowStore';
import { Edge } from 'reactflow';
import { AlertCircle } from 'lucide-react';

interface ConditionSettingsProps {
  nodeId: string;
}

const ConditionSettings: React.FC<ConditionSettingsProps> = ({ nodeId }) => {
  const { edges, nodes, updateEdgeLabel } = useFlowStore();
  const nodeEdges = edges.filter(edge => edge.source === nodeId);
  const startNode = nodes.find(node => node.type === 'startNode');
  const className = startNode?.data.config?.className || '';

  const handleConditionChange = (edge: Edge, type: string, condition: string) => {
    const newLabel = type === 'if' ? condition : `${type} ${condition}`;
    updateEdgeLabel(edge.id, newLabel);
  };

  const getTargetNodeName = (targetId: string) => {
    const targetNode = nodes.find(node => node.id === targetId);
    return targetNode?.data.label || targetId;
  };

  const parseCondition = (label: string = '') => {
    const match = label.match(/^(if|elif|else)?\s*(.*)/);
    return {
      type: match?.[1] || 'if',
      condition: match?.[2] || ''
    };
  };

  const validateCondition = (condition: string) => {
    if (!className) {
      return { isValid: false, error: 'Class Name is not defined in Start Node' };
    }

    const conditionRegex = new RegExp(`^${className}\\['[\\w_]+'\\]`);
    if (!conditionRegex.test(condition)) {
      return { 
        isValid: false, 
        error: `Condition must start with ${className}['propertyName']` 
      };
    }

    return { isValid: true, error: null };
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Conditions</h3>
      {nodeEdges.length === 0 ? (
        <p className="text-sm text-gray-500">No connections yet. Connect this node to others to set conditions.</p>
      ) : (
        nodeEdges.map((edge) => {
          const { type, condition } = parseCondition(edge.data?.label);
          const validation = validateCondition(condition);
          
          return (
            <div key={edge.id} className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-600">
                Condition for connection to {getTargetNodeName(edge.target)}
              </label>
              <input
                type="text"
                placeholder="Enter condition description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white mb-2"
              />
              <div className="flex gap-2">
                <select
                  value={type}
                  onChange={(e) => handleConditionChange(edge, e.target.value, condition)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="if">if</option>
                  <option value="elif">elif</option>
                  <option value="else">else</option>
                </select>
                {type !== 'else' && (
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => handleConditionChange(edge, type, e.target.value)}
                    placeholder={`${className}['value'] > 100`}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm bg-white ${
                      !validation.isValid 
                        ? 'border-red-300 focus:ring-red-500 text-red-600' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                )}
              </div>
              {!validation.isValid && (
                <div className="flex items-center mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} className="mr-1" />
                  {validation.error}
                </div>
              )}
              <div className="mt-1 text-xs text-gray-500">
                {type !== 'else' ? 'Enter a Python condition expression' : 'Else condition will be used as default path'}
              </div>
            </div>
          );
        })
      )}
      {nodeEdges.length > 0 && (
        <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded-md">
          <p>Tips:</p>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>Use Python comparison operators: ==, !=, &gt;, &lt;, &gt;=, &lt;=</li>
            <li>Access input data using the class name from Start Node</li>
            <li>Example: {className}['value'] &gt; 100</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConditionSettings;