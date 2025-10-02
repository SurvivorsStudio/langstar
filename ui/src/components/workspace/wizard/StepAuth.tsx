import React, { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, HelpCircle, Key } from 'lucide-react';
import { ModelProvider, Model, AIConnectionForm } from '../../../types/aiConnection';

interface StepAuthProps {
  provider: ModelProvider | undefined;
  model: Model | undefined;
  formData: AIConnectionForm;
  onSubmit: (authData: Partial<AIConnectionForm>) => void;
  onBack: () => void;
}

const StepAuth: React.FC<StepAuthProps> = ({ 
  provider, 
  model, 
  formData, 
  onSubmit, 
  onBack 
}) => {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [authForm, setAuthForm] = useState({
    name: formData.name || '',
    apiKey: formData.apiKey || '',
    accessKeyId: formData.accessKeyId || '',
    secretAccessKey: formData.secretAccessKey || '',
    region: formData.region || '',
  });

  if (!provider || !model) {
    return (
      <div className="p-8 text-center text-red-500">
        Provider 또는 Model 정보를 찾을 수 없습니다.<br />
        provider: {provider ? provider.id : '없음'}<br />
        model: {model ? model.id : '없음'}
      </div>
    );
  }

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setAuthForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: authForm.name,
      apiKey: authForm.apiKey,
      accessKeyId: authForm.accessKeyId,
      secretAccessKey: authForm.secretAccessKey,
      region: authForm.region,
    });
  };

  const isFormValid = () => {
    if (provider.id === 'aws') {
      return authForm.name && authForm.accessKeyId && authForm.secretAccessKey && authForm.region;
    }
    return authForm.name && authForm.apiKey;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Authentication Setup
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Enter authentication information for {provider.name} {model.displayName} connection
          </p>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Model Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {provider.name} - {model.displayName}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{model.description}</p>
          </div>
        </div>
      </div>

      {/* Auth Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Connection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Connection Name *
            </label>
            <input
              type="text"
              value={authForm.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., OpenAI GPT-4 Production"
              required
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter a name to identify this connection
            </p>
          </div>

          {/* Provider-specific auth fields */}
          {provider.authFields.map((field, index) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {field.label} {field.required && '*'}
              </label>
              <div className="relative">
                <input
                  type={field.type === 'password' && showPasswords[field.name] ? 'text' : field.type}
                  value={authForm[field.name as keyof typeof authForm] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 ${
                    provider.id === 'aws' && field.name === 'region' 
                      ? 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                  placeholder={field.placeholder}
                  required={field.required}
                  disabled={provider.id === 'aws' && field.name === 'region'}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
                  >
                    {showPasswords[field.name] ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              {field.helpText && (
                <div className="flex items-start mt-2">
                  <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-300 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {provider.id === 'aws' && field.name === 'region' 
                      ? 'Region is automatically set based on your model selection' 
                      : field.helpText}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={!isFormValid()}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                isFormValid()
                  ? 'bg-blue-500 text-white hover:bg-blue-600 transform hover:scale-105'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue to Next Step
            </button>
          </div>
        </form>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start">
          <div className="w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-3 mt-0.5">
            <span className="text-blue-600 dark:text-blue-300 text-xs">🔒</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Security Notice</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Your API keys and credentials are securely encrypted and stored. 
              Never share them with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepAuth; 