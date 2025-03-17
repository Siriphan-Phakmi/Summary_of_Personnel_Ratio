'use client';
import React from 'react';

const PatientMovement = ({ ward, data, onChange }) => {
  const movementTypes = [
    'New Admit', 'Transfer In', 'Refer In',
    'Transfer Out', 'Refer Out', 'Discharge', 'Dead', 'Planned Discharge'
  ];

  return (
    <div className="flex flex-col gap-1">
      {movementTypes.map(type => (
        <div key={type} className="bg-gradient-to-r from-yellow-400/20 to-yellow-500/10 rounded-md p-1">
          <input
            type="number"
            value={data[type]}
            onChange={(e) => onChange('movement', ward, { [type]: e.target.value })}
            className="w-16 text-center text-sm font-bold bg-transparent border-b"
            placeholder="0"
            min="0"
          />
        </div>
      ))}
    </div>
  );
};

export default PatientMovement;
