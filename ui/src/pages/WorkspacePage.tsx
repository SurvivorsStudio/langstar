import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// import logoImage from '../assets/common/langstar_logo.png';
import { useFlowStore, DEFAULT_PROJECT_NAME, emptyInitialNodes, emptyInitialEdges } from '../store/flowStore';
import { useAIConnectionStore } from '../store/aiConnectionStore';
import { useWorkflowStorageStore } from '../store/workflowStorageStore';
import { useDeploymentStore } from '../store/deploymentZustandStore';
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar';
import WorkflowList from '../components/workspace/WorkflowList';
import RagConfigList from '../components/workspace/RagConfigList';
import RagConfigForm from '../components/workspace/RagConfigForm';
import DeploymentList from '../components/workspace/DeploymentList';
import AIConnectionList from '../components/workspace/AIConnectionList';
import AIConnectionWizard from '../components/workspace/AIConnectionWizard';
import NodeCreation from '../components/workspace/NodeCreation';
import NodeManagement from '../components/workspace/NodeManagement';
import ImportExportModal from '../components/workspace/ImportExportModal';
import ScheduleManagement from '../components/workspace/ScheduleManagement';
import Footer from '../components/Footer';
import { AIConnection, AIConnectionForm as AIConnectionFormType } from '../types/aiConnection';
import { Deployment } from '../types/deployment';
import { useTranslation } from '../hooks/useTranslation';

const mockRagConfigs = [
  {
    id: '1',
    name: 'Customer Support Knowledge Base',
    description: 'RAG system for handling customer inquiries',
    lastModified: '2024-03-15',
    status: 'active',
    vectorDb: 'Pinecone',
    embeddingModel: 'OpenAI Ada 002',
    host: 'https://example.pinecone.io',
    port: '443',
  },
  {
    id: '2',
    name: 'Technical Documentation Assistant',
    description: 'API documentation and technical guides',
    lastModified: '2024-03-14',
    status: 'draft',
    vectorDb: 'Weaviate',
    embeddingModel: 'Cohere Embed',
    host: 'https://example.weaviate.io',
    port: '443',
  }
];

