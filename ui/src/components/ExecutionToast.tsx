import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Clock, X, Play } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'executing';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
  nodeId?: string; // 노드 ID 추가 (실행 중 토스트 식별용)
}

/**
 * 노드 실행 완료 시 토스트 알림을 표시하는 컴포넌트
 */
const ExecutionToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 노드 실행 시작/완료 이벤트 감지
  useEffect(() => {
    const handleExecutionStartEvent = (event: CustomEvent) => {
      const { nodeId, nodeName } = event.detail;
      const nodeLabel = nodeName || 'Node';
      
      // 워크플로우 실행과 개별 노드 실행 구분
      const isWorkflow = nodeId === 'workflow';
      
      const executingToast: ToastMessage = {
        id: `executing-${nodeId}`,
        nodeId,
        type: 'executing',
        title: isWorkflow ? 'Workflow Execution Started' : 'Node Execution Started',
        message: isWorkflow 
          ? `**${nodeLabel}** is executing...` 
          : `**${nodeLabel}** node is executing...`,
        duration: Infinity, // 무한 지속 (완료될 때까지)
        timestamp: new Date()
      };

      setToasts(prev => [...prev, executingToast]);
    };

    const handleExecutionCompleteEvent = (event: CustomEvent) => {
      const { nodeId, success = true, nodeName, failedNodeName } = event.detail;
      
      // 먼저 실행 중 토스트 제거
      setToasts(prev => prev.filter(toast => toast.id !== `executing-${nodeId}`));
      
      // 실행 시점에 전달받은 노드 이름 사용 (가장 정확함)
      const nodeLabel = nodeName || 'Node';
      
      // 워크플로우 실행과 개별 노드 실행 구분
      const isWorkflow = nodeId === 'workflow';
      
      // 워크플로우 실패 시 실패한 노드 정보 포함
      let message;
      if (success) {
        message = isWorkflow 
          ? `**${nodeLabel}** has been executed successfully.`
          : `**${nodeLabel}** node has been executed successfully.`;
      } else {
        if (nodeId === 'workflow' && failedNodeName) {
          message = `Workflow failed at **${failedNodeName}** node. Please check the configuration.`;
        } else {
          message = `**${nodeLabel}** ${isWorkflow ? '' : 'node '}execution failed. Please check the configuration.`;
        }
      }
      
      const completeToast: ToastMessage = {
        id: `complete-${nodeId}-${Date.now()}`,
        type: success ? 'success' : 'error',
        title: isWorkflow 
          ? (success ? 'Workflow Execution Completed' : 'Workflow Execution Failed')
          : (success ? 'Node Execution Completed' : 'Node Execution Failed'),
        message,
        duration: 3500,
        timestamp: new Date()
      };

      // 약간의 지연 후 완료 토스트 표시 (부드러운 전환)
      setTimeout(() => {
        setToasts(prev => [...prev, completeToast]);
      }, 100);
    };

    window.addEventListener('nodeExecutionStarted', handleExecutionStartEvent as EventListener);
    window.addEventListener('nodeExecutionCompleted', handleExecutionCompleteEvent as EventListener);
    
    return () => {
      window.removeEventListener('nodeExecutionStarted', handleExecutionStartEvent as EventListener);
      window.removeEventListener('nodeExecutionCompleted', handleExecutionCompleteEvent as EventListener);
    };
  }, []); // 빈 의존성 배열

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
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(onRemove, 300); // 애니메이션 후 제거
  }, [onRemove]);

  useEffect(() => {
    // 등장 애니메이션
    setTimeout(() => setIsVisible(true), 100);

    // 자동 제거 타이머 (executing 타입은 무한 지속)
    if (toast.type !== 'executing' && toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration || 3500);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.type, handleRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'executing':
        return <Play className="w-5 h-5 text-blue-500 animate-pulse" />;
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
      case 'executing':
        return 'border-l-blue-500';
      default:
        return 'border-l-blue-500';
    }
  };

  // 볼드 텍스트 처리 함수
  const renderTextWithBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index} className="font-bold">{boldText}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`
      transform transition-all duration-300 ease-in-out
      ${isVisible && !isRemoving ? 'translate-x-0 opacity-100 scale-100' : 
        isRemoving ? 'translate-x-full opacity-0 scale-95' : 'translate-x-full opacity-0 scale-95'}
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
            {renderTextWithBold(toast.message)}
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
