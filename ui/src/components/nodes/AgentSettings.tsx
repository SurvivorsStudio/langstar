import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, AlertCircle, Pencil, Check } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import type { AIConnection } from '../../store/flowStore';
import CustomSelect from '../Common/CustomSelect';

// Define an interface for the group objects for better type safety
interface GroupData {
  id: string;
  name: string;
  type: 'memory' | 'tools';
  description?: string;
  code?: string;
  memoryType?: string;
}

interface AgentSettingsProps {
  nodeId: string;
}

const AgentSettings: React.FC<AgentSettingsProps> = ({ nodeId }) => {
  const {
    nodes,
    edges,
    updateNodeData,
    getNodeById,
    aiConnections,
    fetchAIConnections,
  } = useFlowStore(state => ({
    nodes: state.nodes,
    edges: state.edges,
    updateNodeData: state.updateNodeData,
    getNodeById: state.getNodeById,
    aiConnections: state.aiConnections,
    fetchAIConnections: state.fetchAIConnections,
  }));

  const node = nodes.find(n => n.id === nodeId);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isEditingOutputVariable, setIsEditingOutputVariable] = useState(false);
  
  // 이전 노드에서 사용 가능한 입력 키 및 연결 상태 가져오기
  const [availableInputKeys, setAvailableInputKeys] = useState<string[]>([]);
  const [isSourceConnected, setIsSourceConnected] = useState<boolean>(false);
  const [hasValidSourceOutput, setHasValidSourceOutput] = useState<boolean>(false);

  const DEFAULT_TOP_K = 40;
  const DEFAULT_TOP_P = 1;
  const DEFAULT_TEMPERATURE = 0.7;
  const DEFAULT_MAX_TOKENS = 1000;

  // 컴포넌트 마운트 시 한 번만: AI 연결 정보 로드
  useEffect(() => {
    fetchAIConnections();
  }, [fetchAIConnections]);

  useEffect(() => {
    const incomingEdge = edges.find(edge => edge.target === nodeId);
    setIsSourceConnected(!!incomingEdge);

    if (incomingEdge) {
      const sourceNode = getNodeById(incomingEdge.source);
      const sourceOutput = sourceNode?.data?.output;
      if (sourceOutput && typeof sourceOutput === 'object' && sourceOutput !== null && !Array.isArray(sourceOutput) && Object.keys(sourceOutput).length > 0) {
        setHasValidSourceOutput(true);
        setAvailableInputKeys(Object.keys(sourceNode.data.output));
      } else {
        setHasValidSourceOutput(false);
        setAvailableInputKeys([]);
      }
    } else {
      setHasValidSourceOutput(false);
      setAvailableInputKeys([]);
    }
  }, [nodes, edges, nodeId, getNodeById]); // getNodeById는 store에서 오므로 직접적인 의존성은 아니지만, nodes/edges 변경 시 재계산 필요

  // Get all groups nodes and extract tools groups
  const toolsMemoryNode = nodes.find(n => n.type === 'toolsMemoryNode');
  const toolsGroups: GroupData[] = toolsMemoryNode?.data.config?.groups?.filter((g: GroupData) => g.type === 'tools') || [];

  // Get selected tools from node config
  const currentTools = node?.data.config?.tools || []; // 'selectedTools' -> 'tools'로 변경

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelChange = (value: string) => {
    // Find the full connection object from activeConnections
    const selectedConnection = aiConnections.find(conn => conn.id === value);
    updateNodeData(nodeId, {
      config: {
        model: selectedConnection || undefined, // Store the entire object or undefined if not found
      }
    });
  };

  const handleMaxTokensChange = (value: string) => {
    const numValue = parseInt(value, 10);
    updateNodeData(nodeId, {
      config: {
        maxTokens: isNaN(numValue) ? undefined : numValue,
      },
    });
  };

  const handleTopKChange = (value: string) => {
    const numValue = parseInt(value, 10);
    updateNodeData(nodeId, {
      config: {
        topK: isNaN(numValue) ? undefined : numValue,
      },
    });
  };

  const handleTopPChange = (value: string) => {
    const numValue = parseInt(value, 10); // Or parseFloat if it should be a float
    updateNodeData(nodeId, {
      config: {
        topP: isNaN(numValue) ? undefined : numValue,
      },
    });
  };

  const handleTemperatureChange = (value: string) => {
    const floatValue = parseFloat(value);
    updateNodeData(nodeId, {
      config: {
        temperature: isNaN(floatValue) ? undefined : floatValue,
      },
    });
  };


  const handleSystemPromptInputKeyChange = (value: string) => {
    updateNodeData(nodeId, {
      config: {
        systemPromptInputKey: value // 'systemPromptNode' 대신 'systemPromptInputKey' 사용
      }
    });
  };

  const handleUserPromptInputKeyChange = (value: string) => {
    updateNodeData(nodeId, {
      config: {
        userPromptInputKey: value // 'userPromptNode' 대신 'userPromptInputKey' 사용
      }
    });
  };

  const handleAgentOutputVariableChange = (value: string) => {
    updateNodeData(nodeId, {
      config: {
        agentOutputVariable: value
      }
    });
  };

  const handleStreamChange = (checked: boolean) => {
    updateNodeData(nodeId, {
      config: {
        stream: checked,
      },
    });
  };


  const handleMemoryTypeChange = (value: string) => {
    updateNodeData(nodeId, {
      config: {
        ...node?.data.config,
        memoryGroup: {
          id: 'group-1751010925148',
          name: 'New Memory Group',
          memoryType: value,
          memoryOption: value === 'ConversationBufferWindowMemory' ? { k: 5 } : {}
        }
      }
    });
  };

  const handleMemoryOptionKChange = (value: string) => {
    const currentMemoryGroup = node?.data.config?.memoryGroup;
    if (currentMemoryGroup) {
      updateNodeData(nodeId, {
        config: {
          ...node?.data.config,
          memoryGroup: {
            ...currentMemoryGroup,
            memoryOption: {
              ...currentMemoryGroup.memoryOption,
              k: parseInt(value) || 5
            }
          }
        }
      });
    }
  };

  const toggleTool = (toolId: string) => {
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter((id: string) => id !== toolId)
      : [...currentTools, toolId];

    updateNodeData(nodeId, {
      config: {
        tools: newTools // 'selectedTools' -> 'tools'로 변경
      }
    });
  };

  const removeTool = (event: React.MouseEvent, toolId: string) => {
    event.stopPropagation();
    const newTools = currentTools.filter((id: string) => id !== toolId);
    updateNodeData(nodeId, {
      config: {
        tools: newTools // 'selectedTools' -> 'tools'로 변경
      }
    });
  };

  // Filter active AI connections
  // 스토어에서 가져온 AI 연결 중 언어 모델(active)만 필터링
  const activeConnections = aiConnections.filter(
      conn => conn.type === 'language' && conn.status === 'active'
  );



  const selectedModelId =
    node?.data.config?.model && typeof node.data.config.model === 'object'
      ? (node.data.config.model as AIConnection).id
      : (node?.data.config?.model as string) || '';

  const selectedConnection = activeConnections.find(conn => conn.id === selectedModelId);



  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Settings</h3>

        {/* Output Variable Section - Placed at the top */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="agentOutputVariable" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Output Variable
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="streamToggle"
                checked={node?.data.config?.stream || false}
                onChange={(e) => handleStreamChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="streamToggle" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                Stream
              </label>
            </div>
          </div>
          <div className="relative"> 
            <div className="flex items-center space-x-2">
              {isEditingOutputVariable ? (
                <>
                  <input
                    type="text"
                    id="agentOutputVariableInput"
                    value={node?.data.config?.agentOutputVariable || ''}
                    onChange={(e) => handleAgentOutputVariableChange(e.target.value)}
                    placeholder="Enter output variable name"
                    className={`flex-grow px-3 py-2 border ${
                      (!isSourceConnected || !hasValidSourceOutput) && availableInputKeys.length === 0 
                        ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    } border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
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
                    value={node?.data.config?.agentOutputVariable || ''}
                    onChange={handleAgentOutputVariableChange}
                    options={[
                      ...(
                        node?.data.config?.agentOutputVariable &&
                        node.data.config.agentOutputVariable !== "" &&
                        !availableInputKeys.includes(node.data.config.agentOutputVariable)
                          ? [{ value: node.data.config.agentOutputVariable, label: `${node.data.config.agentOutputVariable} (New/Default)` }]
                          : []
                      ),
                      ...availableInputKeys.map(variable => ({ value: variable, label: `${variable} (Overwrite)` }))
                    ]}
                    placeholder="Select output variable (required)"
                    disabled={(!isSourceConnected || !hasValidSourceOutput) && availableInputKeys.length === 0}
                  />
                  <button onClick={() => setIsEditingOutputVariable(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0" aria-label="Edit output variable">
                    <Pencil size={18} />
                  </button>
                </>
              )}
            </div>
            {!isSourceConnected && (
              <div className="flex items-center mt-1 text-amber-500 text-xs">
                <AlertCircle size={12} className="mr-1" />
                Connect an input node to see available keys to overwrite.
              </div>
            )}
            {isSourceConnected && !hasValidSourceOutput && availableInputKeys.length === 0 && (
              <div className="flex items-center mt-1 text-amber-500 text-xs">
                <AlertCircle size={12} className="mr-1" />
                Execute the connected node to see its output keys to overwrite.
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Model
          </label>
          <CustomSelect
            value={selectedModelId}
            onChange={handleModelChange}
            options={activeConnections.map(conn => ({
              value: conn.id,
              label: `${conn.name} (${conn.model})`
            }))}
            placeholder="Select a model"
            disabled={activeConnections.length === 0}
          />
          {selectedConnection && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Provider</span>
                <span className="text-gray-800 dark:text-gray-200 font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 border dark:border-gray-600 rounded-md">{selectedConnection.provider}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Model Name</span>
                <span className="text-gray-800 dark:text-gray-200 font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 border dark:border-gray-600 rounded-md">{selectedConnection.model}</span>
              </div>
            </div>
          )}
          {activeConnections.length === 0 && (
            <p className="text-xs text-amber-500">
              No AI models configured. Please add models in the AI Model Keys section.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            System Prompt (Input Key)
          </label>
          <CustomSelect
            value={node?.data.config?.systemPromptInputKey || ''}
            onChange={handleSystemPromptInputKeyChange}
            options={availableInputKeys.map(key => ({ value: key, label: key }))}
            placeholder="Select an input key for system prompt"
            disabled={!isSourceConnected || (isSourceConnected && !hasValidSourceOutput && availableInputKeys.length === 0)}
          />
          {!isSourceConnected && (
            <p className="text-xs text-amber-500 mt-1">Connect an input node to see available keys.</p>
          )}
          {isSourceConnected && !hasValidSourceOutput && availableInputKeys.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">Execute the connected node to populate input keys.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            User Prompt (Input Key)
          </label>
          <CustomSelect
            value={node?.data.config?.userPromptInputKey || ''}
            onChange={handleUserPromptInputKeyChange}
            options={availableInputKeys.map(key => ({ value: key, label: key }))}
            placeholder="Select an input key for user prompt"
            disabled={!isSourceConnected || (isSourceConnected && !hasValidSourceOutput && availableInputKeys.length === 0)}
          />
          {!isSourceConnected && (
            <p className="text-xs text-amber-500 mt-1">Connect an input node to see available keys.</p>
          )}
          {isSourceConnected && !hasValidSourceOutput && availableInputKeys.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">Execute the connected node to populate input keys.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Memory Type
          </label>
          <CustomSelect
            value={node?.data.config?.memoryGroup?.memoryType || ''}
            onChange={handleMemoryTypeChange}
            options={[
              { value: 'ConversationBufferMemory', label: 'Conversation Buffer Memory' },
              { value: 'ConversationBufferWindowMemory', label: 'Conversation Buffer Window Memory' }
            ]}
            placeholder="Select memory type"
          />
          {node?.data.config?.memoryGroup?.memoryType && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Memory Type</span>
                <span className="text-gray-800 dark:text-gray-200 font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 border dark:border-gray-600 rounded-md">
                  {node?.data.config?.memoryGroup?.memoryType}
                </span>
              </div>
              {node?.data.config?.memoryGroup?.memoryType === 'ConversationBufferWindowMemory' && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Window Size (k)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={node?.data.config?.memoryGroup?.memoryOption?.k || 5}
                    onChange={(e) => handleMemoryOptionKChange(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Number of conversation turns to keep in memory
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Tools
          </label>
          <div
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-2 min-h-[42px] flex flex-wrap items-center cursor-pointer"
            onClick={() => setIsToolsOpen(!isToolsOpen)}
          >
            {currentTools.length > 0 ? ( // 'selectedTools' -> 'currentTools'로 변경
              toolsGroups
                .filter((tool: GroupData) => currentTools.includes(tool.id)) // 'selectedTools' -> 'currentTools'로 변경
                .map((tool: GroupData) => (
                  <span
                    key={tool.id}
                    className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm mr-2 mb-1 flex items-center"
                  >
                    {tool.name}
                    <button
                      onClick={(e) => removeTool(e, tool.id)}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-sm">Select tools</span>
            )}
            <div className="ml-auto">
              <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          {isToolsOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {toolsGroups.length > 0 ? (
                toolsGroups.map((tool: GroupData) => (
                  <div
                    key={tool.id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      currentTools.includes(tool.id) ? 'bg-gray-50 dark:bg-gray-700' : '' // 'selectedTools' -> 'currentTools'로 변경
                    }`}
                    onClick={() => toggleTool(tool.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentTools.includes(tool.id)} // 'selectedTools' -> 'currentTools'로 변경
                        onChange={() => {}}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No tools available. Add tools in the Groups node.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Separator */}
        <hr className="my-4 border-gray-300 dark:border-gray-600" />

        {/* Top K Section */}
        <div className="space-y-2">
          <label htmlFor="topK" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Top K
          </label>
          <input
            type="number"
            id="topK"
            value={node?.data.config?.topK ?? DEFAULT_TOP_K}
            onChange={(e) => handleTopKChange(e.target.value)}
            placeholder="e.g., 40"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Top P Section */}
        <div className="space-y-2">
          <label htmlFor="topP" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Top P
          </label>
          <input
            type="number" // Consider "text" or "number" with step="0.01" if it's a float
            id="topP"
            value={node?.data.config?.topP ?? DEFAULT_TOP_P}
            onChange={(e) => handleTopPChange(e.target.value)}
            placeholder="e.g., 1 (usually 0-1 float)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Temperature Section */}
        <div className="space-y-2">
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Temperature
          </label>
          <input
            type="number"
            id="temperature"
            value={node?.data.config?.temperature ?? DEFAULT_TEMPERATURE}
            onChange={(e) => handleTemperatureChange(e.target.value)}
            placeholder="e.g., 0.7 (usually 0-1)"
            step="0.1" // Optional: for fine-grained control with number input arrows
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        
        {/* Max Token Size Section */}
        <div className="space-y-2">
          <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Max Token Size
          </label>
          <input
            type="number"
            id="maxTokens"
            value={node?.data.config?.maxTokens ?? DEFAULT_MAX_TOKENS}
            onChange={(e) => handleMaxTokensChange(e.target.value)}
            placeholder="e.g., 1000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Output Format</h4>
        <pre className="text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 p-3 rounded border border-blue-100 dark:border-blue-800/50">
{`{
  "response": "Agent's response",
  "model": "gpt-4",
  "tokens": {
    "prompt": 123,
    "completion": 456,
    "total": 579
  }
}`}
        </pre>
      </div>
    </div>
  );
};

export default AgentSettings;