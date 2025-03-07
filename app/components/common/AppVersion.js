'use client';

import React from 'react';

const APP_VERSION = 'v.2.3.3.2025';

export default function AppVersion() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-gray-200 hover:bg-white/90 transition-all duration-300">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-700">
            {APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
} 