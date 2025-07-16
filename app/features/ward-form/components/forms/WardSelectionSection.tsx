'use client';

import React from 'react';
import { Ward } from '@/app/features/ward-form/types/ward';
import { Input } from '@/app/components/ui';
import { User, UserRole } from '@/app/features/auth/types/user';
import { useAuth } from '@/app/features/auth';

interface WardSelectionSectionProps {
  wards: Ward[];
  selectedWard: string;
  selectedDate: string;
  selectedWardObject?: Ward;
  onWardChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSingleWardUser: boolean;
}

export const WardSelectionSection: React.FC<WardSelectionSectionProps> = ({
  wards,
  selectedWard,
  selectedDate,
  selectedWardObject,
  onWardChange,
  onDateChange,
  isSingleWardUser,
}) => {
  const { user } = useAuth();
  
  // ตรวจสอบว่าผู้ใช้เป็น User ทั่วไปหรือ Nurse ที่มีแผนกกำหนดไว้แล้วหรือไม่
  const isRegularUserWithAssignedWard = !!user && 
    user.role === UserRole.NURSE && 
    wards.length === 1;

  // Enhanced ward display information
  const getWardDisplayInfo = () => {
    if (!selectedWardObject) return null;
    return {
      displayName: `${selectedWardObject.name} (${selectedWardObject.wardCode})`,
      fullInfo: `แผนก: ${selectedWardObject.name} | รหัส: ${selectedWardObject.wardCode} | เตียง: ${selectedWardObject.totalBeds} เตียง`,
      userRole: user?.role || 'unknown'
    };
  };

  const wardDisplayInfo = getWardDisplayInfo();

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          เลือกแผนกและวันที่
        </h2>
        {wardDisplayInfo && (
          <div className="mt-2 sm:mt-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              👨‍⚕️ {user?.firstName} {user?.lastName} ({user?.role?.toUpperCase()})
            </span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ward Selection - Enhanced Display */}
        <div>
          <label htmlFor="ward" className="form-label block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            แผนก (Ward) *
          </label>
          <select
            id="ward"
            value={selectedWard}
            onChange={onWardChange}
            className="form-input"
            required
            disabled={isSingleWardUser || wards.length === 0}
          >
            {wards.length > 0 ? (
              wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name} ({ward.wardCode}) - {ward.totalBeds} เตียง
                </option>
              ))
            ) : (
              <option value="" disabled>
                ไม่มีแผนกที่ได้รับมอบหมาย
              </option>
            )}
          </select>
          
          {/* Enhanced Ward Information Display */}
          {wardDisplayInfo && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    🏥 {wardDisplayInfo.fullInfo}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ระดับแผนก: {selectedWardObject?.wardLevel} | ลำดับ: {selectedWardObject?.wardOrder}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedWardObject?.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {selectedWardObject?.isActive ? '✅ เปิดใช้งาน' : '❌ ปิดใช้งาน'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Date Selection */}
        <Input
          id="date"
          name="date"
          label="วันที่ (Date) *"
          type="date"
          value={selectedDate}
          onChange={onDateChange}
          required
        />
      </div>
    </div>
  );
};

export default WardSelectionSection; 