import React from 'react';
import { X } from 'lucide-react';
import JsonViewer from './Common/JsonViewer';

interface OutputInspectorProps {
  output: any;
  onClose: () => void;
}

const OutputInspector: React.FC<OutputInspectorProps> = ({ output, onClose }) => {
  const isJsonData = typeof output === 'object' && output !== null;
  
  return (
    <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col shadow-md">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Output Inspector</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {isJsonData ? (
          <JsonViewer 
            data={output} 
            maxHeight="100%" 
            className="border-0"
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm border">
            <pre className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
              {String(output)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputInspector;