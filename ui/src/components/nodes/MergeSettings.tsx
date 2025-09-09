import React, { useState, useEffect, useMemo } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { PlusCircle, Trash2, Search } from 'lucide-react';
import { nanoid } from 'nanoid';
import CustomSelect from '../Common/CustomSelect';
import HierarchicalKeySelector from '../Common/HierarchicalKeySelector';

interface MergeMapping {
  id: string;
  outputKey: string;
  sourceNodeId: string;
  sourceNodeKey: string;
  // sourceNodeLabel is not stored, derived for display
}

interface MergeSettingsProps {
  nodeId: string;
}


const MergeSettings: React.FC<MergeSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const currentNode = nodes.find(n => n.id === nodeId);

  const [mappings, setMappings] = useState<MergeMapping[]>(currentNode?.data.config?.mergeMappings || []);
  const [isKeySelectorOpen, setIsKeySelectorOpen] = useState(false);
  const [currentSelectingMapping, setCurrentSelectingMapping] = useState<string | null>(null);

  useEffect(() => {
    setMappings(currentNode?.data.config?.mergeMappings || []);
  }, [currentNode?.data.config?.mergeMappings]);

  // 사용 가능한 소스 노드들 생성
  const availableSourceNodes = useMemo(() => {
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    return incomingEdges
      .map(edge => nodes.find(n => n.id === edge.source))
      .filter(node => node && node.data.output && typeof node.data.output === 'object')
      .map(node => ({
        value: node!.id,
        label: node!.data.label,
      }));
  }, [nodeId, nodes, edges]);

  // 선택된 노드의 사용 가능한 키들 생성
  const getAvailableKeysForNode = (nodeId: string) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode || !sourceNode.data.output || typeof sourceNode.data.output !== 'object') {
      return [];
    }
    
    return Object.keys(sourceNode.data.output).map(key => ({
      value: key,
      label: key,
    }));
  };

  // 트리뷰를 사용할지 결정하는 함수
  const shouldUseTreeView = (nodeId: string) => {
    if (!nodeId) return false;
    
    const sourceNode = nodes.find(n => n.id === nodeId);
    const output = sourceNode?.data?.output;
    if (!output) return false;
    
    // 데이터가 있으면 항상 새로운 트리뷰 사용 (훨씬 좋은 UX)
    return Object.keys(output).length > 0;
  };

  // 선택된 노드의 전체 데이터 가져오기 (계층적 선택을 위해)
  const getSelectedNodeData = (nodeId: string) => {
    if (!nodeId) return {};
    
    const sourceNode = nodes.find(n => n.id === nodeId);
    return sourceNode?.data?.output || {};
  };

  // 계층적 선택기 열기
  const openKeySelector = (mappingId: string) => {
    setCurrentSelectingMapping(mappingId);
    setIsKeySelectorOpen(true);
  };

  // 계층적 선택기에서 키 선택 처리
  const handleKeySelect = (key: string) => {
    if (currentSelectingMapping) {
      const mappingIndex = mappings.findIndex(m => m.id === currentSelectingMapping);
      if (mappingIndex !== -1) {
        handleMappingChange(mappingIndex, 'sourceNodeKey', key);
      }
    }
    setIsKeySelectorOpen(false);
    setCurrentSelectingMapping(null);
  };

  const handleAddMapping = () => {
    const newMapping: MergeMapping = {
      id: nanoid(),
      outputKey: '',
      sourceNodeId: '',
      sourceNodeKey: '',
    };
    const updatedMappings = [...mappings, newMapping];
    setMappings(updatedMappings);
    updateNodeData(nodeId, {
      ...currentNode!.data,
      config: { ...currentNode!.data.config, mergeMappings: updatedMappings },
    });
  };

  const handleMappingChange = (index: number, field: keyof MergeMapping, value: string) => {
    const updatedMappings = mappings.map((m, i) => {
      if (i === index) {
        if (field === 'sourceNodeId') {
          // 노드가 변경되면 sourceNodeKey를 초기화
          return { ...m, sourceNodeId: value, sourceNodeKey: '' };
        }
        return { ...m, [field]: value };
      }
      return m;
    });
    setMappings(updatedMappings);
    updateNodeData(nodeId, {
      ...currentNode!.data,
      config: { ...currentNode!.data.config, mergeMappings: updatedMappings },
    });
  };

  const handleRemoveMapping = (id: string) => {
    const updatedMappings = mappings.filter(m => m.id !== id);
    setMappings(updatedMappings);
    updateNodeData(nodeId, {
      ...currentNode!.data,
      config: { ...currentNode!.data.config, mergeMappings: updatedMappings },
    });
  };


  if (!currentNode) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Merge Mappings</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Define how incoming data should be merged. Specify an output key and select the source data.
      </p>
      {mappings.map((mapping, index) => (
        <div key={mapping.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md space-y-2 bg-gray-50 dark:bg-gray-700">
          {/* Output Key 입력 필드 */}
          <div>
            <label htmlFor={`output-key-${mapping.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Output Key</label>
            <input
              type="text"
              id={`output-key-${mapping.id}`}
              placeholder="Output Key"
              value={mapping.outputKey}
              onChange={(e) => handleMappingChange(index, 'outputKey', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          {/* Source Node 선택 드롭다운 */}
          <div>
            <label htmlFor={`source-node-${mapping.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Source Node</label>
            <CustomSelect
              value={mapping.sourceNodeId}
              onChange={value => handleMappingChange(index, 'sourceNodeId', value)}
              options={availableSourceNodes}
              placeholder="Select Source Node"
            />
          </div>
          {/* Source Value 선택 드롭다운 */}
          <div>
            <label htmlFor={`source-value-${mapping.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Source Value</label>
            
            {shouldUseTreeView(mapping.sourceNodeId) ? (
              /* 데이터가 있는 경우 - 향상된 트리뷰 선택기 사용 */
              <button
                type="button"
                onClick={() => openKeySelector(mapping.id)}
                disabled={!mapping.sourceNodeId}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center justify-between ${
                  !mapping.sourceNodeId
                    ? 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <span>
                  {mapping.sourceNodeKey || 'Select Source Value'}
                </span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>
            ) : (
              /* 데이터가 없는 경우 - 기존 CustomSelect 사용 */
              <CustomSelect
                value={mapping.sourceNodeKey}
                onChange={value => handleMappingChange(index, 'sourceNodeKey', value)}
                options={getAvailableKeysForNode(mapping.sourceNodeId)}
                placeholder="Select Source Value"
                disabled={!mapping.sourceNodeId}
              />
            )}
          </div>
          {/* 삭제 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={() => handleRemoveMapping(mapping.id)}
              className="p-1 text-red-500 hover:text-red-700 mt-1"
              title="Remove mapping"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={handleAddMapping}
        className="flex items-center px-3 py-1.5 border border-dashed border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
      >
        <PlusCircle size={16} className="mr-2" />
        Add Mapping
      </button>
      {availableSourceNodes.length === 0 && mappings.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
          No input data available from connected nodes. Connect and execute preceding nodes to populate source options.
        </p>
      )}

      {/* 계층적 키 선택기 팝업 */}
      <HierarchicalKeySelector
        isOpen={isKeySelectorOpen}
        onClose={() => {
          setIsKeySelectorOpen(false);
          setCurrentSelectingMapping(null);
        }}
        data={currentSelectingMapping ? getSelectedNodeData(mappings.find(m => m.id === currentSelectingMapping)?.sourceNodeId || '') : {}}
        onSelect={handleKeySelect}
        title="키 선택 - Source Value"
        selectedKey={currentSelectingMapping ? mappings.find(m => m.id === currentSelectingMapping)?.sourceNodeKey : undefined}
        pathStyle="python"
      />
    </div>
  );
};

export default MergeSettings;