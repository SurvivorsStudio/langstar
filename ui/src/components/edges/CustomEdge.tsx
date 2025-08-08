import React, { memo, useState, useCallback } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { X, Trash2 } from 'lucide-react';
import OutputInspector from '../OutputInspector';
import { useFlowStore } from '../../store/flowStore';

export function handleEdgeDelete(edgeId: string, removeEdge: (id: string) => void): void {
  if (window.confirm('Are you sure you want to remove this connection?')) {
    removeEdge(edgeId);
  }
}

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
}: EdgeProps) => {
  const [showInspector, setShowInspector] = useState(false);
  const { nodes, removeEdge, setEdgeOutput, focusedElement, setFocusedElement, setSelectedNode, updateEdgeData } = useFlowStore();
  const sourceNode = nodes.find(n => n.id === source);
  const isEdgeTextFocused = focusedElement.type === 'edge' && focusedElement.id === id;

  // 드래그 가능한 중간점 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    data?.dragPoint || null
  );

  // Calculate the center point between source and target
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  // 드래그 포인트가 있으면 그것을 사용하고, 없으면 기본 중간점 사용
  const controlPointX: number = dragPoint ? dragPoint.x : centerX;
  const controlPointY: number = dragPoint ? dragPoint.y : centerY;

  // 커스텀 베지어 경로 생성
  const createCustomPath = useCallback(() => {
    if (!dragPoint) {
      // 드래그 포인트가 없으면 기본 베지어 경로 사용
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
    }

    // 드래그 포인트를 사용한 커스텀 경로 생성
    const path = `M ${sourceX} ${sourceY} Q ${controlPointX} ${controlPointY} ${targetX} ${targetY}`;
    return [path, String(controlPointX), String(controlPointY)];
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, controlPointX, controlPointY, dragPoint]);

  const [edgePath, labelX, labelY] = createCustomPath();

  const conditionDescription = data?.conditionDescription;
  const isConditionEdge = sourceNode?.type === 'conditionNode';

  const output = data?.output || 'No output yet';
  const outputPreview = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleEdgeDelete(id, removeEdge);
  };

  const handleClearOutput = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdgeOutput(id, null);
  };

  // 드래그 핸들러
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setFocusedElement('edge', id);
  }, [id, setFocusedElement]);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    // 마우스 위치를 SVG 좌표로 변환
    const svgElement = e.currentTarget.closest('svg');
    if (!svgElement) return;
    
    const rect = svgElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDragPoint({ x, y });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // 드래그 포인트를 edge 데이터에 저장
      if (dragPoint) {
        updateEdgeData(id, { dragPoint });
      }
    }
  }, [isDragging, dragPoint, id, updateEdgeData]);

  // 마우스 이벤트 리스너 추가
  React.useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const svgElement = document.querySelector('svg');
        if (!svgElement) return;
        
        const rect = svgElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setDragPoint({ x, y });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        if (dragPoint) {
          updateEdgeData(id, { dragPoint });
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragPoint, id, updateEdgeData]);

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
      
      {/* 메인 edge 경로 */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-slate-400 stroke-[2px]"
        d={edgePath}
        markerEnd="url(#arrow)"
      />

      {/* 드래그 가능한 중간점 */}
      <circle
        cx={controlPointX}
        cy={controlPointY}
        r={6}
        fill="#94a3b8"
        stroke="#64748b"
        strokeWidth={2}
        className="cursor-move hover:fill-slate-500 transition-colors"
        onMouseDown={handleDragStart}
        style={{ pointerEvents: 'all' }}
      />

      {/* 드래그 중일 때 시각적 피드백 */}
      {isDragging && (
        <circle
          cx={controlPointX}
          cy={controlPointY}
          r={12}
          fill="rgba(148, 163, 184, 0.2)"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {isConditionEdge && conditionDescription && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${Number(labelY) - 35}px)`, // Y 위치 조정
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
        x={controlPointX - 100}
        y={controlPointY - 20}
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
              className="p-1 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-full shadow-sm transition-colors z-10"
              title="Remove Connection"
            >
              <X size={12} />
            </button>
          </div>
          <div 
            className={`bg-white dark:bg-gray-800 shadow-md rounded-md p-2 text-xs border max-h-32 overflow-y-auto cursor-pointer hover:shadow-lg transition-all duration-200 ${
              isEdgeTextFocused 
                ? 'border-white dark:border-white shadow-lg ring-2 ring-white dark:ring-white ring-opacity-50' 
                : 'border-gray-200 dark:border-gray-600'
            }`}
            onClick={e => { 
              e.stopPropagation(); 
              setFocusedElement('edge', id);
              setSelectedNode(null);
              setShowInspector(true); 
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
              {outputPreview.length > 200 ? outputPreview.slice(0, 200) + '...' : outputPreview}
            </pre>
          </div>
        </div>
      </foreignObject>
      
      {showInspector && (
        <div className="fixed top-0 right-0 h-full z-50">
          <OutputInspector
            output={output}
            onClose={() => {
              setShowInspector(false);
              setFocusedElement(null, null);
            }}
          />
        </div>
      )}
    </>
  );
};

export default memo(CustomEdge);