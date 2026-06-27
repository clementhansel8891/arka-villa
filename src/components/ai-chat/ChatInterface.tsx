'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, RotateCcw, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageBubble, { type ChatMessage } from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

const MAX_MESSAGES = 50;
const TIMEOUT_MS = 30_000;

interface UserContext {
  role: string;
  tenantName: string;
}

interface ChatInterfaceProps {
  userContext?: UserContext;
  compact?: boolean;
}

export default function ChatInterface({
  userContext = { role: 'Agency_Admin', tenantName: 'All Villas' },
  compact = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom when new messages or typing indicator appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const updated = [...prev, msg];
      // Enforce max 50 messages per session
      if (updated.length > MAX_MESSAGES) {
        return updated.slice(updated.length - MAX_MESSAGES);
      }
      return updated;
    });
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addMessage(userMsg);
      setIsTyping(true);
      setIsDisabled(true);

      // Create abort controller for timeout
      const controller = new AbortController();
      abortRef.current = controller;

      // Set 30-second timeout
      timeoutRef.current = setTimeout(() => {
        controller.abort();
        setIsTyping(false);
        setIsDisabled(false);
        const timeoutMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'The AI Agent did not respond in time. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addMessage(timeoutMsg);
      }, TIMEOUT_MS);

      try {
        const res = await fetch('/api/v1/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            conversationHistory: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        // Clear timeout since we got a response
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message || 'I apologize, but I could not process your request.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addMessage(assistantMsg);
      } catch (error: unknown) {
        // Only add error message if not aborted by timeout (timeout already adds its own message)
        if (error instanceof Error && error.name !== 'AbortError') {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addMessage(errorMsg);
        }
      } finally {
        setIsTyping(false);
        setIsDisabled(false);
        abortRef.current = null;
      }
    },
    [messages, addMessage]
  );

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setIsTyping(false);
    setIsDisabled(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-white/10 bg-heritage-charcoal/60 backdrop-blur-sm overflow-hidden',
        compact ? 'h-[calc(100vh-8rem)]' : 'h-[calc(100vh-12rem)]'
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-heritage-gold/10 flex items-center justify-center">
            <Bot size={18} className="text-heritage-gold" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">AI Assistant</h2>
            <div className="flex items-center gap-1.5">
              <Shield size={10} className="text-heritage-gold/60" />
              <span className="text-[10px] text-white/40">
                {userContext.role} · {userContext.tenantName}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Start new conversation"
        >
          <RotateCcw size={12} />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 rounded-full bg-heritage-gold/10 flex items-center justify-center mb-4">
                <Bot size={32} className="text-heritage-gold/60" />
              </div>
            </motion.div>
            <h3 className="text-base font-medium text-white/70 mb-1">
              How can I help you?
            </h3>
            <p className="text-xs text-white/30 max-w-xs">
              Ask questions about bookings, staff, maintenance, finances, or any
              villa-related operations within your access scope.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 items-end">
            <div className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <Bot size={14} className="text-white/60" />
            </div>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isDisabled} />
    </div>
  );
}
