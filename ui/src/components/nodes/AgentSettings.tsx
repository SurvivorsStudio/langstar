import React, { useState, useRef, useEffect } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { X, ChevronDown, AlertCircle } from 'lucide-react';

// Mock AI connections - in a real app, this would come from your store or API
const mockAIConnections = [
  {
    id: '1',
    name: 'OpenAI GPT-4',
    provider: 'OpenAI',
    model: 'gpt-4',
    status: 'active',
  },
  {
    id: '2',
    name: 'Claude 3',
    provider: 'Anthropic',
    model: 'claude-3-opus',
    status: 'active',
  },
  {
    id: '3',
    name: 'Gemini Pro',
    provider: 'Google',
    model: 'gemini-pro',
    status: 'active',
  }
];

interface AgentSettingsProps {
  nodeId: string;
}

const AgentSettings: React.FC<AgentSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData, getNodeById } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 이전 노드에서 사용 가능한 입력 키 및 연결 상태 가져오기
  const [availableInputKeys, setAvailableInputKeys] = useState<string[]>([]);
  const [isSourceConnected, setIsSourceConnected] = useState<boolean>(false);
  const [hasValidSourceOutput, setHasValidSourceOutput] = useState<boolean>(false);

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

  // Get all groups nodes and extract memory and tools groups
  const groupsNode = nodes.find(n => n.type === 'groupsNode');
  const memoryGroups = groupsNode?.data.config?.groups?.filter(g => g.type === 'memory') || [];
  const toolsGroups = groupsNode?.data.config?.groups?.filter(g => g.type === 'tools') || [];

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
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        model: value
      }
    });
  };

  const handleSystemPromptInputKeyChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        systemPromptInputKey: value // 'systemPromptNode' 대신 'systemPromptInputKey' 사용
      }
    });
  };

  const handleUserPromptInputKeyChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        userPromptInputKey: value // 'userPromptNode' 대신 'userPromptInputKey' 사용
      }
    });
  };

  const handleAgentOutputVariableChange = (value: string) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        agentOutputVariable: value
      }
    });
  };


  const handleMemoryGroupChange = (groupId: string) => {
    // 선택된 groupId를 사용하여 memoryGroups 배열에서 해당 그룹을 찾습니다.
    const selectedGroup = memoryGroups.find(g => g.id === groupId);
    // 해당 그룹의 memoryType을 가져옵니다. 없으면 빈 문자열로 처리합니다.
    const memoryTypeString = selectedGroup?.memoryType || '';

    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        memoryGroup: groupId, // 여전히 그룹 ID는 저장해둘 수 있습니다 (UI 표시용 또는 다른 용도)
        memoryTypeString: memoryTypeString // 실제 memoryType 문자열을 저장
      } 
    });
  };

  const toggleTool = (toolId: string) => {
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter(id => id !== toolId)
      : [...currentTools, toolId];

    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        tools: newTools // 'selectedTools' -> 'tools'로 변경
      }
    });
  };

  const removeTool = (event: React.MouseEvent, toolId: string) => {
    event.stopPropagation();
    const newTools = currentTools.filter(id => id !== toolId);
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        tools: newTools // 'selectedTools' -> 'tools'로 변경
      }
    });
  };

  // Filter active AI connections
  const activeConnections = mockAIConnections.filter(conn => conn.status === 'active');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Agent Settings</h3>

        {/* Output Variable Section - Placed at the top */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Output Variable
          </label>
          <div className="relative">
            <select
              value={node?.data.config?.agentOutputVariable || ''}
              onChange={(e) => handleAgentOutputVariableChange(e.target.value)}
              className={`w-full px-3 py-2 border ${
                // 이전 노드가 연결되지 않았거나, 유효한 출력이 없을 때 약간 흐리게 표시
                (!isSourceConnected || !hasValidSourceOutput) && availableInputKeys.length === 0 ? 'bg-gray-50 text-gray-400' : 'bg-white'
              } border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
            >
              <option value="">Select output variable (required)</option>
              {/* 현재 설정된 값이자 기본값 (availableInputKeys에 없다면 'New/Default'로 표시) */}
              {node?.data.config?.agentOutputVariable &&
               node.data.config.agentOutputVariable !== "" && 
               !availableInputKeys.includes(node.data.config.agentOutputVariable) && (
                <option key={node.data.config.agentOutputVariable} value={node.data.config.agentOutputVariable}>
                  {node.data.config.agentOutputVariable} (New/Default)
                </option>
              )}
              {availableInputKeys.map((variable) => (
                <option key={variable} value={variable}>
                  {variable} (Overwrite)
                </option>
              ))}
            </select>
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
          <label className="block text-sm font-medium text-gray-600">
            Model
          </label>
          <select
            value={node?.data.config?.model || ''}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select a model</option>
            {activeConnections.map((conn) => (
              <option key={conn.id} value={conn.model}>
                {conn.name} ({conn.model})
              </option>
            ))}
          </select>
          {activeConnections.length === 0 && (
            <p className="text-xs text-amber-500">
              No AI models configured. Please add models in the AI Model Keys section.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            System Prompt (Input Key)
          </label>
          <select
            value={node?.data.config?.systemPromptInputKey || ''}
            onChange={(e) => handleSystemPromptInputKeyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select an input key for system prompt</option>
            {availableInputKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          {!isSourceConnected && (
            <p className="text-xs text-amber-500 mt-1">Connect an input node to see available keys.</p>
          )}
          {isSourceConnected && !hasValidSourceOutput && availableInputKeys.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">Execute the connected node to populate input keys.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            User Prompt (Input Key)
          </label>
          <select
            value={node?.data.config?.userPromptInputKey || ''}
            onChange={(e) => handleUserPromptInputKeyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select an input key for user prompt</option>
            {availableInputKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          {!isSourceConnected && (
            <p className="text-xs text-amber-500 mt-1">Connect an input node to see available keys.</p>
          )}
          {isSourceConnected && !hasValidSourceOutput && availableInputKeys.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">Execute the connected node to populate input keys.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">
            Memory Group
          </label>
          <select
            value={node?.data.config?.memoryGroup || ''} // UI 표시는 그룹 ID 기준
            onChange={(e) => handleMemoryGroupChange(e.target.value)} // 핸들러에는 그룹 ID 전달
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select memory group</option>
            {memoryGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {memoryGroups.length === 0 && (
            <p className="text-xs text-amber-500">
              No memory groups found. Add memory groups in the Groups node.
            </p>
          )}
        </div>

        <div className="space-y-2" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-600">
            Tools
          </label>
          <div
            className="bg-white border border-gray-300 rounded-md p-2 min-h-[42px] flex flex-wrap items-center cursor-pointer"
            onClick={() => setIsToolsOpen(!isToolsOpen)}
          >
            {currentTools.length > 0 ? ( // 'selectedTools' -> 'currentTools'로 변경
              toolsGroups
                .filter(tool => currentTools.includes(tool.id)) // 'selectedTools' -> 'currentTools'로 변경
                .map((tool) => (
                  <span
                    key={tool.id}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm mr-2 mb-1 flex items-center"
                  >
                    {tool.name}
                    <button
                      onClick={(e) => removeTool(e, tool.id)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))
            ) : (
              <span className="text-gray-500 text-sm">Select tools</span>
            )}
            <div className="ml-auto">
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
          {isToolsOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {toolsGroups.length > 0 ? (
                toolsGroups.map((tool) => (
                  <div
                    key={tool.id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                      currentTools.includes(tool.id) ? 'bg-gray-50' : '' // 'selectedTools' -> 'currentTools'로 변경
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
                        <div className="font-medium text-sm">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs text-gray-500">{tool.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No tools available. Add tools in the Groups node.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Output Format</h4>
        <pre className="text-xs text-blue-600 bg-white p-3 rounded border border-blue-100">
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