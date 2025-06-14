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
import { PlusCircle, Minus, LayoutGrid, Maximize, Minimize } from 'lucide-react';

const edgeTypes = {
  default: CustomEdge,
};

const FlowBuilder: React.FC = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useFlowStore();
  const [showNodeSidebar, setShowNodeSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNode(node.id);
    setShowInspector(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowInspector(false);
  }, []);

  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };

  const handleFitView = () => {
    reactFlowInstance.fitView();
  };

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

  return (
    <div className="flex h-full w-full">
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
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <Background color="#aaa" gap={15} variant={BackgroundVariant.Lines} />
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Panel position="top-left" className="ml-4 mt-4">
            {!showNodeSidebar && (
              <button
                onClick={() => setShowNodeSidebar(true)}
                className="p-2 bg-white rounded-md shadow-md mb-2 text-gray-700 hover:bg-gray-100"
                title="Show Node Sidebar"
              >
                <PlusCircle size={20} />
              </button>
            )}
          </Panel>
          <Panel position="bottom-right" className="mr-16 mb-16">
            <div className="flex flex-col bg-white rounded-md shadow-md">
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-t-md"
                title="Zoom In"
              >
                <Maximize size={20} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-700 hover:bg-gray-100"
                title="Zoom Out"
              >
                <Minimize size={20} />
              </button>
              <button
                onClick={handleFitView}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-b-md"
                title="Fit View"
              >
                <LayoutGrid size={20} />
              </button>
            </div>
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