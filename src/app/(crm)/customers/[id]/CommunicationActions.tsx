'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { sendEmailAction, initiateCallAction, sendMessageAction } from './actions';
import { Mail, Phone, MessageSquare } from 'lucide-react';

export default function CommunicationActions({ customerId, contacts }: { customerId: string, contacts: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primaryContact = contacts.find((c: any) => c.isPrimary) || contacts[0];

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryContact?.email) {
      setError("No email address available for the primary contact.");
      return;
    }
    setLoading('email');
    setError(null);
    const form = e.target as HTMLFormElement;
    const res = await sendEmailAction(customerId, primaryContact.email, form.subject.value, form.body.value);
    if (res.error) setError(res.error);
    else form.reset();
    setLoading(null);
  };

  const handleCall = async () => {
    if (!primaryContact?.phone) {
      setError("No phone number available for the primary contact.");
      return;
    }
    setLoading('call');
    setError(null);
    const res = await initiateCallAction(customerId, primaryContact.phone);
    if (res.error) setError(res.error);
    setLoading(null);
  };

  const handleMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryContact?.phone) {
      setError("No phone number available for the primary contact.");
      return;
    }
    setLoading('message');
    setError(null);
    const form = e.target as HTMLFormElement;
    const res = await sendMessageAction(customerId, primaryContact.phone, form.message.value);
    if (res.error) setError(res.error);
    else form.reset();
    setLoading(null);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-primary" />
          Communicate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 text-red-600 bg-red-50 p-2 rounded text-sm font-medium border border-red-200">{error}</div>}
        
        <div className="space-y-6">
          <form onSubmit={handleSendEmail} className="space-y-3 p-4 border rounded-lg bg-gray-50/50">
            <h4 className="font-semibold text-sm flex items-center"><Mail className="w-4 h-4 mr-1" /> Send Email</h4>
            <input type="text" name="subject" placeholder="Subject" required className="w-full text-sm p-2 border rounded-md" />
            <textarea name="body" placeholder="Message body..." required rows={3} className="w-full text-sm p-2 border rounded-md" />
            <Button type="submit" disabled={loading === 'email'} size="sm">
              {loading === 'email' ? 'Sending...' : 'Send Email'}
            </Button>
          </form>

          <form onSubmit={handleMessage} className="space-y-3 p-4 border rounded-lg bg-gray-50/50">
            <h4 className="font-semibold text-sm flex items-center"><MessageSquare className="w-4 h-4 mr-1" /> Send SMS Message</h4>
            <textarea name="message" placeholder="Text message..." required rows={2} className="w-full text-sm p-2 border rounded-md" />
            <Button type="submit" disabled={loading === 'message'} size="sm">
              {loading === 'message' ? 'Sending...' : 'Send Message'}
            </Button>
          </form>

          <div className="p-4 border rounded-lg bg-gray-50/50 flex justify-between items-center">
            <h4 className="font-semibold text-sm flex items-center"><Phone className="w-4 h-4 mr-1" /> Voice Call</h4>
            <Button onClick={handleCall} disabled={loading === 'call'} variant="outline" size="sm">
              {loading === 'call' ? 'Initiating...' : 'Start Call'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
