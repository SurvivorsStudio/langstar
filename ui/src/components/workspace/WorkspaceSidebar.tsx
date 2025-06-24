import React from 'react';
import { ChevronRight, Database, Key, Sun, Moon } from 'lucide-react';
import langstarLogo from '../../assets/common/langstar_logo.png';
import { useThemeStore } from '../../store/themeStore';

interface AdminSidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  expandedMenus: { [key: string]: boolean };
  toggleMenu: (menu: string) => void;
  setSelectedAIType: (type: 'language' | 'embedding' | null) => void;
}

const WorkspaceSidebar: React.FC<AdminSidebarProps> = ({
  activeMenu,
  setActiveMenu,
  expandedMenus,
  toggleMenu,
  setSelectedAIType,
}) => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-between">
      <div>
        <div className="flex flex-row items-start py-4">
          <img src={langstarLogo} alt="LangStar Logo" className="w-40 h-auto ml-4" />
        </div>
        <nav className="p-4">
          <div className="space-y-1">
            <button
              onClick={() => setActiveMenu('chatflows')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'chatflows'
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="flex-1 text-left">Chatflows</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveMenu('rag')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'rag'
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Database className="w-4 h-4 mr-2" />
              <span className="flex-1 text-left">RAG Configuration</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {/* AI Model Keys - Accordion Menu */}
            <div>
              <button
                onClick={() => toggleMenu('aiModelKeys')}
                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Key className="w-4 h-4 mr-2" />
                <span className="flex-1 text-left">AI Model Keys</span>
                <ChevronRight className={`w-4 h-4 transform transition-transform ${expandedMenus['aiModelKeys'] ? 'rotate-90' : ''}`} />
              </button>
              {expandedMenus['aiModelKeys'] && (
                <div className="pl-6 mt-1 space-y-1">
                  <button
                    onClick={() => {
                      setActiveMenu('ai-language');
                      setSelectedAIType('language');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md ${activeMenu === 'ai-language' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    Language Models
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenu('ai-embedding');
                      setSelectedAIType('embedding');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md ${activeMenu === 'ai-embedding' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    Embedding Models
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* 다크모드 토글 버튼 */}
      <div 
        className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-800 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-200 cursor-pointer transition-colors"
        onClick={toggleDarkMode}
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <div className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-100 dark:text-gray-800">
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          {isDarkMode ? <Sun className="h-5 w-5 text-red-500" /> : <Moon className="h-5 w-5 text-yellow-500" />}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceSidebar; 