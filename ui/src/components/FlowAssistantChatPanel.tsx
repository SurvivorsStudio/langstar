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

/** '수정해줘' 트리거 시 데모용으로 채워 넣는 시스템 프롬프트 초안 */
const BUILD_EDIT_PROMPT_REPLY = `[역할]
너는 미식가이자 영양 밸런스를 고려한 메뉴 추천 전문가야. 나의 현재 상황과 취향을 분석하여 최적의 메뉴를 추천해 줘.

[상황 정보]

현재 시간 및 식사 종류: [예: 4월 21일 오후 3시, 점심 혹은 이른 저녁]

함께하는 사람: [예: 혼자, 직장 동료, 친구 등]

선호 메뉴/카테고리: [예: 한식, 일식, 가벼운 것, 기름진 것 등]

피해야 할 음식: [예: 알레르기, 특정 재료, 너무 매운 것 등]

현재 날씨/기분: [예: 비가 와서 따뜻한 국물이 당김, 스트레스받아서 자극적인 것 등]

[요청 사항]

위 조건에 맞는 메뉴 3가지를 추천해 줘.

각 메뉴별로 추천하는 이유(영양학적 관점 혹은 분위기)를 1문장으로 짧게 설명해 줘.

마지막에 이 데이터 해석을 바탕으로 한 한줄요약을 반드시 포함해 줘.`;

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

/** 노드 언급 칩 — 일반 채팅 텍스트와 시각적으로 구분 (동화 DS 그린) */
const ASSISTANT_NODE_CHIP_CLASS =
  'assistant-node-chip mx-0.5 inline-flex max-w-[min(220px,100%)] shrink-0 align-baseline rounded border border-[#00694D] bg-[#E8F5EF] px-1.5 py-0.5 text-xs font-medium text-[#00694D] shadow-sm dark:border-[#00AD50] dark:bg-[#0C3A27]/50 dark:text-[#C2D6BE]';

function getComposerPlainText(root: HTMLElement | null): string {
  if (!root) return '';
  return root.innerText.replace(/\u200b/g, '').replace(/\ufeff/g, '').trim();
}

function clearComposer(root: HTMLElement | null) {
  if (!root) return;
  root.innerHTML = '';
}

