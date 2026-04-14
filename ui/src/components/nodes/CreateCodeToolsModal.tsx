import React, { useState } from 'react';
import { X, Save, AlertCircle, FileText, Code } from 'lucide-react';
import CodeEditor from '../CodeEditor';

interface CreateCodeToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (groupData: {
    name: string;
    description: string;
    code: string;
  }) => void;
  existingNames: string[];
}

const CreateCodeToolsModal: React.FC<CreateCodeToolsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingNames
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('# Write your Python code here\n');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'code'>('description');

  if (!isOpen) return null;

  const validateEnglishName = (name: string): boolean => {
    const englishRegex = /^[a-zA-Z0-9_\s]+$/;
    return englishRegex.test(name);
  };

  const checkNameExists = (name: string): boolean => {
    return existingNames.some(existingName => 
      existingName.toLowerCase() === name.toLowerCase()
    );
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    
    // 영어 이름 검증
    if (newName && !validateEnglishName(newName)) {
      setNameValidationError('Group name must contain only English letters, numbers, spaces, and underscores');
      setNameError(null);
      return;
    }
    setNameValidationError(null);
    
    // 중복 이름 검증
    if (newName && checkNameExists(newName)) {
      setNameError('A group with this name already exists');
      return;
    }
    setNameError(null);
  };

  const handleSave = () => {
    let hasError = false;

    // Group Name 검증
    if (!name.trim()) {
      setNameError('Group name is required');
      hasError = true;
    } else {
      setNameError(null);
    }

    // Description 검증
    if (!description.trim()) {
      setDescriptionError('Description is required');
      hasError = true;
    } else {
      setDescriptionError(null);
    }

    // 기존 검증 에러가 있는지 확인
    if (nameError || nameValidationError || hasError) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      code
    });

    // Reset form
    setName('');
    setDescription('');
    setCode('# Write your Python code here\n');
    setNameError(null);
    setNameValidationError(null);
    setDescriptionError(null);
    setActiveTab('description');
  };

  const handleClose = () => {
    // Reset form
    setName('');
    setDescription('');
    setCode('# Write your Python code here\n');
    setNameError(null);
    setNameValidationError(null);
    setDescriptionError(null);
    setActiveTab('description');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[800px] h-[600px] max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Tools Group - Custom Code
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Group Name Field */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  nameError || nameValidationError ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-md focus:outline-none focus:ring-2 ${
                  nameError || nameValidationError ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                } text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                placeholder="Enter group name (English only)"
              />
              {nameValidationError && (
                <p className="mt-1 text-xs text-red-500 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  {nameValidationError}
                </p>
              )}
              {nameError && (
                <p className="mt-1 text-xs text-red-500 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  {nameError}
                </p>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('description')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                activeTab === 'description'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <FileText size={16} />
              <span>Description *</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                activeTab === 'code'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Code size={16} />
              <span>Python Code</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'description' ? (
              <div className="h-full p-6 flex flex-col">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (descriptionError && e.target.value.trim()) {
                      setDescriptionError(null);
                    }
                  }}
                  className={`flex-1 px-3 py-2 border ${
                    descriptionError ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-md focus:outline-none focus:ring-2 ${
                    descriptionError ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                  } text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none`}
                  placeholder="Enter detailed description for your tools group..."
                />
                {descriptionError && (
                  <p className="mt-2 text-xs text-red-500 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {descriptionError}
                  </p>
                )}
              </div>
            ) : (
              <div className="h-full">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language="python"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !description.trim() || !!nameError || !!nameValidationError || !!descriptionError}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <Save size={16} className="mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCodeToolsModal;