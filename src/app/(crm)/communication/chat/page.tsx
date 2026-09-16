import ChatInterface from '@/components/communication/ChatInterface';
import { requireAuth } from '@/lib/auth';

export default async function ChatPage() {
  const user = await requireAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 font-display text-white">Internal Chat</h1>
      <ChatInterface userId={user.id} tenantId={user.tenantId} />
    </div>
  );
}
