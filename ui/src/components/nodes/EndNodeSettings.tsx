import React, { useState, useEffect, useCallback } from 'react';
import { useFlowStore, NodeData, Edge } from '../../store/flowStore'; // Edge 타입 import
import { AlertCircle } from 'lucide-react'; // 아이콘 import

interface EndNodeSettingsProps {
  nodeId: string;
}

const EndNodeSettings: React.FC<EndNodeSettingsProps> = ({ nodeId }) => {
  const { getNodeById, updateNodeData, edges } = useFlowStore(); // edges 추가
  const currentNode = getNodeById(nodeId);

  const [selectedKeyName, setSelectedKeyName] = useState<string>('');
  const [displayedValue, setDisplayedValue] = useState<string>('N/A');
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debounced = (...args: Parameters<F>) => {
      if (timeout !== null) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), waitFor);
    };
    return debounced as (...args: Parameters<F>) => ReturnType<F>;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateNodeData = useCallback(
    debounce((partialUpdate: Partial<NodeData>) => {
      if (currentNode) {
        const currentData = currentNode.data;
        let newConfig = currentData.config;

        if (partialUpdate.config) {
          newConfig = { ...currentData.config, ...partialUpdate.config };
        }
        
        const dataToUpdateFully = { 
          ...currentData, 
          ...partialUpdate,
          config: newConfig 
        };
        updateNodeData(nodeId, dataToUpdateFully);
      }
    }, 500),
    [nodeId, currentNode, updateNodeData] // currentNode가 변경되면 debounce 함수가 재생성될 수 있음
  );

  const updateDisplayedValue = useCallback((key: string, data: any) => {
    if (key && data && typeof data === 'object' && key in data) {
      const value = data[key];
      setDisplayedValue(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
    } else {
      setDisplayedValue('N/A');
    }
  }, []);

  useEffect(() => {
    if (currentNode) {
      // PromptSettings.tsx와 유사하게 incoming edges로부터 merged input data를 계산
      const incomingEdges = edges.filter(edge => edge.target === nodeId);
      const mergedInputFromEdges = incomingEdges.reduce((acc, edge) => {
        if (edge.data?.output && typeof edge.data.output === 'object') {
          return { ...acc, ...edge.data.output };
        }
        return acc;
      }, {} as Record<string, any>);

      if (mergedInputFromEdges && typeof mergedInputFromEdges === 'object' && Object.keys(mergedInputFromEdges).length > 0) {
        setAvailableKeys(Object.keys(mergedInputFromEdges));
      } else {
        setAvailableKeys([]);
      }
      
      const currentSelectedKey = currentNode.data.config?.receiveKey || '';
      setSelectedKeyName(currentSelectedKey);
      updateDisplayedValue(currentSelectedKey, mergedInputFromEdges);
    }
  }, [currentNode, nodeId, edges, updateDisplayedValue]); // 의존성 배열에 nodeId, edges, updateDisplayedValue 추가

  const handleSelectedKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKey = e.target.value;
    setSelectedKeyName(newKey);
    debouncedUpdateNodeData({ config: { ...currentNode?.data.config, receiveKey: newKey } });
    
    // 선택 변경 시 즉시 표시 값 업데이트 (mergedInputFromEdges 사용)
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    const currentMergedInput = incomingEdges.reduce((acc, edge) => {
      if (edge.data?.output && typeof edge.data.output === 'object') {
        return { ...acc, ...edge.data.output };
      }
      return acc;
    }, {} as Record<string, any>);
    updateDisplayedValue(newKey, currentMergedInput);
  };

  if (!currentNode) return <div>Loading End Node settings...</div>;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="endnode-select-key" className="block text-sm font-medium text-gray-700 mb-1">Chatbot Output Key</label>
        <select
          id="endnode-select-key"
          value={selectedKeyName}
          onChange={handleSelectedKeyChange}
          className={`w-full px-3 py-2 border ${
            availableKeys.length === 0 ? 'bg-gray-50 text-gray-400' : 'bg-white'
          } border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          disabled={availableKeys.length === 0}
        >
          <option value="">-- Select a key --</option>
          {availableKeys.map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
        {(() => {
          const hasIncomingEdges = edges.some(edge => edge.target === nodeId);
          if (!hasIncomingEdges) {
            return (
              <div className="flex items-center mt-1 text-amber-500 text-xs">
                <AlertCircle size={12} className="mr-1" />
                No input connections. Connect a node to this EndNode.
              </div>
            );
          }
          if (availableKeys.length === 0) {
            return (
              <div className="flex items-center mt-1 text-amber-500 text-xs">
                <AlertCircle size={12} className="mr-1" />
                Connected node(s) have not produced output, or output is empty/not an object. Execute preceding node(s).
              </div>
            );
          }
          return null;
        })()}
      </div>
      <div>
        <label htmlFor="endnode-displayed-value" className="block text-sm font-medium text-gray-700 mb-1">Expected Chatbot Response</label>
        <pre id="endnode-displayed-value" className="mt-1 text-sm text-gray-600 bg-gray-100 p-2 border border-gray-300 rounded-md min-h-[38px] whitespace-pre-wrap break-all">
          {displayedValue}
        </pre>
      </div>
    </div>
  );
};

export default EndNodeSettings;