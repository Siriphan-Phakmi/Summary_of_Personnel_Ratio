import { formatThaiDate } from '../../utils/dateUtils';
import { getCurrentShift } from '../../utils/dateHelpers';
import Calendar from '../ui/Calendar';
import Swal from 'sweetalert2';

const CalendarSection = ({
    showCalendar,
    setShowCalendar,
    selectedDate,
    setSelectedDate,
    formData,
    setFormData,
    thaiDate,
    setThaiDate,
    fetchPreviousShiftData,
    handleShiftChange,
    datesWithData,
    checkExistingData,
    setSummaryData
}) => {
    // เพิ่มฟังก์ชันสำหรับล้างข้อมูล
    const handleClearData = async (newDate, isoDate) => {
        const result = await Swal.fire({
            title: 'ล้างข้อมูลเพื่อคำนวณใหม่',
            html: `
                <div class="text-left">
                    <p class="font-semibold mb-2">ข้อมูลที่จะถูกล้าง:</p>
                    <ul class="list-disc pl-5 space-y-1 text-sm">
                        <li>ข้อมูลเจ้าหน้าที่ (Nurse Manager, RN, PN, WC)</li>
                        <li>ข้อมูลการเคลื่อนย้ายผู้ป่วย (New Admit, Transfer In/Out, Refer In/Out, Discharge, Dead)</li>
                        <li>ข้อมูลเตียง (Available, Unavailable, Planned Discharge)</li>
                        <li>Comments</li>
                        <li>ข้อมูลสรุป 24 ชั่วโมง</li>
                        <li>ลายเซ็นผู้ตรวจการและผู้บันทึก</li>
                    </ul>
                    <p class="mt-4 text-sm text-gray-600">*Patient Census และ Overall Data จะถูกคำนวณใหม่</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ล้างข้อมูลและคำนวณใหม่',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0ab4ab',
            cancelButtonColor: '#d33',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            // ล้างข้อมูลในฟอร์ม
            setFormData(prev => {
                const resetWards = {};
                Object.entries(prev.wards).forEach(([ward, data]) => {
                    resetWards[ward] = {
                        ...data,
                        nurseManager: '0',
                        RN: '0',
                        PN: '0',
                        WC: '0',
                        newAdmit: '0',
                        transferIn: '0',
                        referIn: '0',
                        transferOut: '0',
                        referOut: '0',
                        discharge: '0',
                        dead: '0',
                        availableBeds: '0',
                        unavailable: '0',
                        plannedDischarge: '0',
                        comment: ''
                    };
                });

                return {
                    ...prev,
                    date: isoDate,
                    wards: resetWards
                };
            });

            // ล้างข้อมูลสรุปและลายเซ็น
            setSummaryData({
                opdTotal24hr: '',
                existingPatients: '',
                newPatients: '',
                admissions24hr: '',
                supervisorFirstName: '',
                supervisorLastName: '',
                recorderFirstName: '',
                recorderLastName: ''
            });

            setSelectedDate(newDate);
            setThaiDate(formatThaiDate(newDate));
            setShowCalendar(false);

            // ดึงข้อมูล Patient Census จากกะก่อนหน้า
            await fetchPreviousShiftData(isoDate, formData.shift);

            Swal.fire({
                title: 'ล้างข้อมูลสำเร็จ',
                text: 'ระบบได้ล้างข้อมูลและพร้อมสำหรับการคำนวณใหม่',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    return (
        <div className="bg-gradient-to-b from-[#0ab4ab]/10 to-white rounded-lg shadow-lg p-4 mb-4">
            <h1 className="text-lg text-center font-medium text-[#0ab4ab] mb-4 font-THSarabun">
                Daily Patient Census and Staffing
            </h1>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black justify-center">
                    {/* Calendar Button and Date Display */}
                    <div className="flex flex-col md:flex-row items-center gap-2 whitespace-nowrap text-sm justify-center">
                        <div className="flex flex-col md:flex-row gap-2 items-center w-full">
                            <button
                                type="button"
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-THSarabun"
                            >
                                {showCalendar ? 'ซ่อนปฏิทิน' : 'เลือกวันที่'}
                            </button>
                            <div className="text-gray-700 font-medium text-center w-full md:w-auto font-THSarabun">
                                <div>วันที่ปัจจุบัน : {formatThaiDate(new Date())}</div>
                                <div>อัพเดทข้อมูลล่าสุด : {thaiDate}</div>
                            </div>
                        </div>
                    </div>

                    {/* Shift Selection */}
                    <div className="flex gap-4 justify-center">
                        <div className="flex gap-4">
                            {['07:00-19:00', '19:00-07:00'].map((shiftTime) => (
                                <div key={shiftTime} className="flex flex-col items-center md:block">
                                    <span className="text-sm font-medium text-gray-700 mb-1 block md:hidden">
                                        {shiftTime === '07:00-19:00' ? 'เช้า-บ่าย' : 'ดึก'}
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
                                                {shiftTime === '07:00-19:00' ? 'เช้า-บ่าย' : 'ดึก'}{' '}
                                            </span>
                                            ({shiftTime})
                                            {shiftTime === getCurrentShift() && ' (กะปัจจุบัน)'}
                                        </span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Modal */}
            {showCalendar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="relative bg-white rounded-lg">
                        <Calendar
                            selectedDate={selectedDate}
                            datesWithData={datesWithData}
                            onDateSelect={async (date) => {
                                const newDate = new Date(date);
                                newDate.setHours(0, 0, 0, 0);
                                
                                const offset = newDate.getTimezoneOffset();
                                newDate.setMinutes(newDate.getMinutes() - offset);
                                
                                const isoDate = newDate.toISOString().split('T')[0];

                                // ตรวจสอบข้อมูลซ้ำก่อนเปลี่ยนวันที่
                                const hasExistingData = await checkExistingData(isoDate, formData.shift);
                                
                                if (!hasExistingData) {
                                    // ถ้าไม่มีข้อมูลซ้ำ ให้ถามผู้ใช้ว่าต้องการล้างข้อมูลหรือไม่
                                    await handleClearData(newDate, isoDate);
                                }
                            }}
                            onClickOutside={() => setShowCalendar(false)}
                            variant="form"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarSection; 