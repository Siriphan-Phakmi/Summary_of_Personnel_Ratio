'use client';

import React, { useMemo } from 'react';
import { FaInfoCircle, FaExclamationTriangle, FaUserNurse } from 'react-icons/fa';
import RatioCalculationUtil from '../../../../utils/RatioCalculationUtil';

/**
 * คอมโพเนนต์ StaffSection - แสดงข้อมูลบุคลากร
 * @param {Object} props
 * @returns {JSX.Element}
 */
const StaffSection = ({ formData, handleInputChange, isReadOnly, isDarkMode }) => {
    // Get the staffSection data or default to empty object
    const staffSection = formData?.staffSection || {};
    
    // Define staff types
    const staffTypes = [
        { id: 'nurseManager', label: 'Nurse Manager' },
        { id: 'rn', label: 'RN' },
        { id: 'pn', label: 'PN' },
        { id: 'na', label: 'NA' },
        { id: 'wardClerk', label: 'Ward Clerk' },
        { id: 'others', label: 'Others' }
    ];
    
    // Define shifts
    const shifts = [
        { id: 'morning', label: 'เช้า' },
        { id: 'afternoon', label: 'บ่าย' },
        { id: 'night', label: 'ดึก' },
        { id: 'dayShift', label: 'เวรเช้า-บ่าย' },
        { id: 'nightShift', label: 'เวรดึก' }
    ];
    
    // Dynamic styling based on dark mode
    const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
    const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
    const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
    const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const tableBgColor = isDarkMode ? 'bg-gray-700' : 'bg-gray-50';
    const tableBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-200';
    const tableHeaderBgColor = isDarkMode ? 'bg-gray-800' : 'bg-blue-50';
    
    // Helper function to get the value for a staff type and shift
    const getStaffValue = (staffType, shift) => {
        if (!staffSection[staffType] || !staffSection[staffType][shift]) {
            return '';
        }
        return staffSection[staffType][shift];
    };
    
    // Helper function to render tooltip
    const renderTooltip = (text) => (
        <div className="group relative inline-block">
            <FaInfoCircle className={`inline-block ml-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} cursor-help`} />
            <div className="absolute z-10 w-48 p-2 mt-1 text-sm rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 left-full transform -translate-x-1/2 bottom-full mb-1
                 shadow-lg bg-gray-900 text-white">
                {text}
            </div>
        </div>
    );
    
    // คำนวณจำนวนพยาบาลแต่ละประเภท
    const nurseCounts = useMemo(() => {
        const staffData = formData.staff || {};
        
        // รวมจำนวนพยาบาล RN จากทุกกะ
        const totalRN = 
            (parseInt(staffData.headNurseMorning || 0) || 0) +
            (parseInt(staffData.headNurseAfternoon || 0) || 0) +
            (parseInt(staffData.headNurseNight || 0) || 0) +
            (parseInt(staffData.rnMorning || 0) || 0) +
            (parseInt(staffData.rnAfternoon || 0) || 0) +
            (parseInt(staffData.rnNight || 0) || 0);
        
        // รวมจำนวนพยาบาล PN จากทุกกะ
        const totalPN = 
            (parseInt(staffData.pnMorning || 0) || 0) +
            (parseInt(staffData.pnAfternoon || 0) || 0) +
            (parseInt(staffData.pnNight || 0) || 0);
        
        // รวมจำนวนผู้ช่วยพยาบาล (NA) จากทุกกะ
        const totalNA = 
            (parseInt(staffData.naMorning || 0) || 0) +
            (parseInt(staffData.naAfternoon || 0) || 0) +
            (parseInt(staffData.naNight || 0) || 0);
        
        // รวมจำนวนเจ้าหน้าที่อื่นๆ
        const totalOthers = 
            (parseInt(staffData.wardClerkMorning || 0) || 0) +
            (parseInt(staffData.wardClerkAfternoon || 0) || 0) +
            (parseInt(staffData.wardClerkNight || 0) || 0) +
            (parseInt(staffData.othersMorning || 0) || 0) +
            (parseInt(staffData.othersAfternoon || 0) || 0) +
            (parseInt(staffData.othersNight || 0) || 0);
    
        return { totalRN, totalPN, totalNA, totalOthers };
    }, [formData.staff]);

    // คำนวณจำนวนผู้ป่วยทั้งหมด
    const totalPatients = useMemo(() => {
        const census = formData.patientCensus || {};
        return parseInt(census.totalPatients || 0) || 0;
    }, [formData.patientCensus]);

    // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยโดยใช้ RatioCalculationUtil
    const ratioData = useMemo(() => {
        const calculatedData = RatioCalculationUtil.calculateStaffRatios(
            totalPatients,
            nurseCounts.totalRN,
            nurseCounts.totalPN,
            nurseCounts.totalNA
        );

        return {
            ...calculatedData,
            // ปัดเศษทศนิยมให้เหลือ 2 ตำแหน่ง
            nurseToPatientRatio: calculatedData.nurseToPatientRatio === Infinity 
                ? 'N/A' 
                : calculatedData.nurseToPatientRatio.toFixed(2),
            overallRatio: calculatedData.totalNursingStaffToPatientRatio === Infinity 
                ? 'N/A' 
                : calculatedData.totalNursingStaffToPatientRatio.toFixed(2)
        };
    }, [totalPatients, nurseCounts]);

    // ฟังก์ชันการจัดการการเปลี่ยนแปลงข้อมูล
    const handleChange = (e) => {
        const { name, value } = e.target;
        // แปลงค่าเป็นตัวเลขถ้าเป็นไปได้
        const numericValue = value === '' ? '' : isNaN(value) ? value : value;
        handleInputChange('staff', name, numericValue);
    };

    // กำหนดสีตามสถานะอัตราส่วน
    const getRatioStatusColor = (status) => {
        switch(status) {
            case 'optimal':
                return 'text-green-300 bg-green-900/30';
            case 'acceptable':
                return 'text-blue-300 bg-blue-900/30';
            case 'warning':
                return 'text-yellow-300 bg-yellow-900/30';
            case 'critical':
                return 'text-red-300 bg-red-900/30';
            default:
                return '';
        }
    };

    // ฟังก์ชันสร้าง input field พร้อม label
    const renderStaffInput = (label, morning, afternoon, night, isDisabled = false) => (
        <tr className={`border-b ${tableBorderColor} ${tableRowBg}`}>
            <td className="p-2 font-medium">{label}</td>
            <td className="p-2">
                <input
                    type="number"
                    name={`${morning}`}
                    value={formData.staff?.[morning] || ''}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${inputBgColor} ${textColor} ${borderColor} ${placeholderColor}`}
                    placeholder="0"
                    min="0"
                    disabled={isReadOnly || isDisabled}
                />
            </td>
            <td className="p-2">
                <input
                    type="number"
                    name={`${afternoon}`}
                    value={formData.staff?.[afternoon] || ''}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${inputBgColor} ${textColor} ${borderColor} ${placeholderColor}`}
                    placeholder="0"
                    min="0"
                    disabled={isReadOnly || isDisabled}
                />
            </td>
            <td className="p-2">
                <input
                    type="number"
                    name={`${night}`}
                    value={formData.staff?.[night] || ''}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${inputBgColor} ${textColor} ${borderColor} ${placeholderColor}`}
                    placeholder="0"
                    min="0"
                    disabled={isReadOnly || isDisabled}
                />
            </td>
            <td className="p-2 text-center">
                {(parseInt(formData.staff?.[morning] || 0) || 0) +
                 (parseInt(formData.staff?.[afternoon] || 0) || 0) +
                 (parseInt(formData.staff?.[night] || 0) || 0)}
            </td>
        </tr>
    );

    return (
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${bgColor} ${textColor}`}>
            <h3 className="text-lg font-medium mb-4">ข้อมูลบุคลากร</h3>
            
            {/* Real-time Ratio Display */}
            <div className={`p-3 mb-6 rounded-lg ${getRatioStatusColor(ratioData.ratioStatus)}`}>
                <div className="flex items-center mb-2">
                    <FaUserNurse className="mr-2 text-lg" />
                    <h3 className="text-lg font-semibold">อัตราส่วนบุคลากรต่อผู้ป่วย (Real-time)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="font-medium">อัตราส่วนพยาบาล (RN+PN) ต่อผู้ป่วย:</div>
                        <div className="text-xl font-bold">
                            1:{ratioData.nurseToPatientRatio}
                            <span className="text-sm ml-2">
                                ({nurseCounts.totalRN + nurseCounts.totalPN} คน : {totalPatients} คน)
                            </span>
                        </div>
                    </div>
                    <div>
                        <div className="font-medium">บุคลากรทางการพยาบาลทั้งหมดต่อผู้ป่วย:</div>
                        <div className="text-xl font-bold">
                            1:{ratioData.overallRatio}
                            <span className="text-sm ml-2">
                                ({nurseCounts.totalRN + nurseCounts.totalPN + nurseCounts.totalNA} คน : {totalPatients} คน)
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* ข้อความแจ้งเตือนตามสถานะ */}
                {ratioData.ratioStatus === 'warning' && (
                    <div className="mt-2 flex items-start">
                        <FaExclamationTriangle className="text-lg mr-2 mt-1 flex-shrink-0" />
                        <div>
                            <p className="font-medium">คำเตือน: อัตราส่วนอยู่ในระดับที่ต้องเฝ้าระวัง</p>
                            <p className="text-sm">ควรพิจารณาเพิ่มจำนวนพยาบาลหรือจัดสรรบุคลากรให้เหมาะสมกับภาระงาน</p>
                        </div>
                    </div>
                )}
                
                {ratioData.ratioStatus === 'critical' && (
                    <div className="mt-2 flex items-start">
                        <FaExclamationTriangle className="text-lg mr-2 mt-1 flex-shrink-0" />
                        <div>
                            <p className="font-medium">คำเตือน: อัตราส่วนอยู่ในระดับวิกฤต!</p>
                            <p className="text-sm">ควรเพิ่มบุคลากรโดยด่วนหรือลดจำนวนผู้ป่วยที่รับผิดชอบ เพื่อความปลอดภัยของผู้ป่วย</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ตารางข้อมูลเจ้าหน้าที่ */}
            <div className="overflow-x-auto">
                <table className={`min-w-full border ${tableBorderColor}`}>
                    <thead className={tableHeaderBg}>
                        <tr>
                            <th className="p-2 border-b text-left">ประเภท</th>
                            <th className="p-2 border-b text-center">เช้า</th>
                            <th className="p-2 border-b text-center">บ่าย</th>
                            <th className="p-2 border-b text-center">ดึก</th>
                            <th className="p-2 border-b text-center">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderStaffInput('หัวหน้าพยาบาล', 'headNurseMorning', 'headNurseAfternoon', 'headNurseNight')}
                        {renderStaffInput('พยาบาลวิชาชีพ (RN)', 'rnMorning', 'rnAfternoon', 'rnNight')}
                        {renderStaffInput('พยาบาลเทคนิค (PN)', 'pnMorning', 'pnAfternoon', 'pnNight')}
                        {renderStaffInput('ผู้ช่วยพยาบาล (NA)', 'naMorning', 'naAfternoon', 'naNight')}
                        {renderStaffInput('เจ้าหน้าที่เวชระเบียน', 'wardClerkMorning', 'wardClerkAfternoon', 'wardClerkNight')}
                        {renderStaffInput('อื่นๆ', 'othersMorning', 'othersAfternoon', 'othersNight')}
                    </tbody>
                    <tfoot className={`${tableHeaderBg} font-semibold`}>
                        <tr>
                            <td className="p-2 border-t">รวมทั้งหมด</td>
                            <td className="p-2 border-t text-center">
                                {(parseInt(formData.staff?.headNurseMorning || 0) || 0) +
                                 (parseInt(formData.staff?.rnMorning || 0) || 0) +
                                 (parseInt(formData.staff?.pnMorning || 0) || 0) +
                                 (parseInt(formData.staff?.naMorning || 0) || 0) +
                                 (parseInt(formData.staff?.wardClerkMorning || 0) || 0) +
                                 (parseInt(formData.staff?.othersMorning || 0) || 0)}
                            </td>
                            <td className="p-2 border-t text-center">
                                {(parseInt(formData.staff?.headNurseAfternoon || 0) || 0) +
                                 (parseInt(formData.staff?.rnAfternoon || 0) || 0) +
                                 (parseInt(formData.staff?.pnAfternoon || 0) || 0) +
                                 (parseInt(formData.staff?.naAfternoon || 0) || 0) +
                                 (parseInt(formData.staff?.wardClerkAfternoon || 0) || 0) +
                                 (parseInt(formData.staff?.othersAfternoon || 0) || 0)}
                            </td>
                            <td className="p-2 border-t text-center">
                                {(parseInt(formData.staff?.headNurseNight || 0) || 0) +
                                 (parseInt(formData.staff?.rnNight || 0) || 0) +
                                 (parseInt(formData.staff?.pnNight || 0) || 0) +
                                 (parseInt(formData.staff?.naNight || 0) || 0) +
                                 (parseInt(formData.staff?.wardClerkNight || 0) || 0) +
                                 (parseInt(formData.staff?.othersNight || 0) || 0)}
                            </td>
                            <td className="p-2 border-t text-center">
                                {nurseCounts.totalRN + nurseCounts.totalPN + nurseCounts.totalNA + nurseCounts.totalOthers}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* ข้อมูลเพิ่มเติมเกี่ยวกับการตรวจเวร */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">การตรวจเวร</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2 font-medium">หัวหน้าเวร (Nurse Manager)</label>
                        <input
                            type="text"
                            name="nurseManager"
                            value={formData.staff?.nurseManager || ''}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded-md ${inputBgColor} ${textColor} ${borderColor} ${placeholderColor}`}
                            placeholder="ชื่อหัวหน้าเวร"
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 font-medium">Ward Clerk</label>
                        <input
                            type="text"
                            name="wardClerkName"
                            value={formData.staff?.wardClerkName || ''}
                            onChange={handleChange}
                            className={`w-full p-2 border rounded-md ${inputBgColor} ${textColor} ${borderColor} ${placeholderColor}`}
                            placeholder="ชื่อ Ward Clerk"
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                
                <div className="mt-4">
                    <label className="block mb-2 font-medium">หัวหน้าตรวจเวร</label>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center">
                            <input
                                type="radio"
                                name="nurseCheck"
                                value="yes"
                                checked={formData.staff?.nurseCheck === 'yes'}
                                onChange={handleChange}
                                className="mr-2"
                                disabled={isReadOnly}
                            />
                            <label>มาตรวจเวรแล้ว</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="radio"
                                name="nurseCheck"
                                value="no"
                                checked={formData.staff?.nurseCheck === 'no'}
                                onChange={handleChange}
                                className="mr-2"
                                disabled={isReadOnly}
                            />
                            <label>ยังไม่มาตรวจเวร</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="radio"
                                name="nurseCheck"
                                value="na"
                                checked={formData.staff?.nurseCheck === 'na'}
                                onChange={handleChange}
                                className="mr-2"
                                disabled={isReadOnly}
                            />
                            <label>ไม่เกี่ยวข้อง</label>
                        </div>
                    </div>
                </div>
            </div>

            {/* คำแนะนำเพิ่มเติม */}
            <div className={`mt-6 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <div className="flex">
                    <FaInfoCircle className={`mt-1 mr-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-500'}`} />
                    <div>
                        <h4 className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>คำแนะนำ</h4>
                        <p className="text-sm mt-1">กรอกจำนวนบุคลากรในแต่ละประเภทและแต่ละกะให้ครบถ้วน เพื่อการคำนวณอัตราส่วนที่ถูกต้อง และการวางแผนจัดสรรกำลังคนที่เหมาะสม</p>
                    </div>
                </div>
            </div>
            
            {/* การแสดงผลค่าแนะนำตามมาตรฐาน */}
            {totalPatients > 0 && (
                <div className={`mt-6 p-3 rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                    <h4 className={`font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                        จำนวนบุคลากรที่แนะนำตามมาตรฐาน
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        <div>
                            <span className="font-medium">RN:</span> {ratioData.recommendedRN} คน
                            {ratioData.additionalRNNeeded > 0 && (
                                <span className={`text-sm ml-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                                    (ขาด {ratioData.additionalRNNeeded})
                                </span>
                            )}
                        </div>
                        <div>
                            <span className="font-medium">PN:</span> {ratioData.recommendedPN} คน
                            {ratioData.additionalPNNeeded > 0 && (
                                <span className={`text-sm ml-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                                    (ขาด {ratioData.additionalPNNeeded})
                                </span>
                            )}
                        </div>
                        <div>
                            <span className="font-medium">NA:</span> {ratioData.recommendedNA} คน
                            {ratioData.additionalNANeeded > 0 && (
                                <span className={`text-sm ml-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                                    (ขาด {ratioData.additionalNANeeded})
                                </span>
                            )}
                        </div>
                        <div>
                            <span className="font-medium">รวม:</span> {ratioData.recommendedTotal} คน
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffSection; 