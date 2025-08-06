import React, { useEffect, useState } from 'react';
import { X, Settings, Code, AlertCircle, LogIn, Play, Database } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import CodeEditor from './CodeEditor';
import ConditionSettings from './nodes/ConditionSettings';
import PromptSettings from './nodes/PromptSettings';
import SystemPromptSettings from './nodes/SystemPromptSettings';
import AgentSettings from './nodes/AgentSettings';
import StartSettings from './nodes/StartSettings';
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
  const { nodes, edges, updateNodeData, executeNode, updateEdgeData, setManuallySelectedEdge, manuallySelectedEdges } = useFlowStore();
  const [activeTab, setActiveTab] = useState<'input_data' | 'code' | 'settings'>('input_data');
  const [currentNode, setCurrentNode] = useState<Node<NodeData> | null>(null);
  const [code, setCode] = useState<string>('');
  const [nodeName, setNodeName] = useState<string>('');
  const [selectedVariable, setSelectedVariable] = useState<string>('');
  
  const [incomingEdges, setIncomingEdges] = useState<Edge[]>([]);
  const [mergedInputData, setMergedInputData] = useState<Record<string, VariableValue>>({});
  const [hasValidInputData, setHasValidInputData] = useState<boolean>(false);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [selectedEdgeInfo, setSelectedEdgeInfo] = useState<{edgeId: string, sourceNodeId: string, timestamp: number} | null>(null);
  const [manuallySelectedEdgeId, setManuallySelectedEdgeId] = useState<string | null>(null);


  useEffect(() => {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (node) {
      setCurrentNode(node as any);
      setCode(node.data.code || '# Write your Python code here\n\n');
      setNodeName(node.data.label || 'Untitled Node');

      const currentIncomingEdges = edges.filter((edge: Edge) => edge.target === nodeId);
      setIncomingEdges(currentIncomingEdges);

      // store에서 수동 선택된 edge 정보 가져오기
      const storeSelectedEdgeId = manuallySelectedEdges[nodeId];
      setManuallySelectedEdgeId(storeSelectedEdgeId || null);

      // input data 선택 로직
      let currentMergedInputData: Record<string, VariableValue> = {};
      let selectedEdge: {edgeId: string, sourceNodeId: string, timestamp: number} | null = null;
      
      if (currentIncomingEdges.length > 0) {
        // 수동으로 선택된 edge가 있으면 그것을 사용, 없으면 가장 최근 것 사용
        const edgesWithTimestamps = currentIncomingEdges
          .filter(edge => edge.data?.output && typeof edge.data.output === 'object')
          .map(edge => ({
            edge,
            timestamp: edge.data?.timestamp || 0,
            output: edge.data.output
          }))
          .sort((a, b) => b.timestamp - a.timestamp); // 최신 순으로 정렬

        console.log(`[NodeInspector] Available edges for node ${nodeId}:`, edgesWithTimestamps.map(e => ({
          edgeId: e.edge.id,
          source: e.edge.source,
          timestamp: e.timestamp,
          timestampDate: new Date(e.timestamp).toLocaleString()
        })));

        if (edgesWithTimestamps.length > 0) {
          const targetEdge = storeSelectedEdgeId 
            ? edgesWithTimestamps.find(e => e.edge.id === storeSelectedEdgeId) || edgesWithTimestamps[0]
            : edgesWithTimestamps[0];
          
          console.log(`[NodeInspector] Selected edge for node ${nodeId}:`, {
            edgeId: targetEdge.edge.id,
            source: targetEdge.edge.source,
            timestamp: targetEdge.timestamp,
            timestampDate: new Date(targetEdge.timestamp).toLocaleString(),
            isManuallySelected: !!storeSelectedEdgeId
          });
          
          currentMergedInputData = targetEdge.output;
          selectedEdge = {
            edgeId: targetEdge.edge.id,
            sourceNodeId: targetEdge.edge.source,
            timestamp: targetEdge.timestamp
          };
        }
      }
      setMergedInputData(currentMergedInputData);
      setSelectedEdgeInfo(selectedEdge);

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
  }, [nodeId, nodes, edges, activeTab, manuallySelectedEdges]);

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

  // input data 클릭 핸들러
  const handleInputDataClick = async (edgeId: string, sourceNodeId: string, inputData: Record<string, VariableValue>) => {
    setManuallySelectedEdgeId(edgeId);
    
    // Mock Data인 경우와 실제 edge인 경우를 구분
    if (edgeId === 'mock-data') {
      // Mock Data인 경우
      if (currentNode) {
        try {
          // input data를 노드에 설정
          updateNodeData(nodeId, {
            ...currentNode.data,
            inputData: inputData
          });
          
          // 노드 실행
          await executeNode(nodeId);
          
          console.log(`Node ${nodeId} executed with mock data`);
        } catch (error) {
          console.error('Error executing node with mock data:', error);
        }
      }
    } else {
      // 실제 edge인 경우
      // store에 수동 선택 정보 저장
      setManuallySelectedEdge(nodeId, edgeId);
      
      // 선택된 input data로 노드 실행
      if (currentNode) {
        try {
          // input data를 노드에 설정
          updateNodeData(nodeId, {
            ...currentNode.data,
            inputData: inputData
          });
          
          // 노드 실행을 위해 임시로 edge 데이터 수정
          const originalEdgeData = edges.find(e => e.id === edgeId)?.data;
          
          // 선택된 input data로 edge 업데이트
          updateEdgeData(edgeId, {
            output: inputData,
            timestamp: Date.now()
          });
          
          // 노드 실행
          await executeNode(nodeId);
          
          // 원래 edge 데이터 복원 (선택적)
          if (originalEdgeData) {
            setTimeout(() => {
              updateEdgeData(edgeId, originalEdgeData);
            }, 100);
          }
          
          console.log(`Node ${nodeId} executed with manually selected input from node ${sourceNodeId}`);
        } catch (error) {
          console.error('Error executing node with selected input:', error);
        }
      }
    }
  };

  // input data 전체 삭제 핸들러
  const handleClearInputData = () => {
    if (currentNode) {
      // 노드의 inputData 초기화
      updateNodeData(nodeId, {
        ...currentNode.data,
        inputData: null
      });
      
      // 수동 선택 정보 초기화
      setManuallySelectedEdge(nodeId, null);
      setManuallySelectedEdgeId(null);
      
      // 모든 incoming edge의 output 초기화
      incomingEdges.forEach(edge => {
        updateEdgeData(edge.id, {
          output: null,
          timestamp: 0
        });
      });
      
      // 로컬 상태 초기화
      setMergedInputData({});
      setHasValidInputData(false);
      setAvailableVariables([]);
      setSelectedEdgeInfo(null);
      
      console.log(`Cleared all input data for node ${nodeId}`);
    }
  };

  // Mock Data 생성 핸들러
  const handleGenerateMockData = () => {
    const mockData = generateMockData();
    
    // Mock data를 노드에 설정
    if (currentNode) {
      updateNodeData(nodeId, {
        ...currentNode.data,
        inputData: mockData
      });
    }
    
    // 로컬 상태 업데이트
    setMergedInputData(mockData);
    setHasValidInputData(true);
    setAvailableVariables(Object.keys(mockData));
    setSelectedEdgeInfo({
      edgeId: 'mock-data',
      sourceNodeId: 'mock',
      timestamp: Date.now()
    });
    
    console.log(`Generated mock data for node ${nodeId}:`, mockData);
  };

  // Mock Data 생성 함수
  const generateMockData = () => {
    const mockTypes = [
      { name: 'user_input', type: 'string', value: '안녕하세요, 도움이 필요합니다.' },
      { name: 'user_id', type: 'number', value: 12345 },
      { name: 'session_id', type: 'string', value: 'session_abc123' },
      { name: 'timestamp', type: 'number', value: Date.now() },
      { name: 'user_profile', type: 'object', value: { name: '홍길동', age: 30, city: '서울' } },
      { name: 'preferences', type: 'array', value: ['AI', '개발', '기술'] },
      { name: 'is_active', type: 'boolean', value: true },
      { name: 'score', type: 'number', value: 85.5 },
      { name: 'tags', type: 'array', value: ['tag1', 'tag2', 'tag3'] },
      { name: 'metadata', type: 'object', value: { source: 'web', version: '1.0' } }
    ];

    const mockData: Record<string, any> = {};
    
    // 랜덤하게 3-7개의 데이터 선택
    const selectedCount = Math.floor(Math.random() * 5) + 3;
    const shuffled = mockTypes.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, selectedCount);
    
    selected.forEach(item => {
      mockData[item.name] = item.value;
    });
    
    return mockData;
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Incoming Data</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleGenerateMockData}
                  className="px-2 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors flex items-center"
                  title="Generate mock data for testing"
                >
                  <Database size={12} className="mr-1" />
                  Mock Data
                </button>
                {incomingEdges.length > 0 && hasValidInputData && (
                  <button
                    onClick={handleClearInputData}
                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                    title="Clear all input data"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => {
                    // 강제로 input data 새로고침
                    const currentIncomingEdges = edges.filter((edge: Edge) => edge.target === nodeId);
                    setIncomingEdges(currentIncomingEdges);
                    
                    const storeSelectedEdgeId = manuallySelectedEdges[nodeId];
                    setManuallySelectedEdgeId(storeSelectedEdgeId || null);
                    
                    if (currentIncomingEdges.length > 0) {
                      const edgesWithTimestamps = currentIncomingEdges
                        .filter(edge => edge.data?.output && typeof edge.data.output === 'object')
                        .map(edge => ({
                          edge,
                          timestamp: edge.data?.timestamp || 0,
                          output: edge.data.output
                        }))
                        .sort((a, b) => b.timestamp - a.timestamp);

                      if (edgesWithTimestamps.length > 0) {
                        const targetEdge = storeSelectedEdgeId 
                          ? edgesWithTimestamps.find(e => e.edge.id === storeSelectedEdgeId) || edgesWithTimestamps[0]
                          : edgesWithTimestamps[0];
                        
                        setMergedInputData(targetEdge.output);
                        setSelectedEdgeInfo({
                          edgeId: targetEdge.edge.id,
                          sourceNodeId: targetEdge.edge.source,
                          timestamp: targetEdge.timestamp
                        });
                        
                        const currentHasValidInputData = targetEdge.output && Object.keys(targetEdge.output).length > 0;
                        setHasValidInputData(currentHasValidInputData);
                        setAvailableVariables(currentHasValidInputData ? Object.keys(targetEdge.output) : []);
                      }
                    }
                  }}
                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  title="Refresh input data"
                >
                  Refresh
                </button>
              </div>
            </div>
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
              <div className="space-y-3">
                                 {/* 선택된 데이터 표시 */}
                 {selectedEdgeInfo && (
                   <div 
                     className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                       selectedEdgeInfo.edgeId === 'mock-data' 
                         ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30' 
                         : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                     } ${manuallySelectedEdgeId === selectedEdgeInfo.edgeId ? 'border-2 border-blue-500' : ''}`}
                     onClick={() => handleInputDataClick(selectedEdgeInfo.edgeId, selectedEdgeInfo.sourceNodeId, mergedInputData)}
                     title="Click to execute with this input"
                   >
                     <div className="flex items-center justify-between mb-2">
                       <span className={`text-xs font-medium ${
                         selectedEdgeInfo.edgeId === 'mock-data'
                           ? 'text-purple-700 dark:text-purple-300'
                           : 'text-green-700 dark:text-green-300'
                       }`}>
                         {selectedEdgeInfo.edgeId === 'mock-data' ? '🎲 Mock Data' : '✅ Selected Input (Latest)'}
                       </span>
                       <div className="flex items-center space-x-2">
                         <span className={`text-xs ${
                           selectedEdgeInfo.edgeId === 'mock-data'
                             ? 'text-purple-600 dark:text-purple-400'
                             : 'text-green-600 dark:text-green-400'
                         }`}>
                           {new Date(selectedEdgeInfo.timestamp).toLocaleTimeString()}
                         </span>
                         <Play className={`w-3 h-3 ${
                           selectedEdgeInfo.edgeId === 'mock-data'
                             ? 'text-purple-600 dark:text-purple-400'
                             : 'text-green-600 dark:text-green-400'
                         }`} />
                       </div>
                     </div>
                     
                     <div className="space-y-2">
                       <div className="bg-white dark:bg-gray-800 rounded p-2 font-mono text-xs text-gray-900 dark:text-gray-100">
                         <pre className="whitespace-pre-wrap break-words">
                           {JSON.stringify(mergedInputData, null, 2)}
                         </pre>
                       </div>
                     </div>
                   </div>
                 )}
                
                {/* 다른 input data들 표시 */}
                {incomingEdges.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">Other Available Inputs:</h4>
                    {incomingEdges
                      .filter(edge => edge.data?.output && typeof edge.data.output === 'object')
                      .filter(edge => !selectedEdgeInfo || edge.id !== selectedEdgeInfo.edgeId)
                      .map((edge) => {
                        const sourceNode = nodes.find(n => n.id === edge.source);
                        const isSelected = manuallySelectedEdgeId === edge.id;
                        return (
                          <div 
                            key={edge.id}
                            className={`border rounded-lg p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 border-2' 
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            }`}
                            onClick={() => handleInputDataClick(edge.id, edge.source, edge.data.output)}
                            title="Click to execute with this input"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                From: {sourceNode?.data.label || edge.source}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                  {edge.data.timestamp ? new Date(edge.data.timestamp).toLocaleTimeString() : 'No timestamp'}
                                </span>
                                <Play className="w-3 h-3 text-gray-500 dark:text-gray-500" />
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded p-1 font-mono text-xs text-gray-700 dark:text-gray-300 opacity-60">
                              <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(edge.data.output, null, 2)}
                              </pre>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
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