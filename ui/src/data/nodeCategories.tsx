import React from 'react';
import { 
  Bot, Split, MessageSquare, Settings, Group, GitMerge,
  Database, Cpu
} from 'lucide-react';
import { getNodeCategoryDescription } from '../utils/nodeDescriptions';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../locales';

export interface NodeItem {
  type: string;
  label: string;
  description: string;
  icon: (className?: string, isDarkMode?: boolean) => React.ReactNode;
}

export interface NodeCategory {
  id: string;
  title: string;
  nodes: NodeItem[];
}

// 아이콘 색상을 반환하는 함수
const getIconColor = (nodeType: string, isDarkMode: boolean = false) => {
  const colors: Record<string, { light: string; dark: string }> = {
    'promptNode': { light: '#F7CB15', dark: '#F7CB15' },
    'agentNode': { light: '#3b82f6', dark: '#60a5fa' },
    'conditionNode': { light: '#f59e0b', dark: '#fbbf24' },
    'functionNode': { light: '#5B5F97', dark: '#5B5F97' },
    'toolsMemoryNode': { light: '#6b7280', dark: '#9ca3af' },
    'mergeNode': { light: '#FF6B6C', dark: '#FF6B6C' }
  };
  
  const color = colors[nodeType];
  return color ? (isDarkMode ? color.dark : color.light) : '#6b7280';
};

// 노드 카테고리를 동적으로 생성하는 함수
export const getNodeCategories = (): NodeCategory[] => {
  const language = useLanguageStore.getState().language;
  const t = translations[language];
  
  return [
    {
      id: 'workflow',
      title: t.node.workflowNode,
      nodes: [
        {
          type: 'promptNode',
          label: t.node.prompt,
          description: getNodeCategoryDescription('promptNode'),
          icon: (className = '', isDarkMode = false) => (
            <MessageSquare size={20} className={className} style={{ color: getIconColor('promptNode', isDarkMode) }} />
          )
        },
        {
          type: 'agentNode',
          label: t.node.agent,
          description: getNodeCategoryDescription('agentNode'),
          icon: (className = '', isDarkMode = false) => (
            <Bot size={20} className={className} style={{ color: getIconColor('agentNode', isDarkMode) }} />
          )
        },
        {
          type: 'conditionNode',
          label: t.node.condition,
          description: getNodeCategoryDescription('conditionNode'),
          icon: (className = '', isDarkMode = false) => (
            <Split size={20} className={className} style={{ color: getIconColor('conditionNode', isDarkMode) }} />
          )
        },
        {
          type: 'functionNode',
          label: t.node.customPythonFunction,
          description: getNodeCategoryDescription('functionNode'),
          icon: (className = '', isDarkMode = false) => (
            <Database size={20} className={className} style={{ color: getIconColor('functionNode', isDarkMode) }} />
          )
        },
        {
          type: 'toolsMemoryNode',
          label: t.node.toolsAndMemory,
          description: getNodeCategoryDescription('toolsMemoryNode'),
          icon: (className = '', isDarkMode = false) => (
            <Group size={20} className={className} style={{ color: getIconColor('toolsMemoryNode', isDarkMode) }} />
          )
        },
        {
          type: 'mergeNode',
          label: t.node.merge,
          description: getNodeCategoryDescription('mergeNode'),
          icon: (className = '', isDarkMode = false) => (
            <GitMerge size={20} className={className} style={{ color: getIconColor('mergeNode', isDarkMode) }} />
          )
        }
      ]
    }
  ];
};

// 하위 호환성을 위해 기본 export 유지
export const nodeCategories = getNodeCategories();