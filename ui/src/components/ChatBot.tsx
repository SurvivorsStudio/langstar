import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader } from 'lucide-react';
import { useFlowStore } from '../store/flowStore'; // flowStore import

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null); // State for the unique chat ID
  // NodeInspector 감지를 위한 상태 추가
  const [nodeInspectorWidth, setNodeInspectorWidth] = useState(0);
  const [isNodeInspectorVisible, setIsNodeInspectorVisible] = useState(false);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]); // 메시지 목록이나 로딩 상태가 변경될 때 스크롤

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

      // 워크플로우 실행 전 모든 엣지의 output 초기화
      console.log('[ChatBot] Clearing all edge outputs before workflow execution.');
      const currentEdges = useFlowStore.getState().edges; // 최신 엣지 목록 가져오기
      currentEdges.forEach(edge => {
        // data 객체가 있고 output이 null이 아닌 경우에만 초기화
        if (edge.data && edge.data.output !== null) {
          setEdgeOutput(edge.id, null);
        }
      });
      console.log('[ChatBot] All edge outputs cleared.');

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
    const rightPosition = isNodeInspectorVisible 
      ? `${nodeInspectorWidth + 24}px`  // NodeInspector 너비 + 24px 여백
      : '24px'; // 기본 right-6 (24px)

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
  const chatRightPosition = isNodeInspectorVisible 
    ? `${nodeInspectorWidth + 24}px`  // NodeInspector 너비 + 24px 여백
    : '24px'; // 기본 right-6 (24px)

  return (
    <div 
      className="fixed bottom-16 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col border border-gray-200 dark:border-gray-700 transition-all duration-300"
      style={{ right: chatRightPosition }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-blue-500 text-white rounded-t-lg">
        <h3 className="font-semibold">Workflow Assistant</h3>
        <button
          onClick={async () => {
            setIsOpen(false);
            // API 호출 (챗봇 닫힐 때)
            console.log(`[ChatBot] Closing chat. Chat ID: ${chatId}`);
            try {
              // 여기에 API 호출 로직을 추가하세요. 예:
              // const response = await fetch('/api/chatbot/event', {
              //   method: 'POST',
              //   body: JSON.stringify({ chatId: chatId, event: 'closed' }),
              //   headers: { 'Content-Type': 'application/json' },
              // });
              // if (!response.ok) {
              //   throw new Error('API call failed on close');
              // }
              // console.log('[ChatBot] Close event API call successful');
            } catch (error) {
              console.error('[ChatBot] Error calling API on close:', error);
            }
          }}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              <p className="text-sm">{message.content}</p>
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