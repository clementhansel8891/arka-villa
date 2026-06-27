import ChatInterface from '@/components/ai-chat/ChatInterface';

export const metadata = {
  title: 'AI Assistant | Arka Villa Platform',
  description: 'Chat with the AI assistant on mobile.',
};

export default function AIChatMobilePage() {
  return (
    <div className="min-h-screen bg-heritage-charcoal px-4 pt-4 pb-6">
      {/* Mobile page header */}
      <header className="mb-4">
        <h1 className="text-xl font-serif text-white font-bold">
          AI Assistant
        </h1>
        <p className="text-xs text-white/40 mt-0.5">
          Ask questions within your access scope
        </p>
      </header>

      {/* Chat interface - compact mode for mobile */}
      <ChatInterface compact />
    </div>
  );
}
