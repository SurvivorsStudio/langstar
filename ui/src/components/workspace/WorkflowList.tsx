import React from 'react';
import { PlusCircle, Trash2, Loader2, Download, Upload, Folder, FolderPlus, Pencil, ChevronRight, CornerLeftUp } from 'lucide-react';
import { Workflow } from '../../store/flowStore';
import { exportWorkflowOnly } from '../../utils/exportImport';
import * as storageService from '../../services/storageService';
import { WorkflowFolder } from '../../services/storageService';
import { Deployment, DeploymentEnvironment, DeploymentStatus } from '../../types/deployment';
import { useTranslation } from '../../hooks/useTranslation';

interface WorkflowListProps {
  availableWorkflows: Workflow[];
  isLoading: boolean;
  loadError: string | null;
  handleNewWorkflow: () => void;
  handleWorkflowClick: (workflowName: string) => void;
  handleDeleteWorkflow: (workflowName: string, event: React.MouseEvent) => void;
  onImportExport?: (folderId: string | null) => void;
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
  const { t } = useTranslation();

  // 폴더 상태 (MongoDB workflow_folders 컬렉션)
  const [folders, setFolders] = React.useState<WorkflowFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = React.useState('');
  const [draggingWorkflow, setDraggingWorkflow] = React.useState<string | null>(null);
  // 드래그 오버 중인 대상: 폴더 id 또는 'root'
  const [dragOverTarget, setDragOverTarget] = React.useState<string | null>(null);

  const fetchFolders = React.useCallback(async () => {
    try {
      setFolders(await storageService.getAllWorkflowFolders());
    } catch (error) {
      console.error('[WorkflowList] Failed to load folders:', error);
    }
  }, []);

  // 워크플로우 목록이 바뀌면(삭제/이름 변경 등) 폴더 소속도 다시 불러온다
  React.useEffect(() => {
    fetchFolders();
  }, [fetchFolders, availableWorkflows]);

  const currentFolder = folders.find(folder => folder.id === currentFolderId) || null;

  // 폴더가 삭제되었으면 루트로 복귀
  React.useEffect(() => {
    if (currentFolderId && !folders.some(folder => folder.id === currentFolderId)) {
      setCurrentFolderId(null);
    }
  }, [folders, currentFolderId]);

