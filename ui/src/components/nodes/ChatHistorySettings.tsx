import React from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle } from 'lucide-react';

interface ChatHistorySettingsProps {
  nodeId: string;
}

const ChatHistorySettings: React.FC<ChatHistorySettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const incomingEdge = edges.find(edge => edge.target === nodeId);
  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  const handleMaxMessagesChange = (value: number) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        maxMessages: value
      }
    });
  };

  const handleRoleVariableChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        roleVariable: value
      }
    });
  };

  const handleContentVariableChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        contentVariable: value
      }
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Chat History Settings</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Maximum Messages
          </label>
          <input
            type="number"
            min="1"
            value={node?.data.config?.maxMessages || 10}
            onChange={(e) => handleMaxMessagesChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-gray-500">
            Maximum number of messages to keep in history
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Role Variable
          </label>
          <select
            value={node?.data.config?.roleVariable || ''}
            onChange={(e) => handleRoleVariableChange(e.target.value)}
            className={`w-full px-3 py-2 border ${
              !hasValidOutput ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
            disabled={!hasValidOutput}
          >
            <option value="">Select role variable</option>
            {hasValidOutput && Object.keys(sourceOutput).map((variable) => (
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
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Content Variable
          </label>
          <select
            value={node?.data.config?.contentVariable || ''}
            onChange={(e) => handleContentVariableChange(e.target.value)}
            className={`w-full px-3 py-2 border ${
              !hasValidOutput ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
            disabled={!hasValidOutput}
          >
            <option value="">Select content variable</option>
            {hasValidOutput && Object.keys(sourceOutput).map((variable) => (
              <option key={variable} value={variable}>
                {variable}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Output Format</h4>
        <pre className="text-xs text-blue-600 bg-white p-3 rounded border border-blue-100">
{`{
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}`}
        </pre>
      </div>
    </div>
  );
};

export default ChatHistorySettings;