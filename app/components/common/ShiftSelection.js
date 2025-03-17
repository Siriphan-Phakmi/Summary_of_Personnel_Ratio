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
                ? 'bg-gray-800/60 shadow-gray-900 border border-gray-700' 
                : 'bg-white/60 shadow-gray-200'
            } backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all`}>
            <div className="flex flex-col md:flex-row justify-center gap-4">
                {shifts.map(({ id, label, value }) => (
                    <div key={id} className="flex items-center justify-center">
                        <label className="relative flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="shift"
                                value={value}
                                checked={selectedShift === value}
                                onChange={() => handleShiftChange(value)}
                                className="hidden"
                            />
                            <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                selectedShift === value 
                                ? theme === 'dark' 
                                    ? 'border-[#0ab4ab] bg-[#0ab4ab]' 
                                    : 'border-[#0ab4ab] bg-[#0ab4ab]'
                                : theme === 'dark' 
                                    ? 'border-gray-500 group-hover:border-[#0ab4ab]/70' 
                                    : 'border-gray-300 group-hover:border-[#0ab4ab]/50'
                            }`}>
                                {selectedShift === value && (
                                    <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                                )}
                            </div>
                            <span className={`text-sm transition-colors ${
                                selectedShift === value 
                                    ? theme === 'dark'
                                        ? 'text-[#0ab4ab] font-medium'
                                        : 'text-[#0ab4ab] font-medium' 
                                    : theme === 'dark'
                                        ? 'text-gray-200'
                                        : 'text-gray-600'
                            }`}>
                                {label} 
                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
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