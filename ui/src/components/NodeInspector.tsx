import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Settings, Code, AlertCircle, LogIn, Play, Maximize2 } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import CodeEditor from './CodeEditor';
import CodeEditorPopup from './nodes/CodeEditorPopup';
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
import UserNodeSettings from './nodes/UserNodeSettings';
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
  const [isCodePopupOpen, setIsCodePopupOpen] = useState<boolean>(false);
  const [isNodeChanging, setIsNodeChanging] = useState<boolean>(false);
  const lastSavedCodeRef = useRef<string>('');
  
  const [incomingEdges, setIncomingEdges] = useState<Edge[]>([]);
  const [mergedInputData, setMergedInputData] = useState<Record<string, VariableValue>>({});
  const [hasValidInputData, setHasValidInputData] = useState<boolean>(false);
  const [selectedEdgeInfo, setSelectedEdgeInfo] = useState<{edgeId: string, sourceNodeId: string, timestamp: number} | null>(null);
  const [manuallySelectedEdgeId, setManuallySelectedEdgeId] = useState<string | null>(null);

  // 크기 조절을 위한 상태와 ref
  const [width, setWidth] = useState<number>(384); // 기본 너비 384px (w-96)
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // 크기 조절 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    // 드래그 중일 때 텍스트 선택 방지
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      // 최소 너비 300px, 최대 너비 800px로 제한
      const clampedWidth = Math.max(300, Math.min(800, newWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // 드래그 종료 시 스타일 복원
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // 컴포넌트 언마운트 시 스타일 복원
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);



  useEffect(() => {
    console.log(`[NodeInspector] useEffect triggered - nodeId: ${nodeId}, nodes count: ${nodes.length}`);
    const node = nodes.find((n: any) => n.id === nodeId);
    if (node) {
      console.log(`[NodeInspector] Found node: ${node.id}, type: ${node.type}, label: ${node.data.label}`);
      console.log(`[NodeInspector] Current node data:`, node.data);
      setIsNodeChanging(true);
      setCurrentNode(node as any);
      // 코드 상태를 즉시 업데이트 - 노드의 실제 코드 데이터 사용
      const nodeCode = node.data.code || 'def exce_code(state):\n    # Access input variables:\n    # value = state[\'variable_name\']\n    # \n    # Your code here...\n    # \n    return state';
      console.log(`[NodeInspector] Setting code for node ${node.id}:`, nodeCode.substring(0, 100) + '...');
      setCode(nodeCode);
      // 마지막 저장된 코드 초기화
      lastSavedCodeRef.current = nodeCode;
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

      // Adjust active tab based on node type and current active tab validity
      const nodeType = node.type;
      let newDefaultTab: 'input_data' | 'code' | 'settings' = 'input_data';
      let currentTabIsValid = true;

      // 노드 타입별로 유효한 탭 정의
      const validTabsByNodeType: Record<string, ('input_data' | 'code' | 'settings')[]> = {
        'startNode': ['settings'],
        'endNode': ['input_data', 'settings'],
        'promptNode': ['input_data', 'code'],
        'systemPromptNode': ['input_data', 'code'],
        'agentNode': ['input_data', 'settings'],
        'conditionNode': ['input_data', 'settings'],
        'groupsNode': ['input_data', 'settings'],
        'embeddingNode': ['input_data', 'settings'],
        'ragNode': ['input_data', 'settings'],
        'mergeNode': ['input_data', 'settings'],
        'toolsMemoryNode': ['input_data', 'settings'],
        'userNode': ['input_data', 'code', 'settings'],
        'functionNode': ['input_data', 'code', 'settings']
      };

      // 현재 노드 타입의 유효한 탭들 가져오기
      const validTabs = validTabsByNodeType[nodeType || ''] || ['input_data'];
      
      // 현재 활성 탭이 유효한지 확인
      if (!validTabs.includes(activeTab)) {
        currentTabIsValid = false;
        // 유효하지 않으면 첫 번째 유효한 탭으로 설정
        newDefaultTab = validTabs[0];
      }

      // 노드 타입별 기본 탭 설정
      if (nodeType === 'startNode') {
        newDefaultTab = 'settings';
      } else if (nodeType === 'endNode') {
        newDefaultTab = 'settings';
      } else if (nodeType === 'promptNode' || nodeType === 'systemPromptNode') {
        newDefaultTab = 'input_data';
      } else if (nodeType === 'toolsMemoryNode') {
        newDefaultTab = 'input_data';
      } else if (nodeType === 'functionNode') {
        newDefaultTab = 'input_data';
      } else if (nodeType === 'userNode') {
        newDefaultTab = 'input_data';
      }

      if (!currentTabIsValid) {
        setActiveTab(newDefaultTab);
      }
      
      // 노드 변경 완료 후 플래그 해제
      setTimeout(() => {
        console.log(`[NodeInspector] Node change completed, setting isNodeChanging to false`);
        setIsNodeChanging(false);
      }, 100);
    }
  }, [nodeId, edges, activeTab, manuallySelectedEdges]);

  // 현재 노드의 데이터가 변경될 때만 코드 동기화 (임시로 비활성화)
  // useEffect(() => {
  //   console.log(`[NodeInspector] Code sync useEffect triggered - currentNode: ${currentNode?.id}`);
  //   
  //   // 노드가 없으면 동기화 건너뛰기
  //   if (!currentNode) {
  //     console.log(`[NodeInspector] Code sync skipped - no currentNode`);
  //     return;
  //   }
  //   
  //   const nodeCode = currentNode.data.code || 'def exce_code(state):\n    # Access input variables:\n    # value = state[\'variable_name\']\n    # \n    # Your code here...\n    # \n    return state';
  //   
  //   // 마지막으로 저장된 코드와 현재 노드 코드가 같으면 동기화하지 않음
  //   if (lastSavedCodeRef.current === nodeCode) {
  //     console.log(`[NodeInspector] Code sync skipped - same as last saved code`);
  //     return;
  //   }
  //   
  //   console.log(`[NodeInspector] Current code: ${code?.substring(0, 50)}...`);
  //   console.log(`[NodeInspector] Node code: ${nodeCode?.substring(0, 50)}...`);
  //   console.log(`[NodeInspector] Last saved code: ${lastSavedCodeRef.current?.substring(0, 50)}...`);
  //   
  //   // 외부에서 온 변경사항인지 확인 (코드가 실제로 다르고, 빈 코드가 아닐 때만)
  //   if (code !== nodeCode && nodeCode && nodeCode.trim() !== '') {
  //     console.log(`[NodeInspector] Syncing code for node ${currentNode.id} from external changes:`, nodeCode.substring(0, 100) + '...');
  //     setCode(nodeCode);
  //     // 외부에서 온 변경사항이므로 마지막 저장된 코드도 업데이트
  //     lastSavedCodeRef.current = nodeCode;
  //   } else {
  //     console.log(`[NodeInspector] Code is already in sync or empty, no update needed`);
  //   }
  // }, [currentNode?.data.code, currentNode?.id]);

  // 노드 이름 유효성 검사 함수
  const validateNodeName = (name: string): boolean => {
    // 띄어쓰기 금지, 특수문자는 언더스코어(_)만 허용
    const validNameRegex = /^[a-zA-Z0-9_]+$/;
    return validNameRegex.test(name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 유효한 문자만 입력 허용 (띄어쓰기, 특수문자 금지, 언더스코어만 허용)
    const filteredValue = value.replace(/[^a-zA-Z0-9_]/g, '');
    setNodeName(filteredValue);
    
    if (filteredValue.trim() && currentNode) {
      updateNodeData(nodeId, {
        ...currentNode.data,
        label: filteredValue.trim()
      });
    }
  };

  const handleCodeChange = useCallback((newCode: string) => {
    console.log(`[NodeInspector] handleCodeChange called - nodeId: ${nodeId}, new code length: ${newCode?.length}`);
    console.log(`[NodeInspector] New code preview: ${newCode?.substring(0, 100)}...`);
    
    // 로컬 코드 상태 업데이트
    setCode(newCode);
    
    // 마지막 저장된 코드 업데이트
    lastSavedCodeRef.current = newCode;
    
    console.log(`[NodeInspector] Updating node data with new code for nodeId: ${nodeId}`);
    updateNodeData(nodeId, {
      code: newCode
    });
  }, [nodeId, updateNodeData]);



  // input data 클릭 핸들러
  const handleInputDataClick = async (edgeId: string, sourceNodeId: string, inputData: Record<string, VariableValue>) => {
    setManuallySelectedEdgeId(edgeId);
    
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
      setSelectedEdgeInfo(null);
      
      console.log(`Cleared all input data for node ${nodeId}`);
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
  const isUserNode = currentNode.type === 'userNode';

  return (
    <div 
      className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col shadow-md z-10 relative"
      style={{ width: `${width}px` }}
    >
      {/* 크기 조절 핸들 */}
      <div
        ref={resizeRef}
        className={`absolute left-0 top-0 w-2 h-full cursor-col-resize transition-colors z-20 ${
          isResizing 
            ? 'bg-blue-500 opacity-75' 
            : 'bg-transparent hover:bg-blue-500 hover:opacity-50'
        }`}
        onMouseDown={handleMouseDown}
        style={{ transform: 'translateX(-4px)' }}
      >
        {/* 크기 조절 핸들 시각적 표시 */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-gray-400 rounded-full opacity-60" />
      </div>
      
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
          placeholder="영문자, 숫자, _만 사용"
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
          } else if (!(isStartNode || isEndNode || isAgentNode || isConditionNode || isToolsMemoryNode || isEmbeddingNode || isRAGNode || isMergeNode || isUserNode)) {
            return (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'code' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}
                onClick={() => {
                  // 코드 탭을 클릭할 때 현재 노드의 코드를 다시 로드
                  if (currentNode) {
                    const nodeCode = currentNode.data.code || 'def exce_code(state):\n    # Access input variables:\n    # value = state[\'variable_name\']\n    # \n    # Your code here...\n    # \n    return state';
                    console.log(`[NodeInspector] Code tab clicked for node ${nodeId}:`, nodeCode.substring(0, 100) + '...');
                    // 코드 상태를 완전히 리셋 후 다시 설정
                    setCode('');
                    setTimeout(() => {
                      setCode(nodeCode);
                    }, 0);
                  }
                  setActiveTab('code');
                }}
              >
                <Code size={16} className="mr-1" /> Code
              </button>
            );
          } else if (isUserNode) {
            return (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'code' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}
                onClick={() => {
                  console.log(`[NodeInspector] Code tab clicked for node ${currentNode?.id}`);
                  // 코드 탭을 클릭할 때 현재 노드의 코드를 다시 로드
                  if (currentNode) {
                    const nodeCode = currentNode.data.code || 'def exce_code(state):\n    # Access input variables:\n    # value = state[\'variable_name\']\n    # \n    # Your code here...\n    # \n    return state';
                    console.log(`[NodeInspector] Code tab clicked for node ${currentNode.id}, setting code:`, nodeCode.substring(0, 100) + '...');
                    console.log(`[NodeInspector] Current code before setting: ${code?.substring(0, 50)}...`);
                    setCode(nodeCode);
                    console.log(`[NodeInspector] Code set, new code should be: ${nodeCode.substring(0, 50)}...`);
                  }
                  setActiveTab('code');
                }}
              >
                <Code size={16} className="mr-1" /> Code
              </button>
            );
          }
          return null;
        })()}

        {!(isPromptNode || isSystemPromptNode) && (isStartNode || isEndNode || isAgentNode || isConditionNode || isToolsMemoryNode || isEmbeddingNode || isRAGNode || isMergeNode || isUserNode) && (
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
                     className={`border rounded-lg p-3 cursor-pointer transition-colors bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 ${manuallySelectedEdgeId === selectedEdgeInfo.edgeId ? 'border-2 border-blue-500' : ''}`}
                     onClick={() => handleInputDataClick(selectedEdgeInfo.edgeId, selectedEdgeInfo.sourceNodeId, mergedInputData)}
                     title="Click to execute with this input"
                   >
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-medium text-green-700 dark:text-green-300">
                         ✅ Selected Input (Latest)
                       </span>
                       <div className="flex items-center space-x-2">
                         <span className="text-xs text-green-600 dark:text-green-400">
                           {new Date(selectedEdgeInfo.timestamp).toLocaleTimeString()}
                         </span>
                         <Play className="w-3 h-3 text-green-600 dark:text-green-400" />
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
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Python Code
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCodePopupOpen(true)}
                    className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center"
                    title="Open in full screen editor"
                  >
                    <Maximize2 size={14} className="mr-1" />
                    Full Screen
                  </button>
                </div>
                <div className="flex-1">
                  <CodeEditor
                    value={code}
                    onChange={handleCodeChange}
                    language="python"
                    readOnly={isUserNode}
                  />
                </div>
              </div>
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
              {isUserNode && <UserNodeSettings nodeId={nodeId} />}
            </div>
          </div>
        )}
      </div>
      
      {/* Code Editor Popup */}
      <CodeEditorPopup
        isOpen={isCodePopupOpen}
        onClose={() => setIsCodePopupOpen(false)}
        value={code}
        onChange={handleCodeChange}
        edgeData={mergedInputData}
        sourceNode={selectedEdgeInfo ? nodes.find(n => n.id === selectedEdgeInfo.sourceNodeId) : null}
        availableVariables={Object.keys(mergedInputData)}
        readOnly={isUserNode}
      />
    </div>
  );
};

export default NodeInspector;