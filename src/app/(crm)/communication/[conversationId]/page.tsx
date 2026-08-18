import { requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  await requirePermission(Resource.COMMUNICATION, Action.READ);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Conversation: {params.conversationId}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Conversation details.</p>
      </div>
    </div>
  );
}
