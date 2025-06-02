import React from 'react';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';

interface AIConnection {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  status: string;
  lastModified: string;
}

interface AIConnectionListProps {
  filteredAIConnections: AIConnection[];
  isLoading: boolean;
  loadError: string | null;
  handleNewAIConnection: () => void;
  setSelectedAIConnectionId: (id: string) => void;
  setAiConnectionForm: (form: any) => void;
  handleDeleteAIConnection: (id: string, e: React.MouseEvent) => void;
  activeMenu: string;
}

const AIConnectionList: React.FC<AIConnectionListProps> = ({
  filteredAIConnections,
  isLoading,
  loadError,
  handleNewAIConnection,
  setSelectedAIConnectionId,
  setAiConnectionForm,
  handleDeleteAIConnection,
  activeMenu,
}) => (
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
    {isLoading && (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-600">Loading AI connections...</p>
      </div>
    )}
    {!isLoading && loadError && (
      <div className="text-red-500 bg-red-100 p-4 rounded-md">
        Error loading AI connections: {loadError}
      </div>
    )}
    {!isLoading && !loadError && filteredAIConnections.length === 0 && (
      <div className="text-center text-gray-500 py-10">
        <p>No {activeMenu === 'ai-language' ? 'language' : 'embedding'} models found.</p>
      </div>
    )}
    {!isLoading && !loadError && filteredAIConnections.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAIConnections.map((connection) => (
          <div
            key={connection.id}
            onClick={() => {
              setSelectedAIConnectionId(connection.id);
              setAiConnectionForm({
                name: connection.name,
                provider: connection.provider,
                model: connection.model,
                apiKey: connection.apiKey || '',
                temperature: connection.temperature ?? 0.7,
                maxTokens: connection.maxTokens ?? 2048,
              });
            }}
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
                    className={`px-2 py-1 text-xs rounded-full ${connection.status === 'active'
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
);

export default AIConnectionList; 