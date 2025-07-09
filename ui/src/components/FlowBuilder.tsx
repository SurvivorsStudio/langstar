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
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore } from '../store/flowStore';
import NodeSidebar from './NodeSidebar';
import NodeInspector from './NodeInspector';
import { nodeTypes } from './nodes/nodeTypes';
import CustomEdge from './edges/CustomEdge';
import { PlusCircle } from 'lucide-react';

const edgeTypes = {
  default: CustomEdge,
};

const FlowBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, loadWorkflow, projectName, viewport, setProjectName, isLoading, copyNodes, pasteNodes, } = useFlowStore();
  const [showNodeSidebar, setShowNodeSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [synced, setSynced] = useState(false);

  // ReactFlow 인스턴스를 보관할 state
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedIds = rfInstance
            ?.getNodes()
            .filter(n => n.selected)
            .map(n => n.id) || [];
        copyNodes(selectedIds);
      }
      // Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteNodes();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rfInstance, copyNodes, pasteNodes]);

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

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNode(node.id);
    setShowInspector(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowInspector(false);
  }, []);



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
    addNode({
      type,
      position,
      data: { label, code: '', config: {} }
    });
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
          onInit={(instance: ReactFlowInstance) => setRfInstance(instance)}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <Background 
            color={document.documentElement.classList.contains('dark') ? '#374151' : '#888'} 
            gap={15} 
            variant={BackgroundVariant.Lines} 
          />
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
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
      {showInspector && selectedNode && (
        <NodeInspector
          nodeId={selectedNode}
          onClose={() => setShowInspector(false)}
        />
      )}
    </div>
  );
};

export default FlowBuilder;