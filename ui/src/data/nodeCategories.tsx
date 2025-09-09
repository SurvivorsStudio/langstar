import React from 'react';
import { 
  Bot, Split, MessageSquare, Settings, Group, GitMerge,
  Database, Cpu
} from 'lucide-react';
import { getNodeCategoryDescription } from '../utils/nodeDescriptions';

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

export const nodeCategories: NodeCategory[] = [
  {
    id: 'workflow',
    title: 'Workflow Nodes',
    nodes: [
      {
        type: 'promptNode',
        label: 'Prompt',
        description: getNodeCategoryDescription('promptNode'),
        icon: (className = '', isDarkMode = false) => (
          <MessageSquare size={20} className={className} style={{ color: getIconColor('promptNode', isDarkMode) }} />
        )
      },
      // {
      //   type: 'systemPromptNode',
      //   label: 'System Prompt',
      //   description: 'Define system and user prompts for LLM interaction',
      //   icon: (className = '') => <Settings size={20} className={className} />
      // },
      {
        type: 'agentNode',
        label: 'Agent',
        description: getNodeCategoryDescription('agentNode'),
        icon: (className = '', isDarkMode = false) => (
          <Bot size={20} className={className} style={{ color: getIconColor('agentNode', isDarkMode) }} />
        )
      },
      {
        type: 'conditionNode',
        label: 'Condition',
        description: getNodeCategoryDescription('conditionNode'),
        icon: (className = '', isDarkMode = false) => (
          <Split size={20} className={className} style={{ color: getIconColor('conditionNode', isDarkMode) }} />
        )
      },
      {
        type: 'functionNode',
        label: 'Custom Python Function',
        description: getNodeCategoryDescription('functionNode'),
        icon: (className = '', isDarkMode = false) => (
          <Database size={20} className={className} style={{ color: getIconColor('functionNode', isDarkMode) }} />
        )
      },
      {
        type: 'toolsMemoryNode',
        label: 'Tools&Memory',
        description: getNodeCategoryDescription('toolsMemoryNode'),
        icon: (className = '', isDarkMode = false) => (
          <Group size={20} className={className} style={{ color: getIconColor('toolsMemoryNode', isDarkMode) }} />
        )
      },
      {
        type: 'mergeNode',
        label: 'Merge',
        description: getNodeCategoryDescription('mergeNode'),
        icon: (className = '', isDarkMode = false) => (
          <GitMerge size={20} className={className} style={{ color: getIconColor('mergeNode', isDarkMode) }} />
        )
      }
    ]
  }
  // {
  //   id: 'rag',
  //   title: 'RAG Nodes',
  //   nodes: [
  //     {
  //       type: 'embeddingNode',
  //       label: 'Embedding',
  //       description: 'Generate embeddings from text using configured models',
  //       icon: (className = '') => <Cpu size={20} className={className} />
  //     },
  //     {
  //       type: 'ragNode',
  //       label: 'RAG',
  //       description: 'Retrieval-Augmented Generation using vector store',
  //       icon: (className = 'className' />
  //     }
  //   ]
  // }
];