import React, { useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Pencil, Check } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';

interface RAGSettingsProps {
  nodeId: string;
}

const RAGSettings: React.FC<RAGSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);

  // Logic to get available variables from a connected source node
  const incomingEdge = edges.find(edge => edge.target === nodeId);
  const sourceOutput = incomingEdge?.data?.output || null;
  // RAG node primarily produces output, but this helps if user wants to overwrite or align names
  const hasValidSourceOutput = sourceOutput && typeof sourceOutput === 'object' && Object.keys(sourceOutput).length > 0;
  const availableVariables = hasValidSourceOutput ? Object.keys(sourceOutput) : [];

  
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

  const handleOutputVariableChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        outputVariable: value,
      },
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
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">RAG Settings</h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Output Variable
          </label>
          <div className="relative"> {/* Container for input/select and warnings */}
            <div className="flex items-center space-x-2">
              {isEditingOutputVariable ? (
                <>
                  <input
                    type="text"
                    id="ragOutputVariableInput"
                    value={node?.data.config?.outputVariable || ''}
                    onChange={(e) => handleOutputVariableChange(e.target.value)}
                    placeholder="Enter output variable name"
                    className={`flex-grow px-3 py-2 border ${
                      !hasValidSourceOutput && availableVariables.length === 0 ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                     disabled={!hasValidSourceOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable}
                  />
                  <button
                    onClick={() => setIsEditingOutputVariable(false)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0"
                    aria-label="Confirm output variable"
                  >
                    <Check size={18} />
                  </button>
                </>
              ) : (
                <>
                  <select
                    id="ragOutputVariableSelect"
                    value={node?.data.config?.outputVariable || ''}
                    onChange={(e) => handleOutputVariableChange(e.target.value)}
                    className={`flex-grow px-3 py-2 border ${
                      !hasValidSourceOutput && availableVariables.length === 0 ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                    disabled={!hasValidSourceOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable}
                  >
                    <option value="">Set output variable name</option>
                    {node?.data.config?.outputVariable && !availableVariables.includes(node.data.config.outputVariable) && (
                      <option value={node.data.config.outputVariable}>{node.data.config.outputVariable} (Custom)</option>
                    )}
                    {availableVariables.map((variable) => (
                      <option key={variable} value={variable}>{variable} (Overwrite)</option>
                    ))}
                  </select>
                  <button onClick={() => setIsEditingOutputVariable(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0" aria-label="Edit output variable">
                    <Pencil size={18} />
                  </button>
                </>
              )}
            </div>
            {/* Optional: Add warning if no input node is connected, though less critical for RAG output naming */}
            {!incomingEdge && (
                <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <AlertCircle size={12} className="mr-1" />
                  Define a name for the RAG output.
                </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            RAG Configuration
          </label>
          <CustomSelect
            value={node?.data.config?.ragConfig || ''}
            onChange={handleConfigChange}
            options={mockRAGConfigs.map(config => ({ value: config.id, label: `${config.name} (${config.vectorDb})` }))}
            placeholder="Select a RAG configuration"
            disabled={mockRAGConfigs.length === 0}
          />
          {mockRAGConfigs.length === 0 && (
            <p className="text-xs text-amber-500 dark:text-amber-400">
              No RAG configurations found. Please set up RAG in the RAG Configuration section.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Top K Results
          </label>
          <input
            type="number"
            value={node?.data.config?.topK || 3}
            onChange={(e) => handleTopKChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            min={1}
            max={20}
            step={1}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Number of most similar documents to retrieve
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Similarity Threshold
          </label>
          <input
            type="number"
            value={node?.data.config?.similarityThreshold || 0.7}
            onChange={(e) => handleSimilarityThresholdChange(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            min={0}
            max={1}
            step={0.1}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Minimum similarity score for retrieved documents (0-1)
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Output Format</h4>
        <pre className="text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 p-3 rounded border border-blue-100 dark:border-blue-800">
{`// Output will be under the 'Output Variable' name, e.g., 'retrieved_docs'
// "retrieved_docs": {
  "documents": [
  "documents": [
    {
      "content": "...",
      "metadata": { ... },
      "similarity": 0.92
    }
  ],
  "total_found": 3
// }`}
        </pre>
      </div>
    </div>
  );
};

export default RAGSettings;