import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  maxHeight?: string;
  className?: string;
  onExpand?: () => void;
}

interface JsonNodeProps {
  data: any;
  name?: string;
  level?: number;
  isLast?: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  maxHeight = "400px", 
  className = "",
  onExpand
}) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className={`relative bg-gray-50 dark:bg-gray-900 rounded-lg border ${className} ${
        onExpand ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all' : ''
      }`}
      onClick={onExpand}
      title={onExpand ? "클릭하여 확대 보기" : undefined}
    >
      {/* Header with copy button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          JSON Data {onExpand && <span className="text-xs text-blue-500 dark:text-blue-400 ml-2">🔍 클릭하여 확대</span>}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors z-10"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500">Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* JSON content */}
      <div 
        className="p-3 overflow-auto font-mono text-sm"
        style={{ maxHeight }}
      >
        <JsonNode data={data} level={0} />
      </div>
    </div>
  );
};

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, level = 0, isLast = true }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // 처음 2단계까지만 펼쳐서 표시
  
  const indent = '  '.repeat(level);
  
  if (data === null) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
        <span className="text-gray-500 dark:text-gray-400 italic">null</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (typeof data === 'string') {
    return (
      <div className="text-green-600 dark:text-green-400">
        {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
        <span className="whitespace-pre-wrap break-words">"{data}"</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (typeof data === 'number') {
    return (
      <div className="text-purple-600 dark:text-purple-400">
        {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
        <span>{data}</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (typeof data === 'boolean') {
    return (
      <div className="text-orange-600 dark:text-orange-400">
        {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
        <span>{data.toString()}</span>
        {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
      </div>
    );
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div>
          {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">[]</span>
          {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-1 mr-1 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </button>
          {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">
            [{!isExpanded && <span className="text-gray-500 text-xs ml-1">{data.length} items</span>}
          </span>
        </div>
        
        {isExpanded && (
          <div className="ml-4 border-l border-gray-300 dark:border-gray-600 pl-2">
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
        <div>
          {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">{`{}`}</span>
          {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-1 mr-1 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </button>
          {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
          <span className="text-gray-600 dark:text-gray-400">
            {`{`}{!isExpanded && <span className="text-gray-500 text-xs ml-1">{keys.length} properties</span>}
          </span>
        </div>
        
        {isExpanded && (
          <div className="ml-4 border-l border-gray-300 dark:border-gray-600 pl-2">
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
    <div className="text-gray-500 dark:text-gray-400">
      {name && <span className="text-blue-600 dark:text-blue-400">"{name}": </span>}
      <span className="italic">{String(data)}</span>
      {!isLast && <span className="text-gray-600 dark:text-gray-400">,</span>}
    </div>
  );
};

export default JsonViewer;
