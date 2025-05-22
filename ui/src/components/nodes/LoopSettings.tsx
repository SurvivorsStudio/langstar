import React from 'react';
import { useFlowStore } from '../../store/flowStore';

interface LoopSettingsProps {
  nodeId: string;
}

const LoopSettings: React.FC<LoopSettingsProps> = ({ nodeId }) => {
  const { nodes, updateNodeData } = useFlowStore();
  const node = nodes.find(n => n.id === nodeId);
  const repetitions = node?.data.config?.repetitions || 1;

  const handleRepetitionsChange = (value: number) => {
    updateNodeData(nodeId, {
      ...node?.data,
      config: {
        ...node?.data.config,
        repetitions: value
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Loop Settings</h3>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-600">
          Number of Repetitions
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="1"
            value={repetitions}
            onChange={(e) => handleRepetitionsChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          />
          <span className="text-sm text-gray-500">times</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Specify how many times the loop should repeat
        </p>
      </div>
    </div>
  );
};

export default LoopSettings;