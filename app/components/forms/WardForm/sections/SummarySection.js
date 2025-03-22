'use client';

import React, { useMemo, useState } from 'react';
import { FaInfoCircle, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaExclamationTriangle, FaUserNurse, FaSave, FaCheck, FaChartLine, FaExternalLinkAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import RatioCalculationUtil from '../../../../utils/RatioCalculationUtil';
import Link from 'next/link';

/**
 * คอมโพเนนต์ SummarySection - แสดงสรุปข้อมูลทั้งหมด
 * @param {Object} props
 * @returns {JSX.Element}
 */
const SummarySection = ({ formData, approvalStatus, isFormFinal, isDarkMode, isReadOnly }) => {
    const [isSaving, setIsSaving] = useState(false);

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy');
        } catch (error) {
            return dateString;
        }
    };
    
    // Dynamic styling based on dark mode
    const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
    const sectionBgColor = isDarkMode ? 'bg-gray-700' : 'bg-gray-50';
    const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const headingColor = isDarkMode ? 'text-gray-200' : 'text-gray-700';
    const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
    
    // Get patient census section data
    const patientCensusSection = formData?.patientCensusSection || {};
    const staffSection = formData?.staffSection || {};
    
    // Get signature data
    const signatureSection = formData?.signatureSection || {};
    
    // Get approval status
    const isApproved = approvalStatus?.isApproved;
    const approvedBy = approvalStatus?.approvedBy || '-';
    const approvedAt = formatDate(approvalStatus?.approvedAt);

    // คำนวณจำนวนพยาบาลทั้งหมด
    const totalRN = useMemo(() => {
        return Object.values(staffSection.rn || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    }, [staffSection.rn]);

    const totalPN = useMemo(() => {
        return Object.values(staffSection.pn || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    }, [staffSection.pn]);

    const totalNA = useMemo(() => {
        return Object.values(staffSection.na || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    }, [staffSection.na]);

    // คำนวณจำนวนผู้ป่วยทั้งหมด
    const totalPatients = useMemo(() => {
        return parseInt(patientCensusSection.total || 0);
    }, [patientCensusSection.total]);

    // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วยโดยใช้ RatioCalculationUtil
    const ratioData = useMemo(() => {
        if (totalPatients === 0) {
            return {
                nurseToPatientRatio: 0,
                overallRatio: 0,
                ratioStatus: 'no_patients',
                recommendations: {
                    message: 'ไม่มีผู้ป่วยในวอร์ด',
                    severity: 'info',
                    actions: ['ไม่จำเป็นต้องดำเนินการใดๆ']
                }
            };
        }

        const calculatedData = RatioCalculationUtil.calculateStaffRatios(
            totalPatients,
            totalRN,
            totalPN,
            totalNA
        );

        const recommendations = RatioCalculationUtil.getRatioRecommendations(
            calculatedData.ratioStatus,
            calculatedData
        );

        return {
            ...calculatedData,
            recommendations,
            // ปัดเศษทศนิยมให้เหลือ 2 ตำแหน่ง
            nurseToPatientRatio: calculatedData.nurseToPatientRatio === Infinity 
                ? 'N/A' 
                : calculatedData.nurseToPatientRatio.toFixed(2),
            overallRatio: calculatedData.totalNursingStaffToPatientRatio === Infinity 
                ? 'N/A' 
                : calculatedData.totalNursingStaffToPatientRatio.toFixed(2)
        };
    }, [totalPatients, totalRN, totalPN, totalNA]);

    // คำนวณอัตราส่วนบุคลากรต่อผู้ป่วย
    const nurseToPatientRatio = useMemo(() => {
        if (totalRN === 0) return 'N/A';
        return (totalPatients / totalRN).toFixed(2);
    }, [totalPatients, totalRN]);

    // คำนวณอัตราส่วนบุคลากรทางการพยาบาลทั้งหมดต่อผู้ป่วย
    const allNursingStaffToPatientRatio = useMemo(() => {
        const totalNursingStaff = totalRN + totalPN + totalNA;
        if (totalNursingStaff === 0) return 'N/A';
        return (totalPatients / totalNursingStaff).toFixed(2);
    }, [totalPatients, totalRN, totalPN, totalNA]);

    // ตรวจสอบความเหมาะสมของอัตราส่วน (ตามมาตรฐานอัตราส่วนพยาบาลต่อผู้ป่วย)
    const ratioStatus = useMemo(() => {
        if (nurseToPatientRatio === 'N/A') return 'unknown';
        
        const ratio = parseFloat(nurseToPatientRatio);
        // มาตรฐานอัตราส่วนพยาบาลต่อผู้ป่วยทั่วไป (อาจปรับเปลี่ยนตามประเภทของวอร์ด)
        if (ratio <= 1.0) return 'optimal'; // ดีมาก (1:1 หรือน้อยกว่า)
        if (ratio <= 4.0) return 'acceptable'; // ยอมรับได้ (1:2 ถึง 1:4)
        if (ratio <= 6.0) return 'warning'; // ต้องระวัง (1:5 ถึง 1:6)
        return 'critical'; // วิกฤต (มากกว่า 1:6)
    }, [nurseToPatientRatio]);
    
    // กำหนดสีและไอคอนตามสถานะของอัตราส่วน
    const getRatioStatusColor = (status) => {
        switch(status) {
            case 'optimal':
                return isDarkMode ? 'text-green-300' : 'text-green-600';
            case 'acceptable':
                return isDarkMode ? 'text-blue-300' : 'text-blue-600';
            case 'warning':
                return isDarkMode ? 'text-yellow-300' : 'text-yellow-600';
            case 'critical':
                return isDarkMode ? 'text-red-300' : 'text-red-600';
            default:
                return isDarkMode ? 'text-gray-300' : 'text-gray-600';
        }
    };

    const getRatioStatusIndicator = (status) => {
        if (status === 'optimal' || status === 'acceptable') {
            return <FaCheck className="inline mr-1" />;
        } else if (status === 'warning' || status === 'critical') {
            return <FaExclamationTriangle className="inline mr-1" />;
        }
        return null;
    };

    // สร้างการแสดงผลสำหรับข้อเสนอแนะ
    const renderRecommendations = () => {
        if (!ratioData || !ratioData.recommendations) return null;
        
        const { recommendations } = ratioData;
        const bgColorClass = recommendations.severity === 'error' 
            ? isDarkMode ? 'bg-red-900/30' : 'bg-red-100' 
            : recommendations.severity === 'warning' 
                ? isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'
                : isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100';
        
        const textColorClass = recommendations.severity === 'error' 
            ? isDarkMode ? 'text-red-300' : 'text-red-700' 
            : recommendations.severity === 'warning' 
                ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                : isDarkMode ? 'text-blue-300' : 'text-blue-700';
        
        return (
            <div className={`mt-4 p-3 rounded-lg ${bgColorClass} ${textColorClass}`}>
                <div className="font-semibold mb-2">
                    {recommendations.severity === 'error' || recommendations.severity === 'warning' 
                        ? <FaExclamationTriangle className="inline mr-1" /> 
                        : null}
                    {recommendations.message}
                </div>
                {recommendations.actions.length > 0 && (
                    <ul className="list-disc list-inside text-sm">
                        {recommendations.actions.map((action, index) => (
                            <li key={index}>{action}</li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    // สร้าง URL สำหรับลิงก์ไปยังหน้ารายงาน
    const reportUrl = useMemo(() => {
        if (!formData?.ward?.id || !formData?.date) return null;
        
        const date = new Date(formData.date);
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        return `/reports?wardId=${formData.ward.id}&type=daily&startDate=${formattedDate}&endDate=${formattedDate}`;
    }, [formData?.ward?.id, formData?.date]);

    return (
        <div className={`p-4 rounded-lg border ${borderColor} ${bgColor} ${textColor}`}>
            <h3 className="text-lg font-medium mb-4">สรุปข้อมูล</h3>
            
            {/* Status Card */}
            <div className={`p-4 mb-6 rounded-lg border ${borderColor} ${sectionBgColor}`}>
                <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium">สถานะแบบฟอร์ม</h4>
                    {isFormFinal ? (
                        isApproved ? (
                            <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full">
                                <FaCheckCircle className="mr-1" />
                                <span>ได้รับการอนุมัติแล้ว</span>
                            </div>
                        ) : (
                            <div className="flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full">
                                <FaHourglassHalf className="mr-1" />
                                <span>รอการอนุมัติ</span>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                            <FaInfoCircle className="mr-1" />
                            <span>แบบร่าง</span>
                        </div>
                    )}
                </div>
                
                {isFormFinal && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className={`text-sm ${labelColor}`}>ส่งโดย:</p>
                            <p className="font-medium">{signatureSection.name || '-'}</p>
                        </div>
                        <div>
                            <p className={`text-sm ${labelColor}`}>เวลาส่ง:</p>
                            <p className="font-medium">{formatDate(formData?.updatedAt)}</p>
                        </div>
                        {isApproved && (
                            <>
                                <div>
                                    <p className={`text-sm ${labelColor}`}>อนุมัติโดย:</p>
                                    <p className="font-medium">{approvedBy}</p>
                                </div>
                                <div>
                                    <p className={`text-sm ${labelColor}`}>เวลาอนุมัติ:</p>
                                    <p className="font-medium">{approvedAt}</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {/* Patient Census Summary */}
            <div className="mb-6">
                <h4 className={`text-md font-medium mb-2 ${headingColor}`}>สรุปข้อมูลผู้ป่วย</h4>
                <div className={`p-4 rounded-lg border ${borderColor} ${sectionBgColor}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className={`text-sm ${labelColor}`}>จำนวนผู้ป่วยทั้งหมด:</p>
                            <p className="font-bold text-lg">{patientCensusSection.hospitalPatientCensus || '0'}</p>
                        </div>
                        <div>
                            <p className={`text-sm ${labelColor}`}>รับใหม่:</p>
                            <p className="font-medium">{patientCensusSection.newAdmit || '0'}</p>
                        </div>
                        <div>
                            <p className={`text-sm ${labelColor}`}>จำหน่าย:</p>
                            <p className="font-medium">{patientCensusSection.discharge || '0'}</p>
                        </div>
                        <div>
                            <p className={`text-sm ${labelColor}`}>รวมทั้งสิ้น:</p>
                            <p className="font-bold text-lg">{patientCensusSection.total || '0'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Staff to Patient Ratio Analysis */}
            <div className="mb-6">
                <h4 className={`text-md font-medium mb-2 ${headingColor}`}>การวิเคราะห์อัตราส่วนบุคลากรต่อผู้ป่วย</h4>
                <div className={`p-4 rounded-lg border ${borderColor} ${sectionBgColor}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className={`text-sm ${labelColor}`}>อัตราส่วนพยาบาล RN ต่อผู้ป่วย:</p>
                            <div className="flex items-center">
                                <p className="font-bold text-lg">1:{nurseToPatientRatio}</p>
                                {ratioStatus === 'optimal' && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">เหมาะสม</span>
                                )}
                                {ratioStatus === 'acceptable' && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">ยอมรับได้</span>
                                )}
                                {ratioStatus === 'warning' && (
                                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">ควรระวัง</span>
                                )}
                                {ratioStatus === 'critical' && (
                                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">วิกฤต</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className={`text-sm ${labelColor}`}>อัตราส่วนบุคลากรพยาบาลทั้งหมดต่อผู้ป่วย:</p>
                            <p className="font-bold text-lg">1:{allNursingStaffToPatientRatio}</p>
                        </div>
                    </div>

                    {/* Ratio Warning Display */}
                    {ratioStatus === 'warning' && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
                            <FaExclamationTriangle className="text-yellow-500 mt-1 mr-2 flex-shrink-0" />
                            <div>
                                <p className="text-yellow-800 font-medium">คำเตือน - อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับที่ควรระวัง</p>
                                <p className="text-yellow-700 text-sm mt-1">พิจารณาเพิ่มจำนวนพยาบาลหรือจัดสรรบุคลากรเพิ่มเติมในกะถัดไป</p>
                            </div>
                        </div>
                    )}

                    {ratioStatus === 'critical' && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                            <FaExclamationTriangle className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                            <div>
                                <p className="text-red-800 font-medium">คำเตือน - อัตราส่วนพยาบาลต่อผู้ป่วยวิกฤต</p>
                                <p className="text-red-700 text-sm mt-1">จำเป็นต้องเพิ่มจำนวนพยาบาลโดยเร่งด่วน อาจส่งผลต่อคุณภาพการดูแลผู้ป่วย</p>
                                <p className="text-red-700 text-sm mt-1">แจ้งหัวหน้าพยาบาลหรือผู้บริหารเพื่อขอบุคลากรเพิ่มเติม</p>
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    <div className="mt-4">
                        <p className={`text-sm font-medium ${headingColor}`}>คำแนะนำในการจัดการบุคลากร:</p>
                        {renderRecommendations()}
                    </div>
                </div>
            </div>
            
            {/* Staff Summary */}
            <div className="mb-6">
                <h4 className={`text-md font-medium mb-2 ${headingColor}`}>สรุปข้อมูลบุคลากร</h4>
                <div className={`p-4 rounded-lg border ${borderColor} ${sectionBgColor}`}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className={`text-sm ${labelColor}`}>RN:</p>
                            <p className="font-medium">{totalRN}</p>
                        </div>
                        <div>
                            <p className={`text-sm ${labelColor}`}>PN:</p>
                            <p className="font-medium">{totalPN}</p>
                        </div>
                        <div>
                            <p className={`text-sm ${labelColor}`}>NA:</p>
                            <p className="font-medium">{totalNA}</p>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <p className={`text-sm ${labelColor}`}>หัวหน้าเวร:</p>
                        <p className="font-medium">{staffSection.headNurseName || '-'}</p>
                    </div>
                </div>
            </div>
            
            {/* Signature Summary */}
            {signatureSection.name && (
                <div>
                    <h4 className={`text-md font-medium mb-2 ${headingColor}`}>ลงนามโดย</h4>
                    <div className={`p-4 rounded-lg border ${borderColor} ${sectionBgColor}`}>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                            <div>
                                <p className="font-medium">{signatureSection.name}</p>
                                <p className={`text-sm ${labelColor}`}>{signatureSection.position}</p>
                            </div>
                            
                            {signatureSection.signature && (
                                <div className="mt-3 md:mt-0">
                                    <img 
                                        src={signatureSection.signature} 
                                        alt="ลายเซ็น" 
                                        className="h-16 object-contain"
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-3">
                            <p className={`text-sm ${labelColor}`}>วันที่บันทึก:</p>
                            <p className="font-medium">{formatDate(formData?.updatedAt)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ลิงก์ไปยังหน้ารายงาน */}
            {reportUrl && (
                <Link href={reportUrl} className={`mt-4 px-4 py-2 rounded-md font-medium flex items-center ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                    <FaChartLine className="mr-2" />
                    <span>ดูรายงานวิเคราะห์เพิ่มเติม</span>
                    <FaExternalLinkAlt className="ml-2 text-sm" />
                </Link>
            )}

            {!isReadOnly && (
                <div className="mt-5 flex justify-end">
                    <button 
                        className={`px-4 py-2 rounded-lg flex items-center ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                        onClick={() => {
                            setIsSaving(true);
                            setTimeout(() => setIsSaving(false), 1500);
                        }}
                        disabled={isSaving}
                    >
                        <FaSave className="mr-2" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SummarySection;