import React, { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import FlowBuilderComponent from '../components/FlowBuilder';
import Header from '../components/Header';
import ChatBot from '../components/ChatBot';
import Footer from '../components/Footer';
import ActiveUsersPanel from '../components/collaboration/ActiveUsersPanel';
import CollaborationStatus from '../components/collaboration/CollaborationStatus';
import VersionConflictDialog from '../components/collaboration/VersionConflictDialog';
import CollaborationDebugPanel from '../components/collaboration/CollaborationDebugPanel';
import { useFlowStore } from '../store/flowStore';
import 'reactflow/dist/style.css';

function FlowBuilder() {
  const { 
    initializeCollaboration, 
    loadWorkflow, 
    saveWorkflow,
    projectName 
  } = useFlowStore();

  useEffect(() => {
    // 협업 서비스 초기화 (사용자 정보)
    // 실제 구현 시에는 인증 시스템에서 사용자 정보를 가져와야 합니다
    const userId = localStorage.getItem('userId') || 'user_' + Math.random().toString(36).substr(2, 9);
    const username = localStorage.getItem('username') || prompt('사용자 이름을 입력하세요:') || 'Anonymous';
    
    // localStorage에 저장 (다음에 재사용)
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    
    console.log('[FlowBuilder] 협업 초기화:', { userId, username });
    initializeCollaboration(userId, username);
  }, [initializeCollaboration]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <FlowBuilderComponent />
        </ReactFlowProvider>
      </div>
      <ChatBot />
      <Footer />
      
      {/* 협업 UI 컴포넌트들 */}
      <ActiveUsersPanel />
      <CollaborationStatus />
      <CollaborationDebugPanel />
      <VersionConflictDialog
        onReload={() => {
          console.log('[VersionConflict] 서버 버전으로 다시 로드');
          loadWorkflow(projectName);
        }}
        onKeepLocal={() => {
          console.log('[VersionConflict] 로컬 버전 강제 저장');
          const state = useFlowStore.getState();
          // 버전 증가 후 강제 저장
          state.workflowVersion = state.workflowVersion + 1;
          saveWorkflow().catch(err => {
            console.error('[VersionConflict] 강제 저장 실패:', err);
          });
        }}
        onDownloadBoth={() => {
          console.log('[VersionConflict] 두 버전 모두 다운로드');
          alert('두 버전을 다운로드합니다. (구현 예정)');
          // TODO: 두 버전 다운로드 로직 구현
        }}
      />
    </div>
  );
}

export default FlowBuilder;