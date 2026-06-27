'use client';

/**
 * Support Widget Expanded Panel
 *
 * Displays communication channel options when the support widget is expanded:
 * - WhatsApp (deep link to configured number)
 * - Telegram (deep link to configured bot/user)
 * - AI Chat (inline chat interface)
 *
 * Configurable per villa: which channels are active, operating hours,
 * greeting messages, and estimated human response time.
 *
 * Design language: Dark surface, villa accent color highlights,
 * elegant Balinese-inspired styling.
 *
 * Requirements: 26.1, 26.2, 26.4, 26.6, 26.7
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Bot, Clock, ArrowLeft } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupportChannel {
  type: 'whatsapp' | 'telegram' | 'ai_chat';
  enabled: boolean;
  /** WhatsApp: phone number with country code. Telegram: bot username or user handle. */
  handle?: string;
  /** Pre-filled message for external channels */
  prefillMessage?: string;
}

export interface SupportHours {
  /** 24h format, e.g. "08:00" */
  start: string;
  /** 24h format, e.g. "20:00" */
  end: string;
  /** IANA timezone, e.g. "Asia/Bali" */
  timezone: string;
}

export interface SupportWidgetPanelProps {
  villaName: string;
  villaId: string;
  tenantId: string;
  accentColor: string;
  channels: SupportChannel[];
  greeting?: string;
  supportHours?: SupportHours;
  estimatedResponseTime?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function isWithinSupportHours(hours?: SupportHours): boolean {
  if (!hours) return true; // If no hours configured, always available

  const now = new Date();
  // Simple timezone-aware check using Intl
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: hours.timezone,
  });

  const timeStr = formatter.format(now); // "HH:MM"
  const [startH, startM] = hours.start.split(':').map(Number);
  const [endH, endM] = hours.end.split(':').map(Number);
  const [nowH, nowM] = timeStr.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = nowH * 60 + nowM;

  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

function buildWhatsAppUrl(handle: string, message?: string): string {
  const phone = handle.replace(/[^0-9]/g, '');
  const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${phone}${encoded}`;
}

function buildTelegramUrl(handle: string): string {
  const username = handle.replace(/^@/, '');
  return `https://t.me/${username}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChannelButton({
  icon,
  label,
  sublabel,
  onClick,
  href,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  href?: string;
  accentColor: string;
}) {
  const className =
    'flex items-center gap-3 w-full p-3 rounded-sm border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left';

  const content = (
    <>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accentColor}20` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {sublabel && (
          <p className="text-xs text-white/50 truncate">{sublabel}</p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

// ─── AI Chat View ────────────────────────────────────────────────────────────

function AIChatView({
  villaId,
  tenantId,
  accentColor,
  onBack,
}: {
  villaId: string;
  tenantId: string;
  accentColor: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          tenantId,
          villaId,
          source: 'support_widget',
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = response.ok
        ? await response.json()
        : { message: 'I apologize, I am having trouble responding right now. Please try again shortly.' };

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTurnCount((prev) => prev + 1);
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, I am having trouble connecting. Please try again or use WhatsApp/Telegram for immediate assistance.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, tenantId, villaId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Back to channels"
        >
          <ArrowLeft size={16} className="text-white/70" />
        </button>
        <Bot size={16} style={{ color: accentColor }} />
        <span className="text-sm font-medium text-white">AI Assistant</span>
        {turnCount >= 3 && (
          <span className="ml-auto text-[10px] text-white/50">Human handoff available</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-white/40 text-center pt-6">
            Ask me anything about the villa — I&apos;m here to help.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 text-xs leading-relaxed rounded-sm ${
                msg.role === 'user'
                  ? 'bg-white/10 text-white'
                  : 'border border-white/10 text-white/90'
              }`}
              style={
                msg.role === 'user' ? { backgroundColor: `${accentColor}30` } : undefined
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="border border-white/10 px-3 py-2 rounded-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-white/20 placeholder:text-white/30"
            disabled={loading}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-2 rounded-sm transition-colors disabled:opacity-30"
            style={{ color: accentColor }}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        {turnCount >= 3 && (
          <p className="text-[10px] text-white/40 mt-2 text-center">
            Need more help?{' '}
            <button type="button" className="underline" style={{ color: accentColor }}>
              Connect to a human agent
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function SupportWidgetPanel({
  villaName,
  villaId,
  tenantId,
  accentColor,
  channels,
  greeting,
  supportHours,
  estimatedResponseTime,
}: SupportWidgetPanelProps) {
  const [view, setView] = useState<'channels' | 'ai_chat'>('channels');
  const withinHours = isWithinSupportHours(supportHours);

  const enabledChannels = channels.filter((c) => c.enabled);
  const whatsappChannel = enabledChannels.find((c) => c.type === 'whatsapp');
  const telegramChannel = enabledChannels.find((c) => c.type === 'telegram');
  const aiChatChannel = enabledChannels.find((c) => c.type === 'ai_chat');

  const defaultGreeting = greeting || `Welcome to ${villaName}. How can we assist you today?`;

  if (view === 'ai_chat') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-80 h-[420px] bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        <AIChatView
          villaId={villaId}
          tenantId={tenantId}
          accentColor={accentColor}
          onBack={() => setView('channels')}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-80 bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl p-5"
    >
      {/* Header */}
      <div className="mb-4">
        <p
          className="text-[10px] uppercase tracking-[0.3em] mb-2"
          style={{ color: accentColor }}
        >
          Concierge
        </p>
        <p className="text-sm text-white/80 leading-relaxed">
          {defaultGreeting}
        </p>
      </div>

      {/* Outside-hours notice */}
      {!withinHours && (
        <div className="flex items-start gap-2 mb-4 p-3 border border-white/10 bg-white/[0.02] rounded-sm">
          <Clock size={14} className="text-white/50 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-white/70">
              Human agents are currently unavailable.
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              AI assistance is available 24/7.
              {estimatedResponseTime && (
                <> Human response expected within {estimatedResponseTime}.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Channel Options */}
      <div className="space-y-2">
        {whatsappChannel && (
          <ChannelButton
            icon={<MessageCircle size={16} className="text-green-400" />}
            label="WhatsApp"
            sublabel={withinHours ? 'Chat with our team' : 'Leave a message'}
            href={buildWhatsAppUrl(
              whatsappChannel.handle || '',
              whatsappChannel.prefillMessage || `Hello ${villaName}! I have a question.`
            )}
            accentColor={accentColor}
          />
        )}

        {telegramChannel && (
          <ChannelButton
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            label="Telegram"
            sublabel={withinHours ? 'Message us on Telegram' : 'Leave a message'}
            href={buildTelegramUrl(telegramChannel.handle || '')}
            accentColor={accentColor}
          />
        )}

        {aiChatChannel && (
          <ChannelButton
            icon={<Bot size={16} style={{ color: accentColor }} />}
            label="AI Assistant"
            sublabel="Instant answers, available 24/7"
            onClick={() => setView('ai_chat')}
            accentColor={accentColor}
          />
        )}
      </div>

      {/* Footer */}
      {supportHours && withinHours && (
        <p className="text-[10px] text-white/30 mt-4 text-center">
          Human support available {supportHours.start} – {supportHours.end}
        </p>
      )}
    </motion.div>
  );
}
