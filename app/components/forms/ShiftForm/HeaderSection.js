'use client';
import Calendar from '../../Calendar';
import { formatThaiDate } from '../../../utils/dateUtils';

export const HeaderSection = ({
    showCalendar,
    setShowCalendar,
    thaiDate,
    selectedDate,
    setSelectedDate,
    setFormData,
    setThaiDate,
    datesWithData,
    formData,
    handleShiftChange
}) => {
    return (
        <div className="bg-gradient-to-b from-[#0ab4ab]/10 to-white rounded-lg shadow-lg p-4 mb-4">
            <h1 className="text-lg text-center font-medium text-[#0ab4ab] mb-4 font-THSarabun">
                Daily Patient Census and Staffing
            </h1>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black justify-center">
                    <div className="flex flex-col md:flex-row items-center gap-2 whitespace-nowrap text-sm justify-center">
                        <div className="flex flex-col md:flex-row gap-2 items-center w-full">
                            <button
                                type="button"
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-THSarabun"
                            >
                                {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                            </button>
                            <span className="text-gray-700 font-medium text-center w-full md:w-auto font-THSarabun">{thaiDate}</span>
                        </div>
                    </div>
                    {showCalendar && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="relative bg-white rounded-lg">
                                <Calendar
                                    selectedDate={selectedDate}
                                    onDateSelect={async (date) => {
                                        setSelectedDate(date);
                                        const isoDate = date.toISOString().split('T')[0];
                                        setFormData(prev => ({
                                            ...prev,
                                            date: isoDate
                                        }));
                                        setThaiDate(formatThaiDate(date));
                                        setShowCalendar(false);
                                    }}
                                    onClickOutside={() => setShowCalendar(false)}
                                    datesWithData={datesWithData}
                                    variant="form"
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex gap-4 justify-center">
                        <div className="flex gap-4">
                            {['07:00-19:00', '19:00-07:00'].map((shiftTime) => (
                                <div key={shiftTime} className="flex flex-col items-center md:block">
                                    <span className="text-sm font-medium text-gray-700 mb-1 block md:hidden">
                                        {shiftTime === '07:00-19:00' ? 'Morning' : 'Night'}
                                    </span>
                                    <label className="flex text-black text-sm items-center gap-2">
                                        <input
                                            type="radio"
                                            name="shift"
                                            value={shiftTime}
                                            checked={formData.shift === shiftTime}
                                            onChange={(e) => handleShiftChange(e.target.value)}
                                            className="rounded"
                                        />
                                        <span>
                                            <span className="hidden md:inline">
                                                {shiftTime === '07:00-19:00' ? 'Morning' : 'Night'}{' '}
                                            </span>
                                            ({shiftTime})
                                        </span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};