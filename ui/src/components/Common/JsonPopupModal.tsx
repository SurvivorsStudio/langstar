import React from 'react';

import { X, Maximize2, Minimize2, Copy, Check, ChevronDown, ChevronRight, Edit3, Save, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';


interface JsonPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  title?: string;

  onSave?: (newData: any) => void;
  editable?: boolean;

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

  title = 'JSON Data Viewer',
  onSave,
  editable = true
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedJson, setEditedJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // data가 변경되면 편집 모드 종료 (저장 후 자동으로 보기 모드로 전환)
  useEffect(() => {
    if (isEditing) {
      setIsEditing(false);
      setEditedJson('');
      setJsonError(null);
    }
  }, [data]);

  // 팝업이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setEditedJson('');
      setJsonError(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      const textToCopy = isEditing ? editedJson : jsonString;
      await navigator.clipboard.writeText(textToCopy);


      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  const handleEditClick = () => {
    setEditedJson(jsonString);
    setJsonError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedJson('');
    setJsonError(null);
  };

  const handleSave = () => {
    try {
      const parsedData = JSON.parse(editedJson);
      setJsonError(null);
      
      if (onSave) {
        onSave(parsedData);
      }
      
      setIsEditing(false);
      setEditedJson('');
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedJson(e.target.value);
    // 실시간 유효성 검사
    try {
      JSON.parse(e.target.value);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };



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

          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h2>
            {isEditing && (
              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded">
                편집 모드
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <>
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
                {editable && onSave && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                    title="Edit JSON"
                  >
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
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
                  onClick={handleCancelEdit}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                  title="Cancel"
                >
                  <XCircle size={16} />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={jsonError !== null}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors ${
                    jsonError !== null
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                  title={jsonError !== null ? 'Fix JSON errors before saving' : 'Save changes'}
                >
                  <Save size={16} />
                  <span>Save</span>
                </button>
              </>
            )}

          </div>
        </div>

        {/* Content */}

        <div className="flex-1 overflow-hidden p-6 flex flex-col">
          {isEditing ? (
            <>
              <textarea
                value={editedJson}
                onChange={handleJsonChange}
                className="flex-1 w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 font-mono text-sm text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                spellCheck={false}
              />
              {jsonError && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">JSON 형식 오류</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{jsonError}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto p-4">
              <div className="font-mono text-base">
                <JsonNode data={data} level={0} />
              </div>
            </div>
          )}

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

        <span className="break-words whitespace-pre-wrap">"{data}"</span>

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

