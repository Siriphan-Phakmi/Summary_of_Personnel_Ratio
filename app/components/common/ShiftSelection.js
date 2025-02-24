const ShiftSelection = ({
    selectedShift,
    onShiftChange,
    variant = 'form' // 'form' | 'dashboard'
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

    return (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row justify-center gap-4">
                {shifts.map(({ id, label, value }) => (
                    <div key={id} className="flex items-center justify-center">
                        <label className="relative flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="shift"
                                value={value}
                                checked={selectedShift === value}
                                onChange={() => onShiftChange(value)}
                                className="hidden"
                            />
                            <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                                selectedShift === value 
                                ? 'border-[#0ab4ab] bg-[#0ab4ab]' 
                                : 'border-gray-300 group-hover:border-[#0ab4ab]/50'
                            }`}>
                                {selectedShift === value && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-0.5"></div>
                                )}
                            </div>
                            <span className={`text-sm transition-colors ${
                                selectedShift === value ? 'text-[#0ab4ab] font-medium' : 'text-gray-600'
                            }`}>
                                {label} ({value})
                            </span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShiftSelection; 