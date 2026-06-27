import ChatInterface from '@/components/ai-chat/ChatInterface';

export const metadata = {
  title: 'AI Assistant | Arka Villa Platform',
  description: 'Chat with the AI assistant for villa management insights and task assistance.',
};

export default function AIChatDesktopPage() {
  return (
    <div className="min-h-screen bg-heritage-charcoal p-6 lg:p-8">
      {/* Page header */}
      <header className="mb-6">
        <h1 className="text-2xl font-serif text-white font-bold">
          AI Assistant
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Get insights and assistance scoped to your role and permissions
        </p>
      </header>

      {/* Chat interface */}
      <ChatInterface />
    </div>
  );
}
