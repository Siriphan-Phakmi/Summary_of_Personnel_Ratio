'use client';
import { useState } from 'react';
import { Toast, Tooltip } from '../../ui';
import PropTypes from 'prop-types';

const WardForm = ({ wardData, wardName, onUpdate }) => {
    const handleInputChange = (field, value) => {
        onUpdate({
            ...wardData,
            [field]: value
        });
    };

    return (
        <div className="ward-form border p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-4">{wardName}</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">จำนวนผู้ป่วย</label>
                    <input
                        type="text"
                        value={wardData.numberOfPatients}
                        onChange={(e) => handleInputChange('numberOfPatients', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">หัวหน้าเวร</label>
                    <input
                        type="text"
                        value={wardData.nurseManager}
                        onChange={(e) => handleInputChange('nurseManager', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">RN</label>
                    <input
                        type="text"
                        value={wardData.RN}
                        onChange={(e) => handleInputChange('RN', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                </div>

                {/* เพิ่ม input field อื่นๆ ตามต้องการ */}
            </div>
        </div>
    );
};

WardForm.propTypes = {
    wardData: PropTypes.object.isRequired,
    wardName: PropTypes.string.isRequired,
    onUpdate: PropTypes.func.isRequired,
};

export default WardForm;