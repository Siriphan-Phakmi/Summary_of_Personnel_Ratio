import { useState, useEffect } from 'react';
import { formatThaiDate } from '../../utils/dateUtils';
import { getCurrentShift } from '../../utils/dateHelpers';
import Calendar from '../ui/Calendar';
import { Swal } from '../../utils/alertService';

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
                        // เก็บค่าเดิมของ Patient Census และ Overall Data
                        numberOfPatients: data.numberOfPatients || '0',
                        overallData: data.overallData || '0',
                        // ล้างข้อมูลอื่นๆ ทั้งหมด
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
                text: 'ระบบได้ล้างข้อมูลและคงค่า Patient Census และ Overall Data ไว้',
                icon: 'success',
                confirmButtonColor: '#0ab4ab'
            });
        }
    };

    return (
        <div className="bg-gradient-to-br from-[#0ab4ab]/5 via-blue-50 to-purple-50 rounded-2xl p-4 mb-3 shadow-lg">
            {/* Header Title */}
            <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2">
                    <img src="/images/BPK.jpg" alt="BPK Logo" className="w-8 h-8 object-contain" />
                    <h1 className="text-xl font-bold bg-gradient-to-r from-[#0ab4ab] to-blue-600 text-transparent bg-clip-text mb-1">
                        Daily Patient Census and Staffing
                    </h1>
                </div>
                <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-[#0ab4ab] to-blue-600 rounded-full"></div>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Calendar Button and Date Display */}
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
                                <div className="text-blue-600">อัพเดทข้อมูลล่าสุด : {thaiDate}</div>
                            </div>
                        </div>
                    </div>

                    {/* Shift Selection */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row justify-center gap-4">
                            {['07:00-19:00', '19:00-07:00'].map((shiftTime) => (
                                <div key={shiftTime} className="flex items-center justify-center">
                                    <label className="relative flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="shift"
                                            value={shiftTime}
                                            checked={formData.shift === shiftTime}
                                            onChange={(e) => handleShiftChange(e.target.value)}
                                            className="hidden"
                                        />
                                        <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                                            formData.shift === shiftTime 
                                            ? 'border-[#0ab4ab] bg-[#0ab4ab]' 
                                            : 'border-gray-300 group-hover:border-[#0ab4ab]/50'
                                        }`}>
                                            {formData.shift === shiftTime && (
                                                <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-0.5"></div>
                                            )}
                                        </div>
                                        <span className={`text-sm transition-colors ${
                                            formData.shift === shiftTime ? 'text-[#0ab4ab] font-medium' : 'text-gray-600'
                                        }`}>
                                            {shiftTime === '07:00-19:00' ? 'เช้า' : 'ดึก'} ({shiftTime})
                                            {shiftTime === formData.shift && (
                                                <span className="ml-1 text-xs px-1.5 py-0.5 bg-[#0ab4ab]/10 text-[#0ab4ab] rounded-full">
                                                    กะที่เลือกก่อนหน้านั้น
                                                </span>
                                            )}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all">
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
                                    // แสดง dialog ยืนยันการล้างข้อมูล
                                    const result = await Swal.fire({
                                        title: 'ยืนยันการเปลี่ยนวันที่',
                                        html: `
                                            <div class="text-left">
                                                <p class="font-semibold mb-2">ข้อมูลต่อไปนี้จะถูกล้าง:</p>
                                                <ul class="list-disc pl-5 space-y-1 text-sm">
                                                    <li>ข้อมูลเจ้าหน้าที่ (Nurse Manager, RN, PN, WC)</li>
                                                    <li>ข้อมูลการเคลื่อนย้ายผู้ป่วย</li>
                                                    <li>ข้อมูลเตียง</li>
                                                    <li>Comments</li>
                                                    <li>ข้อมูลสรุป 24 ชั่วโมง</li>
                                                    <li>ลายเซ็นผู้ตรวจการและผู้บันทึก</li>
                                                </ul>
                                                <p class="mt-4 text-sm text-gray-600">*Patient Census และ Overall Data จะถูกคำนวณใหม่</p>
                                            </div>
                                        `,
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonText: 'ยืนยัน',
                                        cancelButtonText: 'ยกเลิก',
                                        confirmButtonColor: '#0ab4ab',
                                        cancelButtonColor: '#d33',
                                        reverseButtons: true
                                    });

                                    if (result.isConfirmed) {
                                        // 1. ดึงข้อมูล Patient Census และ Overall Data จากกะก่อนหน้า
                                        await fetchPreviousShiftData(isoDate, formData.shift);

                                        // 2. ล้างข้อมูลและอัพเดทด้วยข้อมูลใหม่
                                        setFormData(prev => {
                                            const resetWards = {};
                                            Object.entries(prev.wards).forEach(([ward, data]) => {
                                                resetWards[ward] = {
                                                    // เก็บค่า Patient Census และ Overall Data เดิมไว้
                                                    numberOfPatients: data.numberOfPatients,
                                                    overallData: data.overallData,
                                                    // ล้างข้อมูลอื่นๆ ทั้งหมด
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

                                        // 3. ล้างข้อมูลสรุปและลายเซ็น
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

                                        // แสดงข้อความยืนยันการล้างข้อมูลสำเร็จ
                                        await Swal.fire({
                                            title: 'ล้างข้อมูลสำเร็จ',
                                            text: 'ระบบได้ล้างข้อมูลและคงค่า Patient Census และ Overall Data ไว้',
                                            icon: 'success',
                                            confirmButtonColor: '#0ab4ab'
                                        });
                                    }
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