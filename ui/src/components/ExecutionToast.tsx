import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Clock, X, Play } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'executing';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
  nodeId?: string; // 노드 ID 추가 (실행 중 토스트 식별용)
  startTime?: Date; // 실행 시작 시간
  executionTime?: number; // 총 실행 시간 (ms)
}

/**
 * 노드 실행 완료 시 토스트 알림을 표시하는 컴포넌트
 */
const ExecutionToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const executionStartTimesRef = useRef<Map<string, Date>>(new Map());
  const [executionStartTimes, setExecutionStartTimes] = useState<Map<string, Date>>(new Map());

  // 노드 실행 시작/완료 이벤트 감지
  useEffect(() => {
    const handleExecutionStartEvent = (event: CustomEvent) => {
      const { nodeId, nodeName } = event.detail;
      const nodeLabel = nodeName || 'Node';
      
      // 워크플로우 실행과 개별 노드 실행 구분
      const isWorkflow = nodeId === 'workflow';
      
      const startTime = new Date();
      
      // 실행 시작 시간을 ref와 state 모두에 저장
      executionStartTimesRef.current.set(nodeId, startTime);
      setExecutionStartTimes(prev => {
        const newMap = new Map(prev);
        newMap.set(nodeId, startTime);
        return newMap;
      });
      
      const executingToast: ToastMessage = {
        id: `executing-${nodeId}`,
        nodeId,
        type: 'executing',
        title: isWorkflow ? 'Workflow Execution Started' : 'Node Execution Started',
        message: isWorkflow 
          ? `**${nodeLabel}** is executing...` 
          : `**${nodeLabel}** node is executing...`,
        duration: Infinity, // 무한 지속 (완료될 때까지)
        timestamp: startTime,
        startTime: startTime
      };

      setToasts(prev => [...prev, executingToast]);
    };

    const handleExecutionCompleteEvent = (event: CustomEvent) => {
      const { nodeId, success = true, nodeName, failedNodeName } = event.detail;
      
      // ref에서 시작 시간 가져오기 (즉시 접근 가능)
      const startTime = executionStartTimesRef.current.get(nodeId);
      const executionTime = startTime ? Date.now() - startTime.getTime() : 0;
      
      // 실행 시작 시간 정리 (ref와 state 모두)
      executionStartTimesRef.current.delete(nodeId);
      setExecutionStartTimes(prev => {
        const newMap = new Map(prev);
        newMap.delete(nodeId);
        return newMap;
      });
      
      // 실행 중 토스트 제거
      setToasts(prev => prev.filter(toast => toast.id !== `executing-${nodeId}`));
      
      // 실행 시점에 전달받은 노드 이름 사용 (가장 정확함)
      const nodeLabel = nodeName || 'Node';
      
      // 워크플로우 실행과 개별 노드 실행 구분
      const isWorkflow = nodeId === 'workflow';
      
      // 실행 시간 포맷팅
      const formatExecutionTime = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(1);
        return `${minutes}m ${seconds}s`;
      };
      
      // 워크플로우 실패 시 실패한 노드 정보 포함
      let message;
      const timeText = executionTime > 0 ? ` (${formatExecutionTime(executionTime)})` : '';
      
      if (success) {
        message = isWorkflow 
          ? `**${nodeLabel}** has been executed successfully${timeText}.`
          : `**${nodeLabel}** node has been executed successfully${timeText}.`;
      } else {
        if (nodeId === 'workflow' && failedNodeName) {
          message = `Workflow failed at **${failedNodeName}** node${timeText}. Please check the configuration.`;
        } else {
          message = `**${nodeLabel}** ${isWorkflow ? '' : 'node '}execution failed${timeText}. Please check the configuration.`;
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
        timestamp: new Date(),
        executionTime: executionTime
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
          executionStartTimes={executionStartTimes}
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
  executionStartTimes: Map<string, Date>;
}> = ({ toast, onRemove, executionStartTimes }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

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

  // 실행 중일 때 실시간 타이머
  useEffect(() => {
    if (toast.type === 'executing' && toast.nodeId) {
      const startTime = executionStartTimes.get(toast.nodeId) || toast.startTime;
      if (startTime) {
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime.getTime();
          setElapsedTime(elapsed);
        }, 100); // 100ms마다 업데이트

        return () => clearInterval(interval);
      }
    }
  }, [toast.type, toast.nodeId, executionStartTimes, toast.startTime]);

  // 실행 시간 포맷팅 함수
  const formatElapsedTime = (ms: number) => {
    if (ms < 1000) return `${Math.floor(ms / 100) / 10}s`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'executing':
        return (
          <div className="relative w-5 h-5">
            {/* 회전하는 프로그레스 링 */}
            <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin"></div>
            {/* 중앙의 작은 Play 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-2 h-2 text-blue-500" />
            </div>
          </div>
        );
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
            {toast.type === 'executing' && elapsedTime > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                {formatElapsedTime(elapsedTime)}
              </span>
            )}
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
