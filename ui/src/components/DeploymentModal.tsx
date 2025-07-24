import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { DeploymentFormData, DeploymentEnvironment } from '../types/deployment';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (deploymentData: DeploymentFormData) => Promise<void>;
  isLoading?: boolean;
}

const DeploymentModal: React.FC<DeploymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<DeploymentFormData>({
    name: '',
    version: '1.0.0',
    description: '',
    environment: DeploymentEnvironment.DEV,
    config: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof DeploymentFormData, value: string | DeploymentEnvironment) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '배포 이름은 필수입니다.';
    } else if (formData.name.length > 100) {
      newErrors.name = '배포 이름은 100자 이하여야 합니다.';
    }

    if (!formData.version.trim()) {
      newErrors.version = 'Version is required.';
    } else if (formData.version.length > 50) {
      newErrors.version = 'Version must be 50 characters or less.';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Deployment creation failed:', error);
      // Error handling is done by parent component
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      version: '1.0.0',
      description: '',
      environment: DeploymentEnvironment.DEV,
      config: {}
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Create New Deployment
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deployment Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deployment Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              }`}
              placeholder="e.g., Customer Support Bot v1"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Version */}
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Version *
            </label>
            <input
              type="text"
              id="version"
              value={formData.version}
              onChange={(e) => handleInputChange('version', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.version 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              }`}
              placeholder="예: 1.0.0"
              disabled={isLoading}
            />
            {errors.version && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.version}</p>
            )}
          </div>

          {/* 환경 */}
          <div>
            <label htmlFor="environment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              환경
            </label>
            <select
              id="environment"
              value={formData.environment}
              onChange={(e) => handleInputChange('environment', e.target.value as DeploymentEnvironment)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            >
              <option value={DeploymentEnvironment.DEV}>개발 (DEV)</option>
              <option value={DeploymentEnvironment.STAGING}>스테이징 (STAGING)</option>
              <option value={DeploymentEnvironment.PROD}>운영 (PROD)</option>
            </select>
          </div>

          {/* 설명 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              }`}
              placeholder="배포에 대한 설명을 입력하세요..."
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  배포 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  배포 생성
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeploymentModal; 