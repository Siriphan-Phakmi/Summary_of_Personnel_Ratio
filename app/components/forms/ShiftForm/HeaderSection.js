'use client';
import FormDateShiftSelector from '../../forms/WardForm/FormDateShiftSelector';
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
                <div className="grid grid-cols-1 gap-6 text-black justify-center">
                    <FormDateShiftSelector
                        selectedDate={selectedDate}
                        onDateSelect={(date) => {
                            setSelectedDate(date);
                            const isoDate = date.toISOString().split('T')[0];
                            setFormData(prev => ({
                                ...prev,
                                date: isoDate
                            }));
                            setThaiDate(formatThaiDate(date));
                        }}
                        datesWithData={datesWithData}
                        showCalendar={showCalendar}
                        setShowCalendar={setShowCalendar}
                        thaiDate={thaiDate}
                        selectedShift={formData.shift}
                        onShiftChange={(value) => handleShiftChange(value)}
                    />
                </div>
            </div>
        </div>
    );
};