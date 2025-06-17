'use client';

import React from 'react';

interface PieChartCenterLabelProps {
  totalAvailableBeds: number;
  totalBeds: number;
  textColor: string;
}

const PieChartCenterLabel = ({ totalAvailableBeds, totalBeds, textColor }: PieChartCenterLabelProps) => {
  if (totalBeds === 0) {
    return (
      <>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" fill={textColor} className="text-sm font-medium">
          ไม่พบข้อมูล
        </text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="central" fill={textColor} className="text-xs">
          เตียง
        </text>
      </>
    );
  }

  const percentage = totalBeds > 0 ? ((totalAvailableBeds / totalBeds) * 100) : 0;
  
  if (totalAvailableBeds === 0) {
     return (
      <>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" fill={textColor} className="text-2xl font-bold">
          0%
        </text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="central" fill={textColor} className="text-sm">
          เตียงว่าง
        </text>
      </>
    );
  }

  return (
    <>
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" fill={textColor} className="text-2xl font-bold">
        {`${Math.round(percentage)}%`}
      </text>
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="central" fill={textColor} className="text-sm">
        เตียงว่าง
      </text>
    </>
  );
};

export default React.memo(PieChartCenterLabel); 