function insertNodeChipAtEnd(editor: HTMLElement, label: string) {
  const span = document.createElement('span');
  span.className = ASSISTANT_NODE_CHIP_CLASS;
  span.contentEditable = 'false';
  span.dataset.nodeMention = 'true';
  span.textContent = label;

  const raw = editor.innerText.replace(/\u200b/g, '');
  if (raw.length > 0 && !/\s$/.test(raw)) {
    editor.appendChild(document.createTextNode(' '));
  }
  editor.appendChild(span);
  editor.appendChild(document.createTextNode('\u200b'));

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  editor.focus();
}

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
  const { nodes, updateNodeData, runWorkflow, projectName, setBuildDemoCanvasHidden } = useFlowStore((s) => ({
    nodes: s.nodes,
    updateNodeData: s.updateNodeData,
    runWorkflow: s.runWorkflow,
    projectName: s.projectName,
    setBuildDemoCanvasHidden: s.setBuildDemoCanvasHidden,
  }));
  const assistantChatInsertSeq = useFlowStore((s) => s.assistantChatInsertSeq);
  const assistantChatInsertText = useFlowStore((s) => s.assistantChatInsertText);

  /** 홍보 영상용: 채팅으로 제작 전환 시 캔버스 숨김, 챗플로 실행이면 항상 표시 */
  useEffect(() => {
    if (mode === 'build') {
      setBuildDemoCanvasHidden(true);
    } else {
      setBuildDemoCanvasHidden(false);
    }
  }, [mode, setBuildDemoCanvasHidden]);

  const [runMessages, setRunMessages] = useState<Message[]>([
    { type: 'bot', content: RUN_WELCOME, timestamp: new Date() },
  ]);
  const [buildMessages, setBuildMessages] = useState<Message[]>([
    { type: 'bot', content: BUILD_WELCOME, timestamp: new Date() },
  ]);
  const messages = mode === 'run' ? runMessages : buildMessages;
  const [composerTick, setComposerTick] = useState(0);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);
  const panelLoading = mode === 'run' ? runLoading : buildLoading;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistantInputRef = useRef<HTMLDivElement>(null);
  const lastAssistantInsertSeq = useRef(0);

  useEffect(() => {
    if (assistantChatInsertSeq <= lastAssistantInsertSeq.current) return;
    lastAssistantInsertSeq.current = assistantChatInsertSeq;
    const snippet = assistantChatInsertText;
    if (!snippet) return;
    const ed = assistantInputRef.current;
    if (!ed) return;
    insertNodeChipAtEnd(ed, snippet);
    setComposerTick((n) => n + 1);
  }, [assistantChatInsertSeq, assistantChatInsertText]);

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
    const ed = assistantInputRef.current;
    const sentText = getComposerPlainText(ed);
    if (!sentText) return;

    const userMessage: Message = {
      type: 'user',
      content: sentText,
      timestamp: new Date(),
    };

    setRunMessages((prev) => [...prev, userMessage]);
    clearComposer(ed);
    setComposerTick((n) => n + 1);
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
    const ed = assistantInputRef.current;
    const sentText = getComposerPlainText(ed);
    if (!sentText) return;

    const userMessage: Message = {
      type: 'user',
      content: sentText,
      timestamp: new Date(),
    };
    setBuildMessages((prev) => [...prev, userMessage]);
    clearComposer(ed);
    setComposerTick((n) => n + 1);
    setBuildLoading(true);

    const revealCanvas = sentText.includes('만들어줘');
    const editPromptReply = sentText.includes('수정해줘');
    /** 홍보용: 수정해줘 3초, 만들어줘 5초 */
    const thinkingMs = editPromptReply ? 3000 : revealCanvas ? 5000 : 350;
    await new Promise((r) => setTimeout(r, thinkingMs));

    if (revealCanvas) {
      setBuildDemoCanvasHidden(false);
    }

    const snapshot = {
      프로젝트: projectName ?? '(이름 없음)',
      노드수: nodes.length,
      엣지수: useFlowStore.getState().edges.length,
    };

    let botContent: string;
    if (editPromptReply) {
      botContent = BUILD_EDIT_PROMPT_REPLY;
    } else if (revealCanvas) {
      botContent =
        `요청하신 대로 챗플로를 화면에 표시했습니다.\n\n` +
        `현재 캔버스: 프로젝트 **${snapshot.프로젝트}**, 노드 ${snapshot.노드수}개, 연결 ${snapshot.엣지수}개.`;
    } else {
      botContent =
        `지금 캔버스 상태: 프로젝트 **${snapshot.프로젝트}**, 노드 ${snapshot.노드수}개, 연결 ${snapshot.엣지수}개.\n\n` +
        `적어 주신 내용:\n> ${sentText.replace(/\n/g, '\n> ')}\n\n` +
        `요구를 반영해 노드 구성·연결을 제작하였습니다.`;
    }

    setBuildMessages((prev) => [...prev, { type: 'bot', content: botContent, timestamp: new Date() }]);
    setBuildLoading(false);
  };

  const handleSend = () => {
    if (mode === 'run') void handleSendRun();
    else void handleSendBuild();
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComposerPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    document.execCommand('insertText', false, text);
    setComposerTick((n) => n + 1);
  };

  const composerPlain = getComposerPlainText(assistantInputRef.current);
  const composerEmpty = composerPlain === '';
  const canSend = !panelLoading && composerPlain.length > 0;

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
          <div className="relative min-h-[40px] flex-1">
            {composerEmpty && !isComposerFocused && (
              <span className="pointer-events-none absolute left-3 top-2 z-0 text-sm text-slate-400 dark:text-slate-500">
                {mode === 'run' ? '실행할 입력을 보내세요…' : '만들고 싶은 플로우를 설명해 보세요…'}
              </span>
            )}
            <div
              ref={assistantInputRef}
              data-flow-assistant-input
              contentEditable={!panelLoading}
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label={mode === 'run' ? '챗플로 실행 입력' : '채팅으로 제작 입력'}
              onInput={() => setComposerTick((n) => n + 1)}
              onKeyDown={handleComposerKeyDown}
              onPaste={handleComposerPaste}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              className="relative z-[1] min-h-[40px] w-full whitespace-pre-wrap break-words rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
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
