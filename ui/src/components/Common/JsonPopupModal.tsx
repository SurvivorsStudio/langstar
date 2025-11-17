import React from 'react';
import { X, Maximize2, Minimize2, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface JsonPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  title?: string;
}

interface JsonNodeProps {
  data: any;
  name?: string;
  level?: number;
  isLast?: boolean;
}

const JsonPopupModal: React.FC<JsonPopupModalProps> = ({ 
  isOpen, 
  onClose, 
  data,
  title = 'JSON Data Viewer'
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col transition-all ${
          isFullscreen 
            ? 'w-full h-full' 
            : 'w-full max-w-4xl h-5/6'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              title="Copy JSON"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto p-4">
            <div className="font-mono text-base">
              <JsonNode data={data} level={0} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {typeof data === 'object' && data !== null 
              ? `${Object.keys(data).length} properties, ${jsonString.split('\n').length} lines`
              : `${jsonString.split('\n').length} lines`
            }
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, level = 0, isLast = true }) => {
  const [isExpanded, setIsExpanded] = useState(level < 3); // 처음 3단계까지 펼쳐서 표시
  
  if (data === null) {
    return (
      <div className="text-gray-500 dark:text-gray-400 leading-relaxed">
        {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
        <span className="text-gray-500 dark:text-gray-400 italic">null</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (typeof data === 'string') {
    return (
      <div className="text-green-600 dark:text-green-400 leading-relaxed">
        {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
        <span className="break-words">"{data}"</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (typeof data === 'number') {
    return (
      <div className="text-purple-600 dark:text-purple-400 leading-relaxed">
        {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
        <span>{data}</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (typeof data === 'boolean') {
    return (
      <div className="text-orange-600 dark:text-orange-400 leading-relaxed">
        {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
        <span>{data.toString()}</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="leading-relaxed">
          {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">[]</span>
          {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
        </div>
      );
    }
    
    return (
      <div className="leading-relaxed">
        <div className="flex items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-1.5 py-0.5 mr-2 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">
            [{!isExpanded && <span className="text-gray-500 text-sm ml-2 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{data.length} items</span>}
          </span>
        </div>
        
        {isExpanded && (
          <div className="ml-6 border-l-2 border-gray-300 dark:border-gray-600 pl-4 mt-1">
            {data.map((item, index) => (
              <JsonNode
                key={index}
                data={item}
                level={level + 1}
                isLast={index === data.length - 1}
              />
            ))}
          </div>
        )}
        
        <div className="text-gray-600 dark:text-gray-400">
          ]
          {!isLast && <span>,</span>}
        </div>
      </div>
    );
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return (
        <div className="leading-relaxed">
          {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">{`{}`}</span>
          {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
        </div>
      );
    }
    
    return (
      <div className="leading-relaxed">
        <div className="flex items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-1.5 py-0.5 mr-2 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">
            {`{`}{!isExpanded && <span className="text-gray-500 text-sm ml-2 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{keys.length} properties</span>}
          </span>
        </div>
        
        {isExpanded && (
          <div className="ml-6 border-l-2 border-gray-300 dark:border-gray-600 pl-4 mt-1">
            {keys.map((key, index) => (
              <JsonNode
                key={key}
                data={data[key]}
                name={key}
                level={level + 1}
                isLast={index === keys.length - 1}
              />
            ))}
          </div>
        )}
        
        <div className="text-gray-600 dark:text-gray-400">
          {`}`}
          {!isLast && <span>,</span>}
        </div>
      </div>
    );
  }
  
  // 기타 타입들 (undefined, function 등)
  return (
    <div className="text-gray-500 dark:text-gray-400 leading-relaxed">
      {name && <span className="text-blue-600 dark:text-blue-400 font-semibold">"{name}": </span>}
      <span className="italic">{String(data)}</span>
      {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
    </div>
  );
};

export default JsonPopupModal;

