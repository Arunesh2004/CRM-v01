export default function InvoicesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Invoices & Receipts</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="py-3 px-6 font-medium">Date</th>
              <th className="py-3 px-6 font-medium">Invoice Number</th>
              <th className="py-3 px-6 font-medium">Amount</th>
              <th className="py-3 px-6 font-medium">Status</th>
              <th className="py-3 px-6 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800 divide-y">
            {/* Mock Data */}
            <tr className="hover:bg-gray-50">
              <td className="py-4 px-6">Jul 24, 2026</td>
              <td className="py-4 px-6 font-mono text-gray-500">INV-2026-0042</td>
              <td className="py-4 px-6">$29.00</td>
              <td className="py-4 px-6"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Paid</span></td>
              <td className="py-4 px-6 text-right"><button className="text-blue-600 hover:underline">Download PDF</button></td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="py-4 px-6">Jun 24, 2026</td>
              <td className="py-4 px-6 font-mono text-gray-500">INV-2026-0021</td>
              <td className="py-4 px-6">$29.00</td>
              <td className="py-4 px-6"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Paid</span></td>
              <td className="py-4 px-6 text-right"><button className="text-blue-600 hover:underline">Download PDF</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
