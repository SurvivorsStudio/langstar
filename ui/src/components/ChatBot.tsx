import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader, Minimize2, Maximize2 } from 'lucide-react';
import { useFlowStore } from '../store/flowStore'; // flowStore import

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// 기본 마크다운 파서 함수
const parseBasicMarkdown = (text) => {
  try {
    return text
      // Bold: **text** 또는 __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic: *text* 또는 _text_ (단, **text**와 겹치지 않도록 주의)
      .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>')
      // Inline code: `code`
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return text;
  }
};

// 안전한 마크다운 렌더링 컴포넌트
const SafeMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [content]);

  if (hasError) {
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }

  try {
    const html = parseBasicMarkdown(content);
    return (
      <div 
        className="text-sm prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (error) {
    console.error('Markdown rendering error:', error);
    setHasError(true);
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null); // State for the unique chat ID
  // NodeInspector 감지를 위한 상태 추가
  const [nodeInspectorWidth, setNodeInspectorWidth] = useState(0);
  const [isNodeInspectorVisible, setIsNodeInspectorVisible] = useState(false);
  // 쳇팅창 크기 상태 관리
  const [chatSize, setChatSize] = useState<'default' | 'expanded'>('default');
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  // flowStore에서 endNode의 output을 가져옵니다.
  // 필요한 상태와 액션을 모두 가져옵니다.
  const { 
    nodes, 
    updateNodeData, 
    runWorkflow,
    setEdgeOutput // setEdgeOutput 액션 추가
  } = useFlowStore(state => ({ ...state }));
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: 'Hello! How can I help you with your workflow today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null); // 메시지 컨테이너의 끝을 참조할 ref

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 마크다운 감지 함수
  const isMarkdownContent = (content) => {
    // 기본적인 마크다운 문법이 있는지 확인
    return /(\*\*|__|\*|_|`|\[|\]|#)/.test(content);
  };

  // 쳇팅창 크기 계산 함수
  const getChatSize = () => {
    const { width, height } = windowSize;
    
    if (chatSize === 'expanded') {
      // 확대 모드: 사용 가능한 공간의 60% (최대 800px)
      // NodeInspector가 있을 때는 더 작게 조정
      const availableWidth = isNodeInspectorVisible ? width - nodeInspectorWidth - 48 : width;
      const maxWidth = Math.min(availableWidth * 0.6, 800);
      const maxHeight = Math.min(height * 0.8, 700);
      
      // 최소 너비 보장 (NodeInspector가 있을 때도 최소 400px)
      const finalWidth = Math.max(maxWidth, 400);
      
      return {
        width: `${finalWidth}px`,
        height: `${maxHeight}px`
      };
    } else {
      // 기본 모드: 기존 크기 유지
      return {
        width: '384px', // w-96
        height: '600px'
      };
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]); // 메시지 목록이나 로딩 상태가 변경될 때 스크롤

  // 브라우저 크기 감지
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // 챗봇 창이 열릴 때 스크롤을 맨 아래로 이동
    if (isOpen) scrollToBottom();
  }, [isOpen]);

  // NodeInspector 감지를 위한 useEffect
  useEffect(() => {
    const checkNodeInspector = () => {
      const nodeInspectorElement = document.querySelector('[data-testid="node-inspector"]') as HTMLElement;
      if (nodeInspectorElement) {
        const width = nodeInspectorElement.offsetWidth;
        setNodeInspectorWidth(width);
        setIsNodeInspectorVisible(true);
      } else {
        setNodeInspectorWidth(0);
        setIsNodeInspectorVisible(false);
      }
    };

    // 초기 체크
    checkNodeInspector();

    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver(checkNodeInspector);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'] // NodeInspector의 너비 변경도 감지
    });

    // Resize Observer로 NodeInspector 크기 변경 감지
    const resizeObserver = new ResizeObserver(checkNodeInspector);
    const nodeInspectorElement = document.querySelector('[data-testid="node-inspector"]');
    if (nodeInspectorElement) {
      resizeObserver.observe(nodeInspectorElement);
    }

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. startNode 찾기
      const startNode = nodes.find(node => node.type === 'startNode');
      if (!startNode) {
        throw new Error("Start node not found in the workflow.");
      }
      console.log('[ChatBot] Found startNode:', startNode.id);

      // 2. startNode의 config.variables에서 selectVariable이 'question'인 항목 찾기
      let startNodeDataUpdated = false;
      const updatedVariables = startNode.data.config?.variables?.map(variable => {
        if (variable.selectVariable === 'question') {
          console.log(`[ChatBot] Updating startNode variable "${variable.name}" (selectVariable: 'question') defaultValue to:`, input);
          startNodeDataUpdated = true;
          return { ...variable, defaultValue: input }; // 사용자의 입력으로 defaultValue 업데이트
        }
        return variable;
      });

      if (startNodeDataUpdated && updatedVariables) {
        const newStartNodeData = {
          ...startNode.data,
          config: {
            ...startNode.data.config,
            variables: updatedVariables,
          },
        };
        updateNodeData(startNode.id, newStartNodeData);
        console.log('[ChatBot] startNode data updated in store.');
      } else {
        console.warn("[ChatBot] No variable with selectVariable='question' found in startNode, or variables array is missing. Proceeding without updating startNode.");
      }

      // 워크플로우 실행 전 모든 엣지와 노드의 output 초기화
      console.log('[ChatBot] Clearing all edge and node outputs before workflow execution.');
      
      // 엣지 output 초기화
      const currentEdges = useFlowStore.getState().edges;
      currentEdges.forEach(edge => {
        if (edge.data && edge.data.output !== null) {
          setEdgeOutput(edge.id, null);
        }
      });
      
      // 노드 output 초기화 (startNode와 endNode 제외)
      const currentNodes = useFlowStore.getState().nodes;
      currentNodes.forEach(node => {
        if (node.type !== 'startNode' && node.type !== 'endNode' && node.data.output !== null) {
          console.log(`[ChatBot] Clearing output for node: ${node.id} (${node.data.label})`);
          updateNodeData(node.id, { ...node.data, output: null, inputData: null });
        }
      });
      
      console.log('[ChatBot] All edge and node outputs cleared.');

      // 3. runWorkflow 실행
      console.log('[ChatBot] Starting workflow execution...');
      await runWorkflow(chatId ?? undefined); // 워크플로 실행, chatId가 null이면 undefined 전달
      console.log('[ChatBot] Workflow execution initiated.');

      // 4. 워크플로 완료 기다리기 (isWorkflowRunning 상태 폴링)
      //    실제로는 WebSocket이나 다른 이벤트 기반 알림이 더 좋을 수 있습니다.
      const checkWorkflowStatus = async () => {
        if (!useFlowStore.getState().isWorkflowRunning) {
          console.log('[ChatBot] Workflow execution finished.');
          const endNode = useFlowStore.getState().nodes.find(n => n.type === 'endNode');
          const endNodeOutput = endNode?.data.output;
          const selectedKey = endNode?.data.config?.receiveKey;

          console.log('[ChatBot] EndNode details:', JSON.parse(JSON.stringify(endNode || {})));
          console.log('[ChatBot] EndNode raw output:', JSON.parse(JSON.stringify(endNodeOutput || {})));
          console.log('[ChatBot] EndNode selected key (receiveKey):', selectedKey);
          
          let botResponseContent = "Workflow finished.";

          if (endNodeOutput && typeof endNodeOutput === 'object') {
            if (selectedKey && Object.prototype.hasOwnProperty.call(endNodeOutput, selectedKey)) {
              const selectedValue = endNodeOutput[selectedKey];
              botResponseContent = typeof selectedValue === 'object' ? JSON.stringify(selectedValue, null, 2) : String(selectedValue);
              console.log(`[ChatBot] Using selected key '${selectedKey}' value:`, botResponseContent);
            } else if (selectedKey) {
              botResponseContent = `Key '${selectedKey}' not found in EndNode output. Full output: ${JSON.stringify(endNodeOutput, null, 2)}`;
              console.warn(`[ChatBot] Selected key '${selectedKey}' not found in output. Displaying full output.`);
            } else {
              botResponseContent = `No specific output key selected. Full output: ${JSON.stringify(endNodeOutput, null, 2)}`;
              console.log('[ChatBot] No specific key selected in EndNode. Displaying full output.');
            }
          } else if (endNodeOutput) { // 객체가 아닌 경우 (예: 문자열, 숫자)
            botResponseContent = String(endNodeOutput);
          } else {
            botResponseContent = "Workflow finished, but the final output is empty or not available.";
          }

          const botMessage: Message = { type: 'bot', content: botResponseContent, timestamp: new Date() };
          setMessages(prev => [...prev, botMessage]);
          setIsLoading(false);
        } else {
          setTimeout(checkWorkflowStatus, 500); // 0.5초마다 상태 확인
        }
      };
      setTimeout(checkWorkflowStatus, 500); // 최초 상태 확인 시작

    } catch (error) {
      console.error('[ChatBot] Error during handleSend:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      const botMessage: Message = { type: 'bot', content: `Error: ${errorMessage}`, timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    // NodeInspector가 표시될 때 버튼 위치 조정
    const getButtonPosition = () => {
      if (isNodeInspectorVisible) {
        return `${nodeInspectorWidth + 24}px`;  // NodeInspector 너비 + 24px 여백
      } else {
        return '24px'; // 기본 right-6 (24px)
      }
    };

    const rightPosition = getButtonPosition();

    return (
      <button
        onClick={() => {
          const newUuid = crypto.randomUUID();
          setChatId(newUuid);
          console.log(`[ChatBot] New Chat ID generated: ${newUuid}`);
          // Reset chat history to the initial message
          setMessages([
            {
              type: 'bot',
              content: 'Hello! How can I help you with your workflow today?',
              timestamp: new Date()
            }
          ]);
          setIsOpen(true);
        }}
        className="fixed bottom-16 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-all duration-300"
        style={{ right: rightPosition }}
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  // 채팅창이 열렸을 때도 NodeInspector 위치 고려
  const getChatPosition = () => {
    if (chatSize === 'expanded' && isNodeInspectorVisible) {
      // 확대 모드에서 NodeInspector가 있을 때는 더 큰 여백 필요
      return `${nodeInspectorWidth + 48}px`;
    } else if (isNodeInspectorVisible) {
      // 기본 모드에서 NodeInspector가 있을 때
      return `${nodeInspectorWidth + 24}px`;
    } else {
      // NodeInspector가 없을 때
      return '24px';
    }
  };

  const chatRightPosition = getChatPosition();

  const chatSizeStyle = getChatSize();

  return (
    <div 
      className={`fixed bottom-16 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col border border-gray-200 dark:border-gray-700 chat-window ${chatSize}`}
      style={{ 
        right: chatRightPosition,
        width: chatSizeStyle.width,
        height: chatSizeStyle.height
      }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-blue-500 text-white rounded-t-lg">
        <h3 className="font-semibold">Workflow Assistant</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChatSize(chatSize === 'default' ? 'expanded' : 'default')}
            className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-blue-600 chat-resize-button"
            title={chatSize === 'default' ? '확대' : '축소'}
          >
            {chatSize === 'default' ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button
            onClick={async () => {
              setIsOpen(false);

              // 메모리 삭제 API 호출 (챗봇 닫힐 때)
              console.log(`[ChatBot] Closing chat. Chat ID: ${chatId}`);
              
              if (chatId) {
                try {
                  const response = await fetch('http://localhost:8000/workflow/memory/clear-chat', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ chat_id: chatId }),
                  });
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Memory clear API failed with status ${response.status}: ${errorText}`);
                  }
                  
                  const result = await response.json();
                  console.log('[ChatBot] Memory cleared successfully:', result);
                } catch (error) {
                  console.error('[ChatBot] Error clearing memory on close:', error);
                  // 메모리 삭제 실패해도 UI는 정상적으로 닫기
                }
              } else {
                console.log('[ChatBot] No chat ID available, skipping memory clear');

              }
            }}
            className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-blue-600"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {message.type === 'bot' && isMarkdownContent(message.content) ? (
                <SafeMarkdown content={message.content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {/* 스크롤 타겟을 위한 빈 div. 항상 메시지 목록의 맨 아래에 위치합니다. */}
        <div ref={messagesEndRef} /> 

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <Loader className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-gray-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;