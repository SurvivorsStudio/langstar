import React from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle } from 'lucide-react';

interface EmbeddingSettingsProps {
  nodeId: string;
}

const EmbeddingSettings: React.FC<EmbeddingSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const incomingEdge = edges.find(edge => edge.target === nodeId);
  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  // Get available variables from source node output
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  // Mock embedding models - in a real app, this would come from your store or API
  const mockEmbeddingModels = [
    { id: '1', name: 'OpenAI Ada 002', provider: 'OpenAI', status: 'active' },
    { id: '2', name: 'Cohere Embed', provider: 'Cohere', status: 'active' },
    { id: '3', name: 'GTE-Large', provider: 'Hugging Face', status: 'active' }
  ];

  const handleModelChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        model: value
      }
    });
  };

  const handleInputColumnChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        inputColumn: value
      }
    });
  };

  const handleOutputColumnChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        outputColumn: value
      }
    });
  };

  // Mock embedding generation
  const generateEmbedding = () => {
    if (!sourceOutput || !node?.data.config?.inputColumn || !node?.data.config?.outputColumn) return;

    const result = { ...sourceOutput };
    result[node.data.config.outputColumn] = [1, 2, 3, 4]; // Mock embedding result
    return result;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Embedding Settings</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Embedding Model
          </label>
          <select
            value={node?.data.config?.model || ''}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select a model</option>
            {mockEmbeddingModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </select>
          {mockEmbeddingModels.length === 0 && (
            <p className="text-xs text-amber-500">
              No embedding models configured. Please add models in the RAG Configuration section.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Input Column
          </label>
          <select
            value={node?.data.config?.inputColumn || ''}
            onChange={(e) => handleInputColumnChange(e.target.value)}
            className={`w-full px-3 py-2 border ${
              !hasValidOutput ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
            disabled={!hasValidOutput}
          >
            <option value="">Select input column</option>
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
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Output Column
          </label>
          <select
            value={node?.data.config?.outputColumn || ''}
            onChange={(e) => handleOutputColumnChange(e.target.value)}
            className={`w-full px-3 py-2 border ${
              !hasValidOutput ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
            disabled={!hasValidOutput}
          >
            <option value="">Select output column</option>
            {availableVariables.map((variable) => (
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
  "input_column": "Hello",
  "output_column": [1, 2, 3, 4],
  "model": "cohere-embed"
}`}
        </pre>
      </div>
    </div>
  );
};

export default EmbeddingSettings;