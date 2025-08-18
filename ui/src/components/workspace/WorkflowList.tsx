import React from 'react';
import { PlusCircle, Trash2, Loader2, Download, Upload } from 'lucide-react';
import { Workflow } from '../../store/flowStore';
import { exportWorkflowOnly } from '../../utils/exportImport';
import { Deployment, DeploymentEnvironment, DeploymentStatus } from '../../types/deployment';

interface WorkflowListProps {
  availableWorkflows: Workflow[];
  isLoading: boolean;
  loadError: string | null;
  handleNewWorkflow: () => void;
  handleWorkflowClick: (workflowName: string) => void;
  handleDeleteWorkflow: (workflowName: string, event: React.MouseEvent) => void;
  onImportExport?: () => void;
  deployments?: Deployment[];
  isLoadingDeployments?: boolean;
}

const WorkflowList: React.FC<WorkflowListProps> = ({
  availableWorkflows,
  isLoading,
  loadError,
  handleNewWorkflow,
  handleWorkflowClick,
  handleDeleteWorkflow,
  onImportExport,
  deployments = [],
  isLoadingDeployments = false,
}) => {
  // 워크플로우의 배포 상태 확인
  const getWorkflowDeploymentStatuses = (workflowName: string) => {
    // 배포 데이터가 로딩 중인 경우
    if (isLoadingDeployments) {
      return [{ status: 'loading', text: 'Loading...', color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300' }];
    }

    const workflowDeployments = deployments.filter(
      deployment => deployment.workflowName === workflowName
    );

    if (workflowDeployments.length === 0) {
      return [{ status: 'saved', text: 'Saved', color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300' }];
    }

    const statuses: Array<{
      status: string;
      text: string;
      color: string;
      environment?: DeploymentEnvironment;
    }> = [];

    // 개발 환경 배포 확인
    const devDeployments = workflowDeployments.filter(
      deployment => deployment.environment === DeploymentEnvironment.DEV
    );
    
    if (devDeployments.length > 0) {
             const activeDevDeployment = devDeployments.find(
         deployment => deployment.status === DeploymentStatus.ACTIVE
       );
      
      if (activeDevDeployment) {
        statuses.push({
          status: 'deployed_dev_active',
          text: `DEV v${activeDevDeployment.version}`,
          color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
          environment: DeploymentEnvironment.DEV
        });
      } else {
                 const inactiveDevDeployment = devDeployments.find(
           deployment => deployment.status === DeploymentStatus.INACTIVE
         );
        if (inactiveDevDeployment) {
          statuses.push({
            status: 'deployed_dev_inactive',
            text: `DEV v${inactiveDevDeployment.version} - Inactive`,
            color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
            environment: DeploymentEnvironment.DEV
          });
        } else {
                     const draftDevDeployment = devDeployments.find(
             deployment => deployment.status === DeploymentStatus.DRAFT
           );
          if (draftDevDeployment) {
            statuses.push({
              status: 'deployed_dev_draft',
              text: `DEV v${draftDevDeployment.version} - Draft`,
              color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
              environment: DeploymentEnvironment.DEV
            });
          }
        }
      }
    }

    // 운영 환경 배포 확인
    const prodDeployments = workflowDeployments.filter(
      deployment => deployment.environment === DeploymentEnvironment.PROD
    );
    
    if (prodDeployments.length > 0) {
             const activeProdDeployment = prodDeployments.find(
         deployment => deployment.status === DeploymentStatus.ACTIVE
       );
      
      if (activeProdDeployment) {
        statuses.push({
          status: 'deployed_prod_active',
          text: `PROD v${activeProdDeployment.version}`,
          color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
          environment: DeploymentEnvironment.PROD
        });
      } else {
                 const inactiveProdDeployment = prodDeployments.find(
           deployment => deployment.status === DeploymentStatus.INACTIVE
         );
        if (inactiveProdDeployment) {
          statuses.push({
            status: 'deployed_prod_inactive',
            text: `PROD v${inactiveProdDeployment.version} - Inactive`,
            color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
            environment: DeploymentEnvironment.PROD
          });
        } else {
                     const draftProdDeployment = prodDeployments.find(
             deployment => deployment.status === DeploymentStatus.DRAFT
           );
          if (draftProdDeployment) {
            statuses.push({
              status: 'deployed_prod_draft',
              text: `PROD v${draftProdDeployment.version} - Draft`,
              color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
              environment: DeploymentEnvironment.PROD
            });
          }
        }
      }
    }

    // 기타 환경 배포 확인 (DEV, PROD가 아닌 경우)
    const otherDeployments = workflowDeployments.filter(
      deployment => deployment.environment !== DeploymentEnvironment.DEV && 
                   deployment.environment !== DeploymentEnvironment.PROD
    );
    
    if (otherDeployments.length > 0) {
             const activeOtherDeployment = otherDeployments.find(
         deployment => deployment.status === DeploymentStatus.ACTIVE
       );
      
      if (activeOtherDeployment) {
        statuses.push({
          status: 'deployed_other_active',
          text: `${activeOtherDeployment.environment.toUpperCase()} v${activeOtherDeployment.version}`,
          color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
          environment: activeOtherDeployment.environment
        });
      }
    }

    return statuses.length > 0 ? statuses : [{ status: 'saved', text: 'Saved', color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300' }];
  };

  const handleExportWorkflow = async (workflowName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await exportWorkflowOnly(workflowName);
    } catch (error) {
      console.error('Export failed:', error);
      alert('워크플로우 내보내기에 실패했습니다.');
    }
  };

  return (
  <div className="p-8">
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Workflows</h1>
      <div className="flex gap-2">
                 {onImportExport && (
           <button
             onClick={onImportExport}
             className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
           >
             <Upload className="w-5 h-5 mr-2" />
             Import
           </button>
         )}
        <button
          onClick={handleNewWorkflow}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Workflow
        </button>
      </div>
    </div>
    {isLoading && (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-600 dark:text-gray-300">Loading workflows...</p>
      </div>
    )}
    {!isLoading && loadError && (
      <div className="text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-md">
        Error loading workflows: {loadError}
      </div>
    )}
    {!isLoading && !loadError && availableWorkflows.length === 0 && (
      <div className="text-center text-gray-500 dark:text-gray-400 py-10">
        <p>No workflows found.</p>
        <p>Click "New Workflow" to get started.</p>
      </div>
    )}
    {!isLoading && !loadError && availableWorkflows.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableWorkflows.map((workflow) => {
          const deploymentStatuses = getWorkflowDeploymentStatuses(workflow.projectName);
          
          return (
            <div
              key={workflow.projectId}
              onClick={() => handleWorkflowClick(workflow.projectName)}
              className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group relative"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{workflow.projectName}</h3>
                </div>
                <div className="flex gap-1 absolute top-2 right-2">
                  <button
                    onClick={(e) => handleExportWorkflow(workflow.projectName, e)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-opacity"
                    title={`Export ${workflow.projectName}`}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteWorkflow(workflow.projectName, e)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                    title={`Delete ${workflow.projectName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
                             <div className="flex flex-wrap gap-2">
                 {deploymentStatuses.map((status, index) => (
                   <div key={index} className="flex items-center gap-1">
                     {status.status === 'loading' && (
                       <Loader2 className="w-3 h-3 animate-spin" />
                     )}
                     <span className={`px-2 py-0.5 text-xs rounded-full border ${status.color}`}>
                       {status.text}
                     </span>
                   </div>
                 ))}
               </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};

export default WorkflowList; 