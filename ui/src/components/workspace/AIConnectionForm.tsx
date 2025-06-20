import React from 'react';
import { ChevronLeft, Save } from 'lucide-react';

interface AIConnectionFormProps {
  aiConnectionForm: {
    name: string;
    provider: string;
    model: string;
    apiKey: string;
    status: 'active' | 'draft' | 'archived';
  };
  setAiConnectionForm: (form: any) => void;
  handleSaveAIConnection: () => void;
  setSelectedAIConnectionId: (id: string | null) => void;
  activeMenu: string;
}

const AIConnectionForm: React.FC<AIConnectionFormProps> = ({
  aiConnectionForm,
  setAiConnectionForm,
  handleSaveAIConnection,
  setSelectedAIConnectionId,
  activeMenu,
}) => (
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
                onChange={e => setAiConnectionForm({ ...aiConnectionForm, name: e.target.value })}
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
                onChange={e => setAiConnectionForm({ ...aiConnectionForm, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {activeMenu === 'ai-language' ? (
                  <>
                    <option>OpenAI</option>
                    <option>Anthropic</option>
                    <option>Google</option>
                    <option>Mistral</option>
                    <option>Cohere</option>
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
                onChange={e => setAiConnectionForm({ ...aiConnectionForm, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={activeMenu === 'ai-language' ? "e.g., gpt-4, claude-3-opus" : "e.g., text-embedding-ada-002"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                name="apiKey"
                value={aiConnectionForm.apiKey}
                onChange={e => setAiConnectionForm({ ...aiConnectionForm, apiKey: e.target.value })}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                  name="status"
                  value={aiConnectionForm.status}
                  onChange={e => setAiConnectionForm({
                    ...aiConnectionForm,
                    status: e.target.value as 'active' | 'draft' | 'archived'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

          </div>
        </div>
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
);

export default AIConnectionForm; 