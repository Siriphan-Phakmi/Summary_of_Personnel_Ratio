'use client';

import React from 'react';

interface WardSummaryCardProps {
  wardName: string;
  patientCount: number | string;
  hasData?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'teal';
}

const colors = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
  pink: 'bg-pink-100 text-pink-800',
  teal: 'bg-teal-100 text-teal-800',
}

const WardSummaryCard: React.FC<WardSummaryCardProps> = ({ 
  wardName, 
  patientCount, 
  hasData = true,
  onClick,
  isSelected = false,
  color = 'yellow'
}) => {
  const bgColor = colors[color] || colors.yellow;
  const borderClass = isSelected ? 'border-2 border-blue-500' : '';
  
  return (
    <div 
      className={`${bgColor} ${borderClass} rounded-lg p-4 shadow-sm transition-transform hover:scale-105 hover:shadow-md cursor-pointer`}
      onClick={onClick}
    >
      <h3 className="text-center font-bold text-lg mb-2">{wardName}</h3>
      <p className="text-3xl font-bold text-center">{patientCount}</p>
      {!hasData && <p className="text-sm text-center mt-1">ไม่มีข้อมูล</p>}
      <p className="text-xs text-center mt-1 text-gray-600">คลิกเพื่อดูรายละเอียด...</p>
    </div>
  );
};

export default WardSummaryCard; 