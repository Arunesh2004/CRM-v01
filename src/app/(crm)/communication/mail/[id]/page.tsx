import { notFound } from 'next/navigation';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';
import { withTenant } from '@db/utils/prisma-tenant';
import { Card } from '@/components/ui/Card';
import { Mail, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function MailDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission(Resource.COMMUNICATION, Action.READ);

  const prisma = withTenant(tenantId);
  const threadId = params.id;

  const thread = await prisma.mailThread.findFirst({
    where: { id: threadId, tenantId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { firstName: true, lastName: true, email: true } },
          recipients: { select: { type: true, user: { select: { email: true } } } }
        }
      }
    }
  });

  if (!thread) {
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
          <Mail className="w-5 h-5 text-violet-400" /> {thread.subject || '(No Subject)'}
        </p>
      </div>

      <div className="space-y-4">
        {thread.messages.map((message) => (
          <Card key={message.id} className="glass-panel overflow-hidden border-none shadow-none p-6">
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/[.04]">
              <div>
                <p className="font-medium text-white">{message.sender.firstName} {message.sender.lastName} ({message.sender.email})</p>
                <div className="text-xs text-[#8891B0] mt-1 flex gap-2">
                  <span>To: {message.recipients.filter((r: any) => r.type === 'TO').map((r: any) => r.user.email).join(', ')}</span>
                  {message.recipients.some((r: any) => r.type === 'CC') && (
                    <span>CC: {message.recipients.filter((r: any) => r.type === 'CC').map((r: any) => r.user.email).join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-[#8891B0] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(message.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-white whitespace-pre-wrap">
              {message.bodyHtml ? (
                <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
              ) : (
                message.bodyText
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
