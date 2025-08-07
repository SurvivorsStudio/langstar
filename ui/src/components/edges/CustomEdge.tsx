import React, { memo, useState, useCallback } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from 'reactflow';
import { X, Trash2, Move } from 'lucide-react';
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
  const { screenToFlowPosition } = useReactFlow();
  const sourceNode = nodes.find(n => n.id === source);
  const isEdgeTextFocused = focusedElement.type === 'edge' && focusedElement.id === id;

  // 드래그 가능한 중간점 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    data?.dragPoint || null
  );
  const [clickPoint, setClickPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastMousePosition, setLastMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Calculate the center point between source and target
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  // Edge Data 박스 위치 계산 (박스의 왼쪽 상단 모서리)
  // 드래그 중일 때는 클릭 포인트를 사용, 아니면 저장된 드래그 포인트 또는 기본 중간점 사용
  const dataBoxX: number = isDragging && clickPoint ? clickPoint.x : (dragPoint ? dragPoint.x : centerX);
  const dataBoxY: number = isDragging && clickPoint ? clickPoint.y : (dragPoint ? dragPoint.y : centerY);

  // Edge Data 박스의 중심점 계산 (박스 크기: 220x120)
  const dataBoxCenterX: number = dataBoxX;
  const dataBoxCenterY: number = dataBoxY;

  // 드래그 중일 때는 클릭 포인트를 사용, 아니면 Edge Data 박스 중심 사용
  const controlPointX: number = isDragging && clickPoint ? clickPoint.x : dataBoxCenterX;
  const controlPointY: number = isDragging && clickPoint ? clickPoint.y : dataBoxCenterY;

  // 커스텀 베지어 경로 생성
  const createCustomPath = useCallback(() => {
    // 드래그 중이거나 저장된 드래그 포인트가 있으면 커스텀 경로 사용
    if (isDragging && clickPoint || dragPoint) {
      // 드래그 중일 때는 클릭 포인트를 사용, 아니면 저장된 드래그 포인트 사용
      const currentControlPointX = isDragging && clickPoint ? clickPoint.x : (dragPoint ? dragPoint.x : centerX);
      const currentControlPointY = isDragging && clickPoint ? clickPoint.y : (dragPoint ? dragPoint.y : centerY);
      
      // 드래그 중이거나 저장된 드래그 포인트가 있으면 step 스타일 사용
      if (isDragging && clickPoint || dragPoint) {
        // Step 스타일 경로 생성 (직선과 수직선 조합)
        // source -> controlPoint -> target 경로를 step 형태로
        const path = `M ${sourceX} ${sourceY} L ${currentControlPointX} ${sourceY} L ${currentControlPointX} ${currentControlPointY} L ${targetX} ${currentControlPointY} L ${targetX} ${targetY}`;
        return [path, String(currentControlPointX), String(currentControlPointY)];
      }
    }

    // 기본 베지어 경로 사용
    return getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, centerX, centerY, isDragging, clickPoint, dragPoint]);

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

  // 마우스 위치를 React Flow 좌표로 변환하는 함수
  const getReactFlowCoordinates = useCallback((clientX: number, clientY: number) => {
    // React Flow의 screenToFlowPosition을 사용하여 정확한 좌표 계산
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
    return { x: flowPosition.x, y: flowPosition.y };
  }, [screenToFlowPosition]);

  // 드래그 핸들러
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setFocusedElement('edge', id);
    
    // 클릭한 시점의 위치를 클릭 포인트로 설정
    const coordinates = getReactFlowCoordinates(e.clientX, e.clientY);
    if (coordinates) {
      setClickPoint(coordinates);
    }
  }, [id, setFocusedElement, getReactFlowCoordinates]);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.preventDefault();
    
    // 마우스 위치를 React Flow 좌표로 변환
    const coordinates = getReactFlowCoordinates(e.clientX, e.clientY);
    if (coordinates) {
      setClickPoint(coordinates);
    }
  }, [isDragging, getReactFlowCoordinates]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // 클릭 포인트를 드래그 포인트로 저장
      if (clickPoint) {
        setDragPoint(clickPoint);
        updateEdgeData(id, { dragPoint: clickPoint });
      }
      setClickPoint(null);
    }
  }, [isDragging, clickPoint, id, updateEdgeData]);

  // 마우스 이벤트 리스너 추가
  React.useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const coordinates = getReactFlowCoordinates(e.clientX, e.clientY);
        if (coordinates) {
          setClickPoint(coordinates);
          setLastMousePosition(coordinates);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        // 마지막 마우스 위치를 드래그 포인트로 저장
        if (lastMousePosition) {
          setDragPoint(lastMousePosition);
          updateEdgeData(id, { dragPoint: lastMousePosition });
        }
        setClickPoint(null);
        setLastMousePosition(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, lastMousePosition, id, updateEdgeData, getReactFlowCoordinates]);

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
        className={`react-flow__edge-path stroke-slate-400 stroke-[2px] transition-all duration-200 ${
          isDragging ? 'stroke-slate-500 stroke-[3px]' : ''
        }`}
        d={edgePath}
        markerEnd="url(#arrow)"
      />

      {/* 통합된 데이터 표시 및 드래그 영역 */}
      <foreignObject
        width={220}
        height={120}
        x={dataBoxCenterX - 110}
        y={dataBoxCenterY - 60}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div 
          className={`relative bg-white dark:bg-gray-800 shadow-md rounded-lg border max-h-32 overflow-y-auto transition-all duration-200 ${
            isDragging 
              ? 'border-blue-500 shadow-lg scale-105' 
              : isEdgeTextFocused 
                ? 'border-blue-300 dark:border-blue-700 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800 ring-opacity-50' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
          onMouseDown={handleDragStart}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'all',
            userSelect: 'none',
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.2s ease'
          }}
        >
          {/* 드래그 중일 때 시각적 피드백 */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <div className="flex items-center justify-center w-6 h-6">
                <div className="w-4 h-4 border-2 border-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          {/* 중심점 표시 (+ 모양) */}
          {!isDragging && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 opacity-30">
              <div className="w-full h-0.5 bg-gray-400 absolute top-1/2 transform -translate-y-1/2"></div>
              <div className="w-0.5 h-full bg-gray-400 absolute left-1/2 transform -translate-x-1/2"></div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="absolute -top-2 -right-2 flex gap-1 z-10">
            <button
              onClick={handleClearOutput}
              className="p-1 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-full shadow-sm transition-colors"
              title="Clear Output"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-full shadow-sm transition-colors"
              title="Remove Connection"
            >
              <X size={12} />
            </button>
          </div>

          {/* 데이터 내용 */}
          <div 
            className="p-3 text-xs"
            onClick={e => { 
              e.stopPropagation(); 
              setFocusedElement('edge', id);
              setSelectedNode(null);
              setShowInspector(true); 
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Edge Data
              </span>
              {isDragging && (
                <span className="text-xs text-blue-600 font-medium">
                  Dragging...
                </span>
              )}
            </div>
            <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words text-xs leading-relaxed">
              {outputPreview.length > 150 ? outputPreview.slice(0, 150) + '...' : outputPreview}
            </pre>
          </div>

          {/* 드래그 안내 텍스트 */}
          {!isDragging && (
            <div className="absolute bottom-1 right-2 text-xs text-gray-400 dark:text-gray-500 opacity-60">
              Drag to bend
            </div>
          )}
        </div>
      </foreignObject>

      {/* 드래그 중일 때 추가 시각적 피드백 */}
      {isDragging && (
        <circle
          cx={dataBoxCenterX}
          cy={dataBoxCenterY}
          r={20}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgba(59, 130, 246, 0.3)"
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 드래그 포인트가 있을 때만 중간점 표시 (Edge Data 박스 중심에) */}
      {dragPoint && !isDragging && (
        <circle
          cx={dataBoxCenterX}
          cy={dataBoxCenterY}
          r={4}
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth={1}
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