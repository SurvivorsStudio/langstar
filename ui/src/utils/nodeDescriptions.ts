import { useLanguageStore } from '../store/languageStore';
import { translations } from '../locales';

/**
 * 노드 타입별 기본 description을 관리하는 유틸리티
 * CustomNode 툴팁과 NodeInspector에서 공통으로 사용
 */

export const getNodeDescription = (nodeType: string): string => {
  const language = useLanguageStore.getState().language;
  const t = translations[language];
  
  const descriptionMap: Record<string, string> = {
    'startNode': t.node.startNodeDesc,
    'promptNode': t.node.promptNodeDesc,
    'functionNode': t.node.functionNodeDesc,
    'endNode': t.node.endNodeDesc,
    'agentNode': t.node.agentNodeDesc,
    'conditionNode': t.node.conditionNodeDesc,
    'toolsMemoryNode': t.node.toolsMemoryNodeDesc,
    'mergeNode': t.node.mergeNodeDesc,
    'userNode': t.node.userNodeDesc,
  };
  
  return descriptionMap[nodeType] || t.node.startNodeDesc;
};

/**
 * nodeCategories에서 사용할 description을 반환
 * CustomNode의 description과 동일하게 유지
 */
export const getNodeCategoryDescription = (nodeType: string): string => {
  return getNodeDescription(nodeType);
};
