/**
 * VersionConflictDialog - 워크플로우 버전 충돌 시 표시되는 다이얼로그
 */
import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface VersionConflictDetail {
  localVersion: number;
  serverVersion: number;
  serverWorkflow: any;
}

interface VersionConflictDialogProps {
  onReload: () => void;
  onKeepLocal: () => void;
  onDownloadBoth: () => void;
}

const VersionConflictDialog: React.FC<VersionConflictDialogProps> = ({
  onReload,
  onKeepLocal,
  onDownloadBoth
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [conflictDetail, setConflictDetail] = useState<VersionConflictDetail | null>(null);
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    const handleConflict = (event: CustomEvent<VersionConflictDetail>) => {
      console.log('[VersionConflictDialog] Conflict detected:', event.detail);
      setConflictDetail(event.detail);
      setIsVisible(true);
    };

    window.addEventListener('workflowVersionConflict', handleConflict as EventListener);

    return () => {
      window.removeEventListener('workflowVersionConflict', handleConflict as EventListener);
    };
  }, []);

  const handleReload = () => {
    setIsVisible(false);
    onReload();
  };

  const handleKeepLocal = () => {
    setIsVisible(false);
    onKeepLocal();
  };

  const handleDownloadBoth = () => {
    setIsVisible(false);
    onDownloadBoth();
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || !conflictDetail) {
    return null;
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
        onClick={handleClose}
      />

      {/* 다이얼로그 */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] shadow-2xl rounded-lg p-6 max-w-md w-full"
        style={{
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          border: '2px solid #ef4444',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
            <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
            >
              워크플로우 버전 충돌
            </h2>
            <p
              className="text-sm"
              style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
            >
              다른 사용자가 이 워크플로우를 수정했습니다
            </p>
          </div>
        </div>

        {/* 버전 정보 */}
        <div
          className="mb-6 p-4 rounded-lg border"
          style={{
            backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
            borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
          }}
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>
                현재 로컬 버전:
              </span>
              <span
                className="font-semibold"
                style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
              >
                v{conflictDetail.localVersion}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>
                서버 최신 버전:
              </span>
              <span
                className="font-semibold text-red-600 dark:text-red-400"
              >
                v{conflictDetail.serverVersion}
              </span>
            </div>
          </div>
        </div>

        {/* 설명 */}
        <div
          className="mb-6 text-sm"
          style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}
        >
          <p className="mb-2">
            다른 사용자가 이 워크플로우를 수정하여 저장했습니다.
            다음 중 하나를 선택하세요:
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-2">
          {/* 서버 버전으로 다시 로드 */}
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
            }}
          >
            <RefreshCw size={18} />
            <span className="font-medium">서버 버전으로 다시 로드 (권장)</span>
          </button>

          {/* 로컬 버전 강제 저장 */}
          <button
            onClick={handleKeepLocal}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all hover:scale-[1.02] border-2"
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
              borderColor: '#f59e0b',
              color: isDarkMode ? '#f3f4f6' : '#111827',
            }}
          >
            <span className="font-medium">로컬 버전 강제 저장 (주의!)</span>
          </button>

          {/* 두 버전 모두 백업 */}
          <button
            onClick={handleDownloadBoth}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all hover:scale-[1.02] border"
            style={{
              backgroundColor: 'transparent',
              borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
              color: isDarkMode ? '#d1d5db' : '#374151',
            }}
          >
            <Download size={18} />
            <span>두 버전 모두 다운로드</span>
          </button>
        </div>

        {/* 경고 메시지 */}
        <div
          className="mt-4 p-3 rounded-lg text-xs"
          style={{
            backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2',
            color: '#ef4444',
          }}
        >
          ⚠️ 로컬 버전을 강제 저장하면 다른 사용자의 변경사항이 덮어씌워집니다.
        </div>
      </div>
    </>
  );
};

export default VersionConflictDialog;

