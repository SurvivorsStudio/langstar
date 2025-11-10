import React from 'react';
import { ChevronRight, Database, Key, Plus, Workflow, Rocket, CircleDot, Square, Settings, Hammer, PenTool, Clock } from 'lucide-react';
import langstarLogo from '../../assets/common/langstar_logo.png';

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
  return(
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
          <Workflow className="w-4 h-4 mr-2" />
          <span className="flex-1 text-left">Chatflows</span>
        </button>
        <button
          onClick={() => setActiveMenu('deployment')}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'deployment'
            ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Rocket className="w-4 h-4 mr-2" />
          <span className="flex-1 text-left">Deployment</span>
        </button>

        <button
          onClick={() => setActiveMenu('schedule')}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'schedule'
            ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Clock className="w-4 h-4 mr-2" />
          <span className="flex-1 text-left">Schedule</span>
        </button>

        <button
          onClick={() => setActiveMenu('node-creation')}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'node-creation'
            ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <PenTool className="w-4 h-4 mr-2" />
          <span className="flex-1 text-left">Create Node</span>
        </button>

        <div>
          <button
            onClick={() => setActiveMenu('ai-model-config')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenu === 'ai-model-config'
              ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Key className="w-4 h-4 mr-2" />
            <span className="flex-1 text-left">AI Model Configuration</span>
          </button>
        </div>
      </div>
    </nav>
    </div>
  </div>
)};

export default WorkspaceSidebar; 