import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronRight, X, Play, Loader, Edit2, AlertCircle, Plus, Trash2, Eye } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import { useThemeStore } from '../../store/themeStore';
import PromptTemplatePopup from './PromptTemplatePopup';
import { getNodeDescription } from '../../utils/nodeDescriptions';

/**
 * CustomNode 컴포넌트
 * React Flow 라이브러리에서 사용되는 커스텀 노드를 렌더링합니다.
 * 노드의 타입, 상태, 데이터에 따라 다양한 UI와 기능을 제공합니다.
 */
export const CustomNode = memo(({ data, isConnectable, id, type }: NodeProps) => {
  // Zustand 스토어에서 상태 및 액션 가져오기
  const { removeNode, executeNode, updateNodeData, nodes, edges, focusedElement } = useFlowStore();
  // 현재 노드가 실행 중인지 여부 (data.isExecuting이 없으면 false)
  const isExecuting = data.isExecuting || false;
  // 노드 이름 편집 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  // 편집 중인 노드 이름 상태
  const [nodeName, setNodeName] = useState(data.label);
  // 재생 버튼 hover 상태 관리
  const [isPlayHovered, setIsPlayHovered] = useState(false);
  // 연결점 hover 상태 관리 (Tools & Memory 노드 제외)
  const [isLeftHandleHovered, setIsLeftHandleHovered] = useState(false);
  const [isRightHandleHovered, setIsRightHandleHovered] = useState(false);
  // 툴팁 표시 상태
  const [showTooltip, setShowTooltip] = useState(false);

  // ToolsMemoryNode이고 다른 노드가 포커스되었을 때 selectedGroupId 초기화
  React.useEffect(() => {
    if (type === 'toolsMemoryNode' && focusedElement.type === 'node' && focusedElement.id !== id) {
      // 다른 노드가 포커스되었을 때 selectedGroupId 초기화
      if (data.selectedGroupId) {
        updateNodeData(id, { ...data, selectedGroupId: null });
      }
    }
  }, [focusedElement, id, type, data, updateNodeData]);

  // 노드 타입에 따른 플래그
  const isStartNode = type === 'startNode';
  const isEndNode = type === 'endNode';
  const isConditionNode = type === 'conditionNode';
  const isToolsMemoryNode = type === 'toolsMemoryNode';

  // ToolsMemoryNode일 경우, 설정에서 그룹 목록 가져오기
  const groups: any[] = data.config?.groups || [];
  const memoryGroups = groups.filter((g: any) => g.type === 'memory');
  const toolsGroups = groups.filter((g: any) => g.type === 'tools');

  // 재생 버튼 활성화 조건: 모든 노드는 source(출력) 연결 기준
  const hasConnection = edges.some(edge => edge.source === id);
  const hasNonEmptyInput = (() => {
    // 이 노드로 들어오는 엣지들의 output 중 유효 데이터가 있는지 체크
    const incoming = edges.filter(edge => edge.target === id);
    for (const e of incoming) {
      const out = e.data?.output;
      if (Array.isArray(out)) {
        if (out.length > 0) return true;
      } else if (out && typeof out === 'object') {
        if (Object.keys(out).length > 0) return true;
      } else if (out !== null && out !== undefined && out !== '') {
        return true;
      }
    }
    return false;
  })();

  // 노드 설명 텍스트 생성 (노드 데이터의 description 우선, 없으면 기본값 사용)
  const getNodeDescriptionText = () => {
    // 노드 데이터에 description이 있으면 그것을 사용, 없으면 기본값 사용
    return data.description || getNodeDescription(type);
  };

  // 툴팁용 설명 텍스트 (40자 제한)
  const getTooltipDescription = () => {
    const fullDescription = getNodeDescriptionText();
    if (fullDescription.length <= 40) {
      return fullDescription;
    }
    return fullDescription.substring(0, 40) + '...';
  };


  // 노드 더블클릭 핸들러 - 툴팁 토글
  const handleNodeDoubleClick = () => {
    setShowTooltip(!showTooltip);
  };

  // 툴팁 닫기 핸들러
  const handleCloseTooltip = () => {
    setShowTooltip(false);
  };

  // ConditionSettings.tsx의 getConditionTextFromLabel와 유사한 로직
  // 실제 프로덕션에서는 이 함수를 유틸리티로 분리하여 공유하는 것이 좋습니다.
  const getConditionTextFromEdgeLabel = (label: string = ''): string => {
    const match = label.match(/^(if|elif|else)\s+(.*)/i); // "if condition", "elif condition"
    if (match && match[2]) {
      return match[2]; // condition_text 부분
    }
    if (label.toLowerCase() === 'else') {
      return ''; // 'else'는 조건 텍스트가 없음
    }
    // 접두사(if, elif)가 있지만 공백이 없는 레거시 또는 직접 입력 케이스 처리
    if (label.toLowerCase().startsWith('if ')) return label.substring(3);
    if (label.toLowerCase().startsWith('elif ')) return label.substring(5);
    
    // 위 패턴에 해당하지 않으면, 전체를 조건 텍스트로 간주 (예: className['value'] > 10)
    return label;
  };

  /**
   * 조건 노드의 유효성 검사 상태를 계산합니다.
   * 시작 노드의 className을 기반으로 조건문의 형식을 검사합니다.
   * @returns {boolean} 유효성 에러가 있으면 true, 그렇지 않으면 false.
   */
  const hasValidationError = React.useMemo(() => {
    if (!isConditionNode) return false;

    const startNode = nodes.find(node => node.type === 'startNode');
    const className = startNode?.data.config?.className || '';
    const nodeEdges = edges.filter(edge => edge.source === id);

    if (nodeEdges.length === 0) return false; // 연결된 엣지가 없으면 에러 아님

    // className이 정의되지 않았고, 조건 엣지가 있다면 에러
    // (ConditionSettings.tsx의 validateCondition 첫 번째 검사와 유사)
    if (!className) {
      return true; 
    }

    return nodeEdges.some(edge => {
      const fullLabel = edge.data?.label || '';
      if (fullLabel.toLowerCase().trim() === 'else') {
        return false; // 'else' 조건은 형식 검사에서 제외 (항상 유효)
      }
      const conditionText = getConditionTextFromEdgeLabel(fullLabel);
      
      // 순수 조건 텍스트가 비어있다면 (예: "if "만 있고 실제 조건이 없는 경우) 유효하지 않음
      if (!conditionText.trim()) return true; 

      const conditionRegex = new RegExp(`^${className}\\['[\\w_]+'\\]`); // className['propertyName'] 형식 검사
      return !conditionRegex.test(conditionText); // 패턴에 맞지 않으면 true (에러)
    });
  }, [isConditionNode, id, nodes, edges]);

  /**
   * 노드의 타입에 따라 동적 스타일을 반환합니다.
   * @returns {object} 노드 스타일 객체.
   */
  const getNodeStyle = () => {
    const { isDarkMode } = useThemeStore();
    const baseStyles: Record<string, {
      backgroundColor: string;
      borderColor: string;
      iconColor: string;
      textColor: string;
    }> = {
      'startNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#10b981',
        iconColor: '#10b981',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'promptNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#F7CB15',
        iconColor: '#F7CB15',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'functionNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#5B5F97',
        iconColor: '#5B5F97',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'endNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#10b981',
        iconColor: '#10b981',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'agentNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#3b82f6',
        iconColor: '#3b82f6',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'conditionNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#f59e0b',
        iconColor: '#f59e0b',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'toolNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#10b981',
        iconColor: '#10b981',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'toolsMemoryNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
        iconColor: isDarkMode ? '#9ca3af' : '#6b7280',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'ragNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#8b5cf6',
        iconColor: '#8b5cf6',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'mergeNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#FF6B6C',
        iconColor: '#FF6B6C',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      },
      'userNode': {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#8b5cf6',
        iconColor: '#8b5cf6',
        textColor: isDarkMode ? '#d1d5db' : '#374151'
      }
    };

    return baseStyles[(data.nodeType as string)] || baseStyles['functionNode'];
  };

  /**
   * 노드 타입에 따라 핸들 색상을 반환합니다.
   * @returns {string} 핸들 색상 클래스.
   */
  const getHandleStyle = () => {
    const nodeStyle = getNodeStyle();
    return `w-3 h-3 shadow-sm`;
  };

  /**
   * 연결점의 hover 스타일을 계산합니다.
   * @param {boolean} isHovered - hover 상태 여부
   * @param {string} baseColor - 기본 색상
   * @returns {object} hover 스타일 객체
   */
  const getHandleHoverStyle = (isHovered: boolean, baseColor: string) => {
    if (!isHovered) {
      return {
        backgroundColor: baseColor,
        borderColor: '#ffffff',
        borderWidth: '2px',
        borderStyle: 'solid',
        top: '50%',
        transform: 'translateY(-50%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.2s ease-in-out'
      };
    }
    
    // hover 시 더 밝고 선명한 색상으로 변경
    const hoverColor = getHoverColor(baseColor);
    return {
      backgroundColor: hoverColor,
      borderColor: '#ffffff',
      borderWidth: '3px', // 테두리 두께 증가
      borderStyle: 'solid',
      top: '50%',
      transform: 'translateY(-50%)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)', // 그림자 강화
      transition: 'all 0.2s ease-in-out',
      scale: '1.1' // 크기 약간 증가
    };
  };

  /**
   * 기본 색상에 대한 hover 색상을 계산합니다.
   * @param {string} baseColor - 기본 색상 (hex)
   * @returns {string} hover 색상 (hex)
   */
  const getHoverColor = (baseColor: string): string => {
    // hex 색상을 RGB로 변환하여 밝기 조정
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 밝기를 20% 증가
    const brightness = 1.2;
    const newR = Math.min(255, Math.round(r * brightness));
    const newG = Math.min(255, Math.round(g * brightness));
    const newB = Math.min(255, Math.round(b * brightness));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  /**
   * 노드 삭제 핸들러.
   * @param {React.MouseEvent} event - 마우스 이벤트 객체.
   */
  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation(); // 이벤트 버블링 방지
    if (window.confirm('Are you sure you want to delete this node?')) {
      removeNode(id);
    }
  };

  /**
   * 노드 실행 핸들러.
   * @param {React.MouseEvent} event - 마우스 이벤트 객체.
   */
  const handleExecute = async (event: React.MouseEvent) => {
    event.stopPropagation(); // 이벤트 버블링 방지
    if (!isExecuting) {
      await executeNode(id);
    }
  };

  /**
   * 노드 이름 유효성 검사 함수
   * @param {string} name - 검사할 노드 이름
   * @returns {boolean} 유효하면 true, 그렇지 않으면 false
   */
  const validateNodeName = (name: string): boolean => {
    // 띄어쓰기 금지, 특수문자는 언더스코어(_)만 허용
    const validNameRegex = /^[a-zA-Z0-9_]+$/;
    return validNameRegex.test(name);
  };

  /**
   * 노드 이름 변경 핸들러 (input 값 변경 시).
   * @param {React.ChangeEvent<HTMLInputElement>} event - 변경 이벤트 객체.
   */
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // 유효한 문자만 입력 허용 (띄어쓰기, 특수문자 금지, 언더스코어만 허용)
    const filteredValue = value.replace(/[^a-zA-Z0-9_]/g, '');
    setNodeName(filteredValue);
  };

  /**
   * 노드 이름 변경 완료 핸들러 (blur 또는 Enter 시).
   */
  const handleNameSubmit = () => {
    const trimmedName = nodeName.trim();
    
    // 이름이 비어있는 경우
    if (!trimmedName) {
      alert('노드 이름을 입력해주세요.');
      setNodeName(data.label);
      setIsEditing(false);
      return;
    }
    
    // 이름 유효성 검사
    if (!validateNodeName(trimmedName)) {
      alert('노드 이름에는 영문자, 숫자, 언더스코어(_)만 사용할 수 있습니다. 띄어쓰기와 특수문자는 사용할 수 없습니다.');
      setNodeName(data.label);
      setIsEditing(false);
      return;
    }
    
    // 이름이 유효하고 변경된 경우에만 업데이트
    if (trimmedName !== data.label) {
      updateNodeData(id, { ...data, label: trimmedName });
    }
    setIsEditing(false);
  };

  /**
   * 키 입력 핸들러 (이름 편집 시 Enter 또는 Escape 처리).
   * @param {React.KeyboardEvent} event - 키보드 이벤트 객체.
   */
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleNameSubmit();
    } else if (event.key === 'Escape') {
      setNodeName(data.label);
      setIsEditing(false);
    }
  };

  /**
   * 지정된 타입의 그룹 중에서 동일한 이름이 이미 존재하는지 확인합니다.
   * @param {string} name - 확인할 그룹 이름.
   * @param {'memory' | 'tools'} type - 그룹 타입 ('memory' 또는 'tools').
   * @returns {boolean} 이름이 존재하면 true, 그렇지 않으면 false.
   */
  const checkNameExists = (name: string, type: 'memory' | 'tools'): boolean => {
    const existingGroups = groups.filter((g: any) => g.type === type);
    return existingGroups.some((g: any) => g.name.toLowerCase() === name.toLowerCase());
  };

  /**
   * 새로운 그룹을 추가합니다.
   * 그룹 이름이 중복되지 않도록 기본 이름에 숫자를 붙여 생성합니다.
   * @param {'memory' | 'tools'} type - 생성할 그룹의 타입.
   */
  const handleAddGroup = (type: 'memory' | 'tools') => {
    const defaultName = `New ${type === 'memory' ? 'Memory' : 'Tools'} Group`;
    let newName = defaultName;
    let counter = 1;
    // 중복되지 않는 이름 찾기
    while (checkNameExists(newName, type)) {
      newName = `${defaultName} ${counter}`;
      counter++;
    }

    const newGroup = {
      id: `group-${Date.now()}`,
      name: newName,
      description: '',
      nodes: [],
      type,
      ...(type === 'memory' && { memoryType: 'ConversationBufferMemory' }) // memory 그룹일 때만 기본값 추가
    };
    // 노드 데이터 업데이트 (새 그룹 추가)
    updateNodeData(id, {
      ...data,
      config: {
        ...data.config,
        groups: [...groups, newGroup]
      }
    });
  };

  /**
   * 특정 그룹을 삭제합니다.
   * @param {React.MouseEvent} event - 마우스 이벤트 객체.
   * @param {string} groupId - 삭제할 그룹의 ID.
   */
  const handleDeleteGroup = (event: React.MouseEvent, groupId: string) => {
    event.stopPropagation(); // 이벤트 버블링 방지
    if (window.confirm('Are you sure you want to delete this group?')) {
      updateNodeData(id, { // 노드 데이터 업데이트 (해당 그룹 제거)
        ...data,
        config: {
          ...data.config,
          groups: groups.filter(g => g.id !== groupId)
        }
      });
    }
  };

  /**
   * 지정된 타입의 그룹 목록을 렌더링합니다.
   * @param {any[]} groups - 렌더링할 그룹 객체 배열.
   * @param {'memory' | 'tools'} type - 그룹 타입.
   * @returns {JSX.Element} 그룹 목록을 나타내는 JSX.
   */
  const renderGroups = (groups: any[], type: 'memory' | 'tools') => {
    // 현재 선택된 그룹 ID 확인
    const selectedGroupId = data.selectedGroupId;
    
    return (
      <div className="space-y-3">
        {/* 섹션 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                backgroundColor: type === 'memory' ? '#8b5cf6' : '#10b981'
              }}
            ></div>
            <span 
              className="font-semibold text-sm"
              style={{ color: nodeStyle.textColor }}
            >
              {type === 'memory' ? 'Memory Groups' : 'Tools Groups'}
            </span>
            <span 
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                color: nodeStyle.textColor
              }}
            >
              {groups.length}
            </span>
          </div>
        </div>
        
        {/* 그룹 목록 */}
        <div className="space-y-2">
          {groups.map((group) => {
            // 현재 그룹이 선택되었는지 확인
            const isSelected = selectedGroupId === group.id;
            
            return (
              <div 
                key={group.id} 
                className="rounded-lg p-3 cursor-pointer transition-all duration-200 relative group border"
                style={{
                  backgroundColor: isSelected 
                    ? (isDarkMode ? '#1e40af' : '#dbeafe')
                    : (isDarkMode ? '#374151' : '#f9fafb'),
                  borderColor: isSelected 
                    ? '#3b82f6' 
                    : (isDarkMode ? '#4b5563' : '#e5e7eb'),
                  borderWidth: isSelected ? '2px' : '1px'
                }}
                // 그룹 클릭 시, 해당 그룹을 선택된 그룹으로 설정 (우측 패널에 상세 정보 표시용)
                onClick={() => updateNodeData(id, { ...data, selectedGroupId: group.id })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span 
                        className="font-medium text-sm truncate"
                        style={{ 
                          color: isSelected 
                            ? '#3b82f6' 
                            : nodeStyle.textColor 
                        }}
                      >
                        {group.name}
                      </span>

                    </div>
                    {group.description && (
                      <p 
                        className="text-xs mt-1 overflow-hidden text-gray-500 dark:text-gray-400"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    <button
                      onClick={(e) => handleDeleteGroup(e, group.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900"
                      style={{ 
                        color: '#ef4444'
                      }}
                      title="Delete group"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div 
                      className="p-1 rounded"
                      style={{
                        backgroundColor: isSelected 
                          ? '#3b82f6' 
                          : (isDarkMode ? '#6b7280' : '#9ca3af')
                      }}
                    >
                      <ChevronRight 
                        size={12} 
                        style={{ color: '#ffffff' }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 그룹 추가 버튼 */}
        <button
          onClick={() => handleAddGroup(type)}
          className="w-full flex items-center justify-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 border-2 border-dashed"
          style={{
            color: nodeStyle.iconColor,
            borderColor: nodeStyle.iconColor,
            backgroundColor: 'transparent'
          }}
        >
          <Plus size={16} className="mr-2" />
          Add {type === 'memory' ? 'Memory' : 'Tools'} Group
        </button>
      </div>
    );
  };

  // 노드가 포커스되었는지 확인
  const isNodeFocused = focusedElement.type === 'node' && focusedElement.id === id;
  const nodeStyle = getNodeStyle();
  const { isDarkMode } = useThemeStore();

  return (
    <div
      className="relative transition-all duration-200"
      style={{
        filter: isNodeFocused ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none'
      }}
    >
      {/* Tools & Memory 노드일 경우 통합된 디자인 */}
      {isToolsMemoryNode ? (
        <div 
          className="rounded-xl shadow-xl border-2 overflow-hidden cursor-pointer"
          style={{
            backgroundColor: nodeStyle.backgroundColor,
            borderColor: nodeStyle.borderColor
          }}
          onDoubleClick={handleNodeDoubleClick}
        >
          {/* 통합된 헤더 - 아이콘과 제목을 한 줄에 배치 */}
          <div 
            className="px-4 py-3 border-b-2 flex items-center justify-between"
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
              borderColor: nodeStyle.borderColor
            }}
          >
            <div className="flex items-center space-x-3">
              {/* 노드 아이콘 - 헤더에 통합 */}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ 
                  backgroundColor: nodeStyle.iconColor,
                  border: `2px solid ${nodeStyle.iconColor}`
                }}
              >
                <div style={{ color: '#ffffff' }}>
                  {data.icon}
                </div>
              </div>
              <div>
                <h3 
                  className="font-semibold text-sm"
                  style={{ color: nodeStyle.textColor }}
                >
                  {data.label}
                </h3>
                <p 
                  className="text-xs"
                  style={{ color: nodeStyle.textColor }}
                >
                  Tools & Memory Configuration
                </p>
              </div>
            </div>

          </div>
          
          {/* 그룹 컨테이너 */}
          <div className="p-4 space-y-6">
            {renderGroups(memoryGroups, 'memory')}
            {renderGroups(toolsGroups, 'tools')}
          </div>
        </div>
      ) : (
        <>
          {/* 일반 노드들 - 기존 디자인 유지 */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div
              className="rounded-lg shadow-lg relative overflow-visible cursor-pointer"
              style={{
                backgroundColor: nodeStyle.backgroundColor,
                borderColor: nodeStyle.borderColor,
                borderWidth: '2px',
                borderStyle: 'solid'
              }}
              onDoubleClick={handleNodeDoubleClick}
            >
              {/* 우상단 상태 점 제거 */}
              
              {/* 노드 우측 상단 버튼들 (재생 버튼 이동) */}
              {!isEndNode && (
                <div className="absolute -top-2 -right-2 flex gap-2 z-10"
                  onMouseEnter={() => setIsPlayHovered(true)}
                  onMouseLeave={() => setIsPlayHovered(false)}
                >
                  <button
                    onClick={handleExecute}
                    disabled={
                      isExecuting ||
                      (isConditionNode && hasValidationError) ||
                      (!hasConnection) ||
                      (!hasNonEmptyInput && !isStartNode)
                    }
                    className={`p-1.5 rounded-full shadow-md transition-all duration-200 disabled:cursor-not-allowed 
                      ${(
                        !hasConnection ||
                        isExecuting ||
                        (isConditionNode && hasValidationError) ||
                        (!hasNonEmptyInput && !isStartNode)
                      )
                        ? 'bg-gray-300 hover:bg-gray-400 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white hover:scale-110'}`}
                    title={
                      !hasConnection
                        ? '노드를 연결해주세요'
                        : (!hasNonEmptyInput && !isStartNode)
                          ? 'No input data. Execute preceding nodes.'
                          : hasValidationError
                            ? 'Fix validation errors before executing'
                            : 'Execute Node'
                    }
                  >
                    {isExecuting ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              )}
              
              {/* 노드 내용 영역 - 아이콘만 표시 */}
              <div className="p-2 flex flex-col items-center justify-center text-center h-full">
                {/* 노드 아이콘 - 라운딩이 살짝 있는 정사각형, 적은 padding */}
                <div 
                  className="w-16 h-16 rounded-md flex items-center justify-center shadow-sm"
                  style={{ 
                    backgroundColor: nodeStyle.iconColor,
                    border: `2px solid ${nodeStyle.iconColor}`
                  }}
                >
                  <div style={{ color: '#ffffff' }}>
                    {data.icon}
                  </div>
                </div>
              </div>
              
              {/* Start Node가 아닌 경우 좌측 핸들 (입력) - 노드 아이콘과 같은 높이에 배치 */}
              {!isStartNode && (
                <Handle
                  type="target"
                  position={Position.Left}
                  isConnectable={isConnectable}
                  className={getHandleStyle()}
                  style={getHandleHoverStyle(isLeftHandleHovered, nodeStyle.iconColor)}
                  onMouseEnter={() => setIsLeftHandleHovered(true)}
                  onMouseLeave={() => setIsLeftHandleHovered(false)}
                />
              )}
              
              {/* End Node가 아닌 경우 우측 핸들 (출력) - 노드 아이콘과 같은 높이에 배치 */}
              {!isEndNode && (
                <Handle
                  type="source"
                  position={Position.Right}
                  isConnectable={isConnectable}
                  className={getHandleStyle()}
                  style={getHandleHoverStyle(isRightHandleHovered, nodeStyle.iconColor)}
                  onMouseEnter={() => setIsRightHandleHovered(true)}
                  onMouseLeave={() => setIsRightHandleHovered(false)}
                />
              )}
            </div>
            
            {/* 노드 설명 툴팁 */}
            {showTooltip && (
              <div className="absolute z-50 top-0 left-1/2 transform -translate-x-1/2 -translate-y-full -mt-2">
                {/* 툴팁 내용 */}
                <div 
                  className="border rounded-lg shadow-lg px-4 py-3 min-w-48"
                  style={{
                    backgroundColor: nodeStyle.backgroundColor,
                    borderColor: nodeStyle.borderColor
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm mb-1" style={{ color: nodeStyle.iconColor }}>
                        {data.label}
                      </h3>
                      <p 
                        className="text-xs" 
                        style={{ color: nodeStyle.textColor }}
                      >
                        {getTooltipDescription()}
                      </p>
                    </div>
                    <button
                      onClick={handleCloseTooltip}
                      className="ml-2 transition-colors"
                      style={{ color: nodeStyle.textColor }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {/* 툴팁 화살표 (아래쪽을 가리킴) */}
                <div 
                  className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-transparent"
                  style={{ borderTopColor: nodeStyle.borderColor }}
                ></div>
              </div>
            )}
          </div>
          
          {/* 노드 이름 - 메인 컨테이너 밖으로 분리 */}
          <div 
            className="mt-2 px-6 py-1.5 rounded-lg shadow-md border relative"
            style={{ 
              minWidth: 'fit-content',
              textAlign: 'center',
              backgroundColor: nodeStyle.backgroundColor,
              borderColor: nodeStyle.borderColor
            }}
          >
            {/* 재생 버튼은 상단 우측으로 이동됨 */}
            
            {isEditing ? (
              // 이름 편집 모드
              <input
                type="text"
                value={nodeName}
                onChange={handleNameChange}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyPress}
                placeholder="영문자, 숫자, _만 사용"
                className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
                autoFocus
              />
            ) : (
              // 이름 표시 모드
              <div className="flex items-center justify-center w-full">
                <div 
                  className="font-medium text-sm truncate cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: nodeStyle.textColor }}
                  onClick={() => setIsEditing(true)}
                  title="Click to rename"
                >
                  {data.label}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 조건 노드이고 유효성 에러가 있는 경우 에러 메시지 표시 */}
      {isConditionNode && hasValidationError && (
        <div 
          className="mt-2 text-xs flex items-center p-2 rounded"
          style={{
            color: '#ef4444',
            backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2'
          }}
        >
          <AlertCircle size={12} className="mr-1" />
          Invalid condition format
        </div>
      )}
    </div>
  );
});

export default CustomNode;