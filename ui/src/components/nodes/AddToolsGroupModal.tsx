import React, { useState } from 'react';
import { X, Code, Layers } from 'lucide-react';

interface AddToolsGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCode: () => void;
  onSelectCustomNode: () => void;
}

const AddToolsGroupModal: React.FC<AddToolsGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateCode,
  onSelectCustomNode
}) => {
  if (!isOpen) return null;

  const handleOptionClick = (option: 'createCode' | 'customNode') => {
    if (option === 'createCode') {
      onCreateCode();
    } else {
      onSelectCustomNode();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Tools Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Choose how you want to create your tools group:
          </p>

          {/* Create Code Option */}
          <button
            onClick={() => handleOptionClick('createCode')}
            className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Code size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Create Code
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Write custom Python code for your tools
                </p>
              </div>
            </div>
          </button>

          {/* Custom Node Option */}
          <button
            onClick={() => handleOptionClick('customNode')}
            className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Layers size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Custom Node
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select from existing custom nodes
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToolsGroupModal;