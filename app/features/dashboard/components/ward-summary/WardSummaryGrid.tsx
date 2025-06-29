'use client';

import React from 'react';
import { WardSummaryGridProps } from '../types/componentInterfaces';
import WardButton from './WardButton';

const WardSummaryGrid: React.FC<WardSummaryGridProps> = ({
  wards,
  selectedWardId,
  onSelectWard
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
      {wards.map((ward: { id: string; wardName: string; patientCount: number }) => (
        <div key={ward.id}>
          <WardButton
            wardName={ward.wardName}
            patientCount={ward.patientCount}
            isSelected={selectedWardId === ward.id}
            onClick={() => onSelectWard(ward.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default WardSummaryGrid; 