import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Bot, User, Loader2, GripVertical, Plus, MessageSquare, Trash2, Edit2, Check, X as XIcon } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  isLoading: boolean;
  createdAt: Date;
}

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiChat: React.FC<AiChatProps> = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: 'New Chat',
      messages: [
        {
          id: '1',
          type: 'ai',
          content: 'Hello! I\'m your AI assistant. I can help you with workflow design, node configuration, and answer questions about LangStar. How can I assist you today?',
          timestamp: new Date()
        }
      ],
      isLoading: false,
      createdAt: new Date()
    }
  ]);
  const [activeConversationId, setActiveConversationId] = useState('1');
  const [inputMessage, setInputMessage] = useState('');
  const [width, setWidth] = useState(600); // 더 넓은 기본 너비
  const [isResizing, setIsResizing] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find(conv => conv.id === activeConversationId) || conversations[0];
  const isLoading = activeConversation?.isLoading || false;

  const handleClose = () => {
    // Dispatch custom event to notify Header component
    window.dispatchEvent(new CustomEvent('ai-chat-toggle', { detail: { isOpen: false } }));
    onClose();
  };

  // 새 대화 시작
  const startNewConversation = useCallback(() => {
    const newConversationId = Date.now().toString();
    const newConversation: Conversation = {
      id: newConversationId,
      title: 'New Chat',
      messages: [
        {
          id: '1',
          type: 'ai',
          content: 'Hello! I\'m your AI assistant. How can I help you today?',
          timestamp: new Date()
        }
      ],
      isLoading: false,
      createdAt: new Date()
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversationId);
  }, []);

  // 대화 삭제
  const deleteConversation = useCallback((conversationId: string) => {
    if (conversations.length === 1) return; // 마지막 대화는 삭제할 수 없음
    
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    if (activeConversationId === conversationId) {
      const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
      setActiveConversationId(remainingConversations[0]?.id || conversations[0]?.id);
    }
  }, [conversations, activeConversationId]);

  // 대화 제목 자동 생성
  const generateTitle = (firstUserMessage: string): string => {
    const words = firstUserMessage.trim().split(' ');
    return words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
  };

  // 제목 편집 시작
  const startEditingTitle = useCallback((conversationId: string, currentTitle: string) => {
    setEditingTitleId(conversationId);
    setEditingTitleValue(currentTitle);
  }, []);

  // 제목 편집 저장
  const saveEditingTitle = useCallback(() => {
    if (!editingTitleId || !editingTitleValue.trim()) return;
    
    setConversations(prev => prev.map(conv => 
      conv.id === editingTitleId 
        ? { ...conv, title: editingTitleValue.trim() }
        : conv
    ));
    
    setEditingTitleId(null);
    setEditingTitleValue('');
  }, [editingTitleId, editingTitleValue]);

  // 제목 편집 취소
  const cancelEditingTitle = useCallback(() => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  }, []);

  // 제목 편집 키보드 핸들러
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditingTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditingTitle();
    }
  }, [saveEditingTitle, cancelEditingTitle]);

  // 크기 조절 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 400; // 최소 너비 증가
    const maxWidth = Math.min(1000, window.innerWidth * 0.8); // 최대 너비 증가
    
    setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  useEffect(() => {
    if (editingTitleId && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitleId]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeConversationId]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // 현재 활성 대화에 메시지 추가 및 제목 업데이트
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const updatedMessages = [...conv.messages, userMessage];
        const newTitle = conv.title === 'New Chat' && conv.messages.length === 1 
          ? generateTitle(userMessage.content)
          : conv.title;
        
        return { 
          ...conv, 
          messages: updatedMessages, 
          isLoading: true,
          title: newTitle
        };
      }
      return conv;
    }));
    
    setInputMessage('');

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I understand you're asking about: "${userMessage.content}". This is a simulated response. In a real implementation, this would connect to your AI service to provide helpful assistance with workflow design, node configuration, and LangStar features.`,
        timestamp: new Date()
      };
      
      setConversations(prev => prev.map(conv => 
        conv.id === activeConversationId 
          ? { ...conv, messages: [...conv.messages, aiMessage], isLoading: false }
          : conv
      ));
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex transition-all duration-300 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500 transition-colors z-10 group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-purple-500" />
        </div>
      </div>

      {/* Conversation History Sidebar */}
      <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ml-1">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center justify-center px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                activeConversationId === conversation.id
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => editingTitleId !== conversation.id && setActiveConversationId(conversation.id)}
            >
              <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
              
              {editingTitleId === conversation.id ? (
                <div className="flex items-center flex-1 space-x-1">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={saveEditingTitle}
                    className="flex-1 text-sm bg-white dark:bg-gray-700 border border-purple-300 dark:border-purple-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEditingTitle();
                    }}
                    className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-all"
                    title="Save"
                  >
                    <Check className="h-3 w-3 text-green-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEditingTitle();
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                    title="Cancel"
                  >
                    <XIcon className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm truncate flex-1">{conversation.title}</span>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingTitle(conversation.id, conversation.title);
                      }}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all"
                      title="Edit title"
                    >
                      <Edit2 className="h-3 w-3 text-blue-500" />
                    </button>
                    {conversations.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-purple-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {activeConversation?.title || 'AI Assistant'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeConversation?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-[80%] ${
                message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                }`}>
                  {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 opacity-70 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-end space-x-3">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Assistant..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm resize-none min-h-[44px] max-h-[120px]"
              disabled={isLoading}
              rows={1}
              style={{ 
                height: 'auto',
                minHeight: '44px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 flex-shrink-0"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiChat;