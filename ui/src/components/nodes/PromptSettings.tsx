import React from 'react';
import CodeEditor from '../CodeEditor';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle } from 'lucide-react';

interface PromptSettingsProps {
  nodeId: string;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const incomingEdge = edges.find(edge => edge.target === nodeId);
  const sourceNode = incomingEdge ? nodes.find(n => n.id === incomingEdge.source) : null;
  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  // Get available variables from source node output
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  const handleOutputVariableChange = (value: string) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot update outputVariable.`);
      return;
    }
    updateNodeData(nodeId, {
      // node.data is now guaranteed to be defined here
      ...node.data,
      config: {
        // node.data.config might still be undefined, so handle it
        ...(node.data.config || {}),
        outputVariable: value
      }
    });
  };

  const handleTemplateChange = (value: string) => {
    if (!node || !node.data) {
      console.warn(`[PromptSettings] Node data for node ID ${nodeId} is not available. Cannot update template.`);
      return;
    }
    updateNodeData(nodeId, {
      // node.data is now guaranteed to be defined here
      ...node.data,
      config: {
        // node.data.config might still be undefined, so handle it
        ...(node.data.config || {}),
        template: value
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
          <h3 className="text-sm font-medium text-blue-800 mb-2">Prompt Template</h3>
          <p className="text-sm text-blue-600">
            Use {'{variable}'} syntax to insert variables from input
          </p>
        </div>
        <div className="h-[calc(100%-180px)]">
          <CodeEditor
            value={node?.data.config?.template || ''}
            onChange={handleTemplateChange}
            language="markdown"
          />
        </div>
      </div>
    </div>
  );
};

export default PromptSettings;