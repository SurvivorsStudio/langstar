/**
 * CollaborationDebugPanel - 협업 디버깅 패널
 */
import React, { useState, useEffect } from 'react';
import { Bug, X } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import { useThemeStore } from '../../store/themeStore';

const CollaborationDebugPanel: React.FC = () => {
  const { 
    collaborationService, 
    activeUsers, 
    currentUserId,
    currentUsername,
    projectName,
    isReceivingRemoteChange
  } = useFlowStore();
  const { isDarkMode } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!collaborationService) return;

    // 모든 이벤트 로깅
    const logHandler = (event: any) => {
      const timestamp = new Date().toLocaleTimeString();
      const log = `[${timestamp}] ${event.event_type}: ${JSON.stringify(event.data)}`;
      setLogs(prev => [...prev.slice(-20), log]); // 최근 20개만 유지
    };

    collaborationService.on('*', logHandler);

    return () => {
      collaborationService.off('*', logHandler);
    };
  }, [collaborationService]);

  const testPositionBroadcast = () => {
    if (!collaborationService?.isConnected()) {
      alert('협업이 연결되지 않았습니다!');
      return;
    }

    const testNodeId = 'test_node_' + Math.random().toString(36).substr(2, 9);
    const testPosition = { x: Math.random() * 500, y: Math.random() * 500 };
    
    console.log('[Debug] 테스트 위치 변경 브로드캐스트:', testNodeId, testPosition);
    collaborationService.broadcastNodeChange(testNodeId, { position: testPosition });
    
    alert(`테스트 메시지 전송됨!\n노드: ${testNodeId}\n위치: ${JSON.stringify(testPosition)}`);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg hover:scale-110 transition-all"
        style={{
          backgroundColor: '#ef4444',
          color: '#ffffff'
        }}
        title="협업 디버그 패널 열기"
      >
        <Bug size={24} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-50 shadow-2xl rounded-lg border-2 w-96 max-h-96 overflow-hidden flex flex-col"
      style={{
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: '#ef4444',
      }}
    >
      {/* 헤더 */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
        }}
      >
        <div className="flex items-center space-x-2">
          <Bug size={20} className="text-white" />
          <span className="font-semibold text-sm text-white">
            협업 디버그
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-red-600 p-1 rounded"
        >
          <X size={18} />
        </button>
      </div>

      {/* 상태 정보 */}
      <div className="p-4 space-y-2 text-xs">
        <div className="space-y-1">
          <div className="font-semibold text-gray-700 dark:text-gray-300">연결 상태:</div>
          <div className={collaborationService?.isConnected() ? 'text-green-600' : 'text-red-600'}>
            {collaborationService?.isConnected() ? '✅ 연결됨' : '❌ 연결 안 됨'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-gray-700 dark:text-gray-300">현재 사용자:</div>
          <div className="text-gray-600 dark:text-gray-400">
            {currentUsername} ({currentUserId})
          </div>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-gray-700 dark:text-gray-300">워크플로우:</div>
          <div className="text-gray-600 dark:text-gray-400">{projectName}</div>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-gray-700 dark:text-gray-300">활성 사용자:</div>
          <div className="text-gray-600 dark:text-gray-400">
            {activeUsers.length}명
            {activeUsers.map(u => ` • ${u.username}`).join('')}
          </div>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-gray-700 dark:text-gray-300">수신 중:</div>
          <div className={isReceivingRemoteChange ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-400'}>
            {isReceivingRemoteChange ? '⚠️ Yes' : 'No'}
          </div>
        </div>
      </div>

      {/* 테스트 버튼 */}
      <div className="px-4 pb-4">
        <button
          onClick={testPositionBroadcast}
          className="w-full px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 text-sm"
        >
          📡 테스트 메시지 전송
        </button>
      </div>

      {/* 이벤트 로그 */}
      <div className="flex-1 overflow-y-auto border-t p-2">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          이벤트 로그:
        </div>
        {logs.length === 0 ? (
          <div className="text-xs text-gray-500">이벤트 없음</div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className="text-xs p-1 rounded font-mono"
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                  color: isDarkMode ? '#d1d5db' : '#374151'
                }}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 클리어 버튼 */}
      <div className="p-2 border-t">
        <button
          onClick={() => setLogs([])}
          className="w-full px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600 text-xs"
        >
          로그 지우기
        </button>
      </div>
    </div>
  );
};

export default CollaborationDebugPanel;

