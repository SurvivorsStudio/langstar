import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from '../assets/common/langstar_logo.png';
import { PlusCircle, Settings, ChevronRight, Database, Key, Trash2, ChevronLeft, ChevronDown, Loader2, Save } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';

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

const AdminPage: React.FC = () => {
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
  });
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

  React.useEffect(() => {
    // AdminPage가 마운트되거나 activeMenu가 'chatflows'로 변경될 때 워크플로 목록을 가져옵니다.
    if (activeMenu === 'chatflows') {
      fetchAvailableWorkflows();
    } else if (activeMenu === 'ai-language' || activeMenu === 'ai-embedding') {
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

  const handleAIConnectionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAiConnectionForm(prev => ({
      ...prev,
      [name]: name === 'temperature' || name === 'maxTokens' ? parseFloat(value) : value,
    }));
  };

  const handleSaveAIConnection = async () => {
    if (!aiConnectionForm.name.trim() || !aiConnectionForm.model.trim()) {
      alert('Connection Name and Model are required.');
      return;
    }
    try {
      const connectionPayload = {
        name: aiConnectionForm.name,
        type: activeMenu === 'ai-language' ? 'language' : 'embedding',
        provider: aiConnectionForm.provider,
        model: aiConnectionForm.model,
        apiKey: aiConnectionForm.apiKey,
        temperature: activeMenu === 'ai-language' ? aiConnectionForm.temperature : undefined,
        maxTokens: activeMenu === 'ai-language' ? aiConnectionForm.maxTokens : undefined,
        status: 'active' as 'active', // 기본 상태
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
    setAiConnectionForm({ name: '', provider: 'OpenAI', model: '', apiKey: '', temperature: 0.7, maxTokens: 2048 });
    setSelectedAIConnectionId('new');
  };

  const handleWorkflowClick = async (workflowName: string) => {
    try {
      await loadWorkflow(workflowName); // 스토어에 워크플로 데이터 로드
      navigate(`/flow/${encodeURIComponent(workflowName)}`); // 해당 워크플로 편집 페이지로 이동
    } catch (error) {
      console.error(`AdminPage: Failed to load workflow ${workflowName}:`, error);
      // 여기에 사용자에게 오류 메시지를 표시하는 로직을 추가할 수 있습니다 (예: toast 알림)
      alert(`Error loading workflow: ${workflowName}. Check console for details.`);
    }
  };

  const handleNewWorkflow = () => {
    // 새 워크플로를 위한 상태 초기화 (선택 사항)
    const store = useFlowStore.getState();
    const defaultProjectName = store.DEFAULT_PROJECT_NAME || 'New Workflow'; // flowStore에 DEFAULT_PROJECT_NAME이 없다면 기본값 사용
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
    useFlowStore.setState({ nodes: store.initialNodes || [], edges: store.initialEdges || [], viewport: { x: 0, y: 0, zoom: 1 }, lastSaved: null });
    navigate(`/flow/${encodeURIComponent(newProjectName)}`); 
  };

  const handleDeleteWorkflow = async (workflowName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 부모 요소의 onClick 이벤트 전파 방지
    if (window.confirm(`Are you sure you want to delete the workflow "${workflowName}"? This action cannot be undone.`)) {
      try {
        await deleteWorkflow(workflowName);
        // 성공 알림 (예: toast 메시지)
      } catch (error) {
        console.error(`AdminPage: Failed to delete workflow ${workflowName}:`, error);
        alert(`Error deleting workflow: ${workflowName}. Check console for details.`);
      }
    }
  };

  const logoStyle = {
      height: "3rem"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              {/* <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div> */}
              <img src={logoImage} alt="LangStar Logo" style={logoStyle} />
            </div>
          </div>
          <nav className="p-4">
            <div className="space-y-1">
              <button 
                onClick={() => setActiveMenu('chatflows')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeMenu === 'chatflows' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="flex-1 text-left">Chatflows</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setActiveMenu('rag')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeMenu === 'rag' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Database className="w-4 h-4 mr-2" />
                <span className="flex-1 text-left">RAG Configuration</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div>
                <button 
                  onClick={() => toggleMenu('aiKeys')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeMenu.startsWith('ai-') 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Key className="w-4 h-4 mr-2" />
                  <span className="flex-1 text-left">AI Model Keys</span>
                  <ChevronDown className={`w-4 h-4 transform transition-transform ${
                    expandedMenus.aiKeys ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {expandedMenus.aiKeys && (
                  <div className="ml-6 mt-1 space-y-1">
                    <button
                      onClick={() => {
                        setActiveMenu('ai-language');
                        setSelectedAIType('language');
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        activeMenu === 'ai-language'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex-1 text-left">Language Models</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu('ai-embedding');
                        setSelectedAIType('embedding');
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        activeMenu === 'ai-embedding'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex-1 text-left">Embedding Models</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {activeMenu === 'chatflows' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Workflows</h1>
                <button
                  onClick={handleNewWorkflow}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  New Workflow
                </button>
              </div>
              
              {isStoreLoading && (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="ml-2 text-gray-600">Loading workflows...</p>
                </div>
              )}

              {!isStoreLoading && loadError && (
                <div className="text-red-500 bg-red-100 p-4 rounded-md">
                  Error loading workflows: {loadError}
                </div>
              )}

              {!isStoreLoading && !loadError && availableWorkflows.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  <p>No workflows found.</p>
                  <p>Click "New Workflow" to get started.</p>
                </div>
              )}

              {!isStoreLoading && !loadError && availableWorkflows.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableWorkflows.map((workflowName) => (
                    <div
                      key={workflowName}
                      onClick={() => handleWorkflowClick(workflowName)}
                      className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative" // group 클래스 확인, relative 추가
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{workflowName}</h3>
                          {/* lastModified, status 등 추가 정보는 flowStore에서 해당 데이터를 저장하고 가져오도록 수정해야 표시 가능합니다. */}
                        </div>
                        {/* opacity-0 group-hover:opacity-100 를 일단 제거하여 항상 보이도록 수정 */}
                        <button
                          onClick={(e) => handleDeleteWorkflow(workflowName, e)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-opacity absolute top-2 right-2"
                          title={`Delete ${workflowName}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          Saved
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMenu === 'rag' && !selectedRag && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800">RAG Configurations</h1>
                  <p className="text-gray-600 mt-2">Manage your Retrieval-Augmented Generation configurations</p>
                </div>
                <button
                  onClick={() => setSelectedRag('new')}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  New RAG
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockRagConfigs.map((rag) => (
                  <div
                    key={rag.id}
                    onClick={() => setSelectedRag(rag.id)}
                    className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{rag.name}</h3>
                          <button
                            onClick={(e) => handleDeleteRag(rag.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{rag.description}</p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Vector DB:</span>
                            {rag.vectorDb}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Embedding:</span>
                            {rag.embeddingModel}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Host:</span>
                            {rag.host}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            Modified: {rag.lastModified}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              rag.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {rag.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === 'rag' && selectedRag && (
            <div className="p-8">
              <div className="mb-6">
                <button
                  onClick={() => setSelectedRag(null)}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back to RAG Configurations
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input 
                          type="text" 
                          value={newRag.name}
                          onChange={(e) => setNewRag({ ...newRag, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter RAG name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={newRag.description}
                          onChange={(e) => setNewRag({ ...newRag, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Enter RAG description"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Vector Database Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Database Type
                        </label>
                        <select
                          value={newRag.vectorDb}
                          onChange={(e) => setNewRag({ ...newRag, vectorDb: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Pinecone">Pinecone</option>
                          <option value="Weaviate">Weaviate</option>
                          <option value="Milvus">Milvus</option>
                          <option value="Qdrant">Qdrant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Host
                        </label>
                        <input 
                          type="text"
                          value={newRag.host}
                          onChange={(e) => setNewRag({ ...newRag, host: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter host URL"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Port
                        </label>
                        <input 
                          type="text"
                          value={newRag.port}
                          onChange={(e) => setNewRag({ ...newRag, port: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter port number"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Embedding Configuration</h2>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Embedding Model
                      </label>
                      <select
                        value={newRag.embeddingModel}
                        onChange={(e) => setNewRag({ ...newRag, embeddingModel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OpenAI Ada 002">OpenAI Ada 002</option>
                        <option value="Cohere Embed">Cohere Embed</option>
                        <option value="GTE-Large">GTE-Large</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSaveRag}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeMenu === 'ai-language' || activeMenu === 'ai-embedding') && !selectedAIConnectionId && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800">
                    {activeMenu === 'ai-language' ? 'Language Models' : 'Embedding Models'}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Manage your {activeMenu === 'ai-language' ? 'language' : 'embedding'} model connections and API keys
                  </p>
                </div>
                <button
                  onClick={handleNewAIConnection}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  New {activeMenu === 'ai-language' ? 'Language Model' : 'Embedding Model'}
                </button>
              </div>

              {isLoadingAIConnections && (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="ml-2 text-gray-600">Loading AI connections...</p>
                </div>
              )}
              {!isLoadingAIConnections && loadErrorAIConnections && (
                <div className="text-red-500 bg-red-100 p-4 rounded-md">
                  Error loading AI connections: {loadErrorAIConnections}
                </div>
              )}
              {!isLoadingAIConnections && !loadErrorAIConnections && filteredAIConnections.length === 0 && (
                 <div className="text-center text-gray-500 py-10">
                   <p>No {activeMenu === 'ai-language' ? 'language' : 'embedding'} models found.</p>
                 </div>
              )}

              {!isLoadingAIConnections && !loadErrorAIConnections && filteredAIConnections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAIConnections.map((connection) => (
                  <div
                    key={connection.id}
                    onClick={() => { setSelectedAIConnectionId(connection.id); setAiConnectionForm({...connection, apiKey: connection.apiKey || '' }); }}
                    className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{connection.name}</h3>
                          <button
                            onClick={(e) => handleDeleteAIConnection(connection.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Provider:</span>
                            {connection.provider}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Model:</span>
                            {connection.model}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            Modified: {connection.lastModified}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              connection.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {connection.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {(activeMenu === 'ai-language' || activeMenu === 'ai-embedding') && selectedAIConnectionId && (
            <div className="p-8">
              <div className="mb-6">
                <button
                  onClick={() => setSelectedAIConnectionId(null)}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back to {activeMenu === 'ai-language' ? 'Language' : 'Embedding'} Models
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Connection Details</h2>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Connection Name
                        </label>
                        <input
                          name="name"
                          type="text" 
                          value={aiConnectionForm.name}
                          onChange={handleAIConnectionFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter connection name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Provider
                        </label>
                        <select 
                          name="provider"
                          value={aiConnectionForm.provider}
                          onChange={handleAIConnectionFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {activeMenu === 'ai-language' ? (
                            <>
                              <option>OpenAI</option>
                              <option>Anthropic</option>
                              <option>Google</option>
                              <option>Mistral</option>
                              <option>Cohere</option> {/* Language models from Cohere exist */}
                            </>
                          ) : (
                            <>
                              <option>OpenAI</option>
                              <option>Cohere</option>
                              <option>HuggingFace</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Model
                        </label>
                        <input
                          name="model"
                          type="text"
                          value={aiConnectionForm.model}
                          onChange={handleAIConnectionFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={activeMenu === 'ai-language' ? "e.g., gpt-4, claude-3-opus" : "e.g., text-embedding-ada-002"}
                        />
                        {/* 아래 select는 예시로 남겨두거나, provider에 따라 동적으로 모델 목록을 가져오는 방식으로 개선 가능 */}
                        {/* <select 
                          name="model"
                          value={aiConnectionForm.model}
                          onChange={handleAIConnectionFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {activeMenu === 'ai-language' ? (
                            <>
                              <option>gpt-4</option>
                              <option>gpt-3.5-turbo</option>
                              <option>claude-3-opus</option>
                              <option>claude-3-sonnet</option>
                              <option>gemini-pro</option>
                              <option>mistral-large</option>
                              <option>command</option>
                            </>
                          ) : (
                            <>
                              <option>text-embedding-ada-002</option>
                              <option>embed-english-v3.0</option>
                              <option>gte-large</option>
                            </>
                          )}
                        </select> */}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Key
                        </label>
                        <input
                          name="apiKey"
                          value={aiConnectionForm.apiKey}
                          onChange={handleAIConnectionFormChange}
                          type="password" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter API key"
                        />
                      </div>
                    </div>
                  </div>

                  {activeMenu === 'ai-language' && (
                    <div>
                      <h2 className="text-lg font-medium text-gray-800 mb-4">Advanced Settings</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Temperature
                          </label>
                          <input
                            name="temperature"
                            value={aiConnectionForm.temperature}
                            onChange={handleAIConnectionFormChange}
                            type="number" 
                            min="0" 
                            max="2" 
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.7"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Tokens
                          </label>
                          <input
                            name="maxTokens"
                            value={aiConnectionForm.maxTokens}
                            onChange={handleAIConnectionFormChange}
                            type="number" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="2048"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={handleSaveAIConnection}
                      className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      <Save size={16} className="mr-2" /> Save Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;