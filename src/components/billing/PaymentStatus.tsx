'use client';

export default function PaymentStatus({ payment }: { payment: any }) {
  if (!payment) return null;
  return (
    <div className={`p-4 rounded-md text-sm ${payment.status === 'SUCCESS' ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
      Payment Status: <span className="font-bold">{payment.status}</span>
    </div>
  );
}
