'use client';
import { useState } from 'react';
import { sendEmailAction } from '@/modules/communication/actions/email.actions';

export default function EmailComposer({ customerId }: { customerId?: string }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');
    const result = await sendEmailAction({ to, subject, bodyHtml: body, customerId });
    if (result.success) {
      setStatus('Sent successfully!');
      setTo(''); setSubject(''); setBody('');
    } else {
      setStatus(`Error: ${result.error}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Compose Email</h3>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">To</label>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition">Send Email</button>
        {status && <p className="text-sm mt-2 text-slate-600">{status}</p>}
      </form>
    </div>
  );
}
