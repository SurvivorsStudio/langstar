import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Pencil, Check } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';

interface EmbeddingSettingsProps {
  nodeId: string;
}

const EmbeddingSettings: React.FC<EmbeddingSettingsProps> = ({ nodeId }) => {
  const {nodes, edges, updateNodeData, aiConnections, fetchAIConnections, } = useFlowStore(state => ({
      nodes: state.nodes,
      edges: state.edges,
      updateNodeData: state.updateNodeData,
      aiConnections: state.aiConnections,
      fetchAIConnections: state.fetchAIConnections,
      }));
  // 컴포넌트 마운트 시 AI 연결 정보 로드
  useEffect(() => {
    fetchAIConnections();
  }, [fetchAIConnections]);

  const node = nodes.find(n => n.id === nodeId);
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);
  const incomingEdge = edges.find(edge => edge.target === nodeId);
  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  // Get available variables from source node output
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  // store에서 가져온 AI 연결 중 embedding 모델(active)만 필터링
  const mockEmbeddingModels = aiConnections.filter(
      conn => conn.type === 'embedding' && conn.status === 'active'
  );

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

  const handleOutputVariableChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        outputVariable: value
      }
    });
  };

  // Mock embedding generation - currently unused but kept for future implementation
  // const generateEmbedding = () => {
  //   if (!sourceOutput || !node?.data.config?.inputColumn || !node?.data.config?.outputVariable) return;
  //   const result = { ...sourceOutput };
  //   result[node.data.config.outputColumn] = [1, 2, 3, 4]; // Mock embedding result
  //   return result;
  // };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Embedding Settings</h3>

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
                    id="embeddingOutputVariableInput"
                    value={node?.data.config?.outputVariable || ''}
                    onChange={(e) => handleOutputVariableChange(e.target.value)}
                    placeholder="Enter output variable name"
                    className={`flex-grow px-3 py-2 border ${
                      !hasValidOutput && availableVariables.length === 0 ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                    // Disable if no source and no current value, and no available variables to choose from
                    disabled={!hasValidOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable} 
                  />
                  <button
                    onClick={() => setIsEditingOutputVariable(false)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0"
                    aria-label="Confirm output column"
                  >
                    <Check size={18} />
                  </button>
                </>
              ) : (
                <>
                  <CustomSelect
                    value={node?.data.config?.outputVariable || ''}
                    onChange={handleOutputVariableChange}
                    options={[
                      ...(node?.data.config?.outputVariable && !availableVariables.includes(node.data.config.outputVariable)
                        ? [{ value: node.data.config.outputVariable, label: `${node.data.config.outputVariable} (Custom)` }]
                        : []),
                      ...availableVariables.map(variable => ({ value: variable, label: variable }))
                    ]}
                    placeholder="Select output variable"
                    disabled={!hasValidOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable}
                  />
                  <button onClick={() => setIsEditingOutputVariable(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0" aria-label="Edit output variable">
                    <Pencil size={18} />
                  </button>
                </>
              )}
            </div>
             {/* Warning messages can go here if needed, similar to other components */}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Embedding Model
          </label>
          <CustomSelect
            value={typeof node?.data.config?.model === 'string' ? node.data.config.model : ''}
            onChange={handleModelChange}
            options={mockEmbeddingModels.map(conn => ({ value: conn.model, label: `${conn.name} (${conn.provider})` }))}
            placeholder="Select a model"
            disabled={mockEmbeddingModels.length === 0}
          />
          {mockEmbeddingModels.length === 0 && (
            <p className="text-xs text-amber-500 dark:text-amber-400">
              No embedding models configured. Please add models in the RAG Configuration section.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Input Column
          </label>
          <select
            value={node?.data.config?.inputColumn || ''}
            onChange={(e) => handleInputColumnChange(e.target.value)}
            className={`w-full px-3 py-2 border ${
              !hasValidOutput ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
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
            <div className="flex items-center mt-1 text-amber-500 dark:text-amber-400 text-xs">
              <AlertCircle size={12} className="mr-1" />
              Connect an input node to access variables
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Output Format</h4>
        <pre className="text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 p-3 rounded border border-blue-100 dark:border-blue-800">
{`{
  "input_column": "Hello",
  "output_variable": [1, 2, 3, 4],
  "model": "cohere-embed"
}`}
        </pre>
      </div>
    </div>
  );
};

export default EmbeddingSettings;