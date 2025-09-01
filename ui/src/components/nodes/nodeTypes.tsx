import React from 'react';
import { 
  Bot, Split, FileCode, Play, Square, MessageSquare, Settings, Group, GitMerge,
  Database, Cpu, Code
} from 'lucide-react';
import { CustomNode } from './CustomNode';

const AgentNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Bot size={20} />,
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
      icon: <Split size={20} />,
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
      icon: <Database size={20} />,
      nodeType: 'functionNode',
      description: 'Data processing and storage node'
    }}
  />
);

const StartNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Play size={20} />,
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
      icon: <Square size={20} />,
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
      icon: <MessageSquare size={20} />,
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
      icon: <Settings size={20} />,
      nodeType: 'systemPromptNode',
      description: 'Define system and user prompts for LLM interaction'
    }}
  />
);

const ToolsMemoryNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Group size={20} />,
      nodeType: 'toolsMemoryNode',
      description: 'Tools and Memory groups management'
    }}
  />
);

const EmbeddingNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Database size={20} />,
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
      icon: <Database size={20} />,
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
      icon: <GitMerge size={20} />,
      nodeType: 'mergeNode',
      description: 'Merge inputs from multiple nodes'
    }}
  />
);

const UserNode = (props: any) => (
  <CustomNode
    {...props}
    data={{
      ...props.data,
      icon: <Database size={20} />,
      nodeType: 'userNode',
      description: 'User-defined custom node'
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
  toolsMemoryNode: ToolsMemoryNode,
  embeddingNode: EmbeddingNode,
  ragNode: RAGNode,
  mergeNode: MergeNode,
  userNode: UserNode,
};