const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const {
    loadWorkflow,
    setProjectName,
    getWorkflowAsJSONString,
  } = useFlowStore(state => ({
    loadWorkflow: state.loadWorkflow,
    setProjectName: state.setProjectName,
    getWorkflowAsJSONString: state.getWorkflowAsJSONString,
  }));

  // 배포 관련 상태와 함수들 (별도 스토어에서 가져오기)
  const {
    deployments,
    fetchDeployments,
    isLoadingDeployments,
    loadErrorDeployments,
    deleteDeployment,
    activateDeployment,
    deactivateDeployment,
  } = useDeploymentStore();

  // Workflow Storage 관련 상태와 함수들 (별도 스토어에서 가져오기)
  const {
    availableWorkflows,
    fetchAvailableWorkflows,
    deleteWorkflow,
    isLoading: isStoreLoading,
    loadError,
  } = useWorkflowStorageStore();

  // AI Connection 관련 상태와 함수들 (별도 스토어에서 가져오기)
  const {
    aiConnections,
    fetchAIConnections,
    addAIConnection,
    updateAIConnection,
    deleteAIConnection,
    isLoadingAIConnections,
    loadErrorAIConnections,
  } = useAIConnectionStore();

  const [activeMenu, setActiveMenu] = React.useState(() => {
    const tab = searchParams.get('tab');
    return tab === 'deployment' ? 'deployment' : 'chatflows';
  });
  const [selectedRag, setSelectedRag] = React.useState<string | null>(null);
  const [showWizard, setShowWizard] = React.useState(false);
  const [editingConnection, setEditingConnection] = React.useState<AIConnection | null>(null);

  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({
    aiKeys: false
  });
  const [selectedAIType, setSelectedAIType] = React.useState<'language' | 'embedding' | null>(null);
  const [newRag, setNewRag] = React.useState({
    name: '',
    description: '',
    vectorDb: 'Pinecone',
    host: '',
    port: '443',
    embeddingModel: 'OpenAI Ada 002'
  });
  const [showImportExportModal, setShowImportExportModal] = React.useState(false);

  const defaultProjectName = DEFAULT_PROJECT_NAME;

  React.useEffect(() => {
    // 메뉴가 바뀔 때마다 마법사 닫기
    setShowWizard(false);
    setEditingConnection(null);

    if (activeMenu === 'chatflows') {
      fetchAvailableWorkflows();
      // 워크플로우 목록을 볼 때도 배포 데이터를 로드하여 상태 표시
      fetchDeployments();
    } else if (activeMenu === 'deployment') {
      fetchDeployments();
    } else if (
      activeMenu === 'ai-language' ||
      activeMenu === 'ai-embedding' ||
      activeMenu === 'ai-model-config'
    ) {
      fetchAIConnections();
    }
  }, [activeMenu, fetchAvailableWorkflows, fetchAIConnections, fetchDeployments]);

  const handleDeleteRag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('aiConnection.deleteConfirm'))) {
      // Handle deletion
    }
  };

  const handleDeleteAIConnection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('aiConnection.deleteConfirm'))) {
      try {
        await deleteAIConnection(id);
        // Success notification (e.g., toast)
      } catch (error) {
        alert(`${t('common.error')}: ${(error as Error).message}`);
      }
    }
  };

  const handleSaveRag = () => {
    setSelectedRag(null);
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const filteredAIConnections = aiConnections.filter(conn =>
    conn.type === (activeMenu === 'ai-language' ? 'language' : 'embedding')
  );

  // ai-model-config일 때는 모든 연결을 보여주고, 그 외에는 타입별로 필터링
  const displayAIConnections = activeMenu === 'ai-model-config' 
    ? aiConnections 
    : filteredAIConnections;


  const handleNewAIConnection = () => {
    setEditingConnection(null);
    setShowWizard(true);
  };

  const handleEditAIConnection = (connection: AIConnection) => {
    setEditingConnection(connection);
    setShowWizard(true);
  };

  const handleWizardSave = async (formData: AIConnectionFormType & { type?: 'language' | 'embedding' }) => {
    try {
      const connectionPayload = {
        name: formData.name,
        type: ((formData.type || (activeMenu === 'ai-language' ? 'language' : 'embedding')).toLowerCase() as 'language' | 'embedding'),
        provider: formData.provider,
        model: formData.model,
        apiKey: formData.apiKey,
        accessKeyId: formData.accessKeyId,
        secretAccessKey: formData.secretAccessKey,
        region: formData.region,
        status: formData.status,
      };

      if (editingConnection) {
        await updateAIConnection(editingConnection.id, connectionPayload);
      } else {
        await addAIConnection(connectionPayload);
      }
      setShowWizard(false);
      setEditingConnection(null);
      // Success notification (e.g., toast)
    } catch (error) {
      alert(`Error saving AI connection: ${(error as Error).message}`);
    }
  };

  const handleWizardBack = () => {
    setShowWizard(false);
    setEditingConnection(null);
  };

  const handleWorkflowClick = async (workflowName: string) => {
    try {
      await loadWorkflow(workflowName);
      navigate(`/flow/${encodeURIComponent(workflowName)}`);
    } catch (error) {
      console.error(`WorkspacePage: Failed to load workflow ${workflowName}:`, error);
      alert(`${t('common.error')}: ${workflowName}`);
    }
  };

  const handleNewWorkflow = () => {
    let newProjectName = defaultProjectName;
    let counter = 1;
    while (availableWorkflows.some(workflow => workflow.projectName === newProjectName)) {
      newProjectName = `${defaultProjectName} (${counter})`;
      counter++;
    }

    setProjectName(newProjectName);
    useFlowStore.setState({ 
      nodes: emptyInitialNodes, 
      edges: emptyInitialEdges, 
      viewport: { x: 0, y: 0, zoom: 1 }, 
      lastSaved: null 
    });
    navigate(`/flow/${encodeURIComponent(newProjectName)}`);
  };

  const handleDeleteWorkflow = async (workflowName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(t('workflow.deleteConfirm', { name: workflowName }))) {
      try {
        await deleteWorkflow(workflowName);
        // Success notification (e.g., toast message)
      } catch (error) {
        console.error(`WorkspacePage: Failed to delete workflow ${workflowName}:`, error);
        alert(`${t('common.error')}: ${workflowName}`);
      }
    }
  };

  const handleImportSuccess = () => {
    // import 성공 후 워크플로우 목록 새로고침
    if (activeMenu === 'chatflows') {
      fetchAvailableWorkflows();
    }
  };

  const handleDeleteDeployment = async (deploymentId: string) => {
    console.log('[WorkspacePage] handleDeleteDeployment called with ID:', deploymentId);
    if (window.confirm(t('deployment.deleteConfirm'))) {
      console.log('[WorkspacePage] User confirmed deletion, calling deleteDeployment...');
      try {
        await deleteDeployment(deploymentId);
        console.log('[WorkspacePage] Deployment deleted successfully');
      } catch (error) {
        console.error('[WorkspacePage] Error deleting deployment:', error);
        alert(`${t('common.error')}: ${(error as Error).message}`);
      }
    } else {
      console.log('[WorkspacePage] User cancelled deletion');
    }
  };

  const handleActivateDeployment = async (deploymentId: string) => {
    try {
      await activateDeployment(deploymentId);
    } catch (error) {
      alert(`${t('common.error')}: ${(error as Error).message}`);
    }
  };

  const handleDeactivateDeployment = async (deploymentId: string) => {
    try {
      await deactivateDeployment(deploymentId);
    } catch (error) {
      alert(`${t('common.error')}: ${(error as Error).message}`);
    }
  };

  const renderMainContent = () => {
    if (showWizard) {
      return (
        <AIConnectionWizard
          onBack={handleWizardBack}
          onSave={ handleWizardSave }
          activeMenu={activeMenu}
          editingConnection={editingConnection}
        />
      );
    }
    
    switch (activeMenu) {
      case 'chatflows':
        return (
          <WorkflowList
            availableWorkflows={availableWorkflows}
            isLoading={isStoreLoading}
            loadError={loadError}
            handleNewWorkflow={handleNewWorkflow}
            handleWorkflowClick={handleWorkflowClick}
            handleDeleteWorkflow={handleDeleteWorkflow}
            onImportExport={() => setShowImportExportModal(true)}
            deployments={deployments}
            isLoadingDeployments={isLoadingDeployments}
          />
        );
      case 'deployment':
        return (
          <DeploymentList
            deployments={deployments}
            isLoading={isLoadingDeployments}
            loadError={loadErrorDeployments}
            handleDeleteDeployment={handleDeleteDeployment}
            handleActivateDeployment={handleActivateDeployment}
            handleDeactivateDeployment={handleDeactivateDeployment}
          />
        );
      case 'schedule':
        return <ScheduleManagement />;
      case 'rag':
        return selectedRag ? (
          <RagConfigForm
            newRag={newRag}
            setNewRag={setNewRag}
            handleSaveRag={handleSaveRag}
            setSelectedRag={setSelectedRag}
          />
        ) : (
          <RagConfigList
            ragConfigs={mockRagConfigs}
            onNewRag={() => setSelectedRag('new')}
            onDeleteRag={handleDeleteRag}
            onSelectRag={setSelectedRag}
          />
        );
      case 'ai-language':
      case 'ai-embedding':
      case 'ai-model-config':
        return (
          <AIConnectionList
            filteredAIConnections={displayAIConnections}
            isLoading={isLoadingAIConnections}
            loadError={loadErrorAIConnections}
            handleNewAIConnection={handleNewAIConnection}
            handleEditAIConnection={handleEditAIConnection}
            handleDeleteAIConnection={handleDeleteAIConnection}
            activeMenu={activeMenu}
          />
        );
      case 'node-creation':
        return <NodeManagement onBack={() => setActiveMenu('chatflows')} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex flex-1">
        <WorkspaceSidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          expandedMenus={expandedMenus}
          toggleMenu={toggleMenu}
          setSelectedAIType={setSelectedAIType}
        />
        <div className="flex-1 overflow-auto">
          {renderMainContent()}
        </div>
      </div>
      
      <Footer />
      
      <ImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}

export default WorkspacePage; 