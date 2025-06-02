import React from 'react';
import { Database, Key, ChevronRight, ChevronDown } from 'lucide-react';

interface AdminSidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  expandedMenus: Record<string, boolean>;
  toggleMenu: (menu: string) => void;
  setSelectedAIType: (type: 'language' | 'embedding' | null) => void;
}

const WorkspaceSidebar: React.FC<AdminSidebarProps> = ({
  activeMenu,
  setActiveMenu,
  expandedMenus,
  toggleMenu,
  setSelectedAIType,
}) => (
  <div className="w-64 bg-white border-r border-gray-200">
    <nav className="p-4">
      <div className="space-y-1">
        <button
          onClick={() => setActiveMenu('chatflows')}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'chatflows'
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex-1 text-left">Chatflows</span>
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveMenu('rag')}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'rag'
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
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu.startsWith('ai-')
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Key className="w-4 h-4 mr-2" />
            <span className="flex-1 text-left">AI Model Keys</span>
            <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedMenus.aiKeys ? 'rotate-180' : ''}`} />
          </button>
          {expandedMenus.aiKeys && (
            <div className="ml-6 mt-1 space-y-1">
              <button
                onClick={() => {
                  setActiveMenu('ai-language');
                  setSelectedAIType('language');
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'ai-language'
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
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'ai-embedding'
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
);

export default WorkspaceSidebar; 