import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { useNodeExecutionEvents } from '../hooks/useNodeExecutionEvents';
import { useFlowStore } from '../store/flowStore';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

/**
 * 노드 실행 완료 시 토스트 알림을 표시하는 컴포넌트
 */
const ExecutionToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nodes = useFlowStore(state => state.nodes);

  // 노드 실행 완료 이벤트 감지
  useEffect(() => {
    const handleToastEvent = (event: CustomEvent) => {
      const { nodeId, success = true, nodeName, failedNodeName } = event.detail;
      
      // 실행 시점에 전달받은 노드 이름 사용 (가장 정확함)
      const nodeLabel = nodeName || 'Node';
      
      // 워크플로우 실패 시 실패한 노드 정보 포함
      let message;
      if (success) {
        message = `${nodeLabel} node has been executed successfully.`;
      } else {
        if (nodeId === 'workflow' && failedNodeName) {
          message = `Workflow failed at ${failedNodeName} node. Please check the configuration.`;
        } else {
          message = `${nodeLabel} node execution failed. Please check the configuration.`;
        }
      }
      
      const toast: ToastMessage = {
        id: `${nodeId}-${Date.now()}`,
        type: success ? 'success' : 'error',
        title: success ? 'Node Execution Completed' : 'Node Execution Failed',
        message,
        duration: 4000,
        timestamp: new Date()
      };

      setToasts(prev => [...prev, toast]);

      // 자동 제거
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 4000);
    };

    window.addEventListener('nodeExecutionCompleted', handleToastEvent as EventListener);
    
    return () => {
      window.removeEventListener('nodeExecutionCompleted', handleToastEvent as EventListener);
    };
  }, []); // 빈 의존성 배열

  const showCompletionToast = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const nodeLabel = node?.data?.label || node?.type || `Node ${nodeId}`;
    
    const toast: ToastMessage = {
      id: `${nodeId}-${Date.now()}`,
      type: 'success',
      title: '노드 실행 완료',
      message: `${nodeLabel} 노드가 성공적으로 실행되었습니다.`,
      duration: 4000,
      timestamp: new Date()
    };

    console.log('🍞 Toast: Adding toast:', toast);
    setToasts(prev => {
      const newToasts = [...prev, toast];
      console.log('🍞 Toast: Current toasts:', newToasts);
      return newToasts;
    });

    // 자동 제거
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);
  }, [nodes]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };


  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={() => removeToast(toast.id)} 
        />
      ))}
    </div>
  );
};

/**
 * 개별 토스트 아이템 컴포넌트
 */
const ToastItem: React.FC<{ 
  toast: ToastMessage; 
  onRemove: () => void; 
}> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 등장 애니메이션
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(onRemove, 300); // 애니메이션 후 제거
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div className={`
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      bg-white dark:bg-gray-800 border-l-4 ${getBorderColor()} 
      rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px]
    `}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
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

export default ExecutionToast;
