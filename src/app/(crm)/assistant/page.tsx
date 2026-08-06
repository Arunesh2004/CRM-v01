import { ChatInterface } from '@/components/ai/ChatInterface';

export default function AssistantPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">AI Assistant</h1>
        <p className="text-gray-600">Ask questions about your security, CRM, and billing data.</p>
      </div>
      
      <ChatInterface />
    </div>
  );
}
