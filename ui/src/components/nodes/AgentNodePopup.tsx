import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Plus, Code, Trash2, User } from 'lucide-react';
import CodeEditorPopup from './CodeEditorPopup';
import { useFlowStore } from '../../store/flowStore';

interface CodeNode {
  id: string;
  code: string;
  label: string;
  title?: string;
  description?: string;
}

interface UserNode {
  id: string;
  name: string;
  code: string;
  functionName: string;
  functionDescription: string;
  parameters: any[];
}

interface AgentNodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: any;
  nodeId: string;
}

const AgentNodePopup: React.FC<AgentNodePopupProps> = ({ isOpen, onClose, nodeData, nodeId }) => {
  const { updateNodeData, setSelectedUserNodeInAgentPopup } = useFlowStore();
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState('# Write your Python code here\n');
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const currentTitleRef = useRef('');
  const currentDescriptionRef = useRef('');
  const [codeNodes, setCodeNodes] = useState<CodeNode[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [userNodes, setUserNodes] = useState<UserNode[]>([]);

  // nodeData에서 저장된 코드 노드들과 유저 노드들 불러오기
  useEffect(() => {
    if (isOpen) {
      if (nodeData?.codeNodes && Array.isArray(nodeData.codeNodes)) {
        console.log('[AgentNodePopup] Loading saved code nodes:', nodeData.codeNodes);
        setCodeNodes(nodeData.codeNodes);
      } else {
        console.log('[AgentNodePopup] No saved code nodes found, initializing empty array');
        setCodeNodes([]);
      }
      
      if (nodeData?.userNodes && Array.isArray(nodeData.userNodes)) {
        console.log('[AgentNodePopup] Loading saved user nodes:', nodeData.userNodes);
        setUserNodes(nodeData.userNodes);
      } else {
        console.log('[AgentNodePopup] No saved user nodes found, initializing empty array');
        setUserNodes([]);
      }
    }
  }, [isOpen, nodeData]);

  if (!isOpen) return null;

  const handlePlusClick = () => {
    setCurrentCode('# Write your Python code here\n');
    setCurrentTitle('');
    setCurrentDescription('');
    currentTitleRef.current = '';
    currentDescriptionRef.current = '';
    setEditingNodeId(null);
    setIsCodeEditorOpen(true);
  };

  const handleCodeEditorClose = () => {
    setIsCodeEditorOpen(false);
    setEditingNodeId(null);
  };

  const handleCodeSave = (newCode: string) => {
    // ref에서 최신 title과 description 값을 가져옴
    const finalTitle = currentTitleRef.current.trim();
    const finalDescription = currentDescriptionRef.current.trim();
    const finalLabel = finalTitle || generateLabel(newCode);
    
    console.log('[AgentNodePopup] handleCodeSave called:', { 
      newCode: newCode.length, 
      finalTitle, 
      finalDescription,
      finalLabel 
    });
    
    let updatedNodes: CodeNode[];
    
    if (editingNodeId) {
      // 기존 노드 수정
      updatedNodes = codeNodes.map(node => 
        node.id === editingNodeId 
          ? { ...node, code: newCode, label: finalLabel, title: finalTitle, description: finalDescription }
          : node
      );
    } else {
      // 새 노드 추가
      const newNode: CodeNode = {
        id: `code-${Date.now()}`,
        code: newCode,
        label: finalLabel,
        title: finalTitle,
        description: finalDescription
      };
      console.log('[AgentNodePopup] Creating new node:', newNode);
      updatedNodes = [...codeNodes, newNode];
    }
    
    setCodeNodes(updatedNodes);
    setCurrentCode(newCode);
    
    // Agent 노드의 data에 저장 (MongoDB에 자동 저장됨)
    updateNodeData(nodeId, {
      ...nodeData,
      codeNodes: updatedNodes
    });
    
    console.log('[AgentNodePopup] Saved to node data, will be persisted to MongoDB');
  };

  const handleTitleChange = (newTitle: string) => {
    console.log('[AgentNodePopup] Title changed:', newTitle);
    currentTitleRef.current = newTitle;
    setCurrentTitle(newTitle);
  };

  const handleDescriptionChange = (newDescription: string) => {
    console.log('[AgentNodePopup] Description changed:', newDescription);
    currentDescriptionRef.current = newDescription;
    setCurrentDescription(newDescription);
  };

  const handleNodeClick = (node: CodeNode) => {
    setCurrentCode(node.code);
    const nodeTitle = node.title || '';
    const nodeDescription = node.description || '';
    setCurrentTitle(nodeTitle);
    setCurrentDescription(nodeDescription);
    currentTitleRef.current = nodeTitle;
    currentDescriptionRef.current = nodeDescription;
    setEditingNodeId(node.id);
    setIsCodeEditorOpen(true);
  };

  const handleDeleteNode = (codeNodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 코드 노드를 삭제하시겠습니까?')) {
      const updatedNodes = codeNodes.filter(node => node.id !== codeNodeId);
      setCodeNodes(updatedNodes);
      
      // Agent 노드의 data에 저장 (MongoDB에 자동 저장됨)
      updateNodeData(nodeId, {
        ...nodeData,
        codeNodes: updatedNodes
      });
      
      console.log('[AgentNodePopup] Deleted node and saved to node data');
    }
  };

  const handleDeleteUserNode = (userNodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 유저 노드를 삭제하시겠습니까?')) {
      const updatedNodes = userNodes.filter(node => node.id !== userNodeId);
      setUserNodes(updatedNodes);
      
      // Agent 노드의 data에 저장 (MongoDB에 자동 저장됨)
      updateNodeData(nodeId, {
        ...nodeData,
        userNodes: updatedNodes
      });
      
      console.log('[AgentNodePopup] Deleted user node and saved to node data');
    }
  };

  const handleUserNodeClick = (userNode: UserNode) => {
    console.log('[AgentNodePopup] User Node clicked:', userNode);
    // agentNodeId와 함께 userNode를 저장
    setSelectedUserNodeInAgentPopup({
      userNode,
      agentNodeId: nodeId
    });
  };

  const generateLabel = (code: string): string => {
    // 코드의 첫 줄에서 의미있는 텍스트 추출
    const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    if (lines.length > 0) {
      const firstLine = lines[0].trim().substring(0, 20);
      return firstLine.length < lines[0].trim().length ? firstLine + '...' : firstLine;
    }
    return 'Code Node';
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // 코드 에디터가 열려있을 때는 배경 클릭 무시
    if (isCodeEditorOpen) {
      return;
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col w-full max-w-4xl h-5/6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Bot size={24} className="text-blue-500 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Agent 노드 상세 정보
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - 코드 노드들과 유저 노드들 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* 유저 노드 섹션 */}
          {userNodes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <User size={16} className="mr-2" />
                User Nodes
              </h3>
              <div className="flex flex-wrap gap-4 items-start content-start">
                {userNodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => handleUserNodeClick(node)}
                    className="relative w-32 h-32 rounded-xl border-2 border-purple-300 dark:border-purple-600 
                               bg-purple-50 dark:bg-purple-900/20
                               hover:border-purple-400 dark:hover:border-purple-500 
                               hover:shadow-lg
                               transition-all duration-200 
                               flex flex-col items-center justify-center
                               cursor-pointer
                               group"
                  >
                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => handleDeleteUserNode(node.id, e)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 
                                 text-white rounded-full flex items-center justify-center
                                 opacity-0 group-hover:opacity-100 transition-opacity
                                 shadow-md z-10"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* 노드 아이콘 */}
                    <div className="w-12 h-12 rounded-lg bg-purple-200 dark:bg-purple-800/50 
                                   flex items-center justify-center mb-2">
                      <User size={24} className="text-purple-600 dark:text-purple-300" />
                    </div>

                    {/* 노드 라벨 */}
                    <div className="text-xs text-gray-600 dark:text-gray-300 text-center px-2 line-clamp-2">
                      {node.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 코드 노드 섹션 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <Code size={16} className="mr-2" />
              Code Nodes
            </h3>
            <div className="flex flex-wrap gap-4 items-start content-start">
              {/* 코드 노드들 */}
              {codeNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="relative w-32 h-32 rounded-xl border-2 border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700
                             hover:border-blue-400 dark:hover:border-blue-500 
                             hover:shadow-lg
                             transition-all duration-200 
                             flex flex-col items-center justify-center
                             cursor-pointer
                             group"
                >
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => handleDeleteNode(node.id, e)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 
                               text-white rounded-full flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity
                               shadow-md z-10"
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* 노드 아이콘 */}
                  <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 
                                 flex items-center justify-center mb-2">
                    <Code size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>

                  {/* 노드 라벨 */}
                  <div className="text-xs text-gray-600 dark:text-gray-300 text-center px-2 line-clamp-2">
                    {node.label}
                  </div>
                </div>
              ))}

              {/* + 버튼 */}
              <button
                onClick={handlePlusClick}
                className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 
                           hover:border-blue-400 dark:hover:border-blue-500 
                           hover:bg-blue-50 dark:hover:bg-blue-900/20
                           transition-all duration-200 
                           flex items-center justify-center
                           group"
              >
                <Plus 
                  size={64} 
                  className="text-gray-400 dark:text-gray-500 
                             group-hover:text-blue-500 dark:group-hover:text-blue-400 
                             transition-colors" 
                />
              </button>
            </div>

            {/* 노드가 없을 때 안내 메시지 */}
            {codeNodes.length === 0 && userNodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-gray-400 dark:text-gray-500 mb-20">
                  <p className="text-sm">+ 버튼을 클릭하여 코드를 추가하거나</p>
                  <p className="text-sm">User Node를 드래그하여 추가하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Code Editor Popup - 이벤트 버블링 방지 */}
      {isCodeEditorOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <CodeEditorPopup
            isOpen={isCodeEditorOpen}
            onClose={handleCodeEditorClose}
            value={currentCode}
            onChange={handleCodeSave}
            title={currentTitle}
            onTitleChange={handleTitleChange}
            description={currentDescription}
            onDescriptionChange={handleDescriptionChange}
            edgeData={{}}
            sourceNode={null}
            availableVariables={[]}
            hideInputVariables={true}
          />
        </div>
      )}
    </div>
  );
};

export default AgentNodePopup;



