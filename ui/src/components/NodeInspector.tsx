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
import MergeSettings from './nodes/MergeSettings'; // MergeSettings import
import EndNodeSettings from './nodes/EndNodeSettings'; // EndNodeSettings import

interface NodeInspectorProps {
  nodeId: string;
  onClose: () => void;
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ nodeId, onClose }) => {
  const { nodes, edges, updateNodeData, removeNode } = useFlowStore();
  const [activeTab, setActiveTab] = useState<'input_data' | 'code' | 'settings'>('input_data');
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [code, setCode] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [selectedVariable, setSelectedVariable] = useState<string>('');
  
  const [incomingEdges, setIncomingEdges] = useState<any[]>([]);
  const [mergedInputData, setMergedInputData] = useState<Record<string, any>>({});
  const [hasValidInputData, setHasValidInputData] = useState(false);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);

  useEffect(() => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCurrentNode(node);
      setCode(node.data.code || '# Write your Python code here\n\n');
      setNodeName(node.data.label || 'Untitled Node');

      const currentIncomingEdges = edges.filter(edge => edge.target === nodeId);
      setIncomingEdges(currentIncomingEdges);

      const currentMergedInputData = currentIncomingEdges.reduce((acc, edge) => {
        if (edge.data?.output && typeof edge.data.output === 'object') {
          return { ...acc, ...edge.data.output };
        }
        return acc;
      }, {} as Record<string, any>);
      setMergedInputData(currentMergedInputData);

      const currentHasValidInputData = currentMergedInputData && Object.keys(currentMergedInputData).length > 0;
      setHasValidInputData(currentHasValidInputData);
      setAvailableVariables(currentHasValidInputData ? Object.keys(currentMergedInputData) : []);

      // Adjust active tab based on node type and current active tab validity
      const nodeType = node.type;
      let newDefaultTab: 'input_data' | 'code' | 'settings' = 'input_data';
      let currentTabIsValid = true;

      if (nodeType === 'startNode') {
        newDefaultTab = 'settings'; // StartNode는 항상 settings가 기본
        if (activeTab !== 'settings') currentTabIsValid = false; 
      } else if (nodeType === 'endNode') {
        // EndNode는 input_data와 settings 탭을 가질 수 있음
        const validTabsForEndNode = ['input_data', 'settings'];
        if (!validTabsForEndNode.includes(activeTab)) {
          currentTabIsValid = false;
          newDefaultTab = 'settings'; // EndNode의 기본 탭을 settings로 설정 (또는 input_data)
        }
      } else if (nodeType === 'promptNode' || nodeType === 'systemPromptNode') {
        if (activeTab === 'settings') currentTabIsValid = false; // Original settings tab is gone
        newDefaultTab = 'input_data';
      } else if (['agentNode', 'conditionNode', 'groupsNode', 'embeddingNode', 'ragNode', 'mergeNode'].includes(nodeType)) { // mergeNode 추가
        if (activeTab === 'code') currentTabIsValid = false; // Code tab is gone
        newDefaultTab = 'input_data';
      }

      if (!currentTabIsValid) {
        setActiveTab(newDefaultTab);
      }
    }
  }, [nodeId, nodes, edges, activeTab]); // Added edges and activeTab to dependencies for dynamic updates

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNodeName(newName);
    if (newName.trim()) {
      updateNodeData(nodeId, {
        ...currentNode.data,
        label: newName.trim()
      });
    }
  };

  const handleSave = () => {
    if (currentNode) {
      updateNodeData(nodeId, {
        ...currentNode.data,
        code,
        label: nodeName.trim() || currentNode.data.label
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      removeNode(nodeId);
      onClose();
    }
  };

  if (!currentNode) return null;

  const isConditionNode = currentNode.type === 'conditionNode';
  const isPromptNode = currentNode.type === 'promptNode';
  const isSystemPromptNode = currentNode.type === 'systemPromptNode';
  const isAgentNode = currentNode.type === 'agentNode';
  const isStartNode = currentNode.type === 'startNode';
  const isGroupsNode = currentNode.type === 'groupsNode';
  const isEmbeddingNode = currentNode.type === 'embeddingNode';
  const isRAGNode = currentNode.type === 'ragNode';
  const isEndNode = currentNode.type === 'endNode';
  const isMergeNode = currentNode.type === 'mergeNode'; // isMergeNode 정의 추가

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full overflow-hidden flex flex-col shadow-md z-10">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Node Inspector</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="px-4 py-3 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Node Name
        </label>
        <input
          type="text"
          value={nodeName}
          onChange={handleNameChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter node name"
        />
      </div>
      
      <div className="flex border-b border-gray-200">
        {/* Input Data Tab */}
        {!isStartNode && (
          <button
            className={`flex-1 py-2 flex justify-center items-center ${
              activeTab === 'input_data' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('input_data')}
          >
            <LogIn size={16} className="mr-1" /> Input Data
          </button>
        )}

        {/* Code Tab (for general nodes) OR Settings Tab (for Prompt/SystemPrompt) */}
        {(() => {
          if (isPromptNode || isSystemPromptNode) { // "Settings" tab for Prompt/SystemPrompt (internally 'code')
            return (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'code' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
                }`}
                onClick={() => setActiveTab('code')}
              >
                <Settings size={16} className="mr-1" /> Settings
              </button>
            );
          } else if (!(isStartNode || isEndNode || isAgentNode || isConditionNode || isGroupsNode || isEmbeddingNode || isRAGNode || isMergeNode)) { // mergeNode 추가하여 Code 탭 제외
            return (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'code' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
                }`}
                onClick={() => setActiveTab('code')}
              >
                <Code size={16} className="mr-1" /> Code
              </button>
            );
          }
          return null;
        })()}

        {/* Settings Tab (original, for nodes that have it and it's not repurposed) */}
        {!(isPromptNode || isSystemPromptNode) && ( // EndNode도 Settings 탭을 가질 수 있도록 isEndNode 조건 제거
          <button
            className={`flex-1 py-2 flex justify-center items-center ${
              activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">Incoming Data</h3>
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
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs">
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
                <div className="p-4 border-b border-gray-200">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600">
                      Available Input Variables
                    </label>
                    <select
                      value={selectedVariable}
                      onChange={(e) => setSelectedVariable(e.target.value)}
                      className={`w-full px-3 py-2 border ${
                        !hasValidInputData ? 'bg-gray-50 text-gray-400' : 'bg-white'
                      } border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
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
                    onChange={setCode}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Node Type
                </label>
                <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                  {currentNode.type}
                </div>
              </div>
              
              {isStartNode && <StartSettings nodeId={nodeId} />}
              {isConditionNode && <ConditionSettings nodeId={nodeId} />}
              {isAgentNode && <AgentSettings nodeId={nodeId} />}
              {isGroupsNode && <GroupsSettings nodeId={nodeId} />}
              {isEmbeddingNode && <EmbeddingSettings nodeId={nodeId} />}
              {isRAGNode && <RAGSettings nodeId={nodeId} />}
              {isMergeNode && <MergeSettings nodeId={nodeId} />} {/* MergeSettings 렌더링 추가 */}
              {isEndNode && <EndNodeSettings nodeId={nodeId} />} {/* EndNodeSettings 렌더링 추가 */}
              {/* MergeNode는 별도의 상세 설정 UI가 없으므로, 이 부분에 추가할 필요는 없습니다. 기본 Node Type만 표시됩니다. */}
            </div>
          </div>
        )}
      </div>
      
      <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
        >
          Delete
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default NodeInspector;