import React from 'react';
import { ChevronLeft, Save } from 'lucide-react';

interface RagConfigFormProps {
  newRag: {
    name: string;
    description: string;
    vectorDb: string;
    host: string;
    port: string;
    embeddingModel: string;
  };
  setNewRag: (rag: {
    name: string;
    description: string;
    vectorDb: string;
    host: string;
    port: string;
    embeddingModel: string;
  }) => void;
  handleSaveRag: () => void;
  setSelectedRag: (id: string | null) => void;
}

const RagConfigForm: React.FC<RagConfigFormProps> = ({
  newRag,
  setNewRag,
  handleSaveRag,
  setSelectedRag,
}) => (
  <div className="p-8">
    <div className="mb-6">
      <button
        onClick={() => setSelectedRag(null)}
        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Back to RAG Configurations
      </button>
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newRag.name}
                onChange={(e) => setNewRag({ ...newRag, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter RAG name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={newRag.description}
                onChange={(e) => setNewRag({ ...newRag, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={3}
                placeholder="Enter RAG description"
              />
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Vector Database Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Database Type
              </label>
              <select
                value={newRag.vectorDb}
                onChange={(e) => setNewRag({ ...newRag, vectorDb: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Pinecone">Pinecone</option>
                <option value="Weaviate">Weaviate</option>
                <option value="Milvus">Milvus</option>
                <option value="Qdrant">Qdrant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Host
              </label>
              <input
                type="text"
                value={newRag.host}
                onChange={(e) => setNewRag({ ...newRag, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter host URL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="text"
                value={newRag.port}
                onChange={(e) => setNewRag({ ...newRag, port: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter port number"
              />
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Embedding Configuration</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Embedding Model
            </label>
            <select
              value={newRag.embeddingModel}
              onChange={(e) => setNewRag({ ...newRag, embeddingModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center"
          >
            <Save size={16} className="mr-2" /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default RagConfigForm; 