import React, { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const AnimatedSelect = ({ value, onChange, options, placeholder, icon: Icon, className = '' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((opt: any) => opt.value === value)?.label || value || placeholder;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`zen-input w-full p-3 text-left flex items-center justify-between transition-all outline-none ${isOpen
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
          : ''
          }`}
      >
        <div className="flex items-center text-[var(--text-primary)]">
          {Icon && <Icon className={`w-4 h-4 mr-2 transition-colors ${isOpen ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />}
          <span className={!value ? "text-[var(--text-secondary)]" : ""}>{selectedLabel}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--accent)]' : ''}`} />
      </button>

      <div
        className={`absolute z-[999] w-full mt-2 zen-card overflow-hidden transition-all duration-300 origin-top ${isOpen
          ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
          }`}
      >
        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
          {options.map((option: any) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full p-3 rounded-lg text-left flex items-center justify-between transition-all duration-200 ${value === option.value
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
                }`}
            >
              <span>{option.label}</span>
              {value === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
