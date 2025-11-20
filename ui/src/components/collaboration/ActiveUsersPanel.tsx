/**
 * ActiveUsersPanel - 현재 활성화된 협업 사용자 목록 표시
 */
import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';
import { useThemeStore } from '../../store/themeStore';

const ActiveUsersPanel: React.FC = () => {
  const { activeUsers, currentUserId } = useFlowStore();
  const { isDarkMode } = useThemeStore();
  const [isMinimized, setIsMinimized] = useState(false);

  if (activeUsers.length === 0) {
    return null;
  }

  // 최소화 상태일 때
  if (isMinimized) {
    return (
      <div
        className="fixed top-4 right-4 z-50 shadow-lg rounded-lg border-2 p-2 cursor-pointer hover:scale-105 transition-transform"
        style={{
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderColor: isDarkMode ? '#374151' : '#e5e7eb',
        }}
        onClick={() => setIsMinimized(false)}
        title="클릭하여 사용자 목록 보기"
      >
        <div className="flex items-center space-x-2">
          <Users size={16} style={{ color: '#3b82f6' }} />
          <span
            className="font-semibold text-sm"
            style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}
          >
            {activeUsers.length}
          </span>
          <ChevronDown size={14} style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }} />
        </div>
      </div>
    );
  }

  // 최대화 상태일 때
  return (
    <div
      className="fixed top-4 right-4 z-50 shadow-lg rounded-lg border-2 p-3 min-w-[200px]"
      style={{
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Users size={16} style={{ color: '#3b82f6' }} />
          <span
            className="font-semibold text-sm"
            style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}
          >
            협업 중인 사용자 ({activeUsers.length})
          </span>
        </div>
        
        {/* 최소화 버튼 */}
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="최소화"
        >
          <ChevronUp size={14} style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }} />
        </button>
      </div>

      <div className="space-y-2">
        {activeUsers.map((user) => {
          const isCurrentUser = user.user_id === currentUserId;
          return (
            <div
              key={user.user_id}
              className="flex items-center space-x-2 p-2 rounded"
              style={{
                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
              }}
            >
              {/* 사용자 색상 표시 */}
              <div
                className="w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: user.color }}
                title={`${user.username}의 식별 색상`}
              />

              {/* 사용자 이름 */}
              <span
                className="flex-1 text-sm truncate"
                style={{
                  color: isDarkMode ? '#d1d5db' : '#374151',
                  fontWeight: isCurrentUser ? 'bold' : 'normal',
                }}
              >
                {user.username}
                {isCurrentUser && ' (나)'}
              </span>

              {/* 연결 시간 (상대 시간) */}
              <span
                className="text-xs"
                style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
              >
                {getRelativeTime(user.connected_at)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 안내 메시지 */}
      <div
        className="mt-3 pt-2 border-t text-xs"
        style={{
          borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
          color: isDarkMode ? '#9ca3af' : '#6b7280',
        }}
      >
        💡 노드를 클릭하면 자동으로 잠금됩니다
      </div>
    </div>
  );
};

/**
 * 상대 시간 계산 (예: "방금", "1분 전")
 */
function getRelativeTime(isoString: string): string {
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return '방금';
  if (diffSec < 60) return `${diffSec}초 전`;
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

export default ActiveUsersPanel;

