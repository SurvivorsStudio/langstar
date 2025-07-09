import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
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
            return (
              <div
                key={opt.value + idx}
                role="option"
                aria-selected={value === opt.value}
                className={`px-4 py-2 cursor-pointer text-sm flex items-center transition-colors
                  ${value === opt.value ? 'font-semibold text-blue-700 dark:text-blue-300' : ''}
                  ${highlightedIdx === idx ? 'bg-blue-100 dark:bg-blue-900/40' : ''}
                  ${isPlaceholder ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightedIdx(idx)}
              >
                {value === opt.value && <Check size={16} className="mr-2 text-blue-600 dark:text-blue-300" />}
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect; 