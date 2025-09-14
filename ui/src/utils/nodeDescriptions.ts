/**
 * 노드 타입별 기본 description을 관리하는 유틸리티
 * CustomNode 툴팁과 NodeInspector에서 공통으로 사용
 */

export const getNodeDescription = (nodeType: string): string => {
  const descriptions: Record<string, string> = {
    'startNode': 'A start node in the workflow',
    'promptNode': 'A prompt node for user input and AI responses',
    'systemPromptNode': 'A system prompt node for defining system behavior',
    'functionNode': 'A function node for executing custom logic',
    'endNode': 'An end node that terminates the workflow',
    'agentNode': 'An agent node for AI agent interactions',
    'conditionNode': 'A condition node for workflow branching',
    'toolNode': 'A tool node for external tool integration',
    'toolsMemoryNode': 'A tools and memory management node',
    'ragNode': 'A RAG node for retrieval-augmented generation',
    'mergeNode': 'A merge node for combining multiple inputs',
    'userNode': 'A user interaction node',
    'groupsNode': 'A groups node for managing collections'
  };
  
  return descriptions[nodeType] || 'A workflow node';
};

/**
 * nodeCategories에서 사용할 description을 반환
 * CustomNode의 description과 동일하게 유지
 */
export const getNodeCategoryDescription = (nodeType: string): string => {
  const categoryDescriptions: Record<string, string> = {
    'promptNode': 'A prompt node for user input and AI responses',
    'systemPromptNode': 'A system prompt node for defining system behavior',
    'agentNode': 'An agent node for AI agent interactions',
    'conditionNode': 'A condition node for workflow branching',
    'functionNode': 'A function node for executing custom logic',
    'toolsMemoryNode': 'A tools and memory management node',
    'mergeNode': 'A merge node for combining multiple inputs',
    'ragNode': 'A RAG node for retrieval-augmented generation',
    'userNode': 'A user interaction node',
    'startNode': 'A start node in the workflow',
    'endNode': 'An end node that terminates the workflow'
  };
  
  return categoryDescriptions[nodeType] || 'A workflow node';
};
