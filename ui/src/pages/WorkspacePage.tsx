import React from 'react';
import { useNavigate } from 'react-router-dom';
// import logoImage from '../assets/common/langstar_logo.png';
import { useFlowStore, DEFAULT_PROJECT_NAME, emptyInitialNodes, emptyInitialEdges } from '../store/flowStore';
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar';
import WorkflowList from '../components/workspace/WorkflowList';
import RagConfigList from '../components/workspace/RagConfigList';
import RagConfigForm from '../components/workspace/RagConfigForm';
import DeploymentList from '../components/workspace/DeploymentList';
import AIConnectionList from '../components/workspace/AIConnectionList';
import AIConnectionWizard from '../components/workspace/AIConnectionWizard';
import { AIConnection, AIConnectionForm as AIConnectionFormType } from '../types/aiConnection';

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
  const {
    availableWorkflows,
    fetchAvailableWorkflows,
    loadWorkflow,
    isLoading: isStoreLoading,
    loadError,
    setProjectName,
    deleteWorkflow,
    aiConnections,
    fetchAIConnections,
    addAIConnection,
    updateAIConnection,
    deleteAIConnection,
    isLoadingAIConnections,
    loadErrorAIConnections,
    getWorkflowAsJSONString,
  } = useFlowStore(state => ({
    availableWorkflows: state.availableWorkflows,
    fetchAvailableWorkflows: state.fetchAvailableWorkflows,
    loadWorkflow: state.loadWorkflow,
    isLoading: state.isLoading,
    loadError: state.loadError,
    setProjectName: state.setProjectName,
    deleteWorkflow: state.deleteWorkflow,
    aiConnections: state.aiConnections,
    fetchAIConnections: state.fetchAIConnections,
    addAIConnection: state.addAIConnection,
    updateAIConnection: state.updateAIConnection,
    deleteAIConnection: state.deleteAIConnection,
    isLoadingAIConnections: state.isLoadingAIConnections,
    loadErrorAIConnections: state.loadErrorAIConnections,
    getWorkflowAsJSONString: state.getWorkflowAsJSONString,
  }));

  const [activeMenu, setActiveMenu] = React.useState('chatflows');
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

  const defaultProjectName = DEFAULT_PROJECT_NAME;

  React.useEffect(() => {
    // 메뉴가 바뀔 때마다 마법사 닫기
    setShowWizard(false);
    setEditingConnection(null);

    if (activeMenu === 'chatflows' || activeMenu === 'deployment') {
      fetchAvailableWorkflows();
    } else if (
      activeMenu === 'ai-language' ||
      activeMenu === 'ai-embedding' ||
      activeMenu === 'ai-model-config'
    ) {
      fetchAIConnections();
    }
  }, [activeMenu, fetchAvailableWorkflows, fetchAIConnections]);

  const handleDeleteRag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this RAG configuration?')) {
      // Handle deletion
    }
  };

  const handleDeleteAIConnection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this AI connection?')) {
      try {
        await deleteAIConnection(id);
        // Success notification (e.g., toast)
      } catch (error) {
        alert(`Error deleting AI connection: ${(error as Error).message}`);
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
      alert(`Error loading workflow: ${workflowName}. Check console for details.`);
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
    if (window.confirm(`Are you sure you want to delete the workflow "${workflowName}"? This action cannot be undone.`)) {
      try {
        await deleteWorkflow(workflowName);
        // Success notification (e.g., toast message)
      } catch (error) {
        console.error(`WorkspacePage: Failed to delete workflow ${workflowName}:`, error);
        alert(`Error deleting workflow: ${workflowName}. Check console for details.`);
      }
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

    const handleNewDeployment = () => {
      // Implement new agent creation logic
      console.log('Create new deployment clicked');
    };

    const handleDeleteDeployment = async (deploymentName: string, event: React.MouseEvent) => {
      event.stopPropagation();
      // Implement delete agent logic
      console.log(`Delete deployment ${deploymentName} clicked`);
    };
    
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
          />
        );
      case 'deployment':
        return (
          <DeploymentList
            getWorkflowAsJSONString={getWorkflowAsJSONString}
            availableDeployments={availableWorkflows}
            isLoading={isStoreLoading}
            loadError={loadError}
            handleNewDeployment={handleNewDeployment}
            handleDeleteDeployment={handleDeleteDeployment}
          />
        );        
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
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
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
    </div>
  );
}

export default WorkspacePage; 