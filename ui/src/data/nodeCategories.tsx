import React from 'react';
import { 
  Bot, Split, FileCode, MessageSquare, Settings, Group, GitMerge,
  Database, Cpu, FolderOpen
} from 'lucide-react';

export interface NodeItem {
  type: string;
  label: string;
  description: string;
  icon: (className?: string) => React.ReactNode;
}

export interface NodeCategory {
  id: string;
  title: string;
  nodes: NodeItem[];
}

export const nodeCategories: NodeCategory[] = [
  {
    id: 'workflow',
    title: 'Workflow Nodes',
    nodes: [
      {
        type: 'promptNode',
        label: 'Prompt',
        description: 'Define a prompt template for LLM interaction',
        icon: (className = '') => <MessageSquare size={20} className={className} />
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
        description: 'Agent that can execute tools',
        icon: (className = '') => <Bot size={20} className={className} />
      },
      {
        type: 'conditionNode',
        label: 'Condition',
        description: 'Conditional function to determine which route to take next',
        icon: (className = '') => <Split size={20} className={className} />
      },
      {
        type: 'functionNode',
        label: 'Custom Python Function',
        description: 'Execute custom Python function',
        icon: (className = '') => <FileCode size={20} className={className} />
      },
      {
        type: 'toolsMemoryNode',
        label: 'Tools&Memory',
        description: 'Tools and Memory groups management',
        icon: (className = '') => <FolderOpen size={20} className={className} />
      },
      {
        type: 'mergeNode',
        label: 'Merge',
        description: 'Merge inputs from multiple nodes',
        icon: (className = '') => <GitMerge size={20} className={className} />
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
  //       icon: (className = '') => <Database size={20} className={className} />
  //     }
  //   ]
  // }
];