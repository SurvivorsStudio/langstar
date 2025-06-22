import React from 'react';
import { useNavigate } from 'react-router-dom';
// import logoImage from '../assets/common/langstar_logo.png';
import { useFlowStore, DEFAULT_PROJECT_NAME, initialNodes, initialEdges } from '../store/flowStore';
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar';
import WorkflowList from '../components/workspace/WorkflowList';
import RagConfigList from '../components/workspace/RagConfigList';
import RagConfigForm from '../components/workspace/RagConfigForm';
import AIConnectionList from '../components/workspace/AIConnectionList';
import AIConnectionForm from '../components/workspace/AIConnectionForm';

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
    isLoading: isStoreLoading, // 스토어의 isLoading을 isStoreLoading으로 별칭 부여
    loadError,
    setProjectName, // 새 워크플로를 위해 프로젝트 이름 설정 함수 가져오기
    deleteWorkflow, // 워크플로 삭제 함수 가져오기
    // AI Connections
    aiConnections,
    fetchAIConnections,
    addAIConnection,
    updateAIConnection,
    deleteAIConnection,
    isLoadingAIConnections,
    loadErrorAIConnections,
  } = useFlowStore(state => ({
    availableWorkflows: state.availableWorkflows,
    fetchAvailableWorkflows: state.fetchAvailableWorkflows,
    loadWorkflow: state.loadWorkflow,
    isLoading: state.isLoading, // 워크플로 로딩 상태
    loadError: state.loadError, // 워크플로 로드 에러
    setProjectName: state.setProjectName,
    deleteWorkflow: state.deleteWorkflow,
    aiConnections: state.aiConnections, // AI 연결 목록
    fetchAIConnections: state.fetchAIConnections, // AI 연결 가져오기 함수
    addAIConnection: state.addAIConnection, // AI 연결 추가 함수
    updateAIConnection: state.updateAIConnection, // AI 연결 업데이트 함수
    deleteAIConnection: state.deleteAIConnection, // AI 연결 삭제 함수
    isLoadingAIConnections: state.isLoadingAIConnections, // AI 연결 로딩 상태
    loadErrorAIConnections: state.loadErrorAIConnections, // AI 연결 로드 에러
  }));
  const [activeMenu, setActiveMenu] = React.useState('chatflows');
  const [selectedRag, setSelectedRag] = React.useState<string | null>(null);
  const [selectedAIConnectionId, setSelectedAIConnectionId] = React.useState<string | null>(null); // 'new' 또는 실제 ID
  const [aiConnectionForm, setAiConnectionForm] = React.useState({
    name: '',
    provider: 'OpenAI',
    model: '',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    status: 'draft' as 'active' | 'draft' | 'archived',  // ← 여기에 draft 기본값 추가
  });

  //상태 값 관련
  React.useEffect(() => {
    // 기존에 저장된 연결을 편집할 때, 해당 데이터로 폼을 채워줍니다.
    if (selectedAIConnectionId && selectedAIConnectionId !== 'new') {
      const conn = aiConnections.find(c => c.id === selectedAIConnectionId);
      if (conn) {
        setAiConnectionForm({
          name: conn.name,
          provider: conn.provider,
          model: conn.model,
          apiKey: conn.apiKey || '',
          temperature: conn.temperature ?? 0.7,
          maxTokens: conn.maxTokens ?? 2048,
          status: conn.status,  // ← 여기서 기존에 저장된 status 값을 폼에 반영
        });
      }
    }
  }, [selectedAIConnectionId, aiConnections]);

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
    // WorkspacePage가 마운트되거나 activeMenu가 'chatflows'로 변경될 때 워크플로 목록을 가져옵니다.
    if (activeMenu === 'chatflows') {
      fetchAvailableWorkflows();
    } else if (activeMenu === 'ai-language' || activeMenu === 'ai-embedding') {
      fetchAIConnections();
      // 폼과 선택된 항목 초기화
      setSelectedAIConnectionId(null);
      setAiConnectionForm({
        name: '',
        provider: 'OpenAI',
        model: '',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 2048,
        status: 'draft' as 'active' | 'draft' | 'archived',
      });
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
        // 성공 알림 (예: toast)
      } catch (error) {
        alert(`Error deleting AI connection: ${(error as Error).message}`);
      }
    }
  };

  const handleSaveRag = () => {
    // Handle saving RAG configuration
    setSelectedRag(null);
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const filteredAIConnections = aiConnections.filter(conn =>
    selectedAIType ? conn.type === selectedAIType : true
  );

  // handleAIConnectionFormChange function removed as it was unused

  const handleSaveAIConnection = async () => {
    if (!aiConnectionForm.name.trim() || !aiConnectionForm.model.trim()) {
      alert('Connection Name and Model are required.');
      return;
    }
    try {
      const tempFromForm = aiConnectionForm.temperature;
      const maxTokensFromForm = aiConnectionForm.maxTokens;

      // NaN인 경우 undefined로 처리하여 페이로드에서 제외되거나 명시적으로 "값 없음"을 나타내도록 함
      const finalTempValue = (typeof tempFromForm === 'number' && !isNaN(tempFromForm))
        ? tempFromForm
        : undefined;
      const finalMaxTokensValue = (typeof maxTokensFromForm === 'number' && !isNaN(maxTokensFromForm))
        ? maxTokensFromForm
        : undefined;

      const connectionPayload = {
        name: aiConnectionForm.name,
        // 'type' 속성의 타입을 명시적으로 'language' 또는 'embedding' 리터럴로 지정
        type: activeMenu === 'ai-language' ? ('language' as const) : ('embedding' as const),
        provider: aiConnectionForm.provider,
        model: aiConnectionForm.model,
        apiKey: aiConnectionForm.apiKey,
        temperature: activeMenu === 'ai-language' ? finalTempValue : undefined,
        maxTokens: activeMenu === 'ai-language' ? finalMaxTokensValue : undefined,
        status: aiConnectionForm.status,
      };

      if (selectedAIConnectionId === 'new') {
        await addAIConnection(connectionPayload);
      } else if (selectedAIConnectionId) {
        await updateAIConnection(selectedAIConnectionId, connectionPayload);
      }
      setSelectedAIConnectionId(null); // 폼 닫기
      // 성공 알림 (예: toast)
    } catch (error) {
      alert(`Error saving AI connection: ${(error as Error).message}`);
    }
  };

  const handleNewAIConnection = () => {
    setAiConnectionForm({ name: '', provider: 'OpenAI', model: '', apiKey: '', temperature: 0.7, maxTokens: 2048, status: 'draft' as 'active' | 'draft' | 'archived', });
    setSelectedAIConnectionId('new');
  };

  const handleWorkflowClick = async (workflowName: string) => {
    try {
      await loadWorkflow(workflowName); // 스토어에 워크플로 데이터 로드
      navigate(`/flow/${encodeURIComponent(workflowName)}`); // 해당 워크플로 편집 페이지로 이동
    } catch (error) {
      console.error(`WorkspacePage: Failed to load workflow ${workflowName}:`, error);
      // 여기에 사용자에게 오류 메시지를 표시하는 로직을 추가할 수 있습니다 (예: toast 알림)
      alert(`Error loading workflow: ${workflowName}. Check console for details.`);
    }
  };

  const handleNewWorkflow = () => {
    // 새 워크플로를 위한 상태 초기화 (선택 사항)
    const store = useFlowStore.getState();
    let newProjectName = defaultProjectName;
    let counter = 1;
    // 이미 존재하는 프로젝트 이름과 중복되지 않도록 처리
    while (store.availableWorkflows.includes(newProjectName)) {
      newProjectName = `${defaultProjectName} (${counter})`;
      counter++;
    }

    setProjectName(newProjectName); // 새 프로젝트 이름 설정
    // nodes, edges, viewport를 초기 상태로 설정합니다.
    // flowStore.ts에 정의된 initialNodes, initialEdges를 사용하거나, 직접 초기값을 지정합니다.
    // Viewport의 초기값도 설정합니다.
    useFlowStore.setState({ nodes: initialNodes, edges: initialEdges, viewport: { x: 0, y: 0, zoom: 1 }, lastSaved: null });
    navigate(`/flow/${encodeURIComponent(newProjectName)}`);
  };

  const handleDeleteWorkflow = async (workflowName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 부모 요소의 onClick 이벤트 전파 방지
    if (window.confirm(`Are you sure you want to delete the workflow "${workflowName}"? This action cannot be undone.`)) {
      try {
        await deleteWorkflow(workflowName);
        // 성공 알림 (예: toast 메시지)
      } catch (error) {
        console.error(`WorkspacePage: Failed to delete workflow ${workflowName}:`, error);
        alert(`Error deleting workflow: ${workflowName}. Check console for details.`);
      }
    }
  };

  // logoStyle removed as it was unused

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <WorkspaceSidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          expandedMenus={expandedMenus}
          toggleMenu={toggleMenu}
          setSelectedAIType={setSelectedAIType}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
          {activeMenu === 'chatflows' && (
            <WorkflowList
              availableWorkflows={availableWorkflows}
              isLoading={isStoreLoading}
              loadError={loadError}
              handleNewWorkflow={handleNewWorkflow}
              handleWorkflowClick={handleWorkflowClick}
              handleDeleteWorkflow={handleDeleteWorkflow}
            />
          )}

          {activeMenu === 'rag' && !selectedRag && (
            <RagConfigList
              ragConfigs={mockRagConfigs}
              onNewRag={() => setSelectedRag('new')}
              onDeleteRag={handleDeleteRag}
              onSelectRag={setSelectedRag}
            />
          )}

          {activeMenu === 'rag' && selectedRag && (
            <RagConfigForm
              newRag={newRag}
              setNewRag={setNewRag}
              handleSaveRag={handleSaveRag}
              setSelectedRag={setSelectedRag}
            />
          )}

          {(activeMenu === 'ai-language' || activeMenu === 'ai-embedding') && !selectedAIConnectionId && (
            <AIConnectionList
              filteredAIConnections={filteredAIConnections}
              isLoading={isLoadingAIConnections}
              loadError={loadErrorAIConnections}
              handleNewAIConnection={handleNewAIConnection}
              setSelectedAIConnectionId={setSelectedAIConnectionId}
              setAiConnectionForm={setAiConnectionForm}
              handleDeleteAIConnection={handleDeleteAIConnection}
              activeMenu={activeMenu}
            />
          )}

          {(activeMenu === 'ai-language' || activeMenu === 'ai-embedding') && selectedAIConnectionId && (
            <AIConnectionForm
              aiConnectionForm={aiConnectionForm}
              setAiConnectionForm={setAiConnectionForm}
              handleSaveAIConnection={handleSaveAIConnection}
              setSelectedAIConnectionId={setSelectedAIConnectionId}
              activeMenu={activeMenu}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkspacePage; 