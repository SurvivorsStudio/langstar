import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, List, Hash, Type, ToggleLeft, Calendar, Copy, Search, X } from 'lucide-react';

interface JsonTreeViewerProps {
  data: Record<string, any> | any[];
  title?: string;
  collapsed?: boolean;
  showCopyButton?: boolean;
  maxHeight?: string;
  className?: string;
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

const JsonTreeViewer: React.FC<JsonTreeViewerProps> = ({
  data,
  title = "JSON Data",
  collapsed = false,
  showCopyButton = true,
  maxHeight = "400px",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [autoExpandedNodes, setAutoExpandedNodes] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  useEffect(() => {
    if (!collapsed && !searchTerm.trim()) {
      // 기본적으로 첫 번째 레벨까지 확장
      const firstLevelNodes = new Set<string>();
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          firstLevelNodes.add(key);
        });
      }
      setExpandedNodes(firstLevelNodes);
    }
  }, [data, collapsed, searchTerm]);

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

  const formatValue = (value: any, type: 'object' | 'array' | 'primitive') => {
    switch (type) {
      case 'object':
        const keys = Object.keys(value);
        const keyNames = keys.slice(0, 3).join(', ');
        const moreKeys = keys.length > 3 ? `, +${keys.length - 3}개 더` : '';
        return `{${keys.length}개 키: ${keyNames}${moreKeys}}`;
      case 'array':
        const preview = value.slice(0, 2).map((item: any) => {
          if (typeof item === 'string') return `"${item.length > 10 ? item.substring(0, 10) + '...' : item}"`;
          return JSON.stringify(item);
        }).join(', ');
        const moreItems = value.length > 2 ? `, +${value.length - 2}개 더` : '';
        return `[${value.length}개 항목: ${preview}${moreItems}]`;
      case 'primitive':
        const valueType = typeof value;
        if (valueType === 'string') {
          if (value.length > 60) {
            return `"${value.substring(0, 60)}..." (${value.length}자)`;
          }
          return `"${value}" (문자열, ${value.length}자)`;
        } else if (valueType === 'number') {
          return `${value} (숫자)`;
        } else if (valueType === 'boolean') {
          return `${value} (불린)`;
        } else if (value === null) {
          return 'null';
        } else if (value === undefined) {
          return 'undefined';
        } else {
          return `${JSON.stringify(value)} (${valueType})`;
        }
    }
  };

  // 경로를 올바른 형태로 변환하는 헬퍼 함수
  const buildFullPath = (pathArray: string[]): string => {
    if (pathArray.length === 0) return '';
    
    let result = pathArray[0];
    for (let i = 1; i < pathArray.length; i++) {
      const segment = pathArray[i];
      if (segment.startsWith('[') && segment.endsWith(']')) {
        result += segment;
      } else {
        result += '.' + segment;
      }
    }
    return result;
  };

  // JSON 데이터를 트리 구조로 변환
  const buildTree = (obj: any, parentPath: string[] = [], level: number = 0): TreeNode[] => {
    if (!obj || typeof obj !== 'object') return [];

    if (Array.isArray(obj)) {
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
      if (node.key.toLowerCase().includes(searchLower)) return true;
      
      if (node.type === 'primitive') {
        const valueStr = String(node.value).toLowerCase();
        if (valueStr.includes(searchLower)) return true;
      }
      
      if (node.fullPath.toLowerCase().includes(searchLower)) return true;
      
      return false;
    };

    const filterRecursive = (node: TreeNode): TreeNode | null => {
      const nodeMatches = matchesSearch(node);
      let filteredChildren: TreeNode[] = [];

      if (node.children) {
        filteredChildren = node.children
          .map(child => filterRecursive(child))
          .filter((child): child is TreeNode => child !== null);
      }

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

  const handleNodeClick = (node: TreeNode) => {
    if (node.type !== 'primitive') {
      toggleExpanded(node.fullPath);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const renderTreeNode = (node: TreeNode, isLastChild: boolean = false) => {
    const expanded = isExpanded(node.fullPath);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.fullPath} className="select-none relative">
        {/* 트리 구조 가이드라인 */}
        {node.level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
            {Array.from({ length: node.level }, (_, i) => (
              <div
                key={`guide-${i}`}
                className="absolute"
                style={{ left: `${i * 20 + 8}px` }}
              >
                <div 
                  className="w-px bg-gray-200 dark:bg-gray-600"
                  style={{
                    height: i === node.level - 1 && isLastChild ? '50%' : '100%',
                    opacity: 0.6
                  }}
                />
                
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
          className={`relative flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
            node.type === 'object'
              ? 'border-blue-200 dark:border-blue-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600'
              : node.type === 'array'
                ? 'border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600'
                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
          style={{ paddingLeft: `${node.level * 20 + 12}px`, marginLeft: '0px' }}
          onClick={() => handleNodeClick(node)}
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
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {node.key}
              </span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                {node.fullPath}
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
              {formatValue(node.value, node.type)}
            </div>
          </div>
        </div>

        {/* 자식 노드들 */}
        {hasChildren && expanded && (
          <div>
            {node.children!.map((child, index) => 
              renderTreeNode(
                child, 
                index === node.children!.length - 1
              )
            )}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className={`border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {title}
            </span>
          </div>
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
              title="Copy JSON"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {title}
          </span>
        </div>
        {showCopyButton && (
          <button
            onClick={handleCopy}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
            title="Copy JSON"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="키 이름이나 값으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
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
      <div className="overflow-y-auto p-3" style={{ maxHeight }}>
        {filteredTree.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">
              {searchTerm ? '🔍' : '📂'}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm ? '검색 결과가 없습니다.' : '표시할 데이터가 없습니다.'}
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
              >
                검색어 지우기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map((node, index) => 
              renderTreeNode(
                node, 
                index === filteredTree.length - 1
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonTreeViewer;
