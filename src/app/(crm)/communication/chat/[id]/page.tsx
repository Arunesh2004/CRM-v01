import { notFound } from 'next/navigation';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';
import { withTenant } from '@db/utils/prisma-tenant';
import { Card } from '@/components/ui/Card';
import { MessageSquare, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { ChatService } from '@/modules/communication/chat.service';

export default async function ChatDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission(Resource.COMMUNICATION, Action.READ);

  const prisma = withTenant(tenantId);
  const conversationId = params.id;

  // We fetch the conversation to get the name, but rely on ChatService for messages
  // because ChatService enforces the user participation requirement.
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId },
    include: {
      participants: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } }
      }
    }
  });

  if (!conversation) {
    notFound();
  }

  // Fetch messages using the secure service that enforces participant RLS
  let messages;
  try {
    messages = await ChatService.getMessages(tenantId, conversationId, user.id);
  } catch (error) {
    // If not a participant, or other error, treat as not found for IDOR protection
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/communication/inbox" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Inbox
        </Link>
      </div>

      <div className="glass-panel rounded-[1.25rem] p-5">
        <p className="font-display font-bold text-xl text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" /> {conversation.name || 'Direct Message'}
        </p>
        <div className="text-xs text-[#8891B0] mt-2">
          Participants: {conversation.participants.map(p => p.user.firstName ? `${p.user.firstName} ${p.user.lastName}` : p.user.email).join(', ')}
        </div>
      </div>

      <div className="space-y-4">
        {messages.map((message) => (
          <Card key={message.id} className="glass-panel overflow-hidden border-none shadow-none p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="font-medium text-white text-sm">
                {message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'System'}
              </p>
              <div className="text-xs text-[#8891B0] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(message.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-white">
              {message.isDeleted ? <i className="text-[#8891B0]">This message was deleted.</i> : message.content}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
