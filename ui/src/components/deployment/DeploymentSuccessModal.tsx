import React from 'react';
import { CheckCircle, ExternalLink, Copy, X } from 'lucide-react';
import { Deployment } from '../../types/deployment';
import { useTranslation } from '../../hooks/useTranslation';

interface DeploymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  deployment: Deployment | null;
}

const DeploymentSuccessModal: React.FC<DeploymentSuccessModalProps> = ({
  isOpen,
  onClose,
  deployment
}) => {
  const { t } = useTranslation();
  
  if (!isOpen || !deployment) return null;

  const handleCopyDeploymentId = async () => {
    try {
      await navigator.clipboard.writeText(deployment.id);
      alert(t('alert.deploymentIdCopied'));
    } catch (err) {
      console.error('Failed to copy deployment ID:', err);
    }
  };

  const handleViewDeployments = () => {
    // Workspace 페이지의 배포 탭으로 이동
    window.location.href = '/workspace?tab=deployment';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('deployment.deploymentSuccessful')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 text-sm">
              {t('deployment.workflowDeployedSuccessfully')}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deployment.deploymentName')}
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                {deployment.name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.version')}
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {deployment.version}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deployment.environment')}
              </label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                deployment.environment === 'prod' 
                  ? 'text-red-600 bg-red-100 dark:bg-red-900/20' 
                  : deployment.environment === 'staging'
                  ? 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
                  : 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
              }`}>
                {deployment.environment.toUpperCase()}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deployment.deploymentId')}
              </label>
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-gray-800 dark:text-gray-200">
                  {deployment.id.slice(0, 8)}...
                </code>
                <button
                  onClick={handleCopyDeploymentId}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title={t('deployment.copyDeploymentId')}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {deployment.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.description')}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {deployment.description}
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              {t('deployment.nextSteps')}
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• {t('deployment.nextStepsDesc1')}</li>
              <li>• {t('deployment.nextStepsDesc2')}</li>
              <li>• {t('deployment.nextStepsDesc3')}</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {t('common.close')}
          </button>
          <button
            onClick={handleViewDeployments}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('deployment.viewDeploymentList')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentSuccessModal; 