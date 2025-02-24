import { formatThaiDate } from '../../utils/dateUtils';
import Calendar from '../ui/Calendar';

const CalendarSection = ({
    selectedDate,
    onDateSelect,
    datesWithData = [],
    showCalendar,
    setShowCalendar,
    thaiDate,
    variant = 'form'
}) => {
    return (
        <div className="relative">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-[#0ab4ab] to-blue-500 text-white rounded-lg hover:from-[#0ab4ab]/90 hover:to-blue-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#0ab4ab] focus:ring-opacity-50 shadow-md text-sm"
                    >
                        {showCalendar ? 'ซ่อนปฏิทิน' : 'เลือกวันที่'}
                    </button>
                    <div className="text-gray-700 space-y-0.5 text-center md:text-left text-sm">
                        <div className="font-medium text-[#0ab4ab]">วันที่ปัจจุบัน : {formatThaiDate(new Date())}</div>
                        <div className="text-blue-600">วันที่เลือก : {thaiDate}</div>
                    </div>
                </div>
            </div>

            {/* Calendar Modal */}
            {showCalendar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all">
                        <Calendar
                            selectedDate={selectedDate}
                            onDateSelect={onDateSelect}
                            onClickOutside={() => setShowCalendar(false)}
                            datesWithData={datesWithData}
                            variant={variant}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarSection; 