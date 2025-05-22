import React from 'react';
import { X } from 'lucide-react';

interface OutputInspectorProps {
  output: any;
  onClose: () => void;
}

const OutputInspector: React.FC<OutputInspectorProps> = ({ output, onClose }) => {
  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full overflow-hidden flex flex-col shadow-md">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Output Inspector</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
          <pre className="whitespace-pre-wrap break-words">
            {typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default OutputInspector;