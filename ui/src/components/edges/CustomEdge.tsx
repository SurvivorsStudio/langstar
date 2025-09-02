import React, { memo, useState, useCallback } from 'react';

import { EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow, Position } from 'reactflow';
import { Database } from 'lucide-react';

import OutputInspector from '../OutputInspector';
import { useFlowStore } from '../../store/flowStore';
import { useThemeStore } from '../../store/themeStore';

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
  target,
}: EdgeProps) => {
  const [showInspector, setShowInspector] = useState(false);
  const { nodes, removeEdge, focusedElement, setFocusedElement, updateEdgeData, setSelectedNode } = useFlowStore();
  const { isDarkMode } = useThemeStore();

  const { screenToFlowPosition } = useReactFlow();

  const sourceNode = nodes.find(n => n.id === source);
  const isEdgeTextFocused = focusedElement.type === 'edge' && focusedElement.id === id;

  // 드래그 가능한 중간점 상태
  const [isDragging, setIsDragging] = useState(false);
  const [edgeNodePosition, setEdgeNodePosition] = useState<{ x: number; y: number } | null>(
    data?.edgeNodePosition || null
  );

  const [lastMousePosition, setLastMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [dragStartTimeout, setDragStartTimeout] = useState<NodeJS.Timeout | null>(null);

  // Calculate the center point between source and target
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;
  
  // Edge Data 박스 위치 계산 - 드래그 포인트가 아닌 고정된 연결점 기준
  const dataBoxX: number = edgeNodePosition ? edgeNodePosition.x : centerX;
  const dataBoxY: number = edgeNodePosition ? edgeNodePosition.y : centerY;

  // Edge Data 박스의 중심점 계산 (박스 크기: 80x80)
  const dataBoxCenterX: number = dataBoxX;
  const dataBoxCenterY: number = dataBoxY;

  // 워크플로우 방향성 분석 및 연결 방향 결정
  const determineConnectionDirection = useCallback(() => {
    // source와 target의 상대적 위치 분석
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 워크플로우 방향성 판단
    // dx > 0: 오른쪽으로 연결 (정방향)
    // dx < 0: 왼쪽으로 연결 (역방향)
    // dy: 수직 거리
    
    // 역방향 연결 감지 (뒤쪽 노드에서 앞쪽 노드로)
    const isReverseConnection = dx < 0;
    
    // 수직 거리가 가까우면 교차 가능성 높음 (거리에 따른 동적 기준)
    const verticalThreshold = Math.max(60, distance * 0.15); // 거리에 비례한 임계값
    const isCloseVertically = Math.abs(dy) < verticalThreshold;
    
    // 수평 거리가 충분히 클 때만 교차 방지 적용 (너무 가까운 노드는 제외)
    const horizontalThreshold = Math.max(40, distance * 0.1);
    const isFarHorizontally = Math.abs(dx) > horizontalThreshold;
    
    // 교차 방지가 필요한 경우 (더 정확한 판단)
    const needsCrossingPrevention = isReverseConnection && isCloseVertically && isFarHorizontally;
    
    return {
      isReverseConnection,
      needsCrossingPrevention,
      direction: needsCrossingPrevention ? 'reverse' : 'normal',
      distance,
      verticalThreshold,
      horizontalThreshold
    };
  }, [sourceX, sourceY, targetX, targetY]);

  // Handle 위치 계산 - 워크플로우 방향성에 따라 동적 조정
  const handleOffset = 0; // Handle의 offset 값 (간격 최소화)
  
  // 워크플로우 방향성에 따른 Handle 설정
  const getHandleConfiguration = useCallback(() => {
    const connectionInfo = determineConnectionDirection();
    
    if (connectionInfo.needsCrossingPrevention) {
      // 역방향 연결: Handle 방향 전환
      return {
        inputHandle: {
          x: dataBoxCenterX + 30 + handleOffset, // 우측에 위치
          y: dataBoxCenterY,
          type: 'target',
          position: Position.Right
        },
        outputHandle: {
          x: dataBoxCenterX - 30 - handleOffset, // 좌측에 위치
          y: dataBoxCenterY,
          type: 'source',
          position: Position.Left
        }
      };
    } else {
      // 정방향 연결: 기본 Handle 설정
      return {
        inputHandle: {
          x: dataBoxCenterX - 30 - handleOffset, // 좌측에 위치
          y: dataBoxCenterY,
          type: 'target',
          position: Position.Left
        },
        outputHandle: {
          x: dataBoxCenterX + 30 + handleOffset, // 우측에 위치
          y: dataBoxCenterY,
          type: 'source',
          position: Position.Right
        }
      };
    }
  }, [dataBoxCenterX, dataBoxCenterY, handleOffset, determineConnectionDirection]);

  const { inputHandle, outputHandle } = getHandleConfiguration();
  const inputHandleX = inputHandle.x;
  const inputHandleY = inputHandle.y;
  const outputHandleX = outputHandle.x;
  const outputHandleY = outputHandle.y;



  // 스마트 경로 생성 - 워크플로우 방향성 기반 교차 방지 + 간격 최소화
  const createSmartPaths = useCallback(() => {
    const connectionInfo = determineConnectionDirection();
    
    // 기본 베지어 경로 생성 - 좌우 모두 동일한 품질
    const inputPath = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX: inputHandleX,
      targetY: inputHandleY,
      targetPosition: inputHandle.position,
    })[0];

    const outputPath = getBezierPath({
      sourceX: outputHandleX,
      sourceY: outputHandleY,
      sourcePosition: outputHandle.position,
      targetX,
      targetY,
      targetPosition,
    })[0];

    // 워크플로우 방향성에 따른 스마트 경로 생성 + 간격 최소화
    const createDirectionalPath = () => {
      if (connectionInfo.needsCrossingPrevention) {
        // 역방향 연결 + 교차 방지 필요: 제어점 조정으로 자연스러운 곡선
        if (connectionInfo.isReverseConnection) {
          // 역방향: 베지어 곡선의 제어점을 조정하여 교차 방지 + 간격 최소화
          const dx = targetX - outputHandleX;
          const dy = targetY - outputHandleY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 더 자연스러운 제어점 계산 - 거리에 비례하여 조정 + 곡선형 강화
          const controlRatio = Math.min(0.4, Math.max(0.2, distance / 300)); // 20%~40% 범위로 조정하여 더 곡선형으로
          const controlOffsetX = dx * controlRatio;
          
          // 첫 번째 제어점: 엣지 노드에서 자연스럽게 우측으로 (곡선형 강화)
          const cp1x = outputHandleX + Math.max(controlOffsetX, 25); // 3 → 25로 조정하여 더 곡선형으로
          const cp1y = outputHandleY + (dy * 0.15); // 0.005 → 0.15로 수직 변화 증가하여 곡선형 강화
          
          // 두 번째 제어점: 목표점 근처에서 자연스럽게 (곡선형 강화)
          const cp2x = targetX - Math.max(controlOffsetX, 25); // 3 → 25로 조정하여 더 곡선형으로
          const cp2y = targetY - (dy * 0.15); // 0.005 → 0.15로 수직 변화 증가하여 곡선형 강화
          
          // 부드러운 베지어 곡선 경로 (간격 최소화)
          return `M ${outputHandleX} ${outputHandleY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;
        }
      }
      
      // 정방향 연결이거나 교차 방지가 불필요한 경우: 기본 경로 + 간격 최소화
      return outputPath;
    };

    // 좌측 연결선도 우측과 동일한 교차 방지 로직 적용 + 간격 최소화
    const createUnifiedInputPath = () => {
      if (connectionInfo.needsCrossingPrevention && connectionInfo.isReverseConnection) {
        // 좌측 연결선도 우측과 동일한 방식으로 교차 방지 + 간격 최소화
        const dx = inputHandleX - sourceX;
        const dy = inputHandleY - sourceY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 우측 연결선과 동일한 제어점 계산 방식으로 완벽한 대칭 + 곡선형 강화
        const controlRatio = Math.min(0.4, Math.max(0.2, distance / 300)); // 20%~40% 범위로 조정하여 더 곡선형으로
        const controlOffsetX = dx * controlRatio;
        
        // 첫 번째 제어점: source에서 자연스럽게 (우측 연결선과 대칭 + 곡선형 강화)
        const cp1x = sourceX + Math.max(controlOffsetX, 25); // 3 → 25로 조정하여 더 곡선형으로
        const cp1y = sourceY + (dy * 0.15); // 0.005 → 0.15로 수직 변화 증가하여 곡선형 강화
        
        // 두 번째 제어점: 엣지 노드 근처에서 자연스럽게 (우측 연결선과 대칭 + 곡선형 강화)
        const cp2x = inputHandleX - Math.max(controlOffsetX, 25); // 3 → 25로 조정하여 더 곡선형으로
        const cp2y = inputHandleY - (dy * 0.15); // 0.005 → 0.15로 수직 변화 증가하여 곡선형 강화
        
        // 부드러운 베지어 곡선 경로 (우측과 동일한 품질 + 간격 최소화)
        return `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${inputHandleX} ${inputHandleY}`;
      }
      
      // 교차 방지가 불필요한 경우: 기본 베지어 곡선 사용
      return inputPath;
    };

    return {
      inputPath: createUnifiedInputPath(),
      outputPath: createDirectionalPath()
    };
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, inputHandleX, inputHandleY, outputHandleX, outputHandleY, inputHandle, outputHandle, determineConnectionDirection]);

  // 커스텀 베지어 경로 생성 - 고정된 연결점 기준으로 두 개의 연결선 생성
  const createCustomPaths = useCallback(() => {
    // 스마트 경로 생성 (교차 방지)
    const { inputPath, outputPath } = createSmartPaths();

    return {
      inputPath,
      outputPath,
      controlPoint: { x: centerX, y: centerY }
    };
  }, [createSmartPaths, centerX, centerY]);

  const { inputPath, outputPath } = createCustomPaths();

  const conditionDescription = data?.conditionDescription;
  const isConditionEdge = sourceNode?.type === 'conditionNode';

  const output = data?.output || 'No output yet';


  // 엣지 노드 삭제 함수
  const handleDelete = useCallback(() => {
    handleEdgeDelete(id, removeEdge);
  }, [id, removeEdge]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      handleDelete();
    }
  }, [handleDelete]);

  // 전역 키보드 이벤트 리스너 추가
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 엣지 노드가 포커스된 상태에서만 삭제 키 처리
      if (isEdgeTextFocused && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        e.stopPropagation();
        handleDelete();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isEdgeTextFocused, handleDelete]);

  // 마우스 위치를 React Flow 좌표로 변환하는 함수 - 최적화
  const getReactFlowCoordinates = useCallback((clientX: number, clientY: number) => {
    // React Flow의 screenToFlowPosition을 사용하여 정확한 좌표 계산
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
    return { x: flowPosition.x, y: flowPosition.y };
  }, [screenToFlowPosition]);

  // 클릭 핸들러 - 엣지 노드 포커스 및 NodeInspector 활성화
  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('handleClickhandleClickhandleClickhandleClickhandleClickhandleClickhandleClick');
    e.stopPropagation();
    
    // 드래그 시작 타이머가 있다면 취소 (클릭으로 인식)
    if (dragStartTimeout) {
      clearTimeout(dragStartTimeout);
      setDragStartTimeout(null);
    }
    
    setFocusedElement('edge', id);
    
    // 직접 FlowBuilder의 상태 업데이트
    const edgeElement = {
      id,
      source,
      target,
      data
    };
    
    console.log('[CustomEdge] Direct state update - setting selectedNode to:', target);
    console.log('[CustomEdge] Direct state update - edge element:', edgeElement);
    
    setSelectedNode(target);
    
    // NodeInspector 활성화를 위한 전역 이벤트 발생
    const showInspectorEvent = new CustomEvent('show-node-inspector', {
      detail: { nodeId: target, edge: edgeElement }
    });
    window.dispatchEvent(showInspectorEvent);
    
    // 클릭 후 즉시 포커스 설정
    const targetElement = e.currentTarget as HTMLElement;
    if (targetElement) {
      targetElement.focus();
    }
  }, [id, source, target, data, setFocusedElement, dragStartTimeout, setSelectedNode]);

  // 드래그 핸들러 - 엣지 노드만 드래그 (지연된 드래그 시작)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFocusedElement('edge', id);
    
    // 클릭한 시점의 위치를 엣지 노드 위치로 설정
    const coordinates = getReactFlowCoordinates(e.clientX, e.clientY);
    if (coordinates) {
      setEdgeNodePosition(coordinates); // 초기 위치 설정
    }
    
    // 150ms 후에 드래그 시작 (클릭과 구분)
    const timeout = setTimeout(() => {
      setIsDragging(true);
    }, 150);
    
    setDragStartTimeout(timeout);
  }, [id, setFocusedElement, getReactFlowCoordinates]);

  // 마우스 이벤트 리스너 추가 - 실시간 드래그 업데이트
  React.useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const coordinates = getReactFlowCoordinates(e.clientX, e.clientY);
        if (coordinates) {
          // 실시간으로 엣지 노드 위치 업데이트 (드래그 중에도 즉시 반영)
          setEdgeNodePosition(coordinates);
          setLastMousePosition(coordinates);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);

        // 마지막 마우스 위치를 엣지 노드 위치로 저장 (이미 실시간으로 업데이트됨)
        if (lastMousePosition) {
          updateEdgeData(id, { edgeNodePosition: lastMousePosition });
        }
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
        {/* 이미지와 같은 파란색 화살표 마커 */}
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={isDarkMode ? "#60a5fa" : "#3b82f6"} />
        </marker>
      </defs>
      
      {/* 메인 edge 경로 - 두 개의 연결선으로 분리 */}
      {/* 첫 번째 연결선: source -> inputHandle (우측과 완벽하게 대칭) */}
      <path
        id={`${id}-input`}
        className={`react-flow__edge-path transition-all duration-150 ${
          isDragging ? 'stroke-[3px]' : 'stroke-[2px]'
        }`}
        d={inputPath}
        stroke={isDarkMode ? "#60a5fa" : "#3b82f6"}
        strokeDasharray="5,5"
        fill="none"
        style={{ 
          strokeWidth: isDragging ? 3 : 2,
          // 부드러운 곡선을 위한 선 스타일
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          // 베지어 곡선의 자연스러움 강조
          filter: isDarkMode 
            ? 'drop-shadow(0 1px 2px rgba(96, 165, 250, 0.2))'
            : 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.1))',
          // 좌측 연결선도 우측과 완벽하게 동일한 품질
          opacity: inputPath.includes('C') ? 1 : 0.95
        }}
      />
      
      {/* 두 번째 연결선: outputHandle -> target (좌측과 완벽하게 대칭) */}
      <path
        id={`${id}-output`}
        className={`react-flow__edge-path transition-all duration-150 ${
          isDragging ? 'stroke-[3px]' : 'stroke-[2px]'
        }`}
        d={outputPath}
        markerEnd="url(#arrow)"
        stroke={isDarkMode ? "#60a5fa" : "#3b82f6"}
        strokeDasharray="5,5"
        fill="none"
        style={{ 
          strokeWidth: isDragging ? 3 : 2,
          // 부드러운 곡선을 위한 선 스타일
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          // 베지어 곡선의 자연스러움 강조
          filter: isDarkMode 
            ? 'drop-shadow(0 1px 2px rgba(96, 165, 250, 0.2))'
            : 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.1))',
          // 우측 연결선도 좌측과 완벽하게 동일한 품질
          opacity: outputPath.includes('C') ? 1 : 0.95
        }}
      />

      {/* 중앙 데이터베이스 노드 - 이미지와 같은 스타일 */}
      <foreignObject
        width={64}
        height={64}
        x={dataBoxCenterX - 32}
        y={dataBoxCenterY - 32}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div 
          className={`relative transition-all duration-100 ${
            isDragging 
              ? 'scale-110' 
              : isEdgeTextFocused 
                ? 'scale-105' 
                : 'scale-100'
          }`}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'all',
            userSelect: 'none',
            transition: 'all 0.1s ease',
            outline: isEdgeTextFocused ? '2px solid #3b82f6' : 'none'
          }}
        >
          {/* 이미지와 같은 원형 데이터베이스 노드 */}
          <div className="relative w-16 h-16">
            {/* 외부 링 - 다크 모드에 따라 동적 변경 */}
            <div 
              className="absolute inset-0 rounded-full shadow-lg border-2"
              style={{
                backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                borderColor: isDarkMode ? '#6b7280' : '#e5e7eb'
              }}
            ></div>
            {/* 보라색 내부 링 */}
            <div className="absolute inset-2 bg-purple-500 rounded-full"></div>
            {/* 보라색 중심 원 */}
            <div className="absolute inset-4 bg-purple-600 rounded-full flex items-center justify-center">
              {/* 데이터베이스 아이콘 */}
              <Database size={20} className="text-white" />
            </div>
            
            {/* 드래그 중일 때 시각적 피드백 */}
            {isDragging && (
              <div 
                className="absolute inset-0 rounded-full opacity-50 animate-pulse"
                style={{
                  backgroundColor: isDarkMode ? '#1e40af' : '#dbeafe'
                }}
              ></div>
            )}
          </div>

          {/* 액션 버튼들 - 제거됨 */}

                      {/* Input Handle - 워크플로우 방향성에 따라 동적 조정 (화면상 보이지 않음) */}
            <div
              className="absolute w-3 h-3 border-2 border-white shadow-md rounded-full transition-colors opacity-0"
              style={{ 
                left: inputHandle.position === Position.Left ? '-6px' : 'auto',
                right: inputHandle.position === Position.Right ? '-6px' : 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                backgroundColor: inputHandle.type === 'target' 
                  ? (isDarkMode ? '#60a5fa' : '#3b82f6')
                  : (isDarkMode ? '#34d399' : '#10b981')
              }}
              title={`${inputHandle.type === 'target' ? 'Input' : 'Output'} Handle`}
            />

                      {/* Output Handle - 워크플로우 방향성에 따라 동적 조정 (화면상 보이지 않음) */}
            <div
              className="absolute w-3 h-3 border-2 border-white shadow-md rounded-full transition-colors opacity-0"
              style={{ 
                left: outputHandle.position === Position.Left ? '-6px' : 'auto',
                right: outputHandle.position === Position.Right ? '-6px' : 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                backgroundColor: outputHandle.type === 'source' 
                  ? (isDarkMode ? '#34d399' : '#10b981')
                  : (isDarkMode ? '#60a5fa' : '#3b82f6')
              }}
              title={`${outputHandle.type === 'source' ? 'Output' : 'Input'} Handle`}
            />
        </div>
      </foreignObject>

      {/* 드래그 중일 때 추가 시각적 피드백 */}
      {isDragging && (
        <circle
          cx={dataBoxCenterX}
          cy={dataBoxCenterY}
          r={20}
          fill={isDarkMode ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)"}
          stroke={isDarkMode ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.3)"}
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 엣지 노드 위치가 변경되었을 때만 중간점 표시 - 제거됨 */}

      {/* 조건 엣지 라벨 - 엣지 노드 위치에 따라 동적으로 이동 */}
      {isConditionEdge && conditionDescription && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${dataBoxCenterX}px,${dataBoxCenterY - 35}px)`,
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
              backgroundColor: isDarkMode ? '#1e3a8a' : '#dbeafe',
              color: isDarkMode ? '#93c5fd' : '#1e40af',
              border: `1px solid ${isDarkMode ? '#3b82f6' : '#93c5fd'}`
            }}
            className="nodrag nopan"
          >
            {conditionDescription}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Output Inspector */}
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