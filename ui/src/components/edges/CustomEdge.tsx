import React, { memo, useState } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { ChevronRight, X, Trash2 } from 'lucide-react';
import OutputInspector from '../OutputInspector';
import { useFlowStore } from '../../store/flowStore';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  source,
  target,
  style = {},
}: EdgeProps) => {
  const [showInspector, setShowInspector] = useState(false);
  const { nodes, removeEdge, setEdgeOutput } = useFlowStore();
  const sourceNode = nodes.find(n => n.id === source);

  // Calculate the center point between source and target
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const output = data?.output || 'No output yet';
  const outputPreview = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this connection?')) {
      removeEdge(id);
    }
  };

  const handleClearOutput = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdgeOutput(id, null);
  };

  return (
    <>
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-slate-400 stroke-[2px]"
        d={edgePath}
        markerEnd="url(#arrow)"
      />

      <foreignObject
        width={200}
        height={100}
        x={centerX - 100}
        y={centerY - 20}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="relative">
          <div className="absolute -top-2 -right-2 flex gap-1">
            <button
              onClick={handleClearOutput}
              className="p-1 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-sm transition-colors z-10"
              title="Clear Output"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm transition-colors z-10"
              title="Remove Connection"
            >
              <X size={12} />
            </button>
          </div>
          <div 
            className="bg-white shadow-md rounded-md p-2 text-xs border border-gray-200 max-h-32 overflow-y-auto cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setShowInspector(true)}
          >
            <div className="font-medium text-gray-700 mb-1 flex items-center justify-between">
              <span>Output</span>
              <ChevronRight size={14} className="text-gray-400" />
            </div>
            <pre className="text-gray-600 whitespace-pre-wrap break-words">
              {outputPreview.length > 200 ? outputPreview.slice(0, 200) + '...' : outputPreview}
            </pre>
          </div>
        </div>
      </foreignObject>
      
      {showInspector && (
        <div className="fixed top-0 right-0 h-full z-50">
          <OutputInspector
            output={output}
            onClose={() => setShowInspector(false)}
          />
        </div>
      )}
    </>
  );
};

export default memo(CustomEdge);