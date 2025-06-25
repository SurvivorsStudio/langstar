import React, { useEffect, useState } from 'react';
import { X, Settings, Code, AlertCircle, LogIn } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import CodeEditor from './CodeEditor';
import ConditionSettings from './nodes/ConditionSettings';
import PromptSettings from './nodes/PromptSettings';
import SystemPromptSettings from './nodes/SystemPromptSettings';
import AgentSettings from './nodes/AgentSettings';
import StartSettings from './nodes/StartSettings';
import GroupsSettings from './nodes/GroupsSettings';
import EmbeddingSettings from './nodes/EmbeddingSettings';
import RAGSettings from './nodes/RAGSettings';
import MergeSettings from './nodes/MergeSettings';
import EndNodeSettings from './nodes/EndNodeSettings';
import ToolsMemorySettings from './nodes/ToolsMemorySettings';
import { Node, Edge } from 'reactflow';
import { NodeData, VariableValue } from '../types/node';

interface NodeInspectorProps {
  nodeId: string;
  onClose: () => void;
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ nodeId, onClose }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const [activeTab, setActiveTab] = useState<'input_data' | 'code' | 'settings'>('input_data');
  const [currentNode, setCurrentNode] = useState<Node<NodeData> | null>(null);
  const [code, setCode] = useState<string>('');
  const [nodeName, setNodeName] = useState<string>('');
  const [selectedVariable, setSelectedVariable] = useState<string>('');
  
  const [incomingEdges, setIncomingEdges] = useState<Edge[]>([]);
  const [mergedInputData, setMergedInputData] = useState<Record<string, VariableValue>>({});
  const [hasValidInputData, setHasValidInputData] = useState<boolean>(false);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);

  useEffect(() => {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (node) {
      setCurrentNode(node as any);
      setCode(node.data.code || '# Write your Python code here\n\n');
      setNodeName(node.data.label || 'Untitled Node');

      const currentIncomingEdges = edges.filter((edge: Edge) => edge.target === nodeId);
      setIncomingEdges(currentIncomingEdges);

      const currentMergedInputData = currentIncomingEdges.reduce((acc: Record<string, VariableValue>, edge: Edge) => {
        if (edge.data?.output && typeof edge.data.output === 'object') {
          return { ...acc, ...edge.data.output };
        }
        return acc;
      }, {} as Record<string, VariableValue>);
      setMergedInputData(currentMergedInputData);

      const currentHasValidInputData = currentMergedInputData && Object.keys(currentMergedInputData).length > 0;
      setHasValidInputData(currentHasValidInputData);
      setAvailableVariables(currentHasValidInputData ? Object.keys(currentMergedInputData) : []);

      // Adjust active tab based on node type and current active tab validity
      const nodeType = node.type;
      let newDefaultTab: 'input_data' | 'code' | 'settings' = 'input_data';
      let currentTabIsValid = true;

      if (nodeType === 'startNode') {
        newDefaultTab = 'settings';
        if (activeTab !== 'settings') currentTabIsValid = false; 
      } else if (nodeType === 'endNode') {
        const validTabsForEndNode = ['input_data', 'settings'];
        if (!validTabsForEndNode.includes(activeTab)) {
          currentTabIsValid = false;
          newDefaultTab = 'settings';
        }
      } else if (nodeType === 'promptNode' || nodeType === 'systemPromptNode') {
        if (activeTab === 'settings') currentTabIsValid = false;
        newDefaultTab = 'input_data';
      } else if (
        nodeType && ['agentNode', 'conditionNode', 'groupsNode', 'embeddingNode', 'ragNode', 'mergeNode'].includes(nodeType)
      ) {
        if (activeTab === 'code') currentTabIsValid = false;
        newDefaultTab = 'input_data';
      }

      if (!currentTabIsValid) {
        setActiveTab(newDefaultTab);
      }
    }
  }, [nodeId, nodes, edges, activeTab]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNodeName(newName);
    if (newName.trim() && currentNode) {
      updateNodeData(nodeId, {
        ...currentNode.data,
        label: newName.trim()
      });
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (currentNode) {
      updateNodeData(currentNode.id, {
        ...currentNode.data,
        code: newCode
      });
    }
  };

  if (!currentNode) return null;

  const isConditionNode = currentNode.type === 'conditionNode';
  const isPromptNode = currentNode.type === 'promptNode';
  const isSystemPromptNode = currentNode.type === 'systemPromptNode';
  const isAgentNode = currentNode.type === 'agentNode';
  const isStartNode = currentNode.type === 'startNode';
  const isToolsMemoryNode = currentNode.type === 'toolsMemoryNode';
  const isEmbeddingNode = currentNode.type === 'embeddingNode';
  const isRAGNode = currentNode.type === 'ragNode';
  const isEndNode = currentNode.type === 'endNode';
  const isMergeNode = currentNode.type === 'mergeNode';

  return (
    <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col shadow-md z-10">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Node Inspector</h2>
        <button
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Node Name
        </label>
        <input
          type="text"
          value={nodeName}
          onChange={handleNameChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Enter node name"
        />
      </div>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {!isStartNode && (
          <button
            className={`flex-1 py-2 flex justify-center items-center ${
              activeTab === 'input_data' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('input_data')}
          >
            <LogIn size={16} className="mr-1" /> Input Data
          </button>
        )}

        {(() => {
          if (isPromptNode || isSystemPromptNode) {
            return (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'code' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}
                onClick={() => setActiveTab('code')}
              >
                <Settings size={16} className="mr-1" /> Settings
              </button>
            );
          } else if (!(isStartNode || isEndNode || isAgentNode || isConditionNode || isToolsMemoryNode || isEmbeddingNode || isRAGNode || isMergeNode)) {
            return (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'code' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}
                onClick={() => setActiveTab('code')}
              >
                <Code size={16} className="mr-1" /> Code
              </button>
            );
          }
          return null;
        })()}

        {!(isPromptNode || isSystemPromptNode) && (
          <button
            className={`flex-1 py-2 flex justify-center items-center ${
              activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} className="mr-1" /> Settings
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'input_data' && !isStartNode && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Incoming Data</h3>
            {incomingEdges.length === 0 ? (
              <div className="flex items-center mt-1 text-amber-500 text-xs">
                <AlertCircle size={12} className="mr-1" />
                No input connections. Connect a node to this node's input.
              </div>
            ) : !hasValidInputData ? (
              <div className="flex items-center mt-1 text-amber-500 text-xs">
                <AlertCircle size={12} className="mr-1" />
                Connected node(s) have not produced output or output is empty. Execute preceding nodes.
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 font-mono text-xs text-gray-900 dark:text-gray-100">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(mergedInputData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
        {activeTab === 'code' && (
          <div className="h-full">
            {isPromptNode ? (
              <PromptSettings nodeId={nodeId} />
            ) : isSystemPromptNode ? (
              <SystemPromptSettings nodeId={nodeId} />
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                      Available Input Variables
                    </label>
                    <select
                      value={selectedVariable}
                      onChange={(e) => setSelectedVariable(e.target.value)}
                      className={`w-full px-3 py-2 border ${
                        !hasValidInputData 
                          ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                      disabled={!hasValidInputData}
                    >
                      <option value="">Select a variable</option>
                      {availableVariables.map((variable) => (
                        <option key={variable} value={variable}>
                          {variable}: {JSON.stringify(mergedInputData[variable])}
                        </option>
                      ))}
                    </select>
                    {incomingEdges.length === 0 && (
                      <div className="flex items-center mt-1 text-amber-500 text-xs">
                        <AlertCircle size={12} className="mr-1" />
                        Connect an input node to access variables.
                      </div>
                    )}
                    {incomingEdges.length > 0 && !hasValidInputData && (
                      <div className="flex items-center mt-1 text-amber-500 text-xs">
                        <AlertCircle size={12} className="mr-1" />
                        Execute the connected node(s) to access their output variables.
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[calc(100%-80px)]">
                  <CodeEditor
                    value={code}
                    onChange={handleCodeChange}
                    language="python"
                  />
                </div>
              </>
            )}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="p-4 overflow-y-auto h-full">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Node Type
                </label>
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {currentNode.type}
                </div>
              </div>
              
              {isStartNode && <StartSettings nodeId={nodeId} />}
              {isConditionNode && <ConditionSettings nodeId={nodeId} />}
              {isAgentNode && <AgentSettings nodeId={nodeId} />}
              {isToolsMemoryNode && <ToolsMemorySettings nodeId={nodeId} />}
              {isEmbeddingNode && <EmbeddingSettings nodeId={nodeId} />}
              {isRAGNode && <RAGSettings nodeId={nodeId} />}
              {isMergeNode && <MergeSettings nodeId={nodeId} />}
              {isEndNode && <EndNodeSettings nodeId={nodeId} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeInspector;