import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/apiService';
import { Deployment } from '../types/deployment';

interface DeploymentPlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  deploymentId?: string;
  deploymentName?: string;
}

const DeploymentPlayground: React.FC<DeploymentPlaygroundProps> = ({
  isOpen,
  onClose
}) => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeploymentDropdownOpen, setIsDeploymentDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 배포 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadDeployments();
      // 초기 시스템 메시지 추가
      setMessages([{
        id: 'welcome',
        type: 'system',
        content: 'Hello! This is a Playground for testing deployed workflows. First, select a deployment and then enter a message.',
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  // 메시지 스크롤 자동화
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDeployments = async () => {
    setIsLoadingDeployments(true);
    setError(null);
    try {
      const deployments = await apiService.getDeployments();
      setDeployments(deployments);
      
      // 활성 배포가 있으면 자동 선택
      const activeDeployment = deployments.find(d => d.status === 'active');
      if (activeDeployment) {
        setSelectedDeployment(activeDeployment);
      }
    } catch (err) {
      setError('Failed to load deployment list.');
      console.error('Failed to load deployments:', err);
    } finally {
      setIsLoadingDeployments(false);
    }
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedDeployment) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // 배포 실행
      const result = await apiService.runDeployment(selectedDeployment.id, {
        user_input: inputMessage
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.success 
          ? JSON.stringify(result.result, null, 2)
          : `An error occurred: ${result.result?.error || 'Unknown error'}`,
        timestamp: new Date(),
        deploymentId: selectedDeployment.id,
        deploymentName: selectedDeployment.name
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
        deploymentId: selectedDeployment.id,
        deploymentName: selectedDeployment.name
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 메시지 복사
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 복사 성공 표시 (임시)
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // 배포 선택
  const handleDeploymentSelect = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setIsDeploymentDropdownOpen(false);
    
    // 배포 변경 알림 메시지
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'system',
      content: `Deployment changed to: ${deployment.name} v${deployment.version}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              🚀 Deployment Playground
            </h2>
            
            {/* 배포 선택 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setIsDeploymentDropdownOpen(!isDeploymentDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {isLoadingDeployments ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : selectedDeployment ? (
                  <>
                    <span>{selectedDeployment.name} v{selectedDeployment.version}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedDeployment.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                    }`}>
                      {selectedDeployment.status}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Select Deployment</span>
                  </>
                )}
                {isDeploymentDropdownOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {/* 드롭다운 메뉴 */}
              {isDeploymentDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                  {deployments.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      No deployments available.
                    </div>
                  ) : (
                    deployments.map((deployment) => (
                      <button
                        key={deployment.id}
                        onClick={() => handleDeploymentSelect(deployment)}
                        className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {deployment.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          v{deployment.version} • {deployment.status}
                        </div>
                        {deployment.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {deployment.description}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'assistant'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {message.type === 'assistant' && message.deploymentName && (
                      <div className="text-xs opacity-75 mb-1">
                        {message.deploymentName}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                  {message.type === 'assistant' && (
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    응답을 생성하는 중...
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-red-700 dark:text-red-200 text-sm">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedDeployment ? "메시지를 입력하세요..." : "배포를 먼저 선택해주세요..."}
                disabled={!selectedDeployment || isLoading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !selectedDeployment || isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          
          {selectedDeployment && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              현재 배포: {selectedDeployment.name} v{selectedDeployment.version} ({selectedDeployment.status})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeploymentPlayground; 