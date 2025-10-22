import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  nodeName?: string;
  nodeId?: string;
}

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: string;
  singleSelection?: boolean; // 단일 선택 모드
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  value = [],
  onChange,
  options,
  placeholder = 'Select options...',
  disabled = false,
  maxHeight = 'max-h-48',
  singleSelection = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // 외부 클릭 시 닫힘
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 네비게이션
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            toggleOption(options[highlightedIndex].value);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
        case ' ':
          event.preventDefault();
          setIsOpen(!isOpen);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options]);

  const toggleOption = (optionValue: string) => {
    if (singleSelection) {
      // 단일 선택 모드: 다른 값 선택 시 기존 선택 해제
      if (value.includes(optionValue)) {
        // 이미 선택된 값을 다시 클릭하면 해제
        onChange([]);
      } else {
        // 새로운 값 선택 (기존 선택 자동 해제)
        onChange([optionValue]);
      }
    } else {
      // 다중 선택 모드: 기존 로직 유지
      const newValue = value.includes(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    }
  };

  const removeOption = (optionValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (singleSelection) {
      // 단일 선택 모드에서는 선택 해제
      onChange([]);
    } else {
      // 다중 선택 모드에서는 해당 항목만 제거
      const newValue = value.filter(v => v !== optionValue);
      onChange(newValue);
    }
  };

  const selectedOptions = options.filter(option => value.includes(option.value));

  // 노드별로 그룹핑
  const groupedOptions = options.reduce((acc, option) => {
    const nodeName = option.nodeName || 'Unknown Node';
    if (!acc[nodeName]) {
      acc[nodeName] = [];
    }
    acc[nodeName].push(option);
    return acc;
  }, {} as Record<string, MultiSelectOption[]>);

  return (
    <div className="relative" ref={containerRef}>
      {/* 선택된 항목들 표시 */}
      <div
        className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-2 min-h-[42px] flex flex-wrap items-center gap-1 cursor-pointer transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'
        } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={placeholder}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map((option) => (
            <span
              key={option.value}
              className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm flex items-center gap-1"
            >
              <span className="truncate max-w-[120px]">{option.label}</span>
              {option.nodeName && (
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-200 dark:bg-blue-800 px-1 rounded">
                  {option.nodeName}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => removeOption(option.value, e)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                aria-label={`Remove ${option.label}`}
              >
                <X size={12} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {placeholder}
          </span>
        )}
        
        <div className="ml-auto flex-shrink-0">
          <ChevronDown 
            size={16} 
            className={`text-gray-400 dark:text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </div>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg ${maxHeight} overflow-y-auto`}
          role="listbox"
          aria-label="Options"
        >
          {options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              No options available
            </div>
          ) : (
            Object.entries(groupedOptions).map(([nodeName, nodeOptions]) => (
              <div key={nodeName} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                {/* 노드 헤더 */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {nodeName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({nodeOptions.length} items)
                    </span>
                  </div>
                </div>
                
                {/* 노드의 옵션들 */}
                {nodeOptions.map((option) => {
                  const globalIndex = options.findIndex(opt => opt.value === option.value);
                  const isSelected = value.includes(option.value);
                  const isHighlighted = globalIndex === highlightedIndex;
                  
                  return (
                    <div
                      key={option.value}
                      className={`px-6 py-2 cursor-pointer text-sm flex items-center gap-2 transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                          : isHighlighted
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => toggleOption(option.value)}
                      onMouseEnter={() => setHighlightedIndex(globalIndex)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center justify-center w-4 h-4">
                        {isSelected && (
                          <Check size={14} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
