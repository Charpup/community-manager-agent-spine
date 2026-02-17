import { useEffect, useState } from 'react';

interface Report {
  id: number;
  created_at: string;
  ticket_count: number;
  high_priority_count: number;
  content?: string;
}

export default function CruiseReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/cruise-reports')
      .then(res => res.json())
      .then(data => setReports(data.reports || []));
  }, []);

  const handleReportClick = (report: Report) => {
    fetch(`http://localhost:3001/api/cruise-reports/${report.id}`)
      .then(res => res.json())
      .then(data => setSelectedReport(data.report));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Cruise Reports</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Report List</h2>
          <div className="space-y-2">
            {reports.map(report => (
              <div
                key={report.id}
                onClick={() => handleReportClick(report)}
                className="p-4 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {report.ticket_count} tickets
                  </span>
                </div>
                {report.high_priority_count > 0 && (
                  <div className="mt-2 text-red-600 text-sm">
                    ⚠️ {report.high_priority_count} high priority
                  </div>
                )}
              </div>
            ))}
            {reports.length === 0 && (
              <div className="text-gray-500 text-center py-8">No reports available</div>
            )}
          </div>
        </div>

        {/* Report Detail */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Report Detail</h2>
          {selectedReport ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="mb-4">
                <span className="text-sm text-gray-500">
                  Generated: {new Date(selectedReport.created_at).toLocaleString()}
                </span>
              </div>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded">
                  {selectedReport.content || 'Report content not available'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
              Select a report to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
