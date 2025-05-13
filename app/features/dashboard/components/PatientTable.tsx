'use client';

import React from 'react';

// อินเตอร์เฟซสำหรับข้อมูลแถวในตาราง
interface TableRow {
  id: string;
  [key: string]: any;
}

// คอลัมน์ในตาราง
interface TableColumn {
  header: string;
  accessor: string;
  cell?: (value: any, row: TableRow) => React.ReactNode;
}

interface PatientTableProps {
  columns: TableColumn[];
  data: TableRow[];
  title?: string;
}

const PatientTable: React.FC<PatientTableProps> = ({ columns, data, title }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {title && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column, columnIndex) => (
                <th
                  key={columnIndex}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className={rowIndex % 2 === 0 ? "" : "bg-gray-50 dark:bg-gray-900/50"}>
                {columns.map((column, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                  >
                    {column.cell 
                      ? column.cell(row[column.accessor], row) 
                      : row[column.accessor] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientTable; 