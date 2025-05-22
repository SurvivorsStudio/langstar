import React from 'react';
import { 
  Bot, Split, FileCode, Play, Square, MessageSquare, Settings, Group, GitMerge,
  Database, Cpu
} from 'lucide-react';
import { CustomNode } from './CustomNode';

const AgentNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Bot size={16} />,
      nodeType: 'agentNode',
      description: 'Agent that can execute tools'
    }}
  />
);

const ConditionNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Split size={16} />,
      nodeType: 'conditionNode',
      description: 'Conditional function to determine which route to take next'
    }}
  />
);

const FunctionNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <FileCode size={16} />,
      nodeType: 'functionNode',
      description: 'Execute custom Python function'
    }}
  />
);

const StartNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Play size={16} />,
      nodeType: 'startNode',
      description: 'Starting point of the workflow'
    }}
  />
);

const EndNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Square size={16} />,
      nodeType: 'endNode',
      description: 'End of workflow'
    }}
  />
);

const PromptNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <MessageSquare size={16} />,
      nodeType: 'promptNode',
      description: 'Define a prompt template for LLM interaction'
    }}
  />
);

const SystemPromptNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Settings size={16} />,
      nodeType: 'systemPromptNode',
      description: 'Define system and user prompts for LLM interaction'
    }}
  />
);

const GroupsNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Group size={16} />,
      nodeType: 'groupsNode',
      description: 'Organize and manage node groups'
    }}
  />
);

const EmbeddingNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Cpu size={16} />,
      nodeType: 'embeddingNode',
      description: 'Generate embeddings from text using configured models'
    }}
  />
);

const RAGNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Database size={16} />,
      nodeType: 'ragNode',
      description: 'Retrieval-Augmented Generation using vector store'
    }}
  />
);

const MergeNode = (props: any) => (
  <CustomNode
    {...props}
    data={{
      ...props.data,
      icon: <GitMerge size={16} />, // nodeCategories.tsx와 아이콘 일치, 크기 조정
      nodeType: 'mergeNode',
      description: 'Merge inputs from multiple nodes' // nodeCategories.tsx와 설명 일치
    }}
  />
);

export const nodeTypes = {
  agentNode: AgentNode,
  conditionNode: ConditionNode,
  functionNode: FunctionNode,
  startNode: StartNode,
  endNode: EndNode,
  promptNode: PromptNode,
  systemPromptNode: SystemPromptNode,
  groupsNode: GroupsNode,
  embeddingNode: EmbeddingNode,
  ragNode: RAGNode,
  mergeNode: MergeNode, // MergeNode 추가
};