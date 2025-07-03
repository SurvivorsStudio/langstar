import React, { memo, useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { X, Trash2 } from 'lucide-react';
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
  style = {},
  selected,
}: EdgeProps) => {
  const [showInspector, setShowInspector] = useState(false);
  const { nodes, removeEdge, setEdgeOutput } = useFlowStore();
  const sourceNode = nodes.find(n => n.id === source);

  // Calculate the center point between source and target
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const conditionDescription = data?.conditionDescription;
  const isConditionEdge = sourceNode?.type === 'conditionNode';

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
        className={`react-flow__edge-path stroke-[2px] ${
          selected 
            ? 'stroke-blue-500 dark:stroke-blue-400 drop-shadow-md' 
            : 'stroke-slate-400'
        }`}
        d={edgePath}
        markerEnd="url(#arrow)"
      />

      {isConditionEdge && conditionDescription && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 35}px)`, // Y 위치 조정
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 600, // semibold
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
            }}
            className="nodrag nopan bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50"
          >
            {conditionDescription}
          </div>
        </EdgeLabelRenderer>
      )}

      <foreignObject
        width={200}
        height={100}
        x={centerX - 100}
        y={centerY - 20}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="relative" onMouseDown={e => e.stopPropagation()}>
          <div className="absolute -top-2 -right-2 flex gap-1">
            <button
              onClick={handleClearOutput}
              className="p-1 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-full shadow-sm transition-colors z-10"
              title="Clear Output"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={handleDelete}
              className={`p-1 rounded-full shadow-sm transition-colors z-10 ${
                selected
                  ? 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white'
                  : 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white'
              }`}
              title="Remove Connection"
            >
              <X size={12} />
            </button>
          </div>
          <div 
            className={`rounded-md p-2 text-xs max-h-32 overflow-y-auto cursor-pointer transition-all ${
              selected
                ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 shadow-lg'
                : 'bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-600 hover:shadow-lg'
            }`}
            onClick={() => setShowInspector(true)}

          >
            <pre className={`whitespace-pre-wrap break-words ${
              selected
                ? 'text-blue-800 dark:text-blue-200'
                : 'text-gray-600 dark:text-gray-300'
            }`}>
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