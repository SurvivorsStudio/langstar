import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronRight, X, Play, Loader, Edit2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';

/**
 * CustomNode 컴포넌트
 * React Flow 라이브러리에서 사용되는 커스텀 노드를 렌더링합니다.
 * 노드의 타입, 상태, 데이터에 따라 다양한 UI와 기능을 제공합니다.
 */
export const CustomNode = memo(({ data, isConnectable, selected, id, type }: NodeProps) => {
  // Zustand 스토어에서 상태 및 액션 가져오기
  const { removeNode, executeNode, updateNodeData, nodes, edges } = useFlowStore();
  // 현재 노드가 실행 중인지 여부 (data.isExecuting이 없으면 false)
  const isExecuting = data.isExecuting || false;
  // 노드 이름 편집 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  // 편집 중인 노드 이름 상태
  const [nodeName, setNodeName] = useState(data.label);
  // 재생 버튼 hover 상태 관리
  const [isPlayHovered, setIsPlayHovered] = useState(false);

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
   * 노드의 타입과 유효성 상태에 따라 동적 스타일을 반환합니다.
   * @returns {string} Tailwind CSS 클래스 문자열.
   */
  const getNodeStyle = () => {
    const baseStyle = {
      'agentNode': 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700',
      'conditionNode': 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700',
      'functionNode': 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700',
      'toolNode': 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700',
      'startNode': 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600',
      'endNode': 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700',
      'toolsMemoryNode': 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600',
    }[(data.nodeType as string)] || 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600';

    // 조건 노드이고 유효성 에러가 있는 경우 스타일 재정의
    if (isConditionNode && hasValidationError) {
      return 'bg-red-50 dark:bg-red-900 border-red-300 dark:border-red-600';
    }

    return baseStyle;
  };

  /**
   * 노드 타입과 유효성 상태에 따라 아이콘 스타일을 반환합니다.
   * @returns {string} Tailwind CSS 클래스 문자열.
   */
  const getIconStyle = () => {
    const baseStyle = {
      'agentNode': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50',
      'conditionNode': 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-800/50',
      'functionNode': 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-800/50',
      'toolNode': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800/50',
      'startNode': 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
      'endNode': 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-800/50',
      'toolsMemoryNode': 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
    }[(data.nodeType as string)] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';

    // 조건 노드이고 유효성 에러가 있는 경우 스타일 재정의
    if (isConditionNode && hasValidationError) {
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-800/50';
    }

    return baseStyle;
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
    console.log("asdasdasdasdasd")
    event.stopPropagation(); // 이벤트 버블링 방지
    if (!isExecuting) {
      await executeNode(id);
    }
  };

  /**
   * 노드 이름 변경 핸들러 (input 값 변경 시).
   * @param {React.ChangeEvent<HTMLInputElement>} event - 변경 이벤트 객체.
   */
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNodeName(event.target.value);
  };

  /**
   * 노드 이름 변경 완료 핸들러 (blur 또는 Enter 시).
   */
  const handleNameSubmit = () => {
    const trimmedName = nodeName.trim();
    // 이름이 유효하고 변경된 경우에만 업데이트
    if (trimmedName && trimmedName !== data.label) {
      updateNodeData(id, { ...data, label: trimmedName });
    } else {
      // 유효하지 않거나 변경되지 않은 경우 원래 이름으로 복원
      setNodeName(data.label);
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
      type
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
  const renderGroups = (groups: any[], type: 'memory' | 'tools') => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">{type === 'memory' ? 'Memory' : 'Tools'}</span>
      </div>
      {groups.map((group) => (
        <div 
          key={group.id} 
          className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors relative group"
          // 그룹 클릭 시, 해당 그룹을 선택된 그룹으로 설정 (우측 패널에 상세 정보 표시용)
          onClick={() => updateNodeData(id, { ...data, selectedGroupId: group.id })}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">{group.name}</span>
            <div className="flex items-center">
              <button
                onClick={(e) => handleDeleteGroup(e, group.id)}
                // 마우스 호버 시에만 삭제 버튼 표시
                className="opacity-0 group-hover:opacity-100 mr-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
              <ChevronRight size={14} className="text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          {group.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
          )}
        </div>
      ))}
      <button
        onClick={() => handleAddGroup(type)}
        className="w-full flex items-center justify-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
      >
        <Plus size={14} className="mr-1" />
        Add {type === 'memory' ? 'Memory' : 'Tools'} Group
      </button>
    </div>
  );

  return (
    <div
      className={`${getNodeStyle()} border-2 rounded-md p-4 w-64 shadow-sm relative ${
        selected ? 'shadow-md ring-2 ring-blue-300' : ''
      }`}
    >
      {/* 시작 노드와 그룹 노드가 아닌 경우 상단 핸들 (입력) 표시 */}
      {!isStartNode && !isToolsMemoryNode && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-gray-400" // 핸들 스타일
        />
      )}
      
      {/* 노드 우측 상단 버튼 (실행, 삭제) */}
      <div className="absolute -top-2 -right-2 flex gap-2">
        {/* End 노드는 실행(재생) 버튼도 숨김 */}
        {!isToolsMemoryNode && !isEndNode && (
          <div
            className="relative overflow-visible"
            onMouseEnter={() => setIsPlayHovered(true)}
            onMouseLeave={() => setIsPlayHovered(false)}
          >
            <button
              onClick={handleExecute}
              disabled={isExecuting || (isConditionNode && hasValidationError) || !hasConnection}
              className={`p-1 rounded-full shadow-sm transition-colors disabled:cursor-not-allowed 
                ${(!hasConnection || isExecuting || (isConditionNode && hasValidationError)) 
                  ? 'bg-gray-300 hover:bg-gray-400 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'}`}
              title={
                !hasConnection
                  ? '노드를 연결해주세요'
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
            {/* 비활성화 & hover 시 툴팁 */}
            {!hasConnection && isPlayHovered && (
              <div className="absolute z-50 left-1/2 top-full mt-2 -translate-x-1/2 px-3 py-1 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs rounded shadow-lg whitespace-nowrap pointer-events-auto">
                Please connect the nodes
              </div>
            )}
          </div>
        )}
        {/* Start/End 노드는 삭제 버튼 숨김 */}
        {!(isStartNode || isEndNode) && (
          <button
            onClick={handleDelete}
            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {/* 노드 아이콘 및 이름 표시 영역 */}
      <div className="flex items-center mb-2">
        <div className={`w-8 h-8 rounded-md ${getIconStyle()} mr-2 flex items-center justify-center`}>
          {data.icon}
        </div>
        <div className="flex-1 flex items-center">
          {isEditing ? (
            // 이름 편집 모드
            <input
              type="text"
              value={nodeName}
              onChange={handleNameChange}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyPress}
              className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              autoFocus
            />
          ) : (
            // 이름 표시 모드
            <div className="flex items-center justify-between w-full">
              <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{data.label}</div>
              <button
                onClick={() => setIsEditing(true)}
                className="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Rename Node"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 노드 설명 표시 */}
      {data.description && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{data.description}</div>
      )}

      {/* ToolsMemoryNode일 경우 메모리 및 도구 그룹 렌더링 */}
      {isToolsMemoryNode && (
        <div className="mt-4 space-y-4">
          {renderGroups(memoryGroups, 'memory')}
          {renderGroups(toolsGroups, 'tools')}
        </div>
      )}

      {/* 조건 노드이고 유효성 에러가 있는 경우 에러 메시지 표시 */}
      {isConditionNode && hasValidationError && (
        <div className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center bg-red-50 dark:bg-red-900 p-2 rounded">
          <AlertCircle size={12} className="mr-1" />
          Invalid condition format
        </div>
      )}
      
      {/* Start 노드는 code 미리보기 영역을 표시하지 않음 */}
      {data.code && !isStartNode && (
        <div className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 p-2 rounded max-h-20 overflow-y-auto font-mono">
          {data.code.split('\n').slice(0, 3).join('\n')}
          {data.code.split('\n').length > 3 && '...'}
        </div>
      )}
      
      {/* 종료 노드와 그룹 노드가 아닌 경우 하단 핸들 (출력) 표시 */}
      {!isEndNode && !isToolsMemoryNode && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-gray-400"
        />
      )}
    </div>
  );
});

export default CustomNode;