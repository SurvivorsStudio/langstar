import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; isGroup?: boolean; groupLabel?: string }[];
  placeholder?: string;
  disabled?: boolean;
}

interface EnhancedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; preview?: string; type?: string; nodeColor?: string }[];
  placeholder?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find(opt => opt.value === value) || null;
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);

  const allOptions = [{ value: '', label: placeholder }, ...options];

  // 외부 클릭 시 닫힘
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // 키보드 접근성
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setHighlightedIdx(idx => Math.min(options.length - 1, idx + 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setHighlightedIdx(idx => Math.max(0, idx - 1));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (highlightedIdx >= 0 && highlightedIdx < options.length) {
          const selectedOption = options[highlightedIdx];
          if (!selectedOption.isGroup) {
            onChange(selectedOption.value);
            setOpen(false);
          }
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, highlightedIdx, options, onChange]);

  useEffect(() => {
    if (open) {
      // 선택된 값이 있으면 해당 인덱스 하이라이트
      const idx = options.findIndex(opt => opt.value === value);
      setHighlightedIdx(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? '' : 'text-gray-400 dark:text-gray-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} className="ml-2 text-gray-400 dark:text-gray-500" />
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto animate-fade-in"
          tabIndex={-1}
          role="listbox"
        >
          {allOptions.length === 0 && (
            <div className="px-4 py-2 text-gray-400 dark:text-gray-500 text-sm">No options</div>
          )}
          {allOptions.map((opt, idx) => {
            const isPlaceholder = opt.value === '';
            const isGroup = opt.isGroup;
            
            return (
              <div
                key={opt.value + idx}
                role={isGroup ? "group" : "option"}
                aria-selected={!isGroup && value === opt.value}
                className={`px-4 py-2 text-sm flex items-center transition-colors
                  ${value === opt.value && !isGroup ? 'font-semibold text-blue-700 dark:text-blue-300' : ''}
                  ${highlightedIdx === idx && !isGroup ? 'bg-blue-100 dark:bg-blue-900/40' : ''}
                  ${isPlaceholder ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}
                  ${isGroup ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-700 dark:text-blue-300 cursor-default border-l-4 border-blue-500' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!isGroup) {
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
                onMouseEnter={() => {
                  if (!isGroup) {
                    setHighlightedIdx(idx);
                  }
                }}
              >
                {value === opt.value && !isGroup && <Check size={16} className="mr-2 text-blue-600 dark:text-blue-300" />}
                {isGroup && <div className="mr-2 w-4 h-4"></div>}
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 값 미리보기 기능이 있는 Enhanced Select
const EnhancedSelect: React.FC<EnhancedSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find(opt => opt.value === value) || null;
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);

  const allOptions = [{ value: '', label: placeholder }, ...options];

  // 외부 클릭 시 닫힘
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // 키보드 접근성
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setHighlightedIdx(idx => Math.min(options.length - 1, idx + 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setHighlightedIdx(idx => Math.max(0, idx - 1));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (highlightedIdx >= 0 && highlightedIdx < options.length) {
          onChange(options[highlightedIdx].value);
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, highlightedIdx, options, onChange]);

  useEffect(() => {
    if (open) {
      // 선택된 값이 있으면 해당 인덱스 하이라이트
      const idx = options.findIndex(opt => opt.value === value);
      setHighlightedIdx(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? '' : 'text-gray-400 dark:text-gray-500'}>
          {selected ? (
            selected.label.includes(':') ? (
              <div className="flex items-center space-x-1">
                <span className={`px-2 py-0.5 text-xs rounded font-medium ${selected.nodeColor || ''}`}>
                  {selected.label.split(':')[0].trim()}
                </span>
                <span className="text-sm">: {selected.label.split(':')[1].trim()}</span>
              </div>
            ) : selected.label
          ) : placeholder}
        </span>
        <ChevronDown size={18} className="ml-2 text-gray-400 dark:text-gray-500" />
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto animate-fade-in"
          tabIndex={-1}
          role="listbox"
          onMouseLeave={() => setHighlightedIdx(-1)}
        >
          {allOptions.length === 0 && (
            <div className="px-4 py-2 text-gray-400 dark:text-gray-500 text-sm">No options</div>
          )}
          {allOptions.map((opt, idx) => {
            const isPlaceholder = opt.value === '';
            const hasPreview = opt.preview && opt.preview !== '';
            const hasType = opt.type && opt.type !== '';
            const hasNodeColor = opt.nodeColor && opt.nodeColor !== '';
            const isGroup = opt.value.startsWith('group-');
            
            return (
              <div
                key={opt.value + idx}
                role="option"
                aria-selected={value === opt.value}
                className={`px-4 py-3 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0
                  ${value === opt.value ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}
                  ${highlightedIdx === idx && !isGroup ? 'bg-gray-50 dark:bg-gray-700' : ''}
                  ${isPlaceholder ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}
                  ${isGroup ? 'cursor-default' : 'cursor-pointer'}
                  ${isGroup && opt.nodeColor ? opt.nodeColor : ''}`}
                onClick={() => {
                  if (!isGroup) {
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
                onMouseEnter={() => {
                  if (!isGroup) {
                    setHighlightedIdx(idx);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    {value === opt.value && <Check size={16} className="mr-2 text-blue-600 dark:text-blue-300 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {opt.label.includes(':') ? opt.label.split(':')[1].trim() : opt.label}
                        </span>
                        {hasType && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {opt.type}
                          </span>
                        )}
                      </div>
                      {hasPreview && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {opt.preview}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
export { EnhancedSelect }; 