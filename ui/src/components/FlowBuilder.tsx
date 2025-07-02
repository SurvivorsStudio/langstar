import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
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
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, removeNode, removeEdge } = useFlowStore();
  const [showNodeSidebar, setShowNodeSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNode(node.id);
    setSelectedEdge(null);
    setShowInspector(true);
  }, []);

  const onEdgeClick = useCallback((_: unknown, edge: any) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null);
    setShowInspector(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
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
    setTimeout(() => {
      const newNode = useFlowStore.getState().nodes.find(
        n => n.position.x === position.x && n.position.y === position.y && n.type === type && n.data.label === label
      );
      if (newNode) setSelectedNode(newNode.id);
    }, 0);
  }, [addNode, reactFlowInstance]);

  // 키보드 단축키로 노드/엣지 삭제
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Delete') {
      if (selectedNode) {
        const node = nodes.find(n => n.id === selectedNode);
        if (node && node.type !== 'startNode' && node.type !== 'endNode') {
          removeNode(selectedNode);
          setSelectedNode(null);
          setShowInspector(false);
        }
      } else if (selectedEdge) {
        removeEdge(selectedEdge);
        setSelectedEdge(null);
      }
    }
  }, [selectedNode, selectedEdge, nodes, removeNode, removeEdge]);

  return (
    <div className="flex h-full w-full" tabIndex={0} onKeyDown={handleKeyDown}>
      {showNodeSidebar && (
        <NodeSidebar onClose={() => setShowNodeSidebar(false)} />
      )}
      <div className="flex-grow h-full" ref={reactFlowWrapper}>
        <ReactFlow
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
          snapToGrid
          snapGrid={[15, 15]}
          onDrop={onDrop}
          onDragOver={onDragOver}
          deleteKeyCode={null}
          multiSelectionKeyCode={null}
          selectionKeyCode={null}
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