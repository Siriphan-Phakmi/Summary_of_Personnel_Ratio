'use client';

import React, { useEffect, useState } from 'react';
import { Ward } from '@/app/types/ward';
import { FiChevronDown } from 'react-icons/fi';
import { getAllWards } from '@/app/services/ward/ward.service';
import { useAuth } from '@/app/contexts/AuthContext';

interface WardSelectorProps {
  selectedWardId: string;
  onWardChange: (wardId: string, wardName: string) => void;
  disabled?: boolean;
}

export default function WardSelector({
  selectedWardId,
  onWardChange,
  disabled = false
}: WardSelectorProps) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchWards = async () => {
      try {
        setLoading(true);
        const wardsData = await getAllWards();
        
        // Filter wards based on user's role and access
        let filteredWards = wardsData;
        if (user && user.role !== 'admin' && user.wards && user.wards.length > 0) {
          filteredWards = wardsData.filter(ward => user.wards?.includes(ward.id));
        }
        
        setWards(filteredWards);
        
        // If no ward is selected and we have wards, select the first one
        if (!selectedWardId && filteredWards.length > 0) {
          onWardChange(filteredWards[0].id, filteredWards[0].name);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching wards:', err);
        setError('Error loading wards. Please try again.');
        setLoading(false);
      }
    };

    fetchWards();
  }, [selectedWardId, onWardChange, user]);

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardId = e.target.value;
    const selectedWard = wards.find(ward => ward.id === wardId);
    if (selectedWard) {
      onWardChange(selectedWard.id, selectedWard.name);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col space-y-2">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Ward
      </label>
      <div className="relative">
        <select
          value={selectedWardId}
          onChange={handleWardChange}
          disabled={disabled || wards.length === 0}
          className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${
            disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'
          }`}
        >
          {wards.length === 0 ? (
            <option value="">No wards available</option>
          ) : (
            wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))
          )}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <FiChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      {disabled && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Ward selection is locked because this form has been finalized.
        </p>
      )}
    </div>
  );
} 