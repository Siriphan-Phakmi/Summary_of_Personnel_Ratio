'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import 'react-datepicker/dist/react-datepicker.css';
import Calendar from '../ui/Calendar';
import React from 'react';
import CensusOverview from './CensusOverview';
import Staff from './Staff';
import PatientMovement from './PatientMovement';
import AdditionalInformation from './AdditionalInformation';

//คือส่วนของฟอร์มที่ใช้ในการกรอกข้อมูลของแต่ละวอร์ด
const ShiftForm = () => {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [datesWithData, setDatesWithData] = useState([]);
    const [thaiDate, setThaiDate] = useState('');
    const [summaryData, setSummaryData] = useState({
        opdTotal24hr: '', //ยอด OPD 24 hour - รวมผู้ป่วยนอกใน 24 ชั่วโมง
        existingPatients: '', // คนไข้เก่า - จำนวนผู้ป่วยที่รักษาต่อเนื่อง
        newPatients: '', // คนไข้ใหม่ - จำนวนผู้ป่วยที่มารับการรักษาครั้งแรก
        admissions24hr: '',// Admit 24 ชม. - จำนวนผู้ป่วยที่รับไว้ใน 24 ชั่วโมง
        // แยกฟิลด์ชื่อและนามสกุลของ Supervisor
        supervisorFirstName: '',
        supervisorLastName: '',
        // เพิ่มฟิลด์สำหรับผู้บันทึก
        recorderFirstName: '',
        recorderLastName: ''
    });

    // เพิ่มฟิลด์ใหม่ในส่วนของ ward data
    const initialWardData = {
        numberOfPatients: '0',
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
        overallData: '0',
        availableBeds: '0',
        plannedDischarge: '0',
        unavailable: '0',
        comment: '',
    };

    // ปรับปรุง formData state
    const [formData, setFormData] = useState({
        date: '',
        shift: '',
        wards: {
            Ward6: { ...initialWardData },
            Ward7: { ...initialWardData },
            Ward8: { ...initialWardData },
            Ward9: { ...initialWardData },
            WardGI: { ...initialWardData },
            Ward10B: { ...initialWardData },
            Ward11: { ...initialWardData },
            Ward12: { ...initialWardData },
            ICU: { ...initialWardData },
            CCU: { ...initialWardData },
            LR: { ...initialWardData },
            NSY: { ...initialWardData }
        },
        totals: { ...initialWardData }
    });

    const [showDataComparison, setShowDataComparison] = useState(false);
    const [existingData, setExistingData] = useState(null);

    // เพิ่ม state สำหรับจัดการ loading states
    const [loadingStates, setLoadingStates] = useState({
        initialLoading: true,
        savingData: false,
        checkingDuplicates: false,
        fetchingDates: false
    });

    const [loadingMessage, setLoadingMessage] = useState('');

    // เพิ่มค่าคงที่สำหรับลำดับ Ward ที่ถูกต้อง
    const WARD_ORDER = [
        'Ward6',
        'Ward7',
        'Ward8',
        'Ward9',
        'WardGI',
        'Ward10B',
        'Ward11',
        'Ward12',
        'ICU',
        'CCU',
        'LR',
        'NSY'
    ];

    // ฟังก์ชันสำหรับแปลงวันที่เป็นรูปแบบไทย
    const formatThaiDate = (date) => {
        if (!date) {
            return 'คุณยังไม่ได้เลือกวันที่เพื่อเพิ่มข้อมูล';
        }
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const day = dateObj.getDate();
        const month = thaiMonths[dateObj.getMonth()];
        const year = dateObj.getFullYear() + 543;
        return `เพิ่มข้อมูล วันที่: ${day} ${month} ${year}`;
    };

    // เพิ่ม Initial Loading Effect
    useEffect(() => {
        setTimeout(() => {
            setIsInitialLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const today = new Date();
            setSelectedDate(today);
            const isoDate = today.toISOString().split('T')[0];
            setFormData(prev => ({ 
                ...prev, 
                date: isoDate,
                shift: '' // Remove default shift selection
            }));
            setThaiDate(formatThaiDate(today));
            
            // เรียกใช้ฟังก์ชันดึงข้อมูลล่าสุดเมื่อโหลดแอพ
            fetchLatestData();
        }
    }, []);

    const handleDateChange = async (element) => {
        const newDate = element.target.value;
        if (!newDate) {
            setSelectedDate(new Date());
            setFormData(prev => ({ ...prev, date: '' }));
            setThaiDate('คุณยังไม่ได้เลือกวันที่เพื่อเพิ่มข้อมูล');
            return;
        }
        const dateObj = new Date(newDate);
        setSelectedDate(dateObj);
        setFormData(prev => ({ ...prev, date: newDate }));
        setThaiDate(formatThaiDate(dateObj));
    };

    // เพิ่มฟังก์ชันคำนวณ totals
    const calculateTotals = useMemo(() => {
        return Object.values(formData.wards).reduce((totals, ward) => ({
            numberOfPatients: totals.numberOfPatients + (Number(ward.numberOfPatients) || 0),
            nurseManager: totals.nurseManager + (Number(ward.nurseManager) || 0),
            RN: totals.RN + (Number(ward.RN) || 0),
            PN: totals.PN + (Number(ward.PN) || 0),
            WC: totals.WC + (Number(ward.WC) || 0),
            newAdmit: totals.newAdmit + (Number(ward.newAdmit) || 0),
            transferIn: totals.transferIn + (Number(ward.transferIn) || 0),
            referIn: totals.referIn + (Number(ward.referIn) || 0),
            transferOut: totals.transferOut + (Number(ward.transferOut) || 0),
            referOut: totals.referOut + (Number(ward.referOut) || 0),
            discharge: totals.discharge + (Number(ward.discharge) || 0),
            dead: totals.dead + (Number(ward.dead) || 0),
            overallData: totals.overallData + (Number(ward.overallData) || 0),
            availableBeds: totals.availableBeds + (Number(ward.availableBeds) || 0),
            unavailable: totals.unavailable + (Number(ward.unavailable) || 0),
            plannedDischarge: totals.plannedDischarge + (Number(ward.plannedDischarge) || 0)
        }), {
            numberOfPatients: 0,
            nurseManager: 0,
            RN: 0,
            PN: 0,
            WC: 0,
            newAdmit: 0,
            transferIn: 0,
            referIn: 0,
            transferOut: 0,
            referOut: 0,
            discharge: 0,
            dead: 0,
            overallData: 0,
            availableBeds: 0,
            unavailable: 0,
            plannedDischarge: 0
        });
    }, [formData.wards]);

    // Add useEffect for automatic total calculation
    useEffect(() => {
        setFormData(prev => ({ ...prev, totals: calculateTotals }));
    }, [calculateTotals]);

    // เพิ่มฟังก์ชันตรวจสอบความสัมพันธ์ของจำนวนเตียง
    const validateBedCapacity = (wardData) => {
        return []; // ยังไม่มีการตรวจสอบเงื่อนไขเตียง
    };

    // Memoize handleInputChange
    const handleInputChange = useCallback((section, ward, data) => {
        // Sanitize input values
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => {
                if (key === 'comment') return [key, value];
                if (value === '') return [key, '0'];
                const numValue = parseInt(value) || 0;
                return [key, Math.max(0, numValue).toString()];
            })
        );

        setFormData(prev => {
            const currentWardData = prev.wards[ward];
            
            // Calculate overallData with validation
            const overallData = Math.max(0,
                (parseInt(currentWardData.numberOfPatients) || 0) +
                (parseInt(sanitizedData.newAdmit || currentWardData.newAdmit) || 0) +
                (parseInt(sanitizedData.transferIn || currentWardData.transferIn) || 0) +
                (parseInt(sanitizedData.referIn || currentWardData.referIn) || 0) -
                (parseInt(sanitizedData.transferOut || currentWardData.transferOut) || 0) -
                (parseInt(sanitizedData.referOut || currentWardData.referOut) || 0) -
                (parseInt(sanitizedData.discharge || currentWardData.discharge) || 0) -
                (parseInt(sanitizedData.dead || currentWardData.dead) || 0)
            );

            return {
                ...prev,
                wards: {
                    ...prev.wards,
                    [ward]: {
                        ...prev.wards[ward],
                        ...sanitizedData,
                        overallData: overallData.toString(),
                        isReadOnly: false
                    }
                }
            };
        });
    }, []); // Remove formData.wards dependency

    // Add new function to display values
    const displayValue = (value) => {
        return value === undefined || value === null || value === '' ? '0' : value;
    };

    // เพิ่มฟังก์ชันตรวจสอบวันที่
    const isCurrentDate = () => {
        if (!formData.date) return false;
        const selected = new Date(formData.date);
        const today = new Date();
        
        // Reset time to midnight for accurate date comparison
        selected.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        return selected.getTime() === today.getTime();
    };

    const isPastDate = () => {
        if (!formData.date) return false;
        const selected = new Date(formData.date);
        const today = new Date();
        
        // Reset time to midnight for accurate date comparison
        selected.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // Allow saving data for current date and future dates (within 1 day)
        return selected < today;
    };

    const isFutureDateMoreThanOneDay = () => {
        if (!formData.date) return false;
        const selected = new Date(formData.date);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Reset time to midnight for accurate date comparison
        selected.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        
        return selected > tomorrow;
    };

    // Move hasWardData function here, before validateFormData
    const hasWardData = useCallback(() => {
        return Object.values(formData.wards).some(ward =>
            Object.entries(ward).some(([key, value]) =>
                key !== 'comment' && value !== '' && value !== '0'
            )
        );
    }, [formData.wards]);

    // เพิ่มฟังก์ชันตรวจสอบการเปลี่ยนแปลงข้อมูล
    const hasDataChanges = useCallback(() => {
        let changes = {
            staff: false,
            movement: false,
            additional: false
        };

        Object.values(formData.wards).forEach(ward => {
            // ตรวจสอบการเปลี่ยนแปลงข้อมูล Staff
            if (ward.nurseManager !== '0' || ward.RN !== '0' || ward.PN !== '0' || ward.WC !== '0') {
                changes.staff = true;
            }
            // ตรวจสอบการเปลี่ยนแปลงข้อมูล Patient Movement
            if (ward.newAdmit !== '0' || ward.transferIn !== '0' || ward.referIn !== '0' || 
                ward.transferOut !== '0' || ward.referOut !== '0' || ward.discharge !== '0' || ward.dead !== '0') {
                changes.movement = true;
            }
            // ตรวจสอบการเปลี่ยนแปลงข้อมูล Additional Information
            if (ward.availableBeds !== '0' || ward.unavailable !== '0' || ward.plannedDischarge !== '0' || ward.comment.trim() !== '') {
                changes.additional = true;
            }
        });

        return changes;
    }, [formData.wards]);

    // แก้ไข validateFormData
    const validateFormData = useCallback(() => {
        console.log('Validating form data...', formData);
        
        // ตรวจสอบการเปลี่ยนแปลงข้อมูล
        const changes = hasDataChanges();
        if (!changes.staff && !changes.movement && !changes.additional) {
            const confirmNoChanges = window.confirm(
                'คุณยังไม่ได้กรอกข้อมูลเพิ่มเติมในส่วนใดๆ\n\n' +
                'กรุณาตรวจสอบและกรอกข้อมูลในส่วนต่างๆ:\n' +
                '- ข้อมูลเจ้าหน้าที่ (Staff)\n' +
                '- ข้อมูลการเคลื่อนย้ายผู้ป่วย (Patient Movement)\n' +
                '- ข้อมูลเพิ่มเติม (Additional Information)\n\n' +
                'ต้องการดำเนินการต่อหรือไม่?'
            );
            if (!confirmNoChanges) {
                return false;
            }
        }

        const validationChecks = [
            {
                condition: !formData.date || formData.date.trim() === '',
                message: 'กรุณาเลือกวันที่ก่อนดำเนินการต่อ'
            },
            {
                condition: !formData.shift || formData.shift.trim() === '',
                message: 'กรุณาเลือกกะการทำงาน'
            },
            {
                condition: isFutureDateMoreThanOneDay(),
                message: 'ไม่สามารถบันทึกข้อมูลล่วงหน้าเกิน 1 วันได้'
            },
            {
                condition: !summaryData.recorderFirstName?.trim() || !summaryData.recorderLastName?.trim(),
                message: 'กรุณากรอกชื่อและนามสกุลผู้บันทึกข้อมูล'
            },
            {
                condition: !summaryData.supervisorFirstName?.trim() || !summaryData.supervisorLastName?.trim(),
                message: 'กรุณากรอกชื่อและนามสกุลผู้ตรวจการ'
            }
        ];

        for (const check of validationChecks) {
            if (check.condition) {
                console.log('Validation failed:', check.message);
                if (check.message) alert(check.message);
                return false;
            }
        }

        return true;
    }, [formData, summaryData, isFutureDateMoreThanOneDay, hasDataChanges]);

    const resetForm = () => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?')) {
            return;
        }

        // Reset all states to initial values
        setFormData({
            date: '',
            shift: '',
            wards: Object.fromEntries(
                Object.keys(formData.wards).map(ward => [
                    ward,
                    { ...initialWardData }
                ])
            ),
            totals: { ...initialWardData }
        });

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

        setSelectedDate(new Date());
        setThaiDate('');
        setShowCalendar(false);

        // Force reload the page
        window.location.reload();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateFormData()) return;

        const confirmSubmit = window.confirm(
            'โปรดยืนยันว่าข้อมูลได้รับการตรวจสอบเรียบร้อยแล้วก่อนดำเนินการบันทึก\n\n❌ กด "Cancel" (ต้องการแก้ไขข้อมูลก่อน)\n✅ กด "OK" (ดำเนินการบันทึกข้อมูล)'
        );

        if (!confirmSubmit) return;

        setLoadingStates(prev => ({ ...prev, checkingDuplicates: true }));
        setLoadingMessage('กำลังตรวจสอบข้อมูลซ้ำ...');

        try {
            console.log('Checking for duplicate data:', {
                date: formData.date,
                shift: formData.shift
            });

            const recordsRef = collection(db, 'staffRecords');
            const q = query(
                recordsRef,
                where('date', '==', formData.date),
                where('shift', '==', formData.shift)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                console.log('Found duplicate data:', querySnapshot.docs[0].data());
                const existingDoc = querySnapshot.docs[0];
                setExistingData({
                    id: existingDoc.id,
                    ...existingDoc.data()
                });
                setShowDataComparison(true);
                setLoadingStates(prev => ({ ...prev, checkingDuplicates: false }));
                setLoadingMessage('');
                return;
            }

            console.log('No duplicate data found, proceeding with save');
            await saveData();

        } catch (error) {
            console.error('Error checking duplicates:', error);
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
            setLoadingStates(prev => ({ 
                ...prev, 
                checkingDuplicates: false,
                savingData: false 
            }));
            setLoadingMessage('');
        }
    };

    const saveData = async (overwrite = false) => {
        setLoadingStates(prev => ({ ...prev, savingData: true }));
        setLoadingMessage('กำลังบันทึกข้อมูล...');

        try {
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(':', '');

            const formattedDate = formData.date.replace(/-/g, '');
            const docId = overwrite && existingData 
                ? existingData.id 
                : `data_${formattedTime}_${formattedDate}`;

            console.log('Saving data with ID:', docId);

            // Sanitize data before saving
            const sanitizedData = {
                date: formData.date,
                shift: formData.shift,
                wards: Object.fromEntries(
                    Object.entries(formData.wards).map(([wardName, wardData]) => [
                        wardName,
                        Object.fromEntries(
                            Object.entries(wardData).map(([key, value]) => [
                                key,
                                key === 'comment' ? value : (value === '' ? '0' : value)
                            ])
                        )
                    ])
                ),
                summaryData: Object.fromEntries(
                    Object.entries(summaryData).map(([key, value]) => [
                        key,
                        typeof value === 'string' ? value.trim() : value
                    ])
                ),
                timestamp: serverTimestamp(),
                lastModified: serverTimestamp()
            };

            console.log('Saving sanitized data:', sanitizedData);
            await setDoc(doc(db, 'staffRecords', docId), sanitizedData);

            setLoadingMessage('บันทึกข้อมูลสำเร็จ กำลังรีเซ็ตฟอร์ม...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Data saved successfully');
            resetForm();
            alert('บันทึกข้อมูลเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error saving data:', error);
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            setLoadingStates(prev => ({ 
                ...prev, 
                savingData: false,
                checkingDuplicates: false 
            }));
            setLoadingMessage('');
            setShowDataComparison(false);
        }
    };

    // อัพเดท DataComparisonModal component
    const DataComparisonModal = () => {
        if (!showDataComparison || !existingData) return null;

        const ComparisonRow = ({ label, oldValue, newValue }) => {
            const hasChanged = oldValue !== newValue;
            return (
                <div className={`grid grid-cols-3 gap-4 py-2 ${hasChanged ? 'bg-yellow-50' : ''}`}>
                    <div className="text-sm font-medium text-gray-600">{label}</div>
                    <div className="text-sm text-purple-600">{oldValue || '0'}</div>
                    <div className="text-sm text-pink-600">{newValue || '0'}</div>
                </div>
            );
        };

        const WardComparison = ({ wardName }) => {
            const existingWard = existingData.wards?.[wardName] || {};
            const newWard = formData.wards[wardName] || {};
            
            return (
                <div className="border rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-lg mb-4 text-[#0ab4ab]">{wardName}</h4>
                    <div className="grid grid-cols-3 gap-4 mb-2 font-semibold">
                        <div>Field</div>
                        <div>Current Data</div>
                        <div>New Data</div>
                    </div>
                    <div className="space-y-1">
                        <ComparisonRow label="Patient Census" oldValue={existingWard.numberOfPatients} newValue={newWard.numberOfPatients} />
                        <ComparisonRow label="Nurse Manager" oldValue={existingWard.nurseManager} newValue={newWard.nurseManager} />
                        <ComparisonRow label="RN" oldValue={existingWard.RN} newValue={newWard.RN} />
                        <ComparisonRow label="PN" oldValue={existingWard.PN} newValue={newWard.PN} />
                        <ComparisonRow label="WC" oldValue={existingWard.WC} newValue={newWard.WC} />
                        <ComparisonRow label="New Admit" oldValue={existingWard.newAdmit} newValue={newWard.newAdmit} />
                        <ComparisonRow label="Transfer In" oldValue={existingWard.transferIn} newValue={newWard.transferIn} />
                        <ComparisonRow label="Refer In" oldValue={existingWard.referIn} newValue={newWard.referIn} />
                        <ComparisonRow label="Transfer Out" oldValue={existingWard.transferOut} newValue={newWard.transferOut} />
                        <ComparisonRow label="Refer Out" oldValue={existingWard.referOut} newValue={newWard.referOut} />
                        <ComparisonRow label="Discharge" oldValue={existingWard.discharge} newValue={newWard.discharge} />
                        <ComparisonRow label="Dead" oldValue={existingWard.dead} newValue={newWard.dead} />
                        <ComparisonRow label="Overall Data" oldValue={existingWard.overallData} newValue={newWard.overallData} />
                        <ComparisonRow label="Available Beds" oldValue={existingWard.availableBeds} newValue={newWard.availableBeds} />
                        <ComparisonRow label="Unavailable" oldValue={existingWard.unavailable} newValue={newWard.unavailable} />
                        <ComparisonRow label="Plan D/C" oldValue={existingWard.plannedDischarge} newValue={newWard.plannedDischarge} />
                        {(existingWard.comment || newWard.comment) && (
                            <div className="mt-2 pt-2 border-t">
                                <div className="text-sm font-medium text-gray-600 mb-1">Comment:</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-sm text-purple-600">{existingWard.comment || '-'}</div>
                                    <div className="text-sm text-pink-600">{newWard.comment || '-'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-semibold text-[#0ab4ab]">ข้อมูลซ้ำ - Data Comparison</h3>
                            <p className="text-sm text-gray-600">
                                วันที่ {formData.date} กะ {formData.shift}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                                <span className="text-sm">ข้อมูลเดิม</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-pink-600"></div>
                                <span className="text-sm">ข้อมูลใหม่</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Summary Data Section */}
                        <div className="mb-8">
                            <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ข้อมูลสรุป 24 ชั่วโมง</h4>
                            <div className="bg-white rounded-lg p-4 border">
                                <ComparisonRow label="OPD 24hr" oldValue={existingData.summaryData?.opdTotal24hr} newValue={summaryData.opdTotal24hr} />
                                <ComparisonRow label="Old Patient" oldValue={existingData.summaryData?.existingPatients} newValue={summaryData.existingPatients} />
                                <ComparisonRow label="New Patient" oldValue={existingData.summaryData?.newPatients} newValue={summaryData.newPatients} />
                                <ComparisonRow label="Admit 24hr" oldValue={existingData.summaryData?.admissions24hr} newValue={summaryData.admissions24hr} />
                            </div>
                        </div>

                        {/* Staff Information */}
                        <div className="mb-8">
                            <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ข้อมูลผู้บันทึกและผู้ตรวจการ</h4>
                            <div className="bg-white rounded-lg p-4 border space-y-4">
                                <div>
                                    <div className="text-sm font-medium mb-2">Supervisor:</div>
                                    <ComparisonRow 
                                        label="ชื่อ-นามสกุล" 
                                        oldValue={`${existingData.summaryData?.supervisorFirstName || ''} ${existingData.summaryData?.supervisorLastName || ''}`}
                                        newValue={`${summaryData.supervisorFirstName || ''} ${summaryData.supervisorLastName || ''}`}
                                    />
                                </div>
                                <div>
                                    <div className="text-sm font-medium mb-2">ผู้บันทึกข้อมูล:</div>
                                    <ComparisonRow 
                                        label="ชื่อ-นามสกุล"
                                        oldValue={`${existingData.summaryData?.recorderFirstName || ''} ${existingData.summaryData?.recorderLastName || ''}`}
                                        newValue={`${summaryData.recorderFirstName || ''} ${summaryData.recorderLastName || ''}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Ward Data */}
                        <div>
                            <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ข้อมูลรายวอร์ด</h4>
                            <div className="space-y-4">
                                {WARD_ORDER.map((ward) => (
                                    <WardComparison key={ward} wardName={ward} />
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setShowDataComparison(false)}
                                className="px-6 py-2.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={() => saveData(true)}
                                className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                            >
                                บันทึกทับข้อมูลเดิม
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const [currentStep, setCurrentStep] = useState(0);

    // เพิ่มฟังก์ชันสำหรับดึงข้อมูลวันที่มีการบันทึก
    const fetchDatesWithData = async () => {
        try {
            const recordsRef = collection(db, 'staffRecords');
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const endOfYear = new Date(new Date().getFullYear(), 11, 31);

            const yearQuery = query(recordsRef,
                where('date', '>=', getUTCDateString(startOfYear)),
                where('date', '<=', getUTCDateString(endOfYear))
            );

            const yearSnapshot = await getDocs(yearQuery);
            const datesWithDataInYear = [...new Set(yearSnapshot.docs.map(doc => doc.data().date))];
            setDatesWithData(datesWithDataInYear);
        } catch (error) {
            console.error('Error fetching dates with data:', error);
            setDatesWithData([]);
        }
    };

    // เพิ่ม useEffect เพื่อดึงข้อมูลเมื่อ component โหลด
    useEffect(() => {
        fetchDatesWithData();
    }, []);

    // Helper function for date formatting
    const getUTCDateString = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // เพิ่ม cleanup effect
    useEffect(() => {
        return () => {
            // Cleanup resources when component unmounts
            setIsInitialLoading(false);
            setIsLoading(false);
            setShowCalendar(false);
        };
    }, []);

    // เพิ่ม Loading Indicator Component
    const LoadingIndicator = () => {
        if (!loadingMessage) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-6 max-w-md mx-4 shadow-2xl border-2 border-[#0ab4ab]/20">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-[#0ab4ab]/20 rounded-full animate-spin border-t-[#0ab4ab]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-white rounded-full"></div>
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-lg font-medium text-gray-800">{loadingMessage}</p>
                        <p className="text-sm text-gray-500">กรุณารอสักครู่...</p>
                    </div>
                </div>
            </div>
        );
    };

    // เพิ่มฟังก์ชันสำหรับดึงข้อมูล Overall Data จากกะก่อนหน้า
    const fetchPreviousShiftData = async (selectedDate, selectedShift) => {
        try {
            setLoadingMessage('กำลังดึงข้อมูลจากระบบ');
            const recordsRef = collection(db, 'staffRecords');
            let queryDate = new Date(selectedDate);
            let queryShift = '';

            // กำหนดวันที่และกะที่จะค้นหา
            if (selectedShift === '19:00-07:00') {
                queryShift = '07:00-19:00';
                setLoadingMessage(`กำลังดึงข้อมูลจากกะเช้า (${queryShift})`);
            } else {
                queryDate.setDate(queryDate.getDate() - 1);
                queryShift = '19:00-07:00';
                setLoadingMessage(`กำลังดึงข้อมูลจากกะดึกของวันก่อนหน้า (${queryShift})`);
            }

            const formattedQueryDate = getUTCDateString(queryDate);
            const thaiQueryDate = formatThaiDate(queryDate).replace('เพิ่มข้อมูล วันที่: ', '');
            
            setLoadingMessage(`กำลังดึงข้อมูล Patient Census\nจากวันที่ ${thaiQueryDate}\nกะ ${queryShift}`);
            
            const q = query(
                recordsRef,
                where('date', '==', formattedQueryDate),
                where('shift', '==', queryShift)
            );

            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const previousData = querySnapshot.docs[0].data();
                console.log('Found previous shift data:', previousData);

                const updatedWards = {};
                Object.entries(previousData.wards).forEach(([wardName, wardData]) => {
                    updatedWards[wardName] = {
                        ...formData.wards[wardName],
                        numberOfPatients: wardData.overallData || '0',
                        isReadOnly: false // Ensure fields are editable
                    };
                });

                setFormData(prev => ({
                    ...prev,
                    wards: {
                        ...prev.wards,
                        ...updatedWards
                    }
                }));

                setLoadingMessage(`ดึงข้อมูลสำเร็จ\nจากวันที่ ${thaiQueryDate}\nกะ ${queryShift}`);
                setTimeout(() => {
                    setLoadingMessage('');
                }, 2000);
            } else {
                setLoadingMessage('กำลังค้นหาข้อมูลล่าสุด...');
                
                const latestDataQuery = query(
                    recordsRef,
                    where('date', '<=', formattedQueryDate),
                    orderBy('date', 'desc'),
                    limit(1)
                );

                const latestSnapshot = await getDocs(latestDataQuery);
                if (!latestSnapshot.empty) {
                    const latestData = latestSnapshot.docs[0].data();
                    const latestDate = formatThaiDate(new Date(latestData.date)).replace('เพิ่มข้อมูล วันที่: ', '');
                    
                    setLoadingMessage(`พบข้อมูลล่าสุดจาก\nวันที่ ${latestDate}\nกะ ${latestData.shift}`);
                    
                    const updatedWards = {};
                    Object.entries(latestData.wards).forEach(([wardName, wardData]) => {
                        updatedWards[wardName] = {
                            ...formData.wards[wardName],
                            numberOfPatients: wardData.overallData || '0',
                            overallData: wardData.overallData || '0',
                            isReadOnly: false
                        };
                    });

                    setFormData(prev => ({
                        ...prev,
                        wards: {
                            ...prev.wards,
                            ...updatedWards
                        }
                    }));

                    setTimeout(() => {
                        setLoadingMessage('');
                    }, 2000);
                } else {
                    setLoadingMessage('ไม่พบข้อมูลก่อนหน้า');
                    setTimeout(() => {
                        setLoadingMessage('');
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error fetching previous shift data:', error);
            setLoadingMessage(`เกิดข้อผิดพลาด: ${error.message}`);
            setTimeout(() => {
                setLoadingMessage('');
            }, 3000);
        }
    };

    // Update the handleShiftChange function
    const handleShiftChange = (shift) => {
        setFormData(prev => ({ ...prev, shift }));
    };

    // เพิ่มฟังก์ชันสำหรับจัดรูปแบบชื่อ Ward
    const formatWardName = (ward) => {
        switch (ward) {
            case 'Ward10B':
                return 'Ward 10B';
            case 'WardGI':
                return 'Ward GI';
            case 'ICU':
            case 'CCU':
            case 'LR':
            case 'NSY':
                return ward;
            default:
                return ward.replace(/Ward(\d+)/, 'Ward $1');
        }
    };

    // เพิ่มฟังก์ชันสำหรับดึงข้อมูลล่าสุด
    const fetchLatestData = async () => {
        setLoadingMessage('กำลังดึงข้อมูลล่าสุด...');
        try {
            const recordsRef = collection(db, 'staffRecords');
            const latestDataQuery = query(
                recordsRef,
                orderBy('date', 'desc'),
                limit(1)
            );

            const latestSnapshot = await getDocs(latestDataQuery);
            if (!latestSnapshot.empty) {
                const latestData = latestSnapshot.docs[0].data();
                const latestDate = formatThaiDate(new Date(latestData.date)).replace('เพิ่มข้อมูล วันที่: ', '');
                
                setLoadingMessage(`พบข้อมูลล่าสุดจาก\nวันที่ ${latestDate}\nกะ ${latestData.shift}`);
                
                // อัพเดทข้อมูลในฟอร์ม
                const updatedWards = {};
                Object.entries(latestData.wards).forEach(([wardName, wardData]) => {
                    updatedWards[wardName] = {
                        ...formData.wards[wardName],
                        numberOfPatients: wardData.overallData || '0',
                        overallData: wardData.overallData || '0',
                        isReadOnly: false
                    };
                });

                setFormData(prev => ({
                    ...prev,
                    wards: {
                        ...prev.wards,
                        ...updatedWards
                    }
                }));

                // อัพเดท Summary Data
                if (latestData.summaryData) {
                    setSummaryData(prev => ({
                        ...prev,
                        ...latestData.summaryData
                    }));
                }

                setTimeout(() => {
                    setLoadingMessage('');
                }, 2000);
            } else {
                setLoadingMessage('ไม่พบข้อมูลที่บันทึกไว้');
                setTimeout(() => {
                    setLoadingMessage('');
                }, 2000);
            }
        } catch (error) {
            console.error('Error fetching latest data:', error);
            setLoadingMessage(`เกิดข้อผิดพลาด: ${error.message}`);
            setTimeout(() => {
                setLoadingMessage('');
            }, 3000);
        }
    };

    return (
        <div className="w-full px-2 py-2">
            <LoadingIndicator />
            <form onSubmit={handleSubmit} className="w-full mx-auto">
                {isInitialLoading && (
                    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                        <div className="text-center">
                            <img src="/images/BPK.jpg" alt="BPK Loading" className="w-32 h-32 mx-auto mb-4 animate-pulse" />
                            <p className="text-gray-600">กำลังโหลด...</p>
                        </div>
                    </div>
                )}

                <DataComparisonModal />

                <div className="bg-gradient-to-b from-[#0ab4ab]/10 to-white rounded-lg shadow-lg p-4 mb-4">
                    <h1 className="text-lg text-center font-medium text-[#0ab4ab] mb-4 font-THSarabun">
                        Daily Patient Census and Staffing
                    </h1>
                    {/*ส่วนของวันที่และกะงาน*/}
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
                            {/* สร้างส่วนของฟอร์มที่ใช้ในการเลือกกะงาน */}
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

                {/* Desktop View */}
                <div className="hidden md:block w-full">
                    {/* Main Container Box */}
                    <div className="w-full mx-auto p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="bg-gradient-to-r from-pink-400/20 to-white p-2 rounded-lg">
                            <h2 className="text-lg font-bold text-pink-600 text-center mb-1">Form</h2>
                        </div>
                        {/* Scrollable Container for all wards */}
                        <div className="overflow-x-auto">
                            <div className="inline-flex gap-1 min-w-max p-1">
                                {/* Headers Row */}
                                <div className="flex flex-col gap-1">
                                    <div className="h-12 flex items-center justify-center">
                                        <h3 className="text-xs font-bold text-gray-700 font-THSarabun">Wards</h3>
                                    </div>
                                    {WARD_ORDER.map((ward) => (
                                        <div key={ward} className="h-8 flex items-center">
                                            <span className="text-xs font-semibold text-[#0ab4ab] font-THSarabun">{formatWardName(ward)}</span>
                                        </div>
                                    ))}
                                    <div className="h-8 flex items-center">
                                        <span className="text-xs font-semibold text-purple-600 font-THSarabun">Total</span>
                                    </div>
                                </div>

                                {/* Patient Census */}
                                <div className="flex flex-col gap-1">
                                    <div className="h-12 flex items-center justify-center">
                                        <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">Patient Census</h4>
                                    </div>
                                    {WARD_ORDER.map((ward) => (
                                        <div key={ward} className="bg-gradient-to-r from-[#0ab4ab]/20 to-[#0ab4ab]/10 rounded-md p-1 text-[#0ab4ab] shadow h-8">
                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    value={displayValue(formData.wards[ward].numberOfPatients)}
                                                    className="w-16 text-center text-sm font-bold bg-gray-100 border-b border-[#0ab4ab] focus:outline-none text-[#0ab4ab] placeholder-[#0ab4ab]/50 font-THSarabun cursor-not-allowed"
                                                    placeholder="0"
                                                    readOnly
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {/* Total Row */}
                                    <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                                        <div className="text-center">
                                            <input
                                                type="number"
                                                value={displayValue(formData.totals.numberOfPatients)}
                                                readOnly
                                                className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Overall Data */}
                                <div className="flex flex-col gap-1">
                                    <div className="h-12 flex items-center justify-center">
                                        <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">Overall Data</h4>
                                    </div>
                                    {WARD_ORDER.map((ward) => (
                                        <div key={ward} className="bg-gradient-to-r from-blue-400/20 to-blue-500/10 rounded-md p-1 text-blue-600 shadow h-8">
                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    value={displayValue(formData.wards[ward].overallData)}
                                                    className="w-16 text-center text-sm font-bold bg-gray-100 border-b border-blue-500 focus:outline-none text-blue-600 placeholder-blue-300 font-THSarabun cursor-not-allowed"
                                                    placeholder="0"
                                                    readOnly
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {/* Total Row */}
                                    <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                                        <div className="text-center">
                                            <input
                                                type="number"
                                                value={displayValue(formData.totals.overallData)}
                                                readOnly
                                                className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Staff Section */}
                                {['Nurse Manager', 'RN', 'PN', 'WC'].map((staffType) => (
                                    <div key={staffType} className="flex flex-col gap-1">
                                        <div className="h-12 flex items-center justify-center">
                                            <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">{staffType}</h4>
                                        </div>
                                        {WARD_ORDER.map((ward) => (
                                            <div key={ward} className="bg-gradient-to-r from-green-400/20 to-green-500/10 rounded-md p-1 text-green-600 shadow h-8">
                                                <div className="text-center">
                                                    <input
                                                        type="number"
                                                        value={displayValue(formData.wards[ward][staffType])}
                                                        onChange={(e) => handleInputChange('staff', ward, { [staffType]: e.target.value })}
                                                        className="w-16 text-center text-sm font-bold bg-transparent border-b border-green-500 focus:outline-none focus:border-green-500 text-green-600 placeholder-green-300 font-THSarabun"
                                                        placeholder="0"
                                                        min="0"
                                                        disabled={formData.wards[ward].isReadOnly === true}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {/* Total Row */}
                                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    value={displayValue(formData.totals[staffType])}
                                                    readOnly
                                                    className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Patient Movement Section */}
                                {['New Admit', 'Transfer In', 'Refer In', 'Transfer Out', 'Refer Out', 'Discharge', 'Dead'].map((movementType) => (
                                    <div key={movementType} className="flex flex-col gap-1">
                                        <div className="h-12 flex items-center justify-center">
                                            <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">{movementType}</h4>
                                        </div>
                                        {WARD_ORDER.map((ward) => (
                                            <div key={ward} className="bg-gradient-to-r from-yellow-400/20 to-yellow-500/10 rounded-md p-1 text-yellow-600 shadow h-8">
                                                <div className="text-center">
                                                    <input
                                                        type="number"
                                                        value={displayValue(formData.wards[ward][movementType])}
                                                        onChange={(e) => handleInputChange('movement', ward, { [movementType]: e.target.value })}
                                                        className="w-16 text-center text-sm font-bold bg-transparent border-b border-yellow-500 focus:outline-none focus:border-yellow-500 text-yellow-600 placeholder-yellow-300 font-THSarabun"
                                                        placeholder="0"
                                                        min="0"
                                                        disabled={formData.wards[ward].isReadOnly === true}
                                    />
                                </div>
                                            </div>
                                        ))}
                                        {/* Total Row */}
                                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    value={displayValue(formData.totals[movementType])}
                                                    readOnly
                                                    className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Additional Information Section */}
                                {['Available', 'Unavailable', 'Planned Discharge'].map((infoType) => (
                                    <div key={infoType} className="flex flex-col gap-1">
                                        <div className="h-12 flex items-center justify-center">
                                            <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">{infoType}</h4>
                                    </div>
                                        {WARD_ORDER.map((ward) => (
                                            <div key={ward} className="bg-gradient-to-r from-pink-400/20 to-pink-500/10 rounded-md p-1 text-pink-600 shadow h-8">
                                                <div className="text-center">
                                            <input
                                                type="number"
                                                        value={displayValue(formData.wards[ward][infoType])}
                                                        onChange={(e) => handleInputChange('info', ward, { [infoType]: e.target.value })}
                                                        className="w-16 text-center text-sm font-bold bg-transparent border-b border-pink-500 focus:outline-none focus:border-pink-500 text-pink-600 placeholder-pink-300 font-THSarabun"
                                                        placeholder="0"
                                                min="0"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {/* Total Row */}
                                        <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-md p-1 text-white shadow h-8">
                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    value={displayValue(formData.totals[infoType])}
                                                    readOnly
                                                    className="w-16 text-center text-sm font-bold bg-transparent border-b border-white focus:outline-none text-white font-THSarabun"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Comment Section */}
                                <div className="flex flex-col gap-1">
                                    <div className="h-12 flex items-center justify-center">
                                        <h4 className="text-xs font-semibold text-gray-700 font-THSarabun">Comment</h4>
                                    </div>
                                    {WARD_ORDER.map((ward) => (
                                        <div key={ward} className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-md p-1 shadow h-8">
                                            <div className="text-center">
                                                <input
                                                    type="text"
                                                    value={formData.wards[ward].comment}
                                                    onChange={(e) => handleInputChange('comment', ward, { comment: e.target.value })}
                                                    className="w-24 text-center text-xs bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-600 text-gray-600 placeholder-gray-300 font-THSarabun"
                                                    placeholder="Add comment..."
                                                    disabled={formData.wards[ward].isReadOnly === true}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {/* Empty Total Row for Comment */}
                                    <div className="h-8"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Data and Signature Section - Desktop */}
                <div className="hidden md:block mt-8">
                    <div className="bg-gradient-to-r from-[#0ab4ab]/10 to-white rounded-xl shadow-lg p-6">
                        {/* 24-Hour Summary Section */}
                        <div className="mb-8">
                            <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ข้อมูลสรุป 24 ชั่วโมง</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">OPD 24hr</label>
                                    <input
                                        type="number"
                                        value={summaryData.opdTotal24hr}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, opdTotal24hr: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Old Patient</label>
                                    <input
                                        type="number"
                                        value={summaryData.existingPatients}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, existingPatients: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Patient</label>
                                    <input
                                        type="number"
                                        value={summaryData.newPatients}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, newPatients: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Admit 24hr</label>
                                    <input
                                        type="number"
                                        value={summaryData.admissions24hr}
                                        onChange={(e) => setSummaryData(prev => ({ ...prev, admissions24hr: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Signature Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Supervisor */}
                            <div>
                                <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">Supervisor Signature</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={summaryData.supervisorFirstName}
                                            onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorFirstName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={summaryData.supervisorLastName}
                                            onChange={(e) => setSummaryData(prev => ({ ...prev, supervisorLastName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                            placeholder="Last Name"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Recorder */}
                            <div>
                                <h4 className="text-lg font-medium mb-4 text-[#0ab4ab]">ผู้บันทึกข้อมูล</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={summaryData.recorderFirstName}
                                            onChange={(e) => setSummaryData(prev => ({ ...prev, recorderFirstName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={summaryData.recorderLastName}
                                            onChange={(e) => setSummaryData(prev => ({ ...prev, recorderLastName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0ab4ab] focus:border-[#0ab4ab] text-black font-THSarabun bg-white/50 hover:bg-white transition-colors"
                                            placeholder="Last Name"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-center p-6 bg-gradient-to-r from-[#0ab4ab]/10 to-white rounded-xl shadow-lg">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-12 py-4 bg-gradient-to-r from-[#0ab4ab] to-blue-400 text-white text-lg font-bold rounded-xl shadow-lg hover:from-[#0ab4ab] hover:to-blue-500 transition-all transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 font-THSarabun"
                    >
                        {isLoading ? 'Saving...' : 'Save Data'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ShiftForm;

