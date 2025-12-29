import React, { useState, useEffect } from 'react';
import { Save, Play, Loader2, FileJson, Copy, X, Rocket, Bot } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import { useWorkflowStorageStore } from '../store/workflowStorageStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from '../hooks/useTranslation';
import { Link, useNavigate } from 'react-router-dom';
import homeLogo from '../assets/common/home_logo.png';
import { apiService } from '../services/apiService';
import { DeploymentFormData, Deployment } from '../types/deployment';
import DeploymentModal from './deployment/DeploymentModal';
import DeploymentSuccessModal from './deployment/DeploymentSuccessModal';

import CodeEditor from './CodeEditor';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useThemeStore();
  const { t } = useTranslation();
  const { 
    projectName, 
    setProjectName, 
    runWorkflow, 
    isWorkflowRunning, 
    saveWorkflow, 
    isSaving,
    getWorkflowAsJSONString,
    nodes,
  } = useFlowStore(state => ({ 
    projectName: state.projectName, setProjectName: state.setProjectName, runWorkflow: state.runWorkflow, isWorkflowRunning: state.isWorkflowRunning, saveWorkflow: state.saveWorkflow, isSaving: state.isSaving, getWorkflowAsJSONString: state.getWorkflowAsJSONString, nodes: state.nodes
  }));

  const { renameWorkflow } = useWorkflowStorageStore();

  const [apiResponseModalContent, setApiResponseModalContent] = useState<string | null>(null);
  const [editableModalContent, setEditableModalContent] = useState<string>('');
  
  // 워크플로우 이름 편집 관련 상태
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(projectName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isProcessingRename, setIsProcessingRename] = useState(false);
  
  // projectName이 변경될 때 editingName도 업데이트
  React.useEffect(() => {
    setEditingName(projectName);
  }, [projectName]);

  // 편집 중일 때 포커스를 잃으면 편집 취소
  const handleBlur = () => {
    if (isEditingName && !isProcessingRename && !isRenaming) {
      // 처리 중이 아닐 때만 취소, 지연 시간도 늘림
      setTimeout(() => {
        if (isEditingName && !isProcessingRename && !isRenaming) {
          handleCancelEditName();
        }
      }, 100);
    }
  };
  
  // 배포 관련 상태
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentSuccessModalOpen, setDeploymentSuccessModalOpen] = useState(false);
  const [createdDeployment, setCreatedDeployment] = useState<Deployment | null>(null);

  // AI 채팅 관련 상태
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // AI 채팅 상태 동기화
  useEffect(() => {
    const handleAiChatToggle = (event: CustomEvent) => {
      setIsAiChatOpen(event.detail.isOpen);
    };

    window.addEventListener('ai-chat-toggle', handleAiChatToggle as EventListener);
    
    return () => {
      window.removeEventListener('ai-chat-toggle', handleAiChatToggle as EventListener);
    };
  }, []);

  // 워크플로우 이름 편집 시작
  const handleStartEditName = () => {
    setEditingName(projectName);
    setIsEditingName(true);
  };

  // 워크플로우 이름 편집 완료
  const handleFinishEditName = async () => {
    
    // 중복 호출 방지 - 사용자에게 피드백 제공
    if (isProcessingRename) {
      return;
    }

    if (!editingName.trim()) {
      alert(t('alert.workflowNameEmpty'));
      return;
    }

    if (editingName.trim() === projectName) {
      setIsEditingName(false);
      return;
    }

    // 즉시 상태 설정하여 blur 이벤트 방지
    setIsProcessingRename(true);
    setIsRenaming(true);
    
    try {
      // 먼저 현재 워크플로우를 저장 (아직 저장되지 않은 경우)
      if (saveWorkflow) {
        await saveWorkflow();
      }
      
      await renameWorkflow(projectName, editingName.trim());
      
      const newName = editingName.trim();
      setProjectName(newName);
      setIsEditingName(false);
      
      // URL 업데이트
      navigate(`/flow/${encodeURIComponent(newName)}`, { replace: true });
      
      alert(t('alert.workflowRenamed'));
    } catch (error) {
      console.error('Failed to rename workflow:', error);
      alert(t('alert.workflowRenameFailed', { error: error instanceof Error ? error.message : String(error) }));
      // 에러 시 편집 모드 유지
    } finally {
      setIsRenaming(false);
      setIsProcessingRename(false);
    }
  };

  // 워크플로우 이름 편집 취소
  const handleCancelEditName = () => {
    setEditingName(projectName);
    setIsEditingName(false);
  };

  // 배포 생성 함수
  const handleCreateDeployment = async (deploymentData: DeploymentFormData) => {
    setIsDeploying(true);
    try {
      const jsonString = getWorkflowAsJSONString();
      if (!jsonString) {
        throw new Error(t('alert.workflowDataError'));
      }

      const workflowData = JSON.parse(jsonString);
      const deployment = await apiService.createDeployment(deploymentData, workflowData);
      
      setCreatedDeployment(deployment);
      setDeploymentSuccessModalOpen(true);
      setIsDeploymentModalOpen(false);
    } catch (error) {
      console.error('Deployment creation failed:', error);
      alert(t('alert.deploymentFailed', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center">
          <Link to="/">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-2 cursor-pointer ${
              isDarkMode ? 'bg-[#1E2836] text-white' : 'bg-white text-gray-800'
            }`}>
              <img src={homeLogo} alt="Home Logo" className="w-8 h-8 object-contain" />
            </div>
          </Link>
          <div className="relative">
            {isEditingName ? (
              <div className="flex items-center space-x-2 workflow-name-edit-area">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFinishEditName();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCancelEditName();
                    }
                  }}
                  className="font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 px-2 py-1 rounded"
                  placeholder={t('header.workflowNamePlaceholder')}
                  autoFocus
                />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault(); // blur 이벤트 방지
                  }}
                  onClick={handleFinishEditName}
                  disabled={isRenaming}
                  className="text-green-600 hover:text-green-700 disabled:opacity-50"
                  title={t('common.save')}
                >
                  {isRenaming ? <Loader2 className="h-4 w-4 animate-spin" /> : '✓'}
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault(); // blur 이벤트 방지
                  }}
                  onClick={handleCancelEditName}
                  disabled={isRenaming}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  title={t('common.cancel')}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span
                  onClick={handleStartEditName}
                  className="font-medium text-gray-800 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  title={t('header.clickToRename')}
                >
                  {projectName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
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
                alert(t('alert.exportFailed', { error: error instanceof Error ? error.message : String(error) }));
              }
            } else {
              alert(t('alert.exportJsonFailed'));
            }
          }}
          className="hidden sm:flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm"
          title={t('header.exportPython')}
        >
          <FileJson className="h-4 w-4 mr-1" />
          {t('header.exportPython')}
        </button>
        <button
          onClick={async () => {
            if (saveWorkflow) {
              try {
                await saveWorkflow();
                alert(t('alert.workflowSaved'));
              } catch (error) {
                console.error('Header.tsx: Error saving workflow:', error);
                alert(t('alert.workflowSaveFailed'));
              }
            } else {
              console.error('Header.tsx: saveWorkflow function is undefined!');
            }
          }}
          disabled={isSaving}
          className="hidden sm:flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {isSaving ? t('header.saving') : t('header.save')}
        </button>
        <button
          onClick={() => setIsDeploymentModalOpen(true)}
          disabled={nodes.length === 0 || isDeploying}
          className="hidden sm:flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title={nodes.length === 0 ? t('deployment.addNodeFirst') : t('header.deploy')}
        >
          <Rocket className="h-4 w-4 mr-1" />
          {t('header.deploy')}
        </button>
        <button
          onClick={() => {
            const newState = !isAiChatOpen;
            setIsAiChatOpen(newState);
            // Dispatch custom event to notify FlowBuilder
            window.dispatchEvent(new CustomEvent('ai-chat-toggle', { detail: { isOpen: newState } }));
          }}
          className="flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-500 via-pink-500 via-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 to-indigo-500 hover:from-purple-600 hover:via-pink-600 hover:via-red-600 hover:via-orange-600 hover:via-yellow-600 hover:via-green-600 hover:via-blue-600 hover:to-indigo-600 text-white rounded-md text-sm font-medium shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
          title="AI Assistant"
        >
          <Bot className="h-4 w-4 mr-1 animate-pulse" />
          AI
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
              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> {t('header.running')}
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" /> {t('header.run')}
            </>
          )}
        </button>
      </div>
      {apiResponseModalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold ml-1 text-gray-900 dark:text-gray-100">{t('header.apiResponse')}</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    if (editableModalContent) {
                      try {
                        await navigator.clipboard.writeText(editableModalContent);
                        alert(t('alert.codeCopied'));
                      } catch (err) {
                        console.error('Failed to copy code: ', err);
                        alert(t('alert.codeCopyFailed'));
                      }
                    }
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
                  title={t('header.copyCode')}
                >
                  <Copy size={16} className="mr-1" /> {t('common.copy')}
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
              <div className="h-[75vh] border border-gray-300 dark:border-gray-600 rounded-md">
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