import React, { useState, useEffect, useMemo } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { PlusCircle, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import CustomSelect from '../Common/CustomSelect';

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

interface SourceOption {
  value: string; // Format: "nodeId.key"
  label: string; // Format: "Node Label: key"
  nodeId: string;
  nodeKey: string;
}

const MergeSettings: React.FC<MergeSettingsProps> = ({ nodeId }) => {
  const { nodes, edges, updateNodeData } = useFlowStore();
  const currentNode = nodes.find(n => n.id === nodeId);

  const [mappings, setMappings] = useState<MergeMapping[]>(currentNode?.data.config?.mergeMappings || []);

  useEffect(() => {
    setMappings(currentNode?.data.config?.mergeMappings || []);
  }, [currentNode?.data.config?.mergeMappings]);

  const availableSourceOptions = useMemo<SourceOption[]>(() => {
    const options: SourceOption[] = [];
    const incomingEdges = edges.filter(edge => edge.target === nodeId);

    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode && sourceNode.data.output && typeof sourceNode.data.output === 'object') {
        Object.keys(sourceNode.data.output).forEach(key => {
          options.push({
            value: `${sourceNode.id}.${key}`,
            label: `${sourceNode.data.label}: ${key}`,
            nodeId: sourceNode.id,
            nodeKey: key,
          });
        });
      }
    });
    return options;
  }, [nodeId, nodes, edges]);

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
        if (field === 'sourceNodeId') { // Special handling for dropdown
          const [nodeIdVal, nodeKeyVal] = value.split('.');
          return { ...m, sourceNodeId: nodeIdVal, sourceNodeKey: nodeKeyVal };
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
          {/* Source Value 선택 드롭다운 */}
          <div>
            <label htmlFor={`source-value-${mapping.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Source Value</label>
            <CustomSelect
              value={mapping.sourceNodeId ? `${mapping.sourceNodeId}.${mapping.sourceNodeKey}` : ''}
              onChange={value => handleMappingChange(index, 'sourceNodeId', value)}
              options={availableSourceOptions}
              placeholder="Select Source Value"
            />
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
      {availableSourceOptions.length === 0 && mappings.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
          No input data available from connected nodes. Connect and execute preceding nodes to populate source options.
        </p>
      )}
    </div>
  );
};

export default MergeSettings;