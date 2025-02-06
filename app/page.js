'use client';
import { useState } from 'react';
import ShiftForm from './components/forms/ShiftForm';
import Dashboard from './components/dashboard/Dashboard';
import Navigation from './components/dashboard/Navigation';
import exportData from './utils/exportData';

export default function Home() {
  const [currentPage, setCurrentPage] = useState('form');

  return (
    <div>
      {/* Navigation */}
      <nav className="bg-[#0ab4ab] p-4">
        <div className="container mx-auto relative">
          {/* ปุ่มอยู่ตรงกลาง */}
          <div className="flex justify-center">
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentPage('form')}
                className={`px-4 py-2 rounded-lg ${currentPage === 'form'
                  ? 'bg-white text-[#0ab4ab]'
                  : 'text-white hover:bg-[#0ab4ab]/80'
                  }`}
              >
                FormData
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-2 rounded-lg ${currentPage === 'dashboard'
                  ? 'bg-white text-[#0ab4ab]'
                  : 'text-white hover:bg-[#0ab4ab]/80'
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

      {/* Version number - Fixed at bottom right */}
      <div className="fixed bottom-4 right-4 text-xs md:text-sm bg-[#0ab4ab] text-white px-2 py-1 rounded-lg shadow-md z-50">
        v1.6.2.2025
      </div>
    </div>
  );
}