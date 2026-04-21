import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Settings, Code, AlertCircle, LogIn, Play, Maximize2, Database } from 'lucide-react';
import JsonViewer from './Common/JsonViewer';
import JsonPopupModal from './Common/JsonPopupModal';
import { useFlowStore } from '../store/flowStore';
import CodeEditor from './CodeEditor';
import CodeEditorPopup from './nodes/CodeEditorPopup';
import ConditionSettings from './nodes/ConditionSettings';
import PromptSettings from './nodes/PromptSettings';
import AgentSettings from './nodes/AgentSettings';
import StartSettings from './nodes/StartSettings';
import MergeSettings from './nodes/MergeSettings';
import EndNodeSettings from './nodes/EndNodeSettings';
import ToolsMemorySettings from './nodes/ToolsMemorySettings';
import UserNodeSettings from './nodes/UserNodeSettings';
import { Node, Edge } from 'reactflow';
import { NodeData, VariableValue } from '../types/node';
import { getNodeDescription } from '../utils/nodeDescriptions';

interface NodeInspectorProps {
  nodeId: string;
  selectedEdge?: any;
  onClose: () => void;
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ nodeId, selectedEdge, onClose }) => {
  const { nodes, edges, updateNodeData, updateEdgeData } = useFlowStore();
  const [activeTab, setActiveTab] = useState<'input_data' | 'code' | 'settings' | 'edge_data'>('input_data');
  const [currentNode, setCurrentNode] = useState<Node<NodeData> | null>(null);
  const [code, setCode] = useState<string>('');
  const [nodeName, setNodeName] = useState<string>('');
  const [nodeDescription, setNodeDescription] = useState<string>('');
  const [descriptionHeight, setDescriptionHeight] = useState<number>(3); // 기본 3줄
  const [isCodePopupOpen, setIsCodePopupOpen] = useState<boolean>(false);
  const [lastValidNodeName, setLastValidNodeName] = useState<string>(''); // 마지막 유효한 노드 이름 저장
  const lastSavedCodeRef = useRef<string>('');
  
  const [incomingEdges, setIncomingEdges] = useState<Edge[]>([]);
  const [mergedInputData, setMergedInputData] = useState<Record<string, VariableValue>>({});
  const [hasValidInputData, setHasValidInputData] = useState<boolean>(false);
  const [selectedEdgeInfo, setSelectedEdgeInfo] = useState<{edgeId: string, sourceNodeId: string, timestamp: number} | null>(null);
  
  // JSON 팝업 상태
  const [isJsonPopupOpen, setIsJsonPopupOpen] = useState<boolean>(false);
  const [jsonPopupData, setJsonPopupData] = useState<any>(null);
  const [jsonPopupTitle, setJsonPopupTitle] = useState<string>('JSON Data Viewer');

  const [isJsonPopupEditable, setIsJsonPopupEditable] = useState<boolean>(true);


  // 크기 조절을 위한 상태와 ref
  const [width, setWidth] = useState<number>(384); // 기본 너비 384px (w-96)
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // 엣지가 선택되었을 때 edge_data 탭으로 자동 전환
  useEffect(() => {
    if (selectedEdge) {
      setActiveTab('edge_data');
      // 엣지 전용 모드에서는 노드 정보 초기화
      setCurrentNode(null);
    } else {
      setActiveTab('input_data');
    }
  }, [selectedEdge]);

  // 노드 정보 로드 (엣지 상태와 분리)
  useEffect(() => {
    if (!selectedEdge && nodeId) {
      const node = nodes.find((n: any) => n.id === nodeId);
      if (node) {
        setCurrentNode(node as any);
      }
    }
  }, [nodeId, selectedEdge]); // nodes 의존성 제거

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
      setCurrentNode(node as any);
      // 코드 상태를 즉시 업데이트 - 노드의 실제 코드 데이터 사용
      const nodeCode = node.data.code || 'def exce_code(state):\n    # Access input variables:\n    # value = state[\'variable_name\']\n    # \n    # Your code here...\n    # \n    return state';
      console.log(`[NodeInspector] Setting code for node ${node.id}:`, nodeCode.substring(0, 100) + '...');
      setCode(nodeCode);
      // 마지막 저장된 코드 초기화
      lastSavedCodeRef.current = nodeCode;
      const currentNodeName = node.data.label || 'Untitled Node';
      setNodeName(currentNodeName);
      
      // 유효한 노드 이름이면 lastValidNodeName에도 저장
      if (validateNodeName(currentNodeName)) {
        setLastValidNodeName(currentNodeName);
      }
      
      // description이 없으면 기본값 설정
      const defaultDescription = getNodeDescription(node.type || '');
      const nodeDescription = node.data.description || defaultDescription;
      setNodeDescription(nodeDescription);
      
      // description이 없으면 노드 데이터에 기본값 설정
      if (!node.data.description) {
        updateNodeData(nodeId, {
          ...node.data,
          description: nodeDescription
        });
      }

      const currentIncomingEdges = edges.filter((edge: Edge) => edge.target === nodeId);
      setIncomingEdges(currentIncomingEdges);

      // input data 선택: 항상 가장 최근 엣지 기준
      let currentMergedInputData: Record<string, VariableValue> = {};
      let selectedEdge: {edgeId: string, sourceNodeId: string, timestamp: number} | null = null;
      
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
          const targetEdge = edgesWithTimestamps[0];
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

      // merge 노드의 경우 여러 incoming edge 중 하나라도 데이터가 있으면 valid로 처리
      let currentHasValidInputData: boolean;
      if (node.type === 'mergeNode') {
        currentHasValidInputData = currentIncomingEdges.some(edge => 
          edge.data?.output && typeof edge.data.output === 'object' && Object.keys(edge.data.output).length > 0
        );
      } else {
        currentHasValidInputData = currentMergedInputData && Object.keys(currentMergedInputData).length > 0;
      }
      setHasValidInputData(currentHasValidInputData);

      // Adjust active tab based on node type and current active tab validity
      const nodeType = node.type;
      let newDefaultTab: 'input_data' | 'code' | 'settings' | 'edge_data' = 'input_data';
      let currentTabIsValid = true;

      // 노드 타입별로 유효한 탭 정의
      const validTabsByNodeType: Record<string, ('input_data' | 'code' | 'settings' | 'edge_data')[]> = {
        'startNode': ['settings'],
        'endNode': ['input_data', 'settings'],
        'promptNode': ['input_data', 'code'],
        'agentNode': ['input_data', 'settings'],
        'conditionNode': ['input_data', 'settings'],
        'groupsNode': ['input_data', 'settings'],
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
        newDefaultTab = 'input_data';
      } else if (nodeType === 'promptNode') {
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
    }
  }, [nodeId, activeTab, edges]);

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
    setNodeName(value);
    
    // 유효한 입력인 경우에만 노드 데이터 업데이트 및 lastValidNodeName 저장
    if (validateNodeName(value) && value.trim() && currentNode) {
      setLastValidNodeName(value);
      updateNodeData(nodeId, {
        ...currentNode.data,
        label: value.trim()
      });
    }
  };

  const handleNameBlur = () => {
    // 입력이 완료되었을 때 유효하지 않으면 이전 유효한 이름으로 복원
    if (!validateNodeName(nodeName) && lastValidNodeName) {
      setNodeName(lastValidNodeName);
      if (currentNode) {
        updateNodeData(nodeId, {
          ...currentNode.data,
          label: lastValidNodeName
        });
      }
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNodeDescription(value);
    
    // 텍스트 길이에 따라 높이 자동 조절 (최소 3줄, 최대 10줄)
    const lines = value.split('\n').length;
    const newHeight = Math.max(3, Math.min(10, lines));
    setDescriptionHeight(newHeight);
    
    if (currentNode) {
      updateNodeData(nodeId, {
        ...currentNode.data,
        description: value
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




  // input data 전체 삭제 핸들러
  const handleClearInputData = () => {
    if (currentNode) {
      // 노드의 inputData 초기화
      updateNodeData(nodeId, {
        ...currentNode.data,
        inputData: null
      });
      
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

  // JSON 팝업 열기 핸들러

  const handleOpenJsonPopup = (data: any, title: string = 'JSON Data Viewer', editable: boolean = true) => {
    setJsonPopupData(data);
    setJsonPopupTitle(title);
    setIsJsonPopupEditable(editable);
    setIsJsonPopupOpen(true);
  };

  // JSON 데이터 저장 핸들러
  const handleSaveJsonData = (newData: any) => {
    if (!selectedEdgeInfo) {
      console.error('No selected edge info available');
      return;
    }

    // 선택된 edge의 output 데이터 업데이트
    const edgeId = selectedEdgeInfo.edgeId;
    updateEdgeData(edgeId, {
      output: newData,
      timestamp: Date.now()
    });

    // 로컬 상태도 업데이트
    setMergedInputData(newData);
    
    // 팝업에 표시되는 데이터도 즉시 업데이트
    setJsonPopupData(newData);
    
    console.log(`Updated edge ${edgeId} with new data:`, newData);
  };






  if (!currentNode) return null;

  const isConditionNode = currentNode.type === 'conditionNode';
  const isPromptNode = currentNode.type === 'promptNode';
  const isAgentNode = currentNode.type === 'agentNode';
  const isStartNode = currentNode.type === 'startNode';
  const isToolsMemoryNode = currentNode.type === 'toolsMemoryNode';
  const isEndNode = currentNode.type === 'endNode';
  const isMergeNode = currentNode.type === 'mergeNode';
  const isUserNode = currentNode.type === 'userNode';

  return (
    <div 
      className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col shadow-md z-10 relative"
      style={{ width: `${width}px` }}
      data-testid="node-inspector"
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
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          {selectedEdge ? 'Edge Inspector' : 'Node Inspector'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={18} />
        </button>
      </div>
      
      {!selectedEdge && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Node Name
            </label>
            <input
              type="text"
              value={nodeName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                !validateNodeName(nodeName) && nodeName.trim()
                  ? 'border-red-500 dark:border-red-400 focus:ring-red-500 text-red-600 dark:text-red-400'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="영문자, 숫자, _만 사용 (다른 언어 입력 시 빨간색 표시)"
            />
            {!validateNodeName(nodeName) && nodeName.trim() && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                <span className="mr-1">⚠️</span>
                영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={nodeDescription}
              onChange={handleDescriptionChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-y"
              placeholder="Enter a description for the node"
              rows={descriptionHeight}
              style={{ minHeight: '72px', maxHeight: '240px' }}
            />
          </div>
        </div>
      )}
      
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {selectedEdge ? (
          // 엣지 전용 탭
          <button
            className={`flex-1 py-2 flex justify-center items-center ${
              activeTab === 'edge_data' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('edge_data')}
          >
            <Database size={16} className="mr-1" /> Edge Data
          </button>
        ) : (
          // 노드 전용 탭들
          <>
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
          if (isPromptNode) {
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
          } else if (!(isStartNode || isEndNode || isAgentNode || isConditionNode || isToolsMemoryNode || isMergeNode || isUserNode)) {
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

            {!(isPromptNode) && (isStartNode || isEndNode || isAgentNode || isConditionNode || isToolsMemoryNode || isMergeNode || isUserNode) && (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={16} className="mr-1" /> Settings
              </button>
            )}
          </>
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
                    // 강제로 input data 새로고침 (항상 최신 엣지 기준)
                    const currentIncomingEdges = edges.filter((edge: Edge) => edge.target === nodeId);
                    setIncomingEdges(currentIncomingEdges);
                    
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
                        const targetEdge = edgesWithTimestamps[0];
                        setMergedInputData(targetEdge.output);
                        setSelectedEdgeInfo({
                          edgeId: targetEdge.edge.id,
                          sourceNodeId: targetEdge.edge.source,
                          timestamp: targetEdge.timestamp
                        });
                        setHasValidInputData(targetEdge.output && Object.keys(targetEdge.output).length > 0);
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
              <div className="space-y-4">
                {/* Output Variables 섹션 - 이전 노드의 output variable만 표시 */}
                {(() => {
                  const outputVariables: Array<{
                    sourceNodeLabel: string;
                    variableName: string;
                    value: any;
                    edgeId: string;
                  }> = [];

                  if (isMergeNode) {
                    // Merge 노드: 모든 incoming edge의 output variable 수집
                    incomingEdges.forEach(edge => {
                      const sourceNode = nodes.find(n => n.id === edge.source);

                      // Agent 노드는 agentOutputVariable, 다른 노드는 outputVariable 사용
                      const outputVariable = sourceNode?.data?.config?.agentOutputVariable || sourceNode?.data?.config?.outputVariable;

                      if (outputVariable && edge.data?.output && edge.data.output[outputVariable] !== undefined) {
                        outputVariables.push({
                          sourceNodeLabel: sourceNode?.data?.label || edge.source,
                          variableName: outputVariable,
                          value: edge.data.output[outputVariable],
                          edgeId: edge.id
                        });
                      }
                    });
                  } else if (selectedEdgeInfo) {
                    // 일반 노드: 선택된 edge의 output variable만
                    const sourceNode = nodes.find(n => n.id === selectedEdgeInfo.sourceNodeId);

                    // Agent 노드는 agentOutputVariable, 다른 노드는 outputVariable 사용
                    const outputVariable = sourceNode?.data?.config?.agentOutputVariable || sourceNode?.data?.config?.outputVariable;

                    if (outputVariable && mergedInputData[outputVariable] !== undefined) {
                      outputVariables.push({
                        sourceNodeLabel: sourceNode?.data?.label || selectedEdgeInfo.sourceNodeId,
                        variableName: outputVariable,
                        value: mergedInputData[outputVariable],
                        edgeId: selectedEdgeInfo.edgeId
                      });
                    }
                  }

                  return outputVariables.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                          📤 Output Variables
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({outputVariables.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {outputVariables.map((ov, index) => (
                          <div 
                            key={`${ov.edgeId}-${index}`}
                            className="border border-purple-200 dark:border-purple-700 rounded-lg p-2.5 bg-purple-50 dark:bg-purple-900/20 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
                            onClick={() => {
                              handleOpenJsonPopup(
                                ov.value,

                                `Output Variable: ${ov.variableName} from ${ov.sourceNodeLabel}`,
                                false  // 읽기 전용

                              );
                            }}
                            title="클릭하여 확대 보기"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                  {ov.sourceNodeLabel}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">→</span>
                                <code className="text-xs font-mono bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                                  {ov.variableName}
                                </code>
                              </div>
                              <span className="text-xs text-purple-500 dark:text-purple-400 ml-2 flex-shrink-0">
                                🔍
                              </span>
                            </div>

                            <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                              {typeof ov.value === 'string' ? (
                                <div className="italic whitespace-pre-wrap break-words max-h-12 overflow-hidden line-clamp-2">
                                  "{ov.value.length > 100 ? ov.value.substring(0, 100) + '...' : ov.value}"
                                </div>

                              ) : typeof ov.value === 'number' || typeof ov.value === 'boolean' ? (
                                <span className="font-mono text-purple-600 dark:text-purple-400">{String(ov.value)}</span>
                              ) : Array.isArray(ov.value) ? (
                                <span className="text-orange-600 dark:text-orange-400">Array ({ov.value.length} items)</span>
                              ) : typeof ov.value === 'object' && ov.value !== null ? (
                                <span className="text-blue-600 dark:text-blue-400">Object ({Object.keys(ov.value).length} properties)</span>
                              ) : (
                                <span className="text-gray-500">Click to view</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* 기존 전체 데이터 섹션 */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      📊 All Input Data
                    </h3>
                  </div>
                  <div
                    className="space-y-3"
                    tabIndex={0}
                    onKeyDownCapture={(e) => {
                      const target = e.target as HTMLElement;
                      const tag = target && target.tagName;
                      const isEditable = (target as any)?.isContentEditable;
                      if ((e.key === 'Backspace' || e.key === 'Delete') && tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                {/* merge 노드일 때는 모든 incoming 노드들을 표시 (단, Edge Inspector 모드가 아닐 때만) */}
                {isMergeNode && !selectedEdge ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      📦 All Incoming Nodes ({incomingEdges.length})
                    </div>
                    {incomingEdges.map((edge) => {
                      const sourceNode = nodes.find(n => n.id === edge.source);
                      const hasData = edge.data?.output && typeof edge.data.output === 'object' && Object.keys(edge.data.output).length > 0;
                      const hasError = hasData && edge.data.output.error;
                      const isSelected = selectedEdgeInfo?.edgeId === edge.id;
                      
                      return (
                        <div 
                          key={edge.id}
                          className={`border rounded-lg p-3 select-text transition-colors ${
                            hasError 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                              : hasData 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                          } ${isSelected ? 'border-2 border-blue-500' : ''}`}
                          title="Read-only preview"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-medium ${
                                hasError 
                                  ? 'text-red-700 dark:text-red-300' 
                                  : hasData 
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {hasError ? '❌' : hasData ? '✅' : '⏳'} {sourceNode?.data?.label || edge.source}
                              </span>
                              {isSelected && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs ${
                                hasError 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : hasData 
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {edge.data?.timestamp && edge.data.timestamp > 0 
                                  ? new Date(edge.data.timestamp).toLocaleTimeString()
                                  : 'Not executed yet'
                                }
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {hasData ? (
                              <JsonViewer 
                                data={edge.data.output} 
                                maxHeight="200px"
                                className="text-xs"
                                onExpand={() => {
                                  const sourceNode = nodes.find(n => n.id === edge.source);
                                  handleOpenJsonPopup(
                                    edge.data.output, 
                                    `Input Data from ${sourceNode?.data?.label || edge.source}`
                                  );
                                }}
                              />
                            ) : (
                              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                No data available - execute the source node first
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : selectedEdge ? (
                  /* Edge Inspector 모드: 선택된 edge의 데이터만 표시 */
                  (() => {
                    const edgeHasData = selectedEdge.data?.output && 
                      typeof selectedEdge.data.output === 'object' && 
                      Object.keys(selectedEdge.data.output).length > 0;
                    
                    if (!edgeHasData) {
                      // 선택된 edge에 데이터가 없는 경우 경고 표시
                      return (
                        <div className="flex items-center mt-1 text-amber-500 text-xs">
                          <AlertCircle size={12} className="mr-1" />
                          Connected node(s) have not produced output or output is empty. Execute preceding nodes.
                        </div>
                      );
                    }

                    // 선택된 edge에 데이터가 있는 경우 표시
                    const hasError = selectedEdge.data.output.error;
                    
                    return (
                      <div 
                        className={`border rounded-lg p-3 select-text transition-colors ${
                          hasError 
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                        }`}
                        title="Selected edge data"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${
                            hasError 
                              ? 'text-red-700 dark:text-red-300' 
                              : 'text-green-700 dark:text-green-300'
                          }`}>
                            {hasError ? '❌ Selected Edge (Error)' : '✅ Selected Edge Data'}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs ${
                              hasError 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {selectedEdge.data?.timestamp && selectedEdge.data.timestamp > 0 
                                ? new Date(selectedEdge.data.timestamp).toLocaleTimeString()
                                : 'Not executed yet'
                              }
                            </span>
                            <Play className={`w-3 h-3 ${
                              hasError 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <JsonViewer 
                            data={selectedEdge.data.output} 
                            maxHeight="300px"
                            className="text-xs"
                            onExpand={() => {
                              handleOpenJsonPopup(
                                selectedEdge.data.output, 
                                `Edge Data: ${selectedEdge.source} → ${selectedEdge.target}`
                              );
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* 일반 노드는 기존 로직 유지 */
                  selectedEdgeInfo && (() => {
                    // 에러 상태 확인
                    const hasError = mergedInputData && typeof mergedInputData === 'object' && mergedInputData.error;
                    
                    return (
                    <div 
                      className={`border rounded-lg p-3 select-text transition-colors ${
                        hasError 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                      } ${selectedEdgeInfo?.edgeId ? 'border-2 border-blue-500' : ''}`}
                      title="Read-only preview"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${
                          hasError 
                            ? 'text-red-700 dark:text-red-300' 
                            : 'text-green-700 dark:text-green-300'
                        }`}>
                          {hasError ? '❌ Selected Input (Error)' : '✅ Selected Input (Latest)'}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${
                            hasError 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {selectedEdgeInfo.timestamp && selectedEdgeInfo.timestamp > 0 
                              ? new Date(selectedEdgeInfo.timestamp).toLocaleTimeString()
                              : 'Not executed yet'
                            }
                          </span>
                          <Play className={`w-3 h-3 ${
                            hasError 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-green-600 dark:text-green-400'
                          }`} />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <JsonViewer 
                          data={mergedInputData} 
                          maxHeight="300px"
                          className="text-xs"
                          onExpand={() => {
                            const sourceNode = nodes.find(n => n.id === selectedEdgeInfo?.sourceNodeId);
                            handleOpenJsonPopup(
                              mergedInputData, 
                              `Input Data from ${sourceNode?.data?.label || selectedEdgeInfo?.sourceNodeId || 'Source'}`
                            );
                          }}
                        />
                      </div>
                    </div>
                    );
                  })()
                )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'code' && (
          <div className="h-full">
            {isPromptNode ? (
              <PromptSettings nodeId={nodeId} />
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
        {activeTab === 'edge_data' && selectedEdge && (
          <div className="p-4">
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <Database size={20} className="text-blue-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Edge Data Inspector</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                이 엣지를 통해 전달되는 데이터를 확인할 수 있습니다.
              </p>
            </div>

            {/* Output Variable 섹션 - Edge에서도 표시 */}
            {(() => {
              const sourceNode = nodes.find(n => n.id === selectedEdge.source);

              // Agent 노드는 agentOutputVariable, 다른 노드는 outputVariable 사용
              const outputVariable = sourceNode?.data?.config?.agentOutputVariable || sourceNode?.data?.config?.outputVariable;

              const hasOutputVariable = outputVariable && selectedEdge.data?.output && selectedEdge.data.output[outputVariable] !== undefined;

              return hasOutputVariable ? (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                      📤 Output Variable
                    </h3>
                  </div>
                  <div 
                    className="border border-purple-200 dark:border-purple-700 rounded-lg p-2.5 bg-purple-50 dark:bg-purple-900/20 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
                    onClick={() => {
                      handleOpenJsonPopup(
                        selectedEdge.data.output[outputVariable],

                        `Output Variable: ${outputVariable} from ${sourceNode?.data?.label || selectedEdge.source}`,
                        false  // 읽기 전용

                      );
                    }}
                    title="클릭하여 확대 보기"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          {sourceNode?.data?.label || selectedEdge.source}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">→</span>
                        <code className="text-xs font-mono bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                          {outputVariable}
                        </code>
                      </div>
                      <span className="text-xs text-purple-500 dark:text-purple-400 ml-2 flex-shrink-0">
                        🔍
                      </span>
                    </div>

                    <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                      {typeof selectedEdge.data.output[outputVariable] === 'string' ? (
                        <div className="italic whitespace-pre-wrap break-words max-h-12 overflow-hidden line-clamp-2">
                          "{selectedEdge.data.output[outputVariable].length > 100 ? selectedEdge.data.output[outputVariable].substring(0, 100) + '...' : selectedEdge.data.output[outputVariable]}"
                        </div>

                      ) : typeof selectedEdge.data.output[outputVariable] === 'number' || typeof selectedEdge.data.output[outputVariable] === 'boolean' ? (
                        <span className="font-mono text-purple-600 dark:text-purple-400">{String(selectedEdge.data.output[outputVariable])}</span>
                      ) : Array.isArray(selectedEdge.data.output[outputVariable]) ? (
                        <span className="text-orange-600 dark:text-orange-400">Array ({selectedEdge.data.output[outputVariable].length} items)</span>
                      ) : typeof selectedEdge.data.output[outputVariable] === 'object' && selectedEdge.data.output[outputVariable] !== null ? (
                        <span className="text-blue-600 dark:text-blue-400">Object ({Object.keys(selectedEdge.data.output[outputVariable]).length} properties)</span>
                      ) : (
                        <span className="text-gray-500">Click to view</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connection Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Edge ID:</span>
                  <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{selectedEdge.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Source Node:</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{selectedEdge.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Target Node:</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{selectedEdge.target}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📊 All Data Transfer</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                {selectedEdge.data?.output ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Database size={16} className="text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Data from {selectedEdge.source}
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        ✓ Available
                      </span>
                    </div>
                    
                    {/* JSON 데이터를 시각적으로 표시 */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">JSON Data</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {typeof selectedEdge.data.output === 'object' 
                                ? `${Object.keys(selectedEdge.data.output).length} properties`
                                : '1 value'
                              }
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(selectedEdge.data.output, null, 2));
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 max-h-60 overflow-auto">
                        {(() => {
                          const data = selectedEdge.data.output;
                          if (typeof data === 'object' && data !== null) {
                            return (
                              <div className="space-y-2">
                                {Object.entries(data).map(([key, value]) => (
                                  <div key={key} className="flex items-start space-x-2">
                                    <div className="flex-shrink-0 w-20">
                                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                        {key}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {(() => {
                                        if (typeof value === 'string') {
                                          return (
                                            <span className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                                              "{value}"
                                            </span>
                                          );
                                        } else if (typeof value === 'number') {
                                          return (
                                            <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded font-mono">
                                              {value}
                                            </span>
                                          );
                                        } else if (typeof value === 'boolean') {
                                          return (
                                            <span className={`text-xs px-2 py-1 rounded font-mono ${
                                              value 
                                                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                                                : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                                            }`}>
                                              {value.toString()}
                                            </span>
                                          );
                                        } else if (value === null) {
                                          return (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                                              null
                                            </span>
                                          );
                                        } else if (Array.isArray(value)) {
                                          return (
                                            <div className="text-xs">
                                              <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded font-mono">
                                                Array ({value.length} items)
                                              </span>
                                              {value.length > 0 && (
                                                <div className="mt-1 ml-2 space-y-1">
                                                  {value.slice(0, 3).map((item, index) => (
                                                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                                                      [{index}]: {typeof item === 'string' ? `"${item}"` : String(item)}
                                                    </div>
                                                  ))}
                                                  {value.length > 3 && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                                      ... and {value.length - 3} more
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        } else if (typeof value === 'object') {
                                          return (
                                            <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded font-mono">
                                              Object ({Object.keys(value).length} properties)
                                            </span>
                                          );
                                        } else {
                                          return (
                                            <span className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                                              {String(value)}
                                            </span>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          } else {
                            // 단일 값인 경우
                            return (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Value:</span>
                                <span className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                                  {typeof data === 'string' ? `"${data}"` : String(data)}
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Database size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No data available</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                      Execute the source node to see data here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {selectedEdge.data?.label && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Edge Label</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{selectedEdge.data.label}</span>
                </div>
              </div>
            )}

            {selectedEdge.data?.conditionDescription && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{selectedEdge.data.conditionDescription}</span>
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

      {/* JSON Popup Modal */}
      <JsonPopupModal
        isOpen={isJsonPopupOpen}
        onClose={() => setIsJsonPopupOpen(false)}
        data={jsonPopupData}
        title={jsonPopupTitle}

        onSave={isJsonPopupEditable ? handleSaveJsonData : undefined}
        editable={isJsonPopupEditable}

      />
    </div>
  );
};

export default NodeInspector;