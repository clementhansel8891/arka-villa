'use client';

import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t border-white/10 bg-heritage-charcoal/80 backdrop-blur-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask the AI assistant..."
        rows={1}
        className={cn(
          'flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5',
          'text-sm text-white placeholder:text-white/30',
          'focus:outline-none focus:border-heritage-gold/30 focus:ring-1 focus:ring-heritage-gold/20',
          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label="Type your message"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className={cn(
          'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
          value.trim() && !disabled
            ? 'bg-heritage-gold/20 text-heritage-gold hover:bg-heritage-gold/30 cursor-pointer'
            : 'bg-white/5 text-white/20 cursor-not-allowed'
        )}
        aria-label="Send message"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
