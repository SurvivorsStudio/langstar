import React, { useState } from 'react';
import { Save, Play, Undo, Redo, Settings, Loader2, FileJson, Copy, X, Rocket } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import { Link } from 'react-router-dom';
import homeLogo from '../assets/common/home_logo.png';
import { apiService } from '../services/apiService';
import { DeploymentFormData, Deployment } from '../types/deployment';
import DeploymentModal from './DeploymentModal';
import DeploymentSuccessModal from './DeploymentSuccessModal';

import CodeEditor from './CodeEditor';

const Header: React.FC = () => {
  const { 
    projectName, 
    setProjectName, 
    runWorkflow, 
    isWorkflowRunning, 
    saveWorkflow, 
    isSaving,
    getWorkflowAsJSONString,
    nodes
  } = useFlowStore(state => ({ 
    projectName: state.projectName, setProjectName: state.setProjectName, runWorkflow: state.runWorkflow, isWorkflowRunning: state.isWorkflowRunning, saveWorkflow: state.saveWorkflow, isSaving: state.isSaving, getWorkflowAsJSONString: state.getWorkflowAsJSONString, nodes: state.nodes
  }));

  const [apiResponseModalContent, setApiResponseModalContent] = useState<string | null>(null);
  const [editableModalContent, setEditableModalContent] = useState<string>('');
  
  // 배포 관련 상태
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentSuccessModalOpen, setDeploymentSuccessModalOpen] = useState(false);
  const [createdDeployment, setCreatedDeployment] = useState<Deployment | null>(null);

  // 배포 생성 함수
  const handleCreateDeployment = async (deploymentData: DeploymentFormData) => {
    setIsDeploying(true);
    try {
      const jsonString = getWorkflowAsJSONString();
      if (!jsonString) {
        throw new Error('워크플로우 데이터를 생성할 수 없습니다.');
      }

      const workflowData = JSON.parse(jsonString);
      const deployment = await apiService.createDeployment(deploymentData, workflowData);
      
      setCreatedDeployment(deployment);
      setDeploymentSuccessModalOpen(true);
      setIsDeploymentModalOpen(false);
    } catch (error) {
      console.error('Deployment creation failed:', error);
      alert(`배포 생성에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center">
          <Link to="/">
            <div className="w-8 h-8 rounded-md bg-[#1E2836] flex items-center justify-center text-white mr-2 cursor-pointer">
              <img src={homeLogo} alt="Home Logo" className="w-8 h-8 object-contain" />
            </div>
          </Link>
          <div className="relative">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="font-medium text-gray-800 dark:text-gray-200 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 px-2 py-1 rounded"
              placeholder="Untitled Project"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
          <Undo className="h-4 w-4" />
        </button>
        <button className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
          <Redo className="h-4 w-4" />
        </button>
        <button className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={async () => {
            const jsonString = getWorkflowAsJSONString();
            if (jsonString) {
              console.log("Workflow JSON:\n", jsonString);
              try {
                // JSON 문자열을 파싱하여 Workflow 객체로 변환
                const workflowData = JSON.parse(jsonString);
                const langgraphCode = await apiService.generateLangGraphCode(workflowData);
                
                setApiResponseModalContent(langgraphCode);
                setEditableModalContent(langgraphCode);
              } catch (error) {
                console.error('Header.tsx: Error exporting workflow JSON via API:', error);
                alert(`Failed to export workflow JSON. An error occurred: ${error instanceof Error ? error.message : String(error)}`);
              }
            } else {
              alert('Failed to generate workflow JSON.');
            }
          }}
          className="hidden sm:flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm"
          title="Export Workflow as Python"
        >
          <FileJson className="h-4 w-4 mr-1" />
          Export Python
        </button>
        <button
          onClick={async () => {
            if (saveWorkflow) {
              try {
                await saveWorkflow();
                alert('Workflow saved successfully!');
              } catch (error) {
                console.error('Header.tsx: Error saving workflow:', error);
                alert('Failed to save workflow. Please try again.');
              }
            } else {
              console.error('Header.tsx: saveWorkflow function is undefined!');
            }
          }}
          disabled={isSaving}
          className="hidden sm:flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => setIsDeploymentModalOpen(true)}
          disabled={nodes.length === 0 || isDeploying}
          className="hidden sm:flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title={nodes.length === 0 ? "워크플로우에 노드를 추가한 후 배포하세요" : "Deploy Workflow"}
        >
          <Rocket className="h-4 w-4 mr-1" />
          Deploy
        </button>
        <button
          onClick={() => {
            console.log('Header.tsx: Run button clicked!');
            if (runWorkflow) {
              runWorkflow();
            } else {
              console.error('Header.tsx: runWorkflow function is undefined!');
            }
          }}
          disabled={isWorkflowRunning}
          className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWorkflowRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" /> Run
            </>
          )}
        </button>
      </div>
      {apiResponseModalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold ml-1 text-gray-900 dark:text-gray-100">API Response</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    if (editableModalContent) {
                      try {
                        await navigator.clipboard.writeText(editableModalContent);
                        alert('Code copied to clipboard!');
                      } catch (err) {
                        console.error('Failed to copy code: ', err);
                        alert('Failed to copy code. See console for details.');
                      }
                    }
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
                  title="Copy Code"
                >
                  <Copy size={16} className="mr-1" /> Copy
                </button>
                <button
                  onClick={() => {
                    setApiResponseModalContent(null);
                    setEditableModalContent('');
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
              <div className="h-[60vh] border border-gray-300 dark:border-gray-600 rounded-md">
                <CodeEditor
                  value={editableModalContent}
                  onChange={setEditableModalContent}
                  language="python"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 배포 모달 */}
      <DeploymentModal
        isOpen={isDeploymentModalOpen}
        onClose={() => setIsDeploymentModalOpen(false)}
        onSubmit={handleCreateDeployment}
        isLoading={isDeploying}
      />

      {/* 배포 성공 모달 */}
      <DeploymentSuccessModal
        isOpen={deploymentSuccessModalOpen}
        onClose={() => {
          setDeploymentSuccessModalOpen(false);
          setCreatedDeployment(null);
        }}
        deployment={createdDeployment}
      />
    </header>
  );
};

export default Header;