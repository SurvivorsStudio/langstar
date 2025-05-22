import React from 'react';
import CodeEditor from '../CodeEditor';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle } from 'lucide-react';

interface SystemPromptSettingsProps {
  nodeId: string;
}

const SystemPromptSettings: React.FC<SystemPromptSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const incomingEdge = edges.find(edge => edge.target === nodeId);
  const sourceNode = incomingEdge ? nodes.find(n => n.id === incomingEdge.source) : null;
  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  // Get available variables from source node output
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  const handleOutputVariableChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        outputVariable: value
      }
    });
  };

  const handleSystemPromptChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        systemPrompt: value
      }
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              Output Variable
            </label>
            <div className="relative">
              <select
                value={node?.data.config?.outputVariable || ''}
                onChange={(e) => handleOutputVariableChange(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  !hasValidOutput ? 'bg-gray-50 text-gray-400' : 'bg-white'
                } border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                disabled={!hasValidOutput}
              >
                <option value="">Select output variable</option>
                {availableVariables.map((variable) => (
                  <option key={variable} value={variable}>
                    {variable}
                  </option>
                ))}
              </select>
              {!incomingEdge && (
                <div className="flex items-center mt-1 text-amber-500 text-xs">
                  <AlertCircle size={12} className="mr-1" />
                  Connect an input node to access variables
                </div>
              )}
              {incomingEdge && !hasValidOutput && (
                <div className="flex items-center mt-1 text-amber-500 text-xs">
                  <AlertCircle size={12} className="mr-1" />
                  Execute the connected node to access its output variables
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-2">System Prompt</h3>
          <p className="text-sm text-blue-600">
            Define the system behavior and constraints
          </p>
        </div>
        <div className="h-[calc(100%-80px)]">
          <CodeEditor
            value={node?.data.config?.systemPrompt || ''}
            onChange={handleSystemPromptChange}
            language="markdown"
          />
        </div>
      </div>
    </div>
  );
};

export default SystemPromptSettings;