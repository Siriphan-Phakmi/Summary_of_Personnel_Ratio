'use client';
import { useState } from 'react';
import ShiftForm from './components/ShiftForm';
import Dashboard from './dashboard/Dashboard';

export default function Home() {
  const [currentPage, setCurrentPage] = useState('form');

  return (
    <div>
      {/* Navigation */}
      <nav className="bg-white shadow-lg mb-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-4 items-center">
              <button
                onClick={() => setCurrentPage('form')}
                className={`px-4 py-2 rounded-md ${
                  currentPage === 'form'
                    ? 'bg-pink-200 text-gray-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                บันทึกข้อมูล
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-2 rounded-md ${
                  currentPage === 'dashboard'
                    ? 'bg-pink-200 text-gray-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto p-4">
        {currentPage === 'form' ? <ShiftForm /> : <Dashboard />}
      </main>
    </div>
  );
}