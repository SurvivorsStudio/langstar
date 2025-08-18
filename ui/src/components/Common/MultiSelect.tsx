import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  value = [],
  onChange,
  options,
  placeholder = 'Select options...',
  disabled = false,
  maxHeight = 'max-h-48'
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
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const removeOption = (optionValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newValue = value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  const selectedOptions = options.filter(option => value.includes(option.value));

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
            options.map((option, index) => {
              const isSelected = value.includes(option.value);
              const isHighlighted = index === highlightedIndex;
              
              return (
                <div
                  key={option.value}
                  className={`px-4 py-2 cursor-pointer text-sm flex items-center gap-2 transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : isHighlighted
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => toggleOption(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
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
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
