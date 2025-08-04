import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Settings, Code, AlertCircle, LogIn } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import CodeEditor from './CodeEditor';
import ConditionSettings from './nodes/ConditionSettings';
import PromptSettings from './nodes/PromptSettings';
import AgentSettings from './nodes/AgentSettings';
import StartSettings from './nodes/StartSettings';
import EmbeddingSettings from './nodes/EmbeddingSettings';
import RAGSettings from './nodes/RAGSettings';
import MergeSettings from './nodes/MergeSettings';
import EndNodeSettings from './nodes/EndNodeSettings';
import ToolsMemorySettings from './nodes/ToolsMemorySettings';
import FunctionSettings from './nodes/FunctionSettings';
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
  const [width, setWidth] = useState(384); // 기본 너비 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  
  const [incomingEdges, setIncomingEdges] = useState<Edge[]>([]);
  const [mergedInputData, setMergedInputData] = useState<Record<string, VariableValue>>({});
  const [hasValidInputData, setHasValidInputData] = useState<boolean>(false);
  const [isNameDuplicate, setIsNameDuplicate] = useState<boolean>(false);

  // 최소/최대 너비 제한
  const MIN_WIDTH = 320; // 최소 너비
  const MAX_WIDTH = 800; // 최대 너비
  const RESIZE_THROTTLE = 16; // 약 60fps로 제한

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
      setIsNameDuplicate(false); // 노드 변경 시 중복 상태 초기화

      // functionNode에서 input data가 변경될 때 자동으로 코드 업데이트
      if (node.type === 'functionNode' && currentHasValidInputData) {
        const inputKeys = Object.keys(currentMergedInputData);
        const currentCode = node.data.code || '';
        
        // 기본 코드 패턴인지 확인 (새로 생성된 노드인지)
        const isDefaultCode = currentCode.includes('def sample_code(state):') && 
                             currentCode.includes('# Access input variables like this:') &&
                             currentCode.includes('# aaa = state.get("aaa")');
        
        if (isDefaultCode && inputKeys.length > 0) {
          // input data의 모든 키를 자동으로 추가
          const variableLines = inputKeys.map(key => `    ${key} = state.get("${key}")`).join('\n');
          
          const updatedCode = 
            'def sample_code(state):\n' +
            '    # Input data from the previous node is in the `state` dictionary.\n' +
            '    # Access input variables like this:\n' +
            variableLines + '\n' +
            '    \n' +
            '    # Add your custom logic here\n' +
            '    \n' +
            '    # Return the modified state\n' +
            '    return state';
          
          // 코드가 실제로 변경되었을 때만 업데이트
          if (updatedCode !== currentCode) {
            updateNodeData(nodeId, {
              ...node.data,
              code: updatedCode
            });
            setCode(updatedCode);
          }
        }
      }

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
      } else if (nodeType === 'promptNode') {
        if (activeTab === 'settings') currentTabIsValid = false;
        newDefaultTab = 'input_data';
      } else if (nodeType === 'toolsMemoryNode') {
        if (activeTab === 'input_data' || activeTab === 'code') currentTabIsValid = false;
        newDefaultTab = 'settings';
      } else if (
        nodeType && ['agentNode', 'conditionNode', 'groupsNode', 'embeddingNode', 'ragNode', 'mergeNode'].includes(nodeType)
      ) {
        if (activeTab === 'code') currentTabIsValid = false;
        newDefaultTab = 'input_data';
      }

      if (!currentTabIsValid) {
        setActiveTab(newDefaultTab);
      }
    } else {
      // 노드가 삭제되었으면 Node Inspector를 닫음
      onClose();
    }
  }, [nodeId, nodes, edges, activeTab, onClose]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPosition = input.selectionStart || 0;
    const originalValue = input.value;
    const newName = originalValue.replace(/\s+/g, ''); // 띄어쓰기 제거
    
    // 띄어쓰기가 제거된 경우 커서 위치 조정
    const removedSpaces = originalValue.length - newName.length;
    const adjustedPosition = cursorPosition - removedSpaces;
    
    // 중복 체크: 현재 노드를 제외한 다른 노드들과 이름 비교
    const isDuplicate = nodes.some(node => 
      node.id !== nodeId && node.data.label === newName.trim()
    );
    
    setIsNameDuplicate(isDuplicate);
    
    if (newName.trim() && currentNode && !isDuplicate) {
      setNodeName(newName);
      updateNodeData(nodeId, {
        ...currentNode.data,
        label: newName.trim()
      });
    } else if (isDuplicate) {
      // 중복된 경우 기존 이름으로 롤백
      setNodeName(currentNode?.data.label || '');
    } else {
      setNodeName(newName);
    }
    
    // 다음 렌더링 후 커서 위치 복원
    setTimeout(() => {
      const newPosition = Math.max(0, Math.min(adjustedPosition, newName.length));
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (currentNode) {
      updateNodeData(nodeId, {
        ...currentNode.data,
        code: newCode
      });
    }
  };

  // 리사이즈 시작
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setPreviewWidth(null);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  // 리사이즈 중 (throttled)
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = startXRef.current - e.clientX;
    const newWidth = startWidthRef.current + deltaX;
    
    // 최소/최대 너비 제한 적용
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    
    // 미리보기 업데이트
    setPreviewWidth(clampedWidth);
  }, [isResizing]);

  // 리사이즈 종료
  const handleResizeEnd = useCallback(() => {
    if (isResizing && previewWidth !== null) {
      setWidth(previewWidth);
    }
    
    setIsResizing(false);
    setPreviewWidth(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isResizing, previewWidth]);

  // 마우스 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        requestAnimationFrame(() => handleResizeMove(e));
      };
      
      const handleMouseUp = () => {
        handleResizeEnd();
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  if (!currentNode) {
    return null;
  }

  const isStartNode = currentNode.type === 'startNode';
  const isEndNode = currentNode.type === 'endNode';
  const isConditionNode = currentNode.type === 'conditionNode';
  const isPromptNode = currentNode.type === 'promptNode';
  const isAgentNode = currentNode.type === 'agentNode';
  const isToolsMemoryNode = currentNode.type === 'toolsMemoryNode';
  const isEmbeddingNode = currentNode.type === 'embeddingNode';
  const isRAGNode = currentNode.type === 'ragNode';
  const isMergeNode = currentNode.type === 'mergeNode';
  const isFunctionNode = currentNode.type === 'functionNode';

  // 현재 표시할 너비 (미리보기 또는 실제 너비)
  const displayWidth = previewWidth !== null ? previewWidth : width;

  return (
    <div 
      className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col shadow-md z-10 relative"
      style={{ 
        width: `${displayWidth}px`,
        transition: isResizing ? 'none' : 'width 0.1s ease-out'
      }}
    >
      {/* 리사이즈 핸들 */}
      <div
        ref={resizeRef}
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-20 ${
          isResizing 
            ? 'bg-blue-500 opacity-75' 
            : 'hover:bg-blue-500 hover:opacity-50'
        }`}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
      
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
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            isNameDuplicate 
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-gray-100`}
          placeholder="Enter node name"
        />
        {isNameDuplicate && (
          <div className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center">
            <AlertCircle size={12} className="mr-1" />
            Node name already exists
          </div>
        )}
      </div>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {!isStartNode && !isToolsMemoryNode && (
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
          } else if (isToolsMemoryNode) {
            return (
              <button
                className={`flex-1 py-2 flex justify-center items-center ${
                  activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={16} className="mr-1" /> Settings
              </button>
            );
          } else if (!(isStartNode || isEndNode || isAgentNode || isConditionNode || isEmbeddingNode || isRAGNode || isMergeNode)) {
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

        {!isPromptNode && !isFunctionNode && !isToolsMemoryNode && (
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
        {activeTab === 'input_data' && !isStartNode && !isToolsMemoryNode && (
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
            ) : isFunctionNode ? (
              <div className="p-4">
                <FunctionSettings nodeId={nodeId} />
              </div>
            ) : (
              <div className="h-full">
                <CodeEditor
                  value={code}
                  onChange={handleCodeChange}
                  language="python"
                />
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
              {isEmbeddingNode && <EmbeddingSettings nodeId={nodeId} />}
              {isRAGNode && <RAGSettings nodeId={nodeId} />}
              {isMergeNode && <MergeSettings nodeId={nodeId} />}
              {isEndNode && <EndNodeSettings nodeId={nodeId} />}
              {isToolsMemoryNode && <ToolsMemorySettings nodeId={nodeId} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeInspector;