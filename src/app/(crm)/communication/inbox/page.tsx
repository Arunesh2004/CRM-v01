export default function CommunicationInboxEmptyPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white text-gray-400">
      <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <h2 className="text-xl font-medium text-gray-600 mb-2">Unified Communication Inbox</h2>
      <p className="max-w-sm text-center text-sm">Select a conversation from the sidebar to view Email, WhatsApp, and Telephony histories.</p>
    </div>
  );
}
