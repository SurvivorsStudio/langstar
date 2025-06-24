import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Save, Eye, EyeOff } from 'lucide-react';
import { ModelProvider, Model, AIConnectionForm } from '../../../types/aiConnection';

interface StepReviewProps {
  provider: ModelProvider | undefined;
  model: Model | undefined;
  formData: AIConnectionForm;
  onComplete: (data: Partial<AIConnectionForm>) => void;
  onBack: () => void;
}

const StepReview: React.FC<StepReviewProps> = ({
  provider,
  model,
  formData,
  onComplete,
  onBack,
}) => {
  const [connectionName, setConnectionName] = useState(formData.name || '');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const handleSave = () => {
    if (!connectionName.trim()) {
      alert('Please enter a connection name');
      return;
    }
    onComplete({ name: connectionName });
  };

  const maskSensitiveData = (data: string) => {
    if (!data) return '';
    return '******';
  };

  const toggleSensitiveData = () => {
    setShowSensitiveData(!showSensitiveData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 animate-scaleIn">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review & Save Connection</h2>
            <p className="text-gray-600 dark:text-gray-300">Review your configuration and save the connection</p>
          </div>
        </div>

        {/* Connection Summary */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Connection Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-300">Provider:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">{provider?.name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-300">Model:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">{model?.name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-300">Category:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">{provider?.category}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-300">Max Tokens:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">{model?.maxTokens?.toLocaleString() || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Authentication Details */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Authentication Details</h3>
            <button
              onClick={toggleSensitiveData}
              className="flex items-center text-sm text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
            >
              {showSensitiveData ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            {provider?.id === 'aws' ? (
              <>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Access Key ID:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {showSensitiveData ? formData.accessKeyId : maskSensitiveData(formData.accessKeyId ?? '')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Secret Access Key:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {showSensitiveData ? formData.secretAccessKey : maskSensitiveData(formData.secretAccessKey ?? '')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Region:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{formData.region}</span>
                </div>
              </>
            ) : (
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">API Key:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {showSensitiveData ? formData.apiKey : maskSensitiveData(formData.apiKey ?? '')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Name */}
        <div className="mb-6">
          <label htmlFor="connectionName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Connection Name *
          </label>
          <input
            type="text"
            id="connectionName"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder="Enter a name for this connection"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="flex items-center px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={!connectionName.trim()}
            className="flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepReview; 