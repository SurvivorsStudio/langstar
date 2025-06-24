import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

interface RagConfig {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  status: string;
  vectorDb: string;
  embeddingModel: string;
  host: string;
  port: string;
}

interface RagConfigListProps {
  ragConfigs: RagConfig[];
  onNewRag: () => void;
  onDeleteRag: (id: string, e: React.MouseEvent) => void;
  onSelectRag: (id: string) => void;
}

const RagConfigList: React.FC<RagConfigListProps> = ({
  ragConfigs,
  onNewRag,
  onDeleteRag,
  onSelectRag,
}) => (
  <div className="p-8">
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">RAG Configurations</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Manage your Retrieval-Augmented Generation configurations</p>
      </div>
      <button
        onClick={onNewRag}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <PlusCircle className="w-5 h-5 mr-2" />
        New RAG
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ragConfigs.map((rag) => (
        <div
          key={rag.id}
          onClick={() => onSelectRag(rag.id)}
          className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{rag.name}</h3>
                <button
                  onClick={(e) => onDeleteRag(rag.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{rag.description}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium mr-2">Vector DB:</span>
                  {rag.vectorDb}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium mr-2">Embedding:</span>
                  {rag.embeddingModel}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium mr-2">Host:</span>
                  {rag.host}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Modified: {rag.lastModified}
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${rag.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
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
);

export default RagConfigList; 