  const workflowNames = new Set(availableWorkflows.map(workflow => workflow.projectName));
  const folderedNames = new Set(folders.flatMap(folder => folder.workflowNames));
  const visibleWorkflows = currentFolder
    ? availableWorkflows.filter(workflow => currentFolder.workflowNames.includes(workflow.projectName))
    : availableWorkflows.filter(workflow => !folderedNames.has(workflow.projectName));

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      setIsCreatingFolder(false);
      return;
    }
    try {
      await storageService.createWorkflowFolder(name);
      setIsCreatingFolder(false);
      setNewFolderName('');
      fetchFolders();
    } catch (error) {
      console.error('[WorkflowList] Failed to create folder:', error);
      alert(`${t('workflowFolder.createFailed')}: ${(error as Error).message}`);
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    const name = editingFolderName.trim();
    const folder = folders.find(f => f.id === folderId);
    setEditingFolderId(null);
    if (!name || !folder || folder.name === name) return;
    try {
      await storageService.renameWorkflowFolder(folderId, name);
      fetchFolders();
    } catch (error) {
      console.error('[WorkflowList] Failed to rename folder:', error);
      alert(`${t('workflowFolder.renameFailed')}: ${(error as Error).message}`);
    }
  };

  const handleDeleteFolder = async (folder: WorkflowFolder, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(t('workflowFolder.deleteConfirm', { name: folder.name }))) return;
    try {
      await storageService.deleteWorkflowFolder(folder.id);
      fetchFolders();
    } catch (error) {
      console.error('[WorkflowList] Failed to delete folder:', error);
      alert(`${t('workflowFolder.deleteFailed')}: ${(error as Error).message}`);
    }
  };

  const moveWorkflow = async (projectName: string, folderId: string | null) => {
    const sourceFolder = folders.find(folder => folder.workflowNames.includes(projectName));
    if ((sourceFolder?.id ?? null) === folderId) return;
    // 낙관적 업데이트 후 서버 반영
    setFolders(prev => prev.map(folder => {
      const names = folder.workflowNames.filter(name => name !== projectName);
      return { ...folder, workflowNames: folder.id === folderId ? [...names, projectName] : names };
    }));
    try {
      await storageService.moveWorkflowToFolder(projectName, folderId);
    } catch (error) {
      console.error('[WorkflowList] Failed to move workflow:', error);
      alert(`${t('workflowFolder.moveFailed')}: ${(error as Error).message}`);
    }
    fetchFolders();
  };

  const dropTargetProps = (target: string, folderId: string | null) => ({
    onDragOver: (event: React.DragEvent) => {
      if (!draggingWorkflow) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (dragOverTarget !== target) setDragOverTarget(target);
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setDragOverTarget(prev => (prev === target ? null : prev));
      }
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      const projectName = event.dataTransfer.getData('application/x-langstar-workflow') || draggingWorkflow;
      setDragOverTarget(null);
      setDraggingWorkflow(null);
      if (projectName) moveWorkflow(projectName, folderId);
    },
  });

  // 워크플로우의 배포 상태 확인
  const getWorkflowDeploymentStatuses = (workflowName: string) => {
    // 배포 데이터가 로딩 중인 경우
    if (isLoadingDeployments) {
      return [{ status: 'loading', text: t('common.loading'), color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300' }];
    }

    const workflowDeployments = deployments.filter(
      deployment => deployment.workflowName === workflowName
    );

    if (workflowDeployments.length === 0) {
      return [{ status: 'saved', text: t('workflow.notDeployed'), color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300' }];
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
            text: `DEV v${inactiveDevDeployment.version} - ${t('deployment.inactive')}`,
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
              text: `DEV v${draftDevDeployment.version} - ${t('deploymentList.draft')}`,
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
            text: `PROD v${inactiveProdDeployment.version} - ${t('deployment.inactive')}`,
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
              text: `PROD v${draftProdDeployment.version} - ${t('deploymentList.draft')}`,
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

    return statuses.length > 0 ? statuses : [{ status: 'saved', text: t('workflow.notDeployed'), color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300' }];
  };

  const handleExportWorkflow = async (workflowName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await exportWorkflowOnly(workflowName);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('importExport.exportWorkflowFailed'));
    }
  };

  return (
  <div className="p-8">
    <div className="flex justify-between items-center mb-6">
      <h1 className="flex items-center text-2xl font-semibold text-gray-800 dark:text-gray-100 min-w-0">
        {currentFolder ? (
          <>
            <button
              onClick={() => setCurrentFolderId(null)}
              className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              {t('workspace.chatflows')}
            </button>
            <ChevronRight className="w-5 h-5 mx-1 text-gray-400 flex-shrink-0" />
            <Folder className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0" />
            <span className="truncate">{currentFolder.name}</span>
          </>
        ) : (
          t('workspace.chatflows')
        )}
      </h1>
      <div className="flex gap-2">
        {!currentFolder && (
          <button
            onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
            className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <FolderPlus className="w-5 h-5 mr-2" />
            {t('workflowFolder.newFolder')}
          </button>
        )}
                 {onImportExport && (
           <button
             onClick={() => onImportExport(currentFolderId)}
             className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
           >
             <Upload className="w-5 h-5 mr-2" />
             {t('common.import')}
           </button>
         )}
        <button
          onClick={handleNewWorkflow}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          {t('workflow.newWorkflow')}
        </button>
      </div>
    </div>
    {isLoading && (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
      </div>
    )}
    {!isLoading && loadError && (
      <div className="text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-md">
        {t('common.error')}: {loadError}
      </div>
    )}
    {!isLoading && !loadError && availableWorkflows.length === 0 && folders.length === 0 && !isCreatingFolder && (
      <div className="text-center text-gray-500 dark:text-gray-400 py-10">
        <p>{t('workflow.noWorkflows')}</p>
        <p>{t('workflow.createFirst')}</p>
      </div>
    )}
    {!isLoading && !loadError && (availableWorkflows.length > 0 || folders.length > 0 || isCreatingFolder) && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentFolder && (
          <div
            {...dropTargetProps('root', null)}
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
              dragOverTarget === 'root'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
            }`}
          >
            <CornerLeftUp className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {draggingWorkflow ? t('workflowFolder.dropToRoot') : t('workflowFolder.backToRoot')}
            </span>
          </div>
        )}
        {!currentFolder && isCreatingFolder && (
          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-blue-300 dark:border-blue-500 flex items-center">
            <Folder className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0" />
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
              onBlur={handleCreateFolder}
              placeholder={t('workflowFolder.folderNamePlaceholder')}
              className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {!currentFolder && folders.map((folder) => {
          const count = folder.workflowNames.filter(name => workflowNames.has(name)).length;
          const isEditing = editingFolderId === folder.id;
          return (
            <div
              key={folder.id}
              {...dropTargetProps(folder.id, folder.id)}
              onClick={() => !isEditing && setCurrentFolderId(folder.id)}
              className={`p-6 rounded-lg border transition-all cursor-pointer relative ${
                dragOverTarget === folder.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'bg-amber-50/60 dark:bg-gray-700 border-amber-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md'
              }`}
            >
              <div className="flex items-center mb-2 pr-12">
                <Folder className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0" />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingFolderName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(folder.id);
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                    onBlur={() => handleRenameFolder(folder.id)}
                    className="flex-1 min-w-0 px-2 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate" title={folder.name}>{folder.name}</h3>
                )}
              </div>
              <div className="flex gap-1 absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolderId(folder.id);
                    setEditingFolderName(folder.name);
                  }}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-opacity"
                  title={t('workflowFolder.rename')}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => handleDeleteFolder(folder, e)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                  title={t('workflowFolder.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full border bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                {t('workflowFolder.workflowCount', { count })}
              </span>
            </div>
          );
        })}
        {currentFolder && visibleWorkflows.length === 0 && (
          <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">
            {t('workflowFolder.emptyFolder')}
          </div>
        )}
        {visibleWorkflows.map((workflow) => {
          const deploymentStatuses = getWorkflowDeploymentStatuses(workflow.projectName);

          return (
            <div
              key={workflow.projectName}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-langstar-workflow', workflow.projectName);
                e.dataTransfer.effectAllowed = 'move';
                setDraggingWorkflow(workflow.projectName);
              }}
              onDragEnd={() => {
                setDraggingWorkflow(null);
                setDragOverTarget(null);
              }}
              onClick={() => handleWorkflowClick(workflow.projectName)}
              className={`bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group relative ${
                draggingWorkflow === workflow.projectName ? 'opacity-50' : ''
              }`}
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