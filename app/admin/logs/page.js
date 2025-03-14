'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    // Fetch logs here instead of using searchParams
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    if (user) {
      fetchLogs();
    }
  }, [user]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-4 py-2">Timestamp</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={index}>
                <td className="border px-4 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="border px-4 py-2">{log.event}</td>
                <td className="border px-4 py-2">{JSON.stringify(log.properties)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
