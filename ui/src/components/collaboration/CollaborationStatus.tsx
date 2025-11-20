/**
 * CollaborationStatus - 협업 연결 상태 표시 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Users } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import { useThemeStore } from '../../store/themeStore';

const CollaborationStatus: React.FC = () => {
  const { 
    collaborationService, 
    activeUsers, 
    currentUsername,
    projectName 
  } = useFlowStore();
  const { isDarkMode } = useThemeStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 연결 상태 주기적으로 확인
    const checkConnection = () => {
      const connected = collaborationService?.isConnected() || false;
      setIsConnected(connected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, [collaborationService]);

  // 협업이 초기화되지 않았거나 기본 워크플로우면 표시 안 함
  if (!collaborationService || projectName === 'New Workflow') {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 shadow-lg rounded-lg border-2 px-4 py-2 flex items-center space-x-3 transition-all"
      style={{
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isConnected ? '#10b981' : '#ef4444',
      }}
    >
      {/* 연결 상태 아이콘 */}
      {isConnected ? (
        <Wifi size={20} className="text-green-500 animate-pulse" />
      ) : (
        <WifiOff size={20} className="text-red-500" />
      )}

      {/* 상태 텍스트 */}
      <div>
        <div
          className="text-sm font-semibold"
          style={{
            color: isConnected ? '#10b981' : '#ef4444',
          }}
        >
          {isConnected ? '협업 연결됨' : '협업 연결 끊김'}
        </div>
        <div
          className="text-xs"
          style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
        >
          {isConnected ? (
            <>
              <Users size={12} className="inline mr-1" />
              {activeUsers.length}명 활동 중 • {currentUsername}
            </>
          ) : (
            '오프라인 모드'
          )}
        </div>
      </div>

      {/* 상세 정보 토글 버튼 */}
      {isConnected && (
        <button
          onClick={() => {
            console.log('[Collaboration Status]');
            console.log('Connected:', isConnected);
            console.log('Active Users:', activeUsers);
            console.log('Workflow:', projectName);
            console.log('Service:', collaborationService);
            alert(`협업 상태:\n\n연결됨: ${isConnected}\n활성 사용자: ${activeUsers.length}명\n워크플로우: ${projectName}`);
          }}
          className="text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}
        >
          상세
        </button>
      )}
    </div>
  );
};

export default CollaborationStatus;

