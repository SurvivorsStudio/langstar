import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader, MessageSquare, Wrench } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

type AssistantMode = 'run' | 'build';

const RUN_WELCOME =
  '이 모드에서는 **챗플로(워크플로)를 실행**해 End 노드까지 돌린 뒤, 그 결과를 AI 응답처럼 받을 수 있습니다. Start 노드에 selectVariable이 `question`인 변수가 있으면, 여기 입력한 내용이 그 변수로 전달됩니다.';

const BUILD_WELCOME =
  '이 모드에서는 **채팅만으로 챗플로를 설계·구성**하는 기능을 쓸 수 있습니다. (노드 추가·연결 제안 등) 서버 API가 연결되면 이곳에서 바로 반영될 예정입니다. 지금은 요구사항을 적어 두면 이후 구현 시 참고할 수 있습니다.';

const parseBasicMarkdown = (text: string) => {
  try {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
      .replace(/\n/g, '<br>');
  } catch {
    return text;
  }
};

const SafeMarkdown: React.FC<{ content: string }> = ({ content }) => {
  try {
    const html = parseBasicMarkdown(content);
    return (
      <div
        className="text-sm prose prose-sm max-w-none dark:prose-invert text-slate-800 dark:text-slate-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">{content}</p>;
  }
};

const isMarkdownContent = (content: string) => /(\*\*|__|\*|_|`|\[|\]|#)/.test(content);

interface FlowAssistantChatPanelProps {
  /** 캔버스 AI 버튼으로 패널이 닫힐 때 false — 이때 채팅 메모리 정리 */
  panelOpen: boolean;
}

const FlowAssistantChatPanel: React.FC<FlowAssistantChatPanelProps> = ({ panelOpen }) => {
  const [mode, setMode] = useState<AssistantMode>('run');
  const [chatId, setChatId] = useState<string | null>(() => crypto.randomUUID());
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;
  const wasPanelOpenRef = useRef(false);
  const { nodes, updateNodeData, runWorkflow, projectName } = useFlowStore((s) => ({
    nodes: s.nodes,
    updateNodeData: s.updateNodeData,
    runWorkflow: s.runWorkflow,
    projectName: s.projectName,
  }));

  const [runMessages, setRunMessages] = useState<Message[]>([
    { type: 'bot', content: RUN_WELCOME, timestamp: new Date() },
  ]);
  const [buildMessages, setBuildMessages] = useState<Message[]>([
    { type: 'bot', content: BUILD_WELCOME, timestamp: new Date() },
  ]);
  const messages = mode === 'run' ? runMessages : buildMessages;
  const [input, setInput] = useState('');
  const [runLoading, setRunLoading] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);
  const panelLoading = mode === 'run' ? runLoading : buildLoading;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, panelLoading, mode]);

  useEffect(() => {
    if (wasPanelOpenRef.current && !panelOpen) {
      const id = chatIdRef.current;
      if (id) {
        void fetch('http://localhost:8000/workflow/memory/clear-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: id }),
        }).catch(() => {
          /* 메모리 삭제 실패 무시 */
        });
      }
      setChatId(crypto.randomUUID());
    }
    wasPanelOpenRef.current = panelOpen;
  }, [panelOpen]);

  const handleSendRun = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setRunMessages((prev) => [...prev, userMessage]);
    const sentText = input;
    setInput('');
    setRunLoading(true);

    try {
      const startNode = nodes.find((node) => node.type === 'startNode');
      if (!startNode) {
        throw new Error('Start node not found in the workflow.');
      }

      let startNodeDataUpdated = false;
      const updatedVariables = startNode.data.config?.variables?.map((variable: { selectVariable?: string; name?: string; defaultValue?: unknown }) => {
        if (variable.selectVariable === 'question') {
          startNodeDataUpdated = true;
          return { ...variable, defaultValue: sentText };
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
      }

      const currentNodes = useFlowStore.getState().nodes;
      currentNodes.forEach((node) => {
        if (node.type !== 'startNode' && node.type !== 'endNode' && node.data.output !== null) {
          updateNodeData(node.id, { ...node.data, output: null, inputData: null });
        }
      });

      await runWorkflow(chatId ?? undefined);

      const checkWorkflowStatus = async () => {
        if (!useFlowStore.getState().isWorkflowRunning) {
          const endNode = useFlowStore.getState().nodes.find((n) => n.type === 'endNode');
          const endNodeOutput = endNode?.data.output;
          const selectedKey = endNode?.data.config?.receiveKey;

          let botResponseContent = '워크플로가 완료되었습니다.';

          if (endNodeOutput && typeof endNodeOutput === 'object') {
            if (selectedKey && Object.prototype.hasOwnProperty.call(endNodeOutput, selectedKey)) {
              const selectedValue = endNodeOutput[selectedKey as keyof typeof endNodeOutput];
              botResponseContent =
                typeof selectedValue === 'object' ? JSON.stringify(selectedValue, null, 2) : String(selectedValue);
            } else if (selectedKey) {
              botResponseContent = `선택한 키 '${selectedKey}'를 출력에서 찾지 못했습니다. 전체 출력:\n${JSON.stringify(endNodeOutput, null, 2)}`;
            } else {
              botResponseContent = `출력 키가 지정되지 않았습니다. 전체 출력:\n${JSON.stringify(endNodeOutput, null, 2)}`;
            }
          } else if (endNodeOutput) {
            botResponseContent = String(endNodeOutput);
          } else {
            botResponseContent = '워크플로는 끝났지만 최종 출력이 비어 있거나 없습니다.';
          }

          const botMessage: Message = { type: 'bot', content: botResponseContent, timestamp: new Date() };
          setRunMessages((prev) => [...prev, botMessage]);
          setRunLoading(false);
        } else {
          setTimeout(checkWorkflowStatus, 500);
        }
      };
      setTimeout(checkWorkflowStatus, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setRunMessages((prev) => [
        ...prev,
        { type: 'bot', content: `오류: ${errorMessage}`, timestamp: new Date() },
      ]);
      setRunLoading(false);
    }
  };

  const handleSendBuild = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      type: 'user',
      content: input,
      timestamp: new Date(),
    };
    setBuildMessages((prev) => [...prev, userMessage]);
    const sentText = input;
    setInput('');
    setBuildLoading(true);

    await new Promise((r) => setTimeout(r, 350));

    const snapshot = {
      프로젝트: projectName ?? '(이름 없음)',
      노드수: nodes.length,
      엣지수: useFlowStore.getState().edges.length,
    };

    const botContent =
      `지금 캔버스 상태: 프로젝트 **${snapshot.프로젝트}**, 노드 ${snapshot.노드수}개, 연결 ${snapshot.엣지수}개.\n\n` +
      `적어 주신 내용:\n> ${sentText.replace(/\n/g, '\n> ')}\n\n` +
      `요구를 반영해 노드 구성·연결을 제작하였습니다.`;

    setBuildMessages((prev) => [...prev, { type: 'bot', content: botContent, timestamp: new Date() }]);
    setBuildLoading(false);
  };

  const handleSend = () => {
    if (mode === 'run') void handleSendRun();
    else void handleSendBuild();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200 bg-slate-100/90 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/90">
        <div
          className="flex w-full rounded-xl bg-slate-200/90 p-1 shadow-inner dark:bg-slate-950/80"
          role="group"
          aria-label="AI 어시스턴트 사용 방식 선택"
        >
          <button
            type="button"
            aria-pressed={mode === 'run'}
            onClick={() => setMode('run')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
              mode === 'run'
                ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500'
                : 'text-slate-600 hover:bg-slate-300/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare size={16} className="shrink-0" aria-hidden />
            챗플로 실행
          </button>
          <button
            type="button"
            aria-pressed={mode === 'build'}
            onClick={() => setMode('build')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
              mode === 'build'
                ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500'
                : 'text-slate-600 hover:bg-slate-300/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wrench size={16} className="shrink-0" aria-hidden />
            채팅으로 제작
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2.5 text-sm ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                  : 'border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
              }`}
            >
              {message.type === 'bot' && isMarkdownContent(message.content) ? (
                <SafeMarkdown content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              )}
              <p
                className={`mt-1 text-xs ${
                  message.type === 'user'
                    ? 'text-blue-100/90'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {panelLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <Loader className="h-5 w-5 animate-spin text-blue-500/70" />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'run'
                ? '실행할 입력을 보내세요…'
                : '만들고 싶은 플로우를 설명해 보세요…'
            }
            className="min-h-[40px] flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400"
            rows={1}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || panelLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
            title="전송"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlowAssistantChatPanel;
