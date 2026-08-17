import React from 'react';

export default function MailPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Internal Mail</h1>
      <div className="bg-white border rounded-lg p-6 shadow-sm min-h-[500px] flex items-center justify-center">
        <p className="text-gray-500">Your inbox is empty.</p>
      </div>
    </div>
  );
}
