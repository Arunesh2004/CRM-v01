'use client';

import React, { useState, useEffect } from 'react';
import { Send, User as UserIcon, Archive } from 'lucide-react';
import { getInboxAction, sendInternalMailAction, archiveMailAction } from '@/modules/communication/actions/inbox.actions';

export default function MailInterface({ userId }: { userId: string }) {
  const [inbox, setInbox] = useState<any[]>([]);
  const [activeMail, setActiveMail] = useState<any | null>(null);
  const [compose, setCompose] = useState(false);
  const [loading, setLoading] = useState(true);

  // Compose states
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toStr, setToStr] = useState(''); // Comma separated userIds for prototype
  const [sending, setSending] = useState(false);

  const loadInbox = React.useCallback(async () => {
    const res = await getInboxAction();
    if (res.success) {
      setInbox(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- False positive: loadInbox contains only asynchronous setState after network fetch
    loadInbox();
  }, [loadInbox]);



  const handleSend = async () => {
    if (!subject || !body || !toStr) return;
    setSending(true);
    try {
      const toIds = toStr.split(',').map(s => s.trim()).filter(Boolean);
      await sendInternalMailAction({
        subject,
        bodyHtml: body,
        toIds
      });
      setCompose(false);
      setSubject('');
      setBody('');
      setToStr('');
      loadInbox();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async (messageId: string) => {
    try {
      await archiveMailAction(messageId);
      setActiveMail(null);
      loadInbox();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading mailbox...</div>;

  return (
    <div className="flex h-[700px] bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b font-semibold bg-gray-50 text-gray-800 flex justify-between items-center">
          <span>Inbox</span>
          <button 
            onClick={() => setCompose(true)}
            className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
          >
            Compose
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {inbox.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">Your inbox is empty.</div>
          ) : (
            inbox.map(m => (
              <div 
                key={m.id} 
                onClick={() => { setActiveMail(m); setCompose(false); }}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${activeMail?.id === m.id && !compose ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-gray-900 truncate">
                    {m.message?.thread?.subject || 'No Subject'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">From: {m.message?.sender?.firstName} {m.message?.sender?.lastName}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Mail Area */}
      <div className="flex-1 flex flex-col bg-gray-50/50">
        {compose ? (
          <div className="p-6 flex flex-col h-full bg-white">
            <h2 className="text-xl font-semibold mb-4">Compose Internal Mail</h2>
            <div className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (User IDs comma separated)</label>
                <input 
                  type="text" 
                  value={toStr} onChange={e => setToStr(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input 
                  type="text" 
                  value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Subject"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea 
                  value={body} onChange={e => setBody(e.target.value)}
                  className="w-full border rounded p-2 flex-1 focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Type your message here..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setCompose(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSend}
                  disabled={sending || !subject || !body || !toStr}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? 'Sending...' : <><Send className="w-4 h-4" /> Send</>}
                </button>
              </div>
            </div>
          </div>
        ) : activeMail ? (
          <div className="p-6 flex flex-col h-full bg-white">
            <div className="flex justify-between items-start mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-semibold mb-2">{activeMail.message?.thread?.subject || 'No Subject'}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <span>
                    From: <span className="font-medium text-gray-900">{activeMail.message?.sender?.firstName} {activeMail.message?.sender?.lastName}</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{new Date(activeMail.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <button 
                onClick={() => handleArchive(activeMail.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Archive"
              >
                <Archive className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: activeMail.message?.bodyHtml || '' }} />
            
            {/* Structured CRM References rendering block */}
            {activeMail.message?.referenceType && activeMail.message?.referenceId && (
              <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-3">
                <div className="bg-indigo-600 text-white p-2 rounded">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-indigo-900">Attached CRM Record</p>
                  <p className="text-sm text-indigo-700">Type: {activeMail.message.referenceType} | ID: {activeMail.message.referenceId}</p>
                </div>
                <button className="ml-auto px-4 py-2 bg-white text-indigo-600 text-sm font-medium border border-indigo-200 rounded hover:bg-indigo-50 transition-colors">
                  View Record
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a message to read.</p>
          </div>
        )}
      </div>
    </div>
  );
}
