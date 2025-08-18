import React, { useState } from 'react';
import CodeEditor from '../CodeEditor';
import { useFlowStore } from '../../store/flowStore';
import { AlertCircle, Pencil, Check, Maximize2 } from 'lucide-react';
import CustomSelect from '../Common/CustomSelect';
import PromptTemplatePopup from './PromptTemplatePopup';

interface PromptSettingsProps {
  nodeId: string;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const incomingEdge = edges.find(edge => edge.target === nodeId);

  const sourceOutput = incomingEdge?.data?.output || null;
  const hasValidOutput = sourceOutput && Object.keys(sourceOutput).length > 0;

  // Get available variables from source node output
  const availableVariables = hasValidOutput ? Object.keys(sourceOutput) : [];

  // Get source node info
  const sourceNode = nodes.find(n => n.id === incomingEdge?.source);

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
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
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
                      id="promptOutputVariableInput"
                      value={node?.data.config?.outputVariable || ''}
                      onChange={(e) => handleOutputVariableChange(e.target.value)}
                      placeholder="Enter output variable name"
                      className={`flex-grow px-3 py-2 border ${
                        !hasValidOutput && availableVariables.length === 0 
                          ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                      disabled={!hasValidOutput && availableVariables.length === 0 && !node?.data.config?.outputVariable} // Disable if no source and no current value
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
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Prompt Template</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Use {'{variable}'} syntax to insert variables from input
              </p>
            </div>
            <button
              onClick={() => setIsPopupOpen(true)}
              className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
              title="Open in full screen editor"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
        <div className="h-[calc(100%-180px)]">
          <CodeEditor
            value={node?.data.config?.template || ''}
            onChange={handleTemplateChange}
            language="markdown"
          />
        </div>
      </div>

      {/* Prompt Template Popup */}
      <PromptTemplatePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        value={node?.data.config?.template || ''}
        onChange={handleTemplateChange}
        edgeData={sourceOutput}
        sourceNode={sourceNode}
        availableVariables={availableVariables}
      />
    </div>
  );
};

export default PromptSettings;