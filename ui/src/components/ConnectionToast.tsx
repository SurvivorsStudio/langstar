import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Ban } from 'lucide-react';

interface ConnectionErrorMessage {
  id: string;
  type: 'connection-error';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

/**
 * 노드 연결 제약 조건 위반 시 토스트 알림을 표시하는 컴포넌트
 */
const ConnectionToast: React.FC = () => {
  const [toasts, setToasts] = useState<ConnectionErrorMessage[]>([]);
  const [executionToastHeight, setExecutionToastHeight] = useState(0);

  // ExecutionToast 높이 감지
  useEffect(() => {
    const checkExecutionToasts = () => {
      const executionToastContainer = document.querySelector('.execution-toast-container');
      if (executionToastContainer && executionToastContainer.children.length > 0) {
        const height = executionToastContainer.getBoundingClientRect().height;
        setExecutionToastHeight(height + 16); // 16px 여백 추가
      } else {
        setExecutionToastHeight(0);
      }
    };

    // 주기적으로 체크
    const interval = setInterval(checkExecutionToasts, 200);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 연결 오류 이벤트 감지
  useEffect(() => {
    const handleConnectionErrorEvent = (event: CustomEvent) => {
      const { reason } = event.detail;
      
      const errorToast: ConnectionErrorMessage = {
        id: `connection-error-${Date.now()}`,
        type: 'connection-error',
        title: '연결이 거부되었습니다',
        message: reason || '연결 제약 조건을 위반했습니다.',
        duration: 3000, // 3초간 표시
        timestamp: new Date()
      };

      setToasts(prev => {
        const newToasts = [...prev, errorToast];
        // 최대 3개 토스트만 유지
        return newToasts.slice(-3);
      });
    };

    window.addEventListener('connectionError', handleConnectionErrorEvent as EventListener);
    
    return () => {
      window.removeEventListener('connectionError', handleConnectionErrorEvent as EventListener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed right-4 z-50 space-y-2"
      style={{ bottom: `${16 + executionToastHeight}px` }}
    >
      {toasts.map((toast) => (
        <ConnectionToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

/**
 * 개별 연결 오류 토스트 아이템 컴포넌트
 */
const ConnectionToastItem: React.FC<{ 
  toast: ConnectionErrorMessage; 
  onRemove: () => void;
}> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(onRemove, 300); // 애니메이션 후 제거
  }, [onRemove]);

  useEffect(() => {
    // 등장 애니메이션
    setTimeout(() => setIsVisible(true), 100);

    // 자동 제거 타이머
    if (toast.duration) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleRemove]);

  const getIcon = () => {
    return (
      <div className="relative w-5 h-5">
        <Ban className="w-5 h-5 text-red-500" />
      </div>
    );
  };

  return (
    <div className={`
      transform transition-all duration-300 ease-in-out
      ${isVisible && !isRemoving ? 'translate-x-0 opacity-100 scale-100' : 
        isRemoving ? 'translate-x-full opacity-0 scale-95' : 'translate-x-full opacity-0 scale-95'}
      bg-white dark:bg-gray-800 border-l-4 border-l-red-500
      rounded-lg shadow-lg p-4 min-w-[320px] max-w-[420px]
    `}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
            {toast.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {toast.message}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {toast.timestamp.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRemove}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ConnectionToast;
