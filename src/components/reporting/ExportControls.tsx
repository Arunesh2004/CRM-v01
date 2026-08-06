'use client';
import { useState } from 'react';

export function ExportControls({ startDate, endDate }: { startDate?: string, endDate?: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (type: string) => {
    setLoading(true);
    let url = `/api/export?type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Error exporting data');
    }
    setLoading(false);
  };

  return (
    <div className="flex space-x-2">
      <button 
        onClick={() => handleExport('incidents')}
        disabled={loading}
        className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200"
      >
        Export Incidents
      </button>
      <button 
        onClick={() => handleExport('customers')}
        disabled={loading}
        className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200"
      >
        Export Customers
      </button>
      <button 
        onClick={() => handleExport('communications')}
        disabled={loading}
        className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200"
      >
        Export Comms
      </button>
    </div>
  );
}
