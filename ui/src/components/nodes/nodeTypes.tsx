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
      nodeType: 'agentNode'
    }}
  />
);

const ConditionNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Split size={20} />,
      nodeType: 'conditionNode'
    }}
  />
);

const FunctionNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Database size={20} />,
      nodeType: 'functionNode'
    }}
  />
);

const StartNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Play size={20} />,
      nodeType: 'startNode'
    }}
  />
);

const EndNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Square size={20} />,
      nodeType: 'endNode'
    }}
  />
);

const PromptNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <MessageSquare size={20} />,
      nodeType: 'promptNode'
    }}
  />
);

const SystemPromptNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Settings size={20} />,
      nodeType: 'systemPromptNode'
    }}
  />
);

const ToolsMemoryNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Group size={20} />,
      nodeType: 'toolsMemoryNode'
    }}
  />
);


const RAGNode = (props: any) => (
  <CustomNode 
    {...props}
    data={{
      ...props.data,
      icon: <Database size={20} />,
      nodeType: 'ragNode'
    }}
  />
);

const MergeNode = (props: any) => (
  <CustomNode
    {...props}
    data={{
      ...props.data,
      icon: <GitMerge size={20} />,
      nodeType: 'mergeNode'
    }}
  />
);

const UserNode = (props: any) => (
  <CustomNode
    {...props}
    data={{
      ...props.data,
      icon: <Database size={20} />,
      nodeType: 'userNode'
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
  ragNode: RAGNode,
  mergeNode: MergeNode,
  userNode: UserNode,
};