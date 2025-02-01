'use client';
import { useState } from 'react';
import ShiftForm from './components/ShiftForm';
import Dashboard from './dashboard/Dashboard';
import Navigation from './components/Navigation';
import exportData from './lib/exportData';

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
          {/* เวอร์ชันอยู่ขวาสุด */}
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-white text-sm">
            v1.1.2.2025
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