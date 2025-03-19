import React from 'react';

const ShiftSelection = ({
    selectedShift,
    onShiftChange,
    variant = 'form', // 'form' | 'dashboard'
    theme = 'light' // 'light' | 'dark'
}) => {
    const shifts = variant === 'dashboard' 
        ? [
            { id: 'all', label: 'ทั้งวัน', value: 'all' },
            { id: 'morning', label: 'กะเช้า', value: '07:00-19:00' },
            { id: 'night', label: 'กะดึก', value: '19:00-07:00' }
          ]
        : [
            { id: 'morning', label: 'กะเช้า', value: '07:00-19:00' },
            { id: 'night', label: 'กะดึก', value: '19:00-07:00' }
          ];

    // ป้องกันการเกิด error ถ้า onShiftChange ไม่ใช่ฟังก์ชัน
    const handleShiftChange = (value) => {
        if (typeof onShiftChange === 'function') {
            onShiftChange(value);
        } else {
            console.warn('onShiftChange is not a function in ShiftSelection');
        }
    };

    return (
        <div className={`${
            theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            } border rounded-lg p-3 shadow-sm hover:shadow transition-all h-full`}>
            <div className="font-medium text-gray-600 mb-1.5">กะ</div>
            <div className="flex flex-col sm:flex-row justify-start gap-6">
                {shifts.map(({ id, label, value }) => (
                    <div key={id} className="flex items-center">
                        <label className="relative flex items-center gap-2.5 cursor-pointer group">
                            <input
                                type="radio"
                                name="shift"
                                value={value}
                                checked={selectedShift === value}
                                onChange={() => handleShiftChange(value)}
                                className="hidden"
                            />
                            <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                                selectedShift === value 
                                ? theme === 'dark' 
                                    ? 'border-[#0ab4ab] bg-[#0ab4ab]' 
                                    : 'border-[#0ab4ab] bg-[#0ab4ab]'
                                : theme === 'dark' 
                                    ? 'border-gray-500 group-hover:border-[#0ab4ab]/70' 
                                    : 'border-gray-300 group-hover:border-[#0ab4ab]/50'
                            }`}>
                                {selectedShift === value && (
                                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                )}
                            </div>
                            <span className={`transition-colors ${
                                selectedShift === value 
                                    ? theme === 'dark'
                                        ? 'text-[#0ab4ab] font-medium'
                                        : 'text-[#0ab4ab] font-medium' 
                                    : theme === 'dark'
                                        ? 'text-gray-200'
                                        : 'text-gray-700'
                            }`}>
                                {label}
                                <span className={`ml-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    ({value})
                                </span>
                            </span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShiftSelection; 