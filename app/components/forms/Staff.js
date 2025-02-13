'use client';
import React from 'react';

const Staff = ({ ward, data, onChange }) => {
  const staffTypes = ['Nurse Manager', 'RN', 'PN', 'WC'];

  return (
    <div className="flex flex-col gap-1">
      {staffTypes.map(staffType => (
        <div key={staffType} className="bg-gradient-to-r from-green-400/20 to-green-500/10 rounded-md p-1">
          <input
            type="number"
            value={data[staffType]}
            onChange={(e) => onChange('staff', ward, { [staffType]: e.target.value })}
            className="w-16 text-center text-sm font-bold bg-transparent border-b"
            placeholder="0"
            min="0"
          />
        </div>
      ))}
    </div>
  );
};

export default Staff;
