import React from 'react';
import { StatCardProps } from '../types/shiftComparisonTypes';

const StatCard: React.FC<StatCardProps> = ({ title, value, color = "blue" }) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
    purple: "bg-purple-500 text-white",
    orange: "bg-orange-500 text-white",
    red: "bg-red-500 text-white",
    teal: "bg-teal-500 text-white",
  };
  
  const bgClass = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className={`rounded-lg shadow-md p-4 ${bgClass}`}>
      <h3 className="text-sm font-medium text-gray-100 opacity-90">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

export default StatCard; 