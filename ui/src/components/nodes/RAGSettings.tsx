import React from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle } from 'lucide-react';

interface RAGSettingsProps {
  nodeId: string;
}

const RAGSettings: React.FC<RAGSettingsProps> = ({ nodeId }) => {
  const { nodes, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);

  // Mock RAG configurations - in a real app, this would come from your store or API
  const mockRAGConfigs = [
    {
      id: '1',
      name: 'Customer Support Knowledge Base',
      vectorDb: 'Pinecone',
      status: 'active',
    },
    {
      id: '2',
      name: 'Technical Documentation Assistant',
      vectorDb: 'Weaviate',
      status: 'active',
    }
  ];

  const handleConfigChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        ragConfig: value
      }
    });
  };

  const handleTopKChange = (value: number) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        topK: value
      }
    });
  };

  const handleSimilarityThresholdChange = (value: number) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        similarityThreshold: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">RAG Settings</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            RAG Configuration
          </label>
          <select
            value={node?.data.config?.ragConfig || ''}
            onChange={(e) => handleConfigChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select a RAG configuration</option>
            {mockRAGConfigs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name} ({config.vectorDb})
              </option>
            ))}
          </select>
          {mockRAGConfigs.length === 0 && (
            <p className="text-xs text-amber-500">
              No RAG configurations found. Please set up RAG in the RAG Configuration section.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Top K Results
          </label>
          <input
            type="number"
            value={node?.data.config?.topK || 3}
            onChange={(e) => handleTopKChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            min={1}
            max={20}
            step={1}
          />
          <p className="text-xs text-gray-500">
            Number of most similar documents to retrieve
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Similarity Threshold
          </label>
          <input
            type="number"
            value={node?.data.config?.similarityThreshold || 0.7}
            onChange={(e) => handleSimilarityThresholdChange(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            min={0}
            max={1}
            step={0.1}
          />
          <p className="text-xs text-gray-500">
            Minimum similarity score for retrieved documents (0-1)
          </p>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Output Format</h4>
        <pre className="text-xs text-blue-600 bg-white p-3 rounded border border-blue-100">
{`{
  "documents": [
    {
      "content": "...",
      "metadata": { ... },
      "similarity": 0.92
    }
  ],
  "total_found": 3
}`}
        </pre>
      </div>
    </div>
  );
};

export default RAGSettings;