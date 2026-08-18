import { getInboxAction } from '@/modules/communication/actions/inbox.actions';
import { Card } from '@/components/ui/Card';
import { Mail, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function CommunicationInboxPage() {
  const result = await getInboxAction();
  const emails = result.success ? result.data?.emails : [];
  const chats = result.success ? result.data?.chats : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-violet-400" /> Unified Inbox
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage all your emails and messages in one place.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-panel overflow-hidden border-none shadow-none">
          <div className="p-4 border-b border-white/[.04] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#8891B0]" />
            <span className="font-medium text-white">Recent Emails</span>
          </div>
          <div className="divide-y divide-white/[.04]">
            {emails?.map((email: any) => (
              <div key={email.id} className="p-4 hover:bg-white/[.02] transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-white">{email.subject}</p>
                  <span className="text-xs text-[#8891B0]">{new Date(email.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-[#8891B0] truncate">From: {email.sender?.email || 'Unknown'}</p>
                <p className="text-xs text-[#8891B0] mt-1 truncate">{email.bodyText || email.subject}</p>
              </div>
            ))}
            {(!emails || emails.length === 0) && (
              <div className="p-8 text-center text-[#8891B0]">No emails found.</div>
            )}
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden border-none shadow-none">
          <div className="p-4 border-b border-white/[.04] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#8891B0]" />
            <span className="font-medium text-white">Recent Messages</span>
          </div>
          <div className="divide-y divide-white/[.04]">
            {chats?.map((chat: any) => (
              <div key={chat.id} className="p-4 hover:bg-white/[.02] transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <Badge variant={chat.role === 'user' ? 'cyan' : 'slate'}>{chat.role}</Badge>
                  <span className="text-xs text-[#8891B0]">{new Date(chat.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-white mt-2 break-words">{chat.content}</p>
              </div>
            ))}
            {(!chats || chats.length === 0) && (
              <div className="p-8 text-center text-[#8891B0]">No messages found.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
