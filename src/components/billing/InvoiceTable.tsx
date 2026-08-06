'use client';

export default function InvoiceTable({ invoices }: { invoices: any[] }) {
  if (!invoices || invoices.length === 0) {
    return <div className="text-sm text-slate-500 p-4 border rounded-md">No invoices found.</div>;
  }

  const handleDownload = (id: string) => {
    // Usually triggers an action to generate a pre-signed URL or PDF stream.
    alert(`Downloading invoice ${id}...`);
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="p-4 font-medium text-slate-600">Invoice Number</th>
            <th className="p-4 font-medium text-slate-600">Amount</th>
            <th className="p-4 font-medium text-slate-600">Status</th>
            <th className="p-4 font-medium text-slate-600">Date</th>
            <th className="p-4 font-medium text-slate-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-slate-50">
              <td className="p-4 font-medium text-slate-800">{inv.invoiceNumber}</td>
              <td className="p-4 text-slate-600">${inv.finalAmount}</td>
              <td className="p-4">
                <span className={`px-2 py-1 text-xs rounded-full ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                  {inv.status}
                </span>
              </td>
              <td className="p-4 text-slate-500">{new Date(inv.issuedAt).toLocaleDateString()}</td>
              <td className="p-4">
                <button onClick={() => handleDownload(inv.id)} className="text-blue-600 hover:underline">Download</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
