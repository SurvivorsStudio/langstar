import React, { useState } from 'react';
import { PlusCircle, Trash2, Loader2, MessageSquareText, Database } from 'lucide-react';
import { AIConnection } from '../../types/aiConnection';

interface AIConnectionListProps {
  filteredAIConnections: AIConnection[];
  isLoading: boolean;
  loadError: string | null;
  handleNewAIConnection: () => void;
  handleEditAIConnection: (connection: AIConnection) => void;
  handleDeleteAIConnection: (id: string, e: React.MouseEvent) => void;
  activeMenu: string;
}

const AIConnectionList: React.FC<AIConnectionListProps> = ({
  filteredAIConnections,
  isLoading,
  loadError,
  handleNewAIConnection,
  handleEditAIConnection,
  handleDeleteAIConnection,
  activeMenu,
}) => {
  const [filter, setFilter] = useState<'all' | 'language' | 'embedding'>('all');
  const isUnifiedView = activeMenu === 'ai-model-config';

  // 타입별 분리 (type 필드가 대소문자/undefined여도 안전하게)
  const languageModels = filteredAIConnections.filter(conn => (conn.type || '').toLowerCase() === 'language');
  const embeddingModels = filteredAIConnections.filter(conn => (conn.type || '').toLowerCase() === 'embedding');

  // 필터링된 모델
  const showLanguage = filter === 'all' || filter === 'language';
  const showEmbedding = filter === 'all' || filter === 'embedding';

  // 날짜 포맷 함수 추가
  function formatDate(isoString: string) {
    const date = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            AI Models
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your AI model connections and API keys
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          {/* 필터 버튼 그룹 */}
          <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${filter === 'all' ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${filter === 'language' ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => setFilter('language')}
            >
              Language Model
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${filter === 'embedding' ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => setFilter('embedding')}
            >
              Embedding Model
            </button>
          </div>
          <button
            onClick={handleNewAIConnection}
            className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            New AI Model Connection
          </button>
        </div>
      </div>

      {/* 언어 모델 섹션 */}
      {showLanguage && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-black dark:text-gray-100 mb-4">Language Models</h2>
          {isLoading && (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="ml-2 text-gray-600">Loading AI connections...</p>
            </div>
          )}
          {!isLoading && loadError && (
            <div className="text-red-500 bg-red-100 p-4 rounded-md border border-red-200">
              <p className="font-medium">Error occurred</p>
              <p className="text-sm mt-1">Failed to load AI connections: {loadError}</p>
            </div>
          )}
          {!isLoading && !loadError && languageModels.length === 0 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No language models found
              </h3>
              <p className="text-gray-600 mb-6">
                Add your first language model connection
              </p>
            </div>
          )}
          {!isLoading && !loadError && languageModels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {languageModels.map((connection) => (
                <div
                  key={connection.id}
                  onClick={() => handleEditAIConnection(connection)}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-pointer group transform hover:scale-105"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 타입 배지 */}
                      <div className="mb-2 flex items-center">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full mr-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200">
                          <MessageSquareText className="w-4 h-4 mr-1" />
                          Language Model
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span className="font-medium mr-2 w-16">Name:</span>
                        <span className="bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded text-xs">{connection.name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span className="font-medium mr-2 w-16">Provider:</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{connection.provider}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span className="font-medium mr-2 w-16">Model:</span>
                        <span
                          className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap block"
                          title={connection.model}
                        >
                          {connection.model}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Modified: {formatDate(connection.lastModified)}
                        </span>
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            connection.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : connection.status === 'draft'
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {connection.status === 'active' ? 'Active' : 
                           connection.status === 'draft' ? 'Draft' : 'Archived'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAIConnection(connection.id, e);
                      }}
                      className="ml-2 p-2 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600 transition-colors" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 임베딩 모델 섹션 */}
      {showEmbedding && (
        <div>
          <h2 className="text-xl font-bold text-black dark:text-gray-100 mb-4">Embedding Models</h2>
          {isLoading && (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="ml-2 text-gray-600">Loading AI connections...</p>
            </div>
          )}
          {!isLoading && loadError && (
            <div className="text-red-500 bg-red-100 p-4 rounded-md border border-red-200">
              <p className="font-medium">Error occurred</p>
              <p className="text-sm mt-1">Failed to load AI connections: {loadError}</p>
            </div>
          )}
          {!isLoading && !loadError && embeddingModels.length === 0 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No embedding models found
              </h3>
              <p className="text-gray-600 mb-6">
                Add your first embedding model connection
              </p>
            </div>
          )}
          {!isLoading && !loadError && embeddingModels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {embeddingModels.map((connection) => (
                <div
                  key={connection.id}
                  onClick={() => handleEditAIConnection(connection)}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-pointer group transform hover:scale-105"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 타입 배지 */}
                      <div className="mb-2 flex items-center">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full mr-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                          <Database className="w-4 h-4 mr-1" />
                          Embedding Model
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span className="font-medium mr-2 w-16">Name:</span>
                        <span className="bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded text-xs">{connection.name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span className="font-medium mr-2 w-16">Provider:</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{connection.provider}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span className="font-medium mr-2 w-16">Model:</span>
                        <span
                          className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap block"
                          title={connection.model}
                        >
                          {connection.model}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Modified: {formatDate(connection.lastModified)}
                        </span>
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            connection.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : connection.status === 'draft'
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {connection.status === 'active' ? 'Active' : 
                           connection.status === 'draft' ? 'Draft' : 'Archived'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAIConnection(connection.id, e);
                      }}
                      className="ml-2 p-2 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600 transition-colors" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIConnectionList; 