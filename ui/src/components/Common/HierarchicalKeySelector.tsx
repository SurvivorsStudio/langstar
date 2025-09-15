import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, ChevronDown, Key, Folder, FolderOpen, List, Hash, Type, ToggleLeft, Calendar, Search, Eye, Copy } from 'lucide-react';

interface HierarchicalKeySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any>;
  onSelect: (key: string) => void;
  title?: string;
  selectedKey?: string;
  pathStyle?: 'dot' | 'python'; // 경로 스타일 옵션
}

interface TreeNode {
  key: string;
  value: any;
  type: 'object' | 'array' | 'primitive';
  path: string[];
  fullPath: string;
  children?: TreeNode[];
  level: number;
}

const HierarchicalKeySelector: React.FC<HierarchicalKeySelectorProps> = ({
  isOpen,
  onClose,
  data,
  onSelect,
  title = "키 선택",
  selectedKey,
  pathStyle = 'dot'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [autoExpandedNodes, setAutoExpandedNodes] = useState<Set<string>>(new Set());
  const [viewDataModal, setViewDataModal] = useState<{
    isOpen: boolean;
    node: TreeNode | null;
    title: string;
  }>({
    isOpen: false,
    node: null,
    title: ''
  });

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setExpandedNodes(new Set());
      setAutoExpandedNodes(new Set());
      setViewDataModal({ isOpen: false, node: null, title: '' });
    }
  }, [isOpen]);

  // 전체 데이터 보기 함수
  const handleViewFullData = (node: TreeNode) => {
    setViewDataModal({
      isOpen: true,
      node,
      title: `전체 데이터: ${node.key}`
    });
  };

  // 클립보드에 복사하는 함수
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 간단한 토스트 알림을 위한 임시 요소 생성 (실제 프로젝트에서는 토스트 컴포넌트 사용)
      const toast = document.createElement('div');
      toast.textContent = '클립보드에 복사되었습니다!';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const getValueType = (value: any): 'object' | 'array' | 'primitive' => {
    if (Array.isArray(value)) return 'array';
    if (value !== null && typeof value === 'object') return 'object';
    return 'primitive';
  };

  const getTypeIcon = (node: TreeNode, isExpanded?: boolean) => {
    const { type, value } = node;
    
    switch (type) {
      case 'object':
        return isExpanded ? 
          <FolderOpen className="w-4 h-4 text-blue-500" /> : 
          <Folder className="w-4 h-4 text-blue-600" />;
      case 'array':
        return <List className="w-4 h-4 text-emerald-500" />;
      case 'primitive':
        // 값 타입에 따라 다른 아이콘과 색상
        const valueType = typeof value;
        switch (valueType) {
          case 'string':
            return <Type className="w-4 h-4 text-green-600" />;
          case 'number':
            return <Hash className="w-4 h-4 text-orange-500" />;
          case 'boolean':
            return <ToggleLeft className="w-4 h-4 text-purple-500" />;
          default:
            return <Calendar className="w-4 h-4 text-gray-500" />;
        }
    }
  };

  const formatValue = (value: any, type: 'object' | 'array' | 'primitive'): { display: string; isTruncated: boolean } => {
    switch (type) {
      case 'object':
        const keys = Object.keys(value);
        const hasLongKeys = keys.some(key => key.length > 15);
        const keyNames = keys.slice(0, 3).map(key => 
          key.length > 15 ? key.substring(0, 15) + '...' : key
        ).join(', ');
        const moreKeys = keys.length > 3 ? `, +${keys.length - 3}개 더` : '';
        const isTruncated = hasLongKeys || keys.length > 3;
        return {
          display: `{${keys.length}개 키: ${keyNames}${moreKeys}}`,
          isTruncated
        };
      case 'array':
        const hasLongItems = value.some((item: any) => {
          if (typeof item === 'string') return item.length > 15;
          return JSON.stringify(item).length > 20;
        });
        const preview = value.slice(0, 2).map((item: any) => {
          if (typeof item === 'string') {
            const truncated = item.length > 15 ? item.substring(0, 15) + '...' : item;
            return `"${truncated}"`;
          }
          const stringified = JSON.stringify(item);
          return stringified.length > 20 ? stringified.substring(0, 20) + '...' : stringified;
        }).join(', ');
        const moreItems = value.length > 2 ? `, +${value.length - 2}개 더` : '';
        const arrayTruncated = hasLongItems || value.length > 2;
        return {
          display: `[${value.length}개 항목: ${preview}${moreItems}]`,
          isTruncated: arrayTruncated
        };
      case 'primitive':
        const valueType = typeof value;
        if (valueType === 'string') {
          // 줄바꿈이 있는 문자열의 경우 줄바꿈 정보 표시
          const lineCount = (value.match(/\n/g) || []).length + 1;
          const lineInfo = lineCount > 1 ? `, ${lineCount}줄` : '';
          
          if (value.length > 100) {
            // 긴 문자열은 더 짧게 자르고 줄바꿈 유지
            const truncated = value.substring(0, 100);
            const lastNewline = truncated.lastIndexOf('\n');
            const preview = lastNewline > 50 ? truncated.substring(0, lastNewline) + '\n...' : truncated + '...';
            return {
              display: `"${preview}" (문자열, ${value.length}자${lineInfo})`,
              isTruncated: true
            };
          }
          return {
            display: `"${value}" (문자열, ${value.length}자${lineInfo})`,
            isTruncated: false
          };
        } else if (valueType === 'number') {
          // 긴 숫자도 적절히 처리
          const numberStr = String(value);
          if (numberStr.length > 20) {
            return {
              display: `${numberStr.substring(0, 20)}... (숫자)`,
              isTruncated: true
            };
          }
          return {
            display: `${value} (숫자)`,
            isTruncated: false
          };
        } else if (valueType === 'boolean') {
          return {
            display: `${value} (불린)`,
            isTruncated: false
          };
        } else if (value === null) {
          return {
            display: 'null',
            isTruncated: false
          };
        } else if (value === undefined) {
          return {
            display: 'undefined',
            isTruncated: false
          };
        } else {
          const stringified = JSON.stringify(value);
          if (stringified.length > 100) {
            return {
              display: `${stringified.substring(0, 100)}... (${valueType})`,
              isTruncated: true
            };
          }
          return {
            display: `${stringified} (${valueType})`,
            isTruncated: false
          };
        }
    }
  };

  // 경로를 올바른 형태로 변환하는 헬퍼 함수
  const buildFullPath = (pathArray: string[]): string => {
    if (pathArray.length === 0) return '';
    
    if (pathStyle === 'python') {
      // Python 스타일: mm['api_response']['data']['users'][1]['age']
      let result = pathArray[0];
      for (let i = 1; i < pathArray.length; i++) {
        const segment = pathArray[i];
        if (segment.startsWith('[') && segment.endsWith(']')) {
          // 배열 인덱스인 경우: [1]
          result += segment;
        } else {
          // 일반 객체 키인 경우: ['key']
          result += `['${segment}']`;
        }
      }
      return result;
    } else {
      // Dot notation 스타일: mm.api_response.data.users[1].age
      let result = pathArray[0];
      for (let i = 1; i < pathArray.length; i++) {
        const segment = pathArray[i];
        if (segment.startsWith('[') && segment.endsWith(']')) {
          // 배열 인덱스인 경우 점을 붙이지 않음
          result += segment;
        } else {
          // 일반 객체 키인 경우 점으로 연결
          result += '.' + segment;
        }
      }
      return result;
    }
  };

  // JSON 데이터를 트리 구조로 변환
  const buildTree = (obj: any, parentPath: string[] = [], level: number = 0): TreeNode[] => {
    if (!obj || typeof obj !== 'object') return [];

    if (Array.isArray(obj)) {
      // 배열의 경우 인덱스를 키로 사용
      return obj.map((item, index) => {
        const key = `[${index}]`;
        const currentPath = [...parentPath, key];
        const fullPath = buildFullPath(currentPath);
        const type = getValueType(item);

        const node: TreeNode = {
          key,
          value: item,
          type,
          path: currentPath,
          fullPath,
          level,
          children: type !== 'primitive' ? buildTree(item, currentPath, level + 1) : undefined,
        };

        return node;
      });
    }

    return Object.entries(obj).map(([key, value]) => {
      const currentPath = [...parentPath, key];
      const fullPath = buildFullPath(currentPath);
      const type = getValueType(value);

      const node: TreeNode = {
        key,
        value,
        type,
        path: currentPath,
        fullPath,
        level,
        children: type !== 'primitive' ? buildTree(value, currentPath, level + 1) : undefined,
      };

      return node;
    });
  };

  const treeData = useMemo(() => buildTree(data), [data]);

  // 검색 필터링
  const filterTree = (nodes: TreeNode[], searchTerm: string): TreeNode[] => {
    if (!searchTerm.trim()) return nodes;

    const filtered: TreeNode[] = [];
    
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = (node: TreeNode): boolean => {
      // 키 이름으로 검색
      if (node.key.toLowerCase().includes(searchLower)) return true;
      
      // 값으로 검색 (primitive 타입인 경우)
      if (node.type === 'primitive') {
        const valueStr = String(node.value).toLowerCase();
        if (valueStr.includes(searchLower)) return true;
      }
      
      // 전체 경로로 검색
      if (node.fullPath.toLowerCase().includes(searchLower)) return true;
      
      return false;
    };

    const filterRecursive = (node: TreeNode): TreeNode | null => {
      const nodeMatches = matchesSearch(node);
      let filteredChildren: TreeNode[] = [];

      // 자식 노드들 필터링
      if (node.children) {
        filteredChildren = node.children
          .map(child => filterRecursive(child))
          .filter((child): child is TreeNode => child !== null);
      }

      // 현재 노드가 매치되거나 자식 중 하나라도 매치되면 포함
      if (nodeMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        };
      }

      return null;
    };

    nodes.forEach(node => {
      const filtered_node = filterRecursive(node);
      if (filtered_node) {
        filtered.push(filtered_node);
      }
    });

    return filtered;
  };

  const filteredTree = useMemo(() => filterTree(treeData, searchTerm), [treeData, searchTerm]);

  // 검색 시 자동으로 매치된 노드들 확장
  useEffect(() => {
    if (searchTerm.trim()) {
      const newAutoExpanded = new Set<string>();
      
      const expandMatchingNodes = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            newAutoExpanded.add(node.fullPath);
            expandMatchingNodes(node.children);
          }
        });
      };

      expandMatchingNodes(filteredTree);
      setAutoExpandedNodes(newAutoExpanded);
    } else {
      setAutoExpandedNodes(new Set());
    }
  }, [searchTerm, filteredTree]);

  const toggleExpanded = (fullPath: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(fullPath)) {
      newExpanded.delete(fullPath);
    } else {
      newExpanded.add(fullPath);
    }
    setExpandedNodes(newExpanded);
  };

  const isExpanded = (fullPath: string) => {
    return expandedNodes.has(fullPath) || autoExpandedNodes.has(fullPath);
  };

  const handleNodeClick = (node: TreeNode, isSelectAction: boolean = false) => {
    // Shift 키를 누르고 클릭하거나 isSelectAction이 true면 선택
    // 그렇지 않으면 primitive 타입은 바로 선택, 다른 타입은 토글
    if (isSelectAction || node.type === 'primitive') {
      // 값 선택 - 전체 경로 반환
      onSelect(node.fullPath);
      onClose();
    } else {
      // 폴더 토글
      toggleExpanded(node.fullPath);
    }
  };

  const renderTreeNode = (node: TreeNode, isLastChild: boolean = false, _parentPath: string[] = []) => {
    const expanded = isExpanded(node.fullPath);
    const hasChildren = node.children && node.children.length > 0;
    const isSelectable = true; // 모든 타입 선택 가능
    const isCurrentSelected = selectedKey === node.key;
    const valueInfo = formatValue(node.value, node.type);

    return (
      <div key={node.fullPath} className="select-none relative">
        {/* 트리 구조 가이드라인 */}
        {node.level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
            {/* 레벨별 가이드라인 */}
            {Array.from({ length: node.level }, (_, i) => (
              <div
                key={`guide-${i}`}
                className="absolute"
                style={{ left: `${i * 20 + 8}px` }}
              >
                {/* 수직 가이드라인 */}
                <div 
                  className="w-px bg-gray-200 dark:bg-gray-600"
                  style={{
                    height: i === node.level - 1 && isLastChild ? '50%' : '100%',
                    opacity: 0.6
                  }}
                />
                
                {/* 현재 레벨의 연결선 */}
                {i === node.level - 1 && (
                  <div 
                    className="absolute h-px bg-gray-300 dark:bg-gray-500"
                    style={{
                      top: '50%',
                      left: '0px',
                      width: '16px',
                      opacity: 0.8
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className={`relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
            isCurrentSelected && isSelectable
              ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-500 shadow-sm'
              : isSelectable
                ? 'border-green-200 dark:border-green-700/50 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm'
                : node.type === 'object'
                  ? 'border-blue-200 dark:border-blue-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600'
                  : node.type === 'array'
                    ? 'border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
          style={{ paddingLeft: `${node.level * 20 + 12}px`, marginLeft: '0px' }}
          onClick={(e) => {
            // Shift 키를 누르고 클릭하면 확장/축소가 아닌 선택 동작
            const isSelectAction = e.shiftKey || node.type === 'primitive';
            handleNodeClick(node, isSelectAction);
          }}
        >
          {/* 확장/축소 아이콘 */}
          <div className="w-4 h-4 flex items-center justify-center mt-0.5">
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              )
            ) : null}
          </div>

          {/* 타입 아이콘 */}
          <div className="mt-0.5">
            {getTypeIcon(node, expanded)}
          </div>

          {/* 키 이름과 값 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100 break-words">
                {node.key}
              </span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full break-all">
                {node.fullPath}
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-tight break-words whitespace-pre-wrap overflow-wrap-anywhere">
              {valueInfo.display}
            </div>
            {valueInfo.isTruncated && (
              <div className="mt-2 flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewFullData(node);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  전체 보기
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const copyText = node.type === 'primitive' && typeof node.value === 'string' 
                      ? node.value 
                      : JSON.stringify(node.value, null, 2);
                    handleCopyToClipboard(copyText);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  복사
                </button>
              </div>
            )}
          </div>

          {/* 선택 가능 표시 및 버튼 */}
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation(); // 부모 클릭 이벤트 방지
                handleNodeClick(node, true);
              }}
              className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
            >
              선택
            </button>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {node.type === 'primitive' ? '또는 클릭' : '또는 Shift+클릭'}
              </span>
            </div>
          </div>
        </div>

        {/* 자식 노드들 */}
        {hasChildren && expanded && (
          <div>
            {node.children!.map((child, index) => 
              renderTreeNode(
                child, 
                index === node.children!.length - 1, // isLastChild
                node.path // parentPath
              )
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="키 이름이나 값으로 검색... (예: name, 김철수)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
          {filteredTree.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">
                {searchTerm ? '🔍' : '📂'}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? '검색 결과가 없습니다.' : '선택 가능한 키가 없습니다.'}
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-blue-500 hover:text-blue-600 text-sm"
                >
                  검색어 지우기
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTree.map((node, index) => 
                renderTreeNode(
                  node, 
                  index === filteredTree.length - 1, // isLastChild
                  [] // parentPath (root level)
                )
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {filteredTree.length > 0 ? (
                <>💡 값은 클릭, 객체/배열은 Shift+클릭으로 선택</>
              ) : searchTerm ? (
                <>🔍 검색 결과 없음</>
              ) : (
                <>🌳 트리를 탐색하여 원하는 값을 찾으세요</>
              )}
            </div>
            <div className="flex gap-2">
              {(searchTerm || expandedNodes.size > 0) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setExpandedNodes(new Set());
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                >
                  초기화
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* 전체 데이터 보기 모달 */}
    {viewDataModal.isOpen && viewDataModal.node && (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
          {/* 모달 헤더 */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {viewDataModal.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  경로: {viewDataModal.node.fullPath}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const copyText = viewDataModal.node.type === 'primitive' && typeof viewDataModal.node.value === 'string' 
                    ? viewDataModal.node.value 
                    : JSON.stringify(viewDataModal.node.value, null, 2);
                  handleCopyToClipboard(copyText);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                복사
              </button>
              <button
                onClick={() => setViewDataModal({ isOpen: false, node: null, title: '' })}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 모달 내용 */}
          <div className="flex-1 overflow-hidden p-5">
            <div className="h-full border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <pre className="h-full overflow-auto p-4 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-words">
                {viewDataModal.node.type === 'primitive' && typeof viewDataModal.node.value === 'string' 
                  ? viewDataModal.node.value 
                  : JSON.stringify(viewDataModal.node.value, null, 2)}
              </pre>
            </div>
          </div>

          {/* 모달 푸터 */}
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                💡 전체 JSON 데이터를 확인하고 복사할 수 있습니다
              </div>
              <button
                onClick={() => setViewDataModal({ isOpen: false, node: null, title: '' })}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default HierarchicalKeySelector;