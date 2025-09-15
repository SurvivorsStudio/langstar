import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowInstance,
  Node,
  NodeDragHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore } from '../store/flowStore';
import { useThemeStore } from '../store/themeStore';
import NodeSidebar from './NodeSidebar';
import NodeInspector from './NodeInspector';
import ExecutionStatusIndicator from './ExecutionStatusIndicator';
import ExecutionToast from './ExecutionToast';
import { nodeTypes } from './nodes/nodeTypes';
import CustomEdge, { handleEdgeDelete } from './edges/CustomEdge';
import { PlusCircle, Trash2 } from 'lucide-react';

const edgeTypes = {
  default: CustomEdge,
};

const FlowBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, loadWorkflow, projectName, viewport, setProjectName, isLoading, removeNode, setFocusedElement, selectedNode, setSelectedNode, focusedElement, removeEdge, setManuallySelectedEdge } = useFlowStore();
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const { isDarkMode } = useThemeStore();
  const [showNodeSidebar, setShowNodeSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [synced, setSynced] = useState(false);
  
  // 드래그 앤 드롭 삭제 관련 상태
  const [showTrashZone, setShowTrashZone] = useState(false);
  const [isOverTrashZone, setIsOverTrashZone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{x:number;y:number}|null>(null);

  // 전역 마우스 이벤트 처리 (휴지통 영역 감지)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const trashZone = document.getElementById('trash-zone');
        if (trashZone) {
          const rect = trashZone.getBoundingClientRect();
          const isOver = e.clientX >= rect.left && 
                        e.clientX <= rect.right && 
                        e.clientY >= rect.top && 
                        e.clientY <= rect.bottom;
          setIsOverTrashZone(isOver);
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging]);

  // 엣지 삭제 드래그 이벤트 처리
  useEffect(() => {
    const handleEdgeDragStart = (e: CustomEvent) => {
      setIsDragging(true);
      setShowTrashZone(true);
    };

    const handleEdgeDragEnd = (e: CustomEvent) => {
      const { edgeId, isOverTrashZone: edgeIsOverTrash } = e.detail;
      
      // CustomEdge에서 직접 계산된 값 사용
      if (edgeIsOverTrash) {
        if (window.confirm(`Are you sure you want to delete this edge?`)) {
          removeEdge(edgeId);
        }
      }
      
      // 상태 초기화
      setIsDragging(false);
      setShowTrashZone(false);
      setIsOverTrashZone(false);
    };

    window.addEventListener('edge-drag-start', handleEdgeDragStart as EventListener);
    window.addEventListener('edge-drag-end', handleEdgeDragEnd as EventListener);

    return () => {
      window.removeEventListener('edge-drag-start', handleEdgeDragStart as EventListener);
      window.removeEventListener('edge-drag-end', handleEdgeDragEnd as EventListener);
    };
  }, [isOverTrashZone, removeEdge]);

  // id와 projectName이 다를 때만 setProjectName (동기화 플래그 사용)
  useEffect(() => {
    if (id) {
      const decodedId = decodeURIComponent(id);
      if (decodedId !== projectName) {
        setProjectName(decodedId);
        setSynced(false); // 동기화 중
      } else {
        setSynced(true); // 동기화 완료
      }
    }
    // projectName은 의존성에서 제외!
  }, [id, setProjectName, projectName]);

  // 동기화가 끝난 후에만 loadWorkflow 실행
  useEffect(() => {
    if (synced && projectName) {
      console.log(`[SYNCED] 워크플로우 로드 시도: "${projectName}"`);
      loadWorkflow(projectName).catch((error) => {
        console.log(`[SYNCED] 워크플로우 "${projectName}" 로드 실패 (새 워크플로우일 수 있음):`, error);
      });
    }
  }, [synced, projectName]);

  // viewport가 바뀔 때마다 ReactFlow 인스턴스에 적용
  useEffect(() => {
    if (reactFlowInstance && viewport) {
      // 저장된 viewport가 기본값(즉, x:0, y:0, zoom:1)일 때만 중앙으로 이동
      if (
        viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1 && nodes.length > 0
      ) {
        // 모든 노드의 중앙 계산
        const xs = nodes.map(n => n.position.x);
        const ys = nodes.map(n => n.position.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        reactFlowInstance.setCenter(centerX, centerY, { zoom: 1 });
      } else {
        reactFlowInstance.setViewport(viewport);
      }
    }
  // projectName이 바뀔 때(즉, 워크플로우를 처음 불러올 때)만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactFlowInstance, viewport, projectName]);

  // 전역 마우스 이벤트로 휴지통 위에 있는지 감지
  useEffect(() => {
    if (!isDragging || !showTrashZone) return;

    const handleMouseMove = (event: MouseEvent) => {
      const trashZoneElement = document.getElementById('trash-zone');
      if (trashZoneElement) {
        const trashRect = trashZoneElement.getBoundingClientRect();
        const isOver = event.clientX >= trashRect.left && 
                      event.clientX <= trashRect.right && 
                      event.clientY >= trashRect.top && 
                      event.clientY <= trashRect.bottom;
        setIsOverTrashZone(isOver);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setShowTrashZone(false);
      setIsOverTrashZone(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, showTrashZone]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    console.log(`[FlowBuilder] Node clicked: ${node.id}, type: ${node.type}, label: ${node.data.label}`);
    console.log(`[FlowBuilder] Node data:`, node.data);
    // 클릭 시에는 휴지통을 반드시 숨김
    setShowTrashZone(false);
    setIsOverTrashZone(false);
    setSelectedNode(node.id);
    setSelectedEdge(null); // 엣지 상태 초기화
    setShowInspector(true);
    setFocusedElement('node', node.id); // 노드 클릭 시 노드만 포커스 (엣지 포커스 해제)
  }, [setFocusedElement, setSelectedNode]);

  const onEdgeClick = useCallback((_: unknown, edge: any) => {
    console.log(`[FlowBuilder] Edge clicked: ${edge.id}, source: ${edge.source}, target: ${edge.target}`);
    console.log(`[FlowBuilder] Edge data:`, edge.data);
    // 클릭 시에는 휴지통을 반드시 숨김
    setShowTrashZone(false);
    setIsOverTrashZone(false);
    setSelectedNode(edge.target); // 엣지의 타겟 노드를 선택된 노드로 설정
    setSelectedEdge(edge); // 선택된 엣지 정보 저장
    setShowInspector(true);
    setFocusedElement('edge', edge.id); // 엣지 포커스 설정
  }, [setFocusedElement, setSelectedNode]);

  // 전역 이벤트 리스너 - NodeInspector 활성화
  useEffect(() => {
    const handleShowInspector = (event: any) => {
      console.log(`[FlowBuilder] Show inspector event received:`, event.detail);
      const { nodeId, edge } = event.detail;
      
      console.log(`[FlowBuilder] Setting showInspector to: true`);
      console.log(`[FlowBuilder] NodeId: ${nodeId}, Edge:`, edge);
      
      // 인스펙터가 열릴 때도 휴지통을 숨김 (클릭 흐름 방어)
      setShowTrashZone(false);
      setIsOverTrashZone(false);

      setSelectedEdge(edge);
      setShowInspector(true);
      setFocusedElement('edge', edge.id);
      // 엣지를 클릭했을 때 해당 타겟 노드의 수동 선택 인풋으로 지정하여
      // NodeInspector가 새로 연결된 엣지의 인풋(없음)을 정확히 반영하도록 함
      if (edge?.target && edge?.id) {
        setManuallySelectedEdge(edge.target, edge.id);
      }
      
      console.log(`[FlowBuilder] Inspector state updated`);
    };

    window.addEventListener('show-node-inspector', handleShowInspector);
    console.log('[FlowBuilder] Global event listener added');

    return () => {
      window.removeEventListener('show-node-inspector', handleShowInspector);
      console.log('[FlowBuilder] Global event listener removed');
    };
  }, [setFocusedElement]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setShowInspector(false);
    setFocusedElement(null, null); // 패널 클릭 시 모든 포커스 해제
  }, [setFocusedElement, setSelectedNode]);

  // 노드 드래그 이벤트 핸들러
  const onNodeDragStart: NodeDragHandler = useCallback((_, node) => {
    setIsDragging(true);
    setShowTrashZone(false);
    setIsOverTrashZone(false);
    const pos = (node as any).positionAbsolute || node.position;
    setDragStartPos({ x: pos?.x ?? 0, y: pos?.y ?? 0 });
  }, []);

  const onNodeDrag: NodeDragHandler = useCallback((_, node) => {
    if (!dragStartPos) return;
    const pos = (node as any).positionAbsolute || node.position;
    const dx = (pos?.x ?? 0) - dragStartPos.x;
    const dy = (pos?.y ?? 0) - dragStartPos.y;
    const moved = Math.hypot(dx, dy);
    if (moved > 8) {
      if (node.type !== 'startNode' && node.type !== 'endNode') {
        setShowTrashZone(true);
      }
    }
  }, [dragStartPos]);

  const onNodeDragStop: NodeDragHandler = useCallback((_, node) => {
    // 휴지통 영역에 드롭되었는지 확인
    if (isOverTrashZone) {
      // Start와 End 노드는 삭제 불가
      if (node.type !== 'startNode' && node.type !== 'endNode') {
        if (window.confirm(`Are you sure you want to delete this node?`)) {
          removeNode(node.id);
        }
      } else {
        alert('Start와 End 노드는 삭제할 수 없습니다.');
      }
    }
    
    setIsDragging(false);
    setShowTrashZone(false);
    setIsOverTrashZone(false);
    setDragStartPos(null);
  }, [isOverTrashZone, removeNode]);

  // backspace 키로 노드 삭제 방지, delete 키로 선택된 노드 삭제
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'Delete') {
      // 엣지 포커스 상태에서 delete 키: 엣지 삭제
      if (focusedElement.type === 'edge' && focusedElement.id) {
        handleEdgeDelete(focusedElement.id, removeEdge);
        setFocusedElement(null, null);
        setSelectedEdge(null);
        setShowInspector(false);
        return;
      }
      // 노드 포커스 상태에서 delete 키: 노드 삭제
      if (selectedNode) {
        event.preventDefault();
        event.stopPropagation();
        // 선택된 노드가 Start나 End 노드가 아닌 경우에만 삭제
        const nodeToDelete = nodes.find(node => node.id === selectedNode);
        if (nodeToDelete && nodeToDelete.type !== 'startNode' && nodeToDelete.type !== 'endNode') {
          if (window.confirm('Are you sure you want to delete this node?')) {
            removeNode(selectedNode);
            setSelectedNode(null);
            setSelectedEdge(null);
            setShowInspector(false);
            setFocusedElement(null, null); // 노드 삭제 시 포커스 해제
          }
        }
      }
    }
  }, [selectedNode, nodes, removeNode, setSelectedNode, setFocusedElement, focusedElement, removeEdge]);

  // 드래그 앤 드롭으로 노드 추가
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const data = event.dataTransfer.getData('application/reactflow');
    if (!data || !reactFlowBounds) return;

    const { type, label } = JSON.parse(data);
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    // UserNode인 경우 특별한 처리
    if (type === 'userNode') {
      // UserNode 정보를 가져와서 노드 생성
      const userNodes = useFlowStore.getState().userNodes;
      const userNode = userNodes.find(node => node.name === label);
      
      console.log('FlowBuilder - UserNode drag:', { type, label });
      console.log('FlowBuilder - userNodes:', userNodes);
      console.log('FlowBuilder - found userNode:', userNode);
      
      if (userNode) {
        const nodeData = { 
          label: userNode.name, 
          code: userNode.code,
          config: {
            parameters: userNode.parameters,
            functionName: userNode.functionName,
            returnType: userNode.returnType,
            functionDescription: userNode.functionDescription
          }
        };
        
        console.log('FlowBuilder - creating UserNode with data:', nodeData);
        console.log('FlowBuilder - userNode.parameters:', userNode.parameters);
        console.log('FlowBuilder - nodeData.config.parameters:', nodeData.config.parameters);
        
        addNode({
          type: 'userNode',
          position,
          data: nodeData
        });
      } else {
        console.error('FlowBuilder - UserNode not found:', label);
        console.error('FlowBuilder - Available userNodes:', userNodes.map(n => n.name));
      }
    } else {
      // 기존 노드 타입들
      addNode({
        type,
        position,
        data: { label, code: '', config: {} }
      });
    }
  }, [addNode, reactFlowInstance]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <span>워크플로우 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {showNodeSidebar && (
        <NodeSidebar onClose={() => setShowNodeSidebar(false)} />
      )}
      <div className="flex-grow h-full" ref={reactFlowWrapper}>
        <ReactFlow
            onInit={inst => setRfInstance(inst)}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            onDrop={onDrop}
            onDragOver={onDragOver}
            onKeyDown={onKeyDown}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            // 드래그 성능 최적화
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={false}
        >
          <Background 
            color={isDarkMode ? '#374151' : '#e5e7eb'} 
            gap={15} 
            variant={BackgroundVariant.Lines} 
          />
          
          {/* 휴지통 영역 */}
          {showTrashZone && (
            <div
              id="trash-zone"
              className={`fixed bottom-16 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-full shadow-lg transition-all duration-300 border-4 ${
                isOverTrashZone 
                  ? 'bg-red-500/40 text-red-600 scale-125 border-red-600 shadow-2xl' 
                  : 'bg-gray-500/40 text-gray-700 dark:text-gray-200 border-gray-400/40 dark:border-gray-500/40 hover:scale-110 hover:bg-gray-500/50 hover:text-gray-800 dark:hover:text-gray-100'
              }`}
              style={{
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)'
              }}
              onMouseEnter={() => setIsOverTrashZone(true)}
              onMouseLeave={() => setIsOverTrashZone(false)}
            >
              <Trash2 
                size={32} 
                className={`transition-all duration-200 ${
                  isOverTrashZone ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'
                }`}
              />
              {isOverTrashZone && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-3 py-1 rounded text-sm whitespace-nowrap border border-gray-600 shadow-lg backdrop-blur-sm">
                  Drop to delete
                </div>
              )}
            </div>
          )}
          
          <Controls showInteractive={false} />
          <MiniMap 
            nodeStrokeWidth={2} 
            zoomable 
            pannable 
            position="bottom-left"
            className="ml-20"
          />
          <Panel position="top-left" className="ml-4 mt-4">
            {!showNodeSidebar && (
              <button
                onClick={() => setShowNodeSidebar(true)}
                className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md mb-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Show Node Sidebar"
              >
                <PlusCircle size={20} />
              </button>
            )}
          </Panel>

        </ReactFlow>
      </div>
      {showInspector && (selectedNode || selectedEdge) && (
        <NodeInspector
          nodeId={selectedNode || ''}
          selectedEdge={selectedEdge}
          onClose={() => {
            setShowInspector(false);
            setFocusedElement(null, null); // NodeInspector 닫힐 때 포커스 해제
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
        />
      )}
      
      {/* 실행 상태 표시 컴포넌트들 */}
      <ExecutionStatusIndicator />
      <ExecutionToast />
    </div>
  );
};

export default FlowBuilder;