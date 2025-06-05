import React from 'react';
import { 
  Bot, Split, FileCode, Play, Square, MessageSquare, Settings, Group, GitMerge,
  Database, Cpu
} from 'lucide-react';

export interface NodeItem {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
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
        type: 'startNode',
        label: 'Start',
        description: 'Starting point of the workflow',
        icon: <Play size={20} />
      },
      {
        type: 'endNode',
        label: 'End',
        description: 'End of workflow',
        icon: <Square size={20} />
      },
      {
        type: 'promptNode',
        label: 'Prompt',
        description: 'Define a prompt template for LLM interaction',
        icon: <MessageSquare size={20} />
      },
      {
        type: 'systemPromptNode',
        label: 'System Prompt',
        description: 'Define system and user prompts for LLM interaction',
        icon: <Settings size={20} />
      },
      {
        type: 'agentNode',
        label: 'Agent',
        description: 'Agent that can execute tools',
        icon: <Bot size={20} />
      },
      {
        type: 'conditionNode',
        label: 'Condition',
        description: 'Conditional function to determine which route to take next',
        icon: <Split size={20} />
      },
      {
        type: 'functionNode',
        label: 'Custom Python Function',
        description: 'Execute custom Python function',
        icon: <FileCode size={20} />
      },
      {
        type: 'groupsNode',
        label: 'Groups',
        description: 'Organize and manage node groups',
        icon: <Group size={20} />
      },
      {
        type: 'mergeNode',
        label: 'Merge',
        description: 'Merge inputs from multiple nodes',
        icon: <GitMerge size={20} />
      }
    ]
  },
  {
    id: 'rag',
    title: 'RAG Nodes',
    nodes: [
      {
        type: 'embeddingNode',
        label: 'Embedding',
        description: 'Generate embeddings from text using configured models',
        icon: <Cpu size={20} />
      },
      {
        type: 'ragNode',
        label: 'RAG',
        description: 'Retrieval-Augmented Generation using vector store',
        icon: <Database size={20} />
      }
    ]
  }
];