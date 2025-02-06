'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, Timestamp, where } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import LoadingSkeleton from '../ui/LoadingSkeleton';
import Toast from '../ui/Toast';
import Calendar from '../ui/Calendar';
import LoadingScreen from '../ui/LoadingScreen';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [records, setRecords] = useState([]);
    const [filters, setFilters] = useState({
        startDate: new Date(),
        shift: 'all'
    });
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [stats, setStats] = useState(null);
    const [selectedWard, setSelectedWard] = useState(null);
    const [isWardModalOpen, setIsWardModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [datesWithData, setDatesWithData] = useState([]);
    const [notification, setNotification] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const getUTCDateString = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const recordsRef = collection(db, 'staffRecords');
            const selectedDateStr = getUTCDateString(filters.startDate);
            
            // ดึงข้อมูลทั้งปีเพื่อเช็คว่าวันไหนมีข้อมูล
            const startOfYear = new Date(filters.startDate.getFullYear(), 0, 1); // เริ่มต้นปี
            const endOfYear = new Date(filters.startDate.getFullYear(), 11, 31); // สิ้นสุดปี
            
            const yearQuery = query(recordsRef,
                where('date', '>=', getUTCDateString(startOfYear)),
                where('date', '<=', getUTCDateString(endOfYear))
            );
            
            const yearSnapshot = await getDocs(yearQuery);
            const datesWithDataInYear = [...new Set(yearSnapshot.docs.map(doc => doc.data().date))];
            setDatesWithData(datesWithDataInYear);

            // ดึงข้อมูลตาม filter ปกติ
            let fetchedRecords = [];
            if (filters.shift === 'all') {
                const morningQuery = query(recordsRef, 
                    where('date', '==', selectedDateStr),
                    where('shift', '==', '07:00-19:00')
                );
                const nightQuery = query(recordsRef, 
                    where('date', '==', selectedDateStr),
                    where('shift', '==', '19:00-07:00')
                );
                
                const [morningSnapshot, nightSnapshot] = await Promise.all([
                    getDocs(morningQuery),
                    getDocs(nightQuery)
                ]);
                
                fetchedRecords = [
                    ...morningSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })),
                    ...nightSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                ];
            } else {
                const q = query(recordsRef, 
                    where('date', '==', selectedDateStr),
                    where('shift', '==', filters.shift)
                );
                const querySnapshot = await getDocs(q);
                fetchedRecords = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            setRecords(fetchedRecords);
            const newStats = calculateExtendedStats(fetchedRecords);
            setStats(newStats);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('ไม่สามารถโหลดข้อมูลได้');
            setStats(resetStats());
            setDatesWithData([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // เพิ่ม Initial Loading Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const handleDateSelect = (date, shift) => {
        setSelectedDate(date);
        setFilters(prev => ({
            ...prev,
            startDate: date,
            shift: shift
        }));
        fetchData();
        setShowCalendar(false);
    };

    const resetStats = () => {
        return {
            totalRecords: 0,
            totalPatients: 0,
            totalStaff: 0,
            totalAttendance: 0,
            byWard: {},
            supervisorName: ''
        };
    };

    const parseNumberValue = (value) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && value.trim() !== '') {
            return parseInt(value, 10) || 0;
        }
        return 0;
    };

    const calculateStats = (records) => {
        if (!records || !Array.isArray(records) || records.length === 0) {
            return resetStats();
        }

        try {
            let totalPatients = 0;
            let totalStaff = 0;
            const byWard = {};
            let wardRecords = {};

            // จัดกลุ่มข้อมูลตาม ward และ shift
            records.forEach(record => {
                if (record.wards) {
                    Object.entries(record.wards).forEach(([ward, data]) => {
                        if (!data) return;

                        if (!wardRecords[ward]) {
                            wardRecords[ward] = {
                                morning: null,
                                night: null
                            };
                        }

                        // เก็บข้อมูลแยกตามกะ
                        if (record.shift === '07:00-19:00') {
                            wardRecords[ward].morning = data;
                        } else if (record.shift === '19:00-07:00') {
                            wardRecords[ward].night = data;
                        }
                    });
                }
            });

            // คำนวณข้อมูลรวมของแต่ละ ward
            Object.entries(wardRecords).forEach(([ward, shifts]) => {
                const morningData = shifts.morning || {};
                const nightData = shifts.night || {};

                // คำนวณจำนวนผู้ป่วยรวม
                const morningPatients = parseNumberValue(morningData.numberOfPatients);
                const nightPatients = parseNumberValue(nightData.numberOfPatients);
                
                if (filters.shift === 'all') {
                    // แสดงข้อมูลทั้ง 2 กะ
                    byWard[ward] = morningPatients + nightPatients;
                    totalPatients += (morningPatients + nightPatients);
                } else if (filters.shift === '07:00-19:00' && shifts.morning) {
                    // แสดงข้อมูลกะเช้า
                    byWard[ward] = morningPatients;
                    totalPatients += morningPatients;
                } else if (filters.shift === '19:00-07:00' && shifts.night) {
                    // แสดงข้อมูลกะดึก
                    byWard[ward] = nightPatients;
                    totalPatients += nightPatients;
                }

                // คำนวณจำนวนเจ้าหน้าที่
                if (filters.shift === 'all') {
                    const morningStaff = parseNumberValue(morningData.RN) + 
                                       parseNumberValue(morningData.PN) + 
                                       parseNumberValue(morningData.NA);
                    const nightStaff = parseNumberValue(nightData.RN) + 
                                     parseNumberValue(nightData.PN) + 
                                     parseNumberValue(nightData.NA);
                    totalStaff += (morningStaff + nightStaff);
                } else if (filters.shift === '07:00-19:00' && shifts.morning) {
                    totalStaff += parseNumberValue(morningData.RN) + 
                                 parseNumberValue(morningData.PN) + 
                                 parseNumberValue(morningData.NA);
                } else if (filters.shift === '19:00-07:00' && shifts.night) {
                    totalStaff += parseNumberValue(nightData.RN) + 
                                 parseNumberValue(nightData.PN) + 
                                 parseNumberValue(nightData.NA);
                }
            });

            return {
                totalRecords: records.length,
                totalPatients,
                totalStaff,
                totalAttendance: records.reduce((sum, record) => 
                    sum + parseNumberValue(record.totalAttendance), 0),
                byWard,
                supervisorName: records.map(r => r.supervisorName).filter(Boolean).join(', ')
            };
        } catch (err) {
            console.error('Error calculating stats:', err);
            return resetStats();
        }
    };

    // เพิ่มฟังก์ชันคำนวณสถิติใหม่
    const calculateExtendedStats = (records) => {
        if (!records || !Array.isArray(records) || records.length === 0) {
            return resetStats();
        }

        const stats = calculateStats(records);
        const extendedStats = {
            ...stats,
            patientMovement: {
                totalAdmits: 0,
                totalDischarges: 0,
                totalTransfers: 0,
                totalDeaths: 0,
            },
            staffing: {
                totalRN: 0,
                totalPN: 0,
                totalNA: 0,
                staffToPatientRatio: 0,
            },
            bedManagement: {
                totalBeds: 0,
                occupiedBeds: 0,
                availableBeds: 0,
                unavailableBeds: 0,
                occupancyRate: 0,
            },
            opd: {
                total24Hr: 0,
                newPatients: 0,
                existingPatients: 0,
                admissionRate: 0,
            }
        };

        // คำนวณข้อมูลเพิ่มเติม
        records.forEach(record => {
            if (record.wards) {
                Object.values(record.wards).forEach(ward => {
                    // Patient Movement
                    extendedStats.patientMovement.totalAdmits += parseNumberValue(ward.newAdmit);
                    extendedStats.patientMovement.totalDischarges += parseNumberValue(ward.discharge);
                    extendedStats.patientMovement.totalTransfers += 
                        parseNumberValue(ward.transferIn) + 
                        parseNumberValue(ward.transferOut) +
                        parseNumberValue(ward.referIn) +
                        parseNumberValue(ward.referOut);
                    extendedStats.patientMovement.totalDeaths += parseNumberValue(ward.dead);

                    // Staffing
                    extendedStats.staffing.totalRN += parseNumberValue(ward.RN);
                    extendedStats.staffing.totalPN += parseNumberValue(ward.PN);
                    extendedStats.staffing.totalNA += parseNumberValue(ward.WC);

                    // Bed Management
                    extendedStats.bedManagement.availableBeds += parseNumberValue(ward.availableBeds);
                    extendedStats.bedManagement.unavailableBeds += parseNumberValue(ward.unavailable);
                });
            }

            // OPD Data
            if (record.summaryData) {
                extendedStats.opd.total24Hr += parseNumberValue(record.summaryData.opdTotal24hr);
                extendedStats.opd.newPatients += parseNumberValue(record.summaryData.newPatients);
                extendedStats.opd.existingPatients += parseNumberValue(record.summaryData.existingPatients);
            }
        });

        // คำนวณอัตราส่วนต่างๆ
        const totalStaff = extendedStats.staffing.totalRN + extendedStats.staffing.totalPN + extendedStats.staffing.totalNA;
        extendedStats.staffing.staffToPatientRatio = totalStaff > 0 ? 
            (stats.totalPatients / totalStaff).toFixed(2) : 0;

        extendedStats.bedManagement.occupiedBeds = stats.totalPatients;
        extendedStats.bedManagement.totalBeds = 
            extendedStats.bedManagement.occupiedBeds + 
            extendedStats.bedManagement.availableBeds + 
            extendedStats.bedManagement.unavailableBeds;
        
        extendedStats.bedManagement.occupancyRate = 
            extendedStats.bedManagement.totalBeds > 0 ?
            ((extendedStats.bedManagement.occupiedBeds / extendedStats.bedManagement.totalBeds) * 100).toFixed(1) : 0;

        return extendedStats;
    };

    // สีสำหรับ Ward Cards และ Charts
    const wardColors = {
        Ward6: 'bg-pink-100 hover:bg-pink-200',
        Ward7: 'bg-blue-100 hover:bg-blue-200',
        Ward8: 'bg-violet-100 hover:bg-violet-200',
        Ward9: 'bg-green-100 hover:bg-green-200',
        WardGI: 'bg-yellow-100 hover:bg-yellow-200',
        Ward10B: 'bg-sky-100 hover:bg-sky-200',
        Ward11: 'bg-red-100 hover:bg-red-200',
        Ward12: 'bg-cyan-100 hover:bg-cyan-200',
        ICU: 'bg-indigo-100 hover:bg-indigo-200',
        CCU: 'bg-orange-100 hover:bg-orange-200',
        LR: 'bg-emerald-100 hover:bg-emerald-200',
        NSY: 'bg-rose-100 hover:bg-rose-200'
    };

    // อัพเดทสีสำหรับกราฟให้ตรงกับ Ward Cards
    const chartColors = {
        background: [
            'rgba(252, 231, 243, 0.8)',     // pink-100 (Ward6)
            'rgba(219, 234, 254, 0.8)',     // blue-100 (Ward7)
            'rgba(237, 233, 254, 0.8)',     // violet-100 (Ward8)
            'rgba(220, 252, 231, 0.8)',     // green-100 (Ward9)
            'rgba(254, 249, 195, 0.8)',     // yellow-100 (WardGI)
            'rgba(224, 242, 254, 0.8)',     // sky-100 (Ward10B)
            'rgba(254, 226, 226, 0.8)',     // red-100 (Ward11)
            'rgba(207, 250, 254, 0.8)',     // cyan-100 (Ward12)
            'rgba(224, 231, 255, 0.8)',     // indigo-100 (ICU)
            'rgba(255, 237, 213, 0.8)',     // orange-100 (CCU)
            'rgba(209, 250, 229, 0.8)',     // emerald-100 (LR)
            'rgba(255, 228, 230, 0.8)'      // rose-100 (NSY)
        ],
        border: [
            'rgb(252, 231, 243)',     // pink-100
            'rgb(219, 234, 254)',     // blue-100
            'rgb(237, 233, 254)',     // violet-100
            'rgb(220, 252, 231)',     // green-100
            'rgb(254, 249, 195)',     // yellow-100
            'rgb(224, 242, 254)',     // sky-100
            'rgb(254, 226, 226)',     // red-100
            'rgb(207, 250, 254)',     // cyan-100
            'rgb(224, 231, 255)',     // indigo-100
            'rgb(255, 237, 213)',     // orange-100
            'rgb(209, 250, 229)',     // emerald-100
            'rgb(255, 228, 230)'      // rose-100
        ]
    };

    // กำหนดลำดับ Ward
    const wardOrder = [
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

    // Chart data
    const chartData = useMemo(() => {
        if (!stats) return null;

        const labels = Object.keys(stats.byWard);
        const data = Object.values(stats.byWard);

        return {
            pie: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: chartColors.background,
                    borderColor: chartColors.border,
                    borderWidth: 1,
                }]
            },
            bar: {
                labels,
                datasets: [{
                    label: 'จำนวนผู้ป่วย',
                    data,
                    backgroundColor: chartColors.background,
                    borderColor: chartColors.border,
                    borderWidth: 1,
                }]
            }
        };
    }, [stats]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,  // เพิ่มบรรทัดนี้
        plugins: {
            legend: {
                position: 'right',
            },
            title: {
                display: true,
                text: 'Patient Distribution',
                color: 'black',
                font: {
                    size: 16
                }
            }
        },
        scales: {  // เพิ่ม scales options
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };

    const handleWardClick = (ward) => {
        // หา record ล่าสุดจาก records array
        const latestRecord = records[records.length - 1];
        if (!latestRecord || !latestRecord.wards || !latestRecord.wards[ward]) {
            setToastMessage('No information found for this ward...');
            setShowToast(true);
            return;
        }

        setSelectedWard({
            name: ward,
            ...latestRecord.wards[ward]
        });
        setIsWardModalOpen(true);
    };

    const formatThaiDate = (date) => {
        const thaiMonths = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // Convert to Buddhist Era
        return `${day} ${month} ${year}`;
    };

    const WardModal = ({ ward, onClose }) => {
        if (!ward) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-11/12 max-w-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-black">{ward.name}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-black mb-2">จำนวนผู้ป่วย</h3>
                            <p className="text-2xl font-bold text-blue-600">{ward.numberOfPatients || 0}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-black mb-2">Overall Data</h3>
                            <p className="text-2xl font-bold text-green-600">{ward.overallData || 0}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <h3 className="font-semibold text-black mb-2">บุคลากร</h3>
                            <div className="space-y-1">
                                <p className="text-gray-700">RN: {ward.RN || 0}</p>
                                <p className="text-gray-700">PN: {ward.PN || 0}</p>
                                <p className="text-gray-700">NA: {ward.NA || 0}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-black mb-2">การเคลื่อนย้าย</h3>
                            <div className="space-y-1">
                                <p className="text-gray-700">Admit: {ward.newAdmit || 0}</p>
                                <p className="text-gray-700">Discharge: {ward.discharge || 0}</p>
                                <p className="text-gray-700">Transfer In: {ward.transferIn || 0}</p>
                                <p className="text-gray-700">Transfer Out: {ward.transferOut || 0}</p>
                                <p className="text-gray-700">Refer In: {ward.referIn || 0}</p>
                                <p className="text-gray-700">Refer Out: {ward.referOut || 0}</p>
                                <p className="text-gray-700">Dead: {ward.dead || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h3 className="font-semibold text-black mb-2">comments</h3>
                        <p className="text-gray-700">{ward.comment || '-'}</p>
                    </div>
                </div>
            </div>
        );
    };

    // เพิ่ม Notification Component ปรับปรุงใหม่
    const Notification = ({ message, type, onClose }) => (
        <div 
            className={`
                fixed top-4 right-4 z-[60] p-4 rounded-lg shadow-lg
                ${type === 'warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-blue-50 text-blue-800'}
                transition-all duration-300 ease-in-out
            `}
        >
            <div className="flex items-center gap-2">
                {type === 'warning' ? 
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    :
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                }
                <span className="font-medium">{message}</span>
                <button 
                    onClick={onClose}
                    className="ml-2 hover:text-gray-600"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="container mx-auto px-4 py-8">
            {isLoading && <LoadingScreen />}
            
            <div className="p-4">
                {/* Calendar Filters*/}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                        </button>
                        <span className="text-gray-700">
                            แสดงข้อมูล วันที่: {formatThaiDate(selectedDate)}
                        </span>
                    </div>

                    <div className={`${showCalendar ? 'block' : 'hidden'} relative z-10`}>
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="relative bg-white rounded-lg p-4">
                                <button 
                                    onClick={() => setShowCalendar(false)}
                                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <Calendar 
                                    selectedDate={filters.startDate}
                                    onDateSelect={handleDateSelect}
                                    onClickOutside={() => setShowCalendar(false)}
                                    datesWithData={datesWithData}
                                    selectedShift={filters.shift}
                                    variant="dashboard"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards with Pastel Colors */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-pink-100 to-pink-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <h3 className="text-sm font-medium text-pink-800 mb-1">Total Records</h3>
                            <p className="text-2xl font-bold text-pink-600">{stats.totalRecords}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <h3 className="text-sm font-medium text-blue-800 mb-1">Total Patients</h3>
                            <p className="text-2xl font-bold text-blue-600">{stats.totalPatients}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <h3 className="text-sm font-medium text-purple-800 mb-1">Total Staff</h3>
                            <p className="text-2xl font-bold text-purple-600">{stats.totalStaff}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <h3 className="text-sm font-medium text-green-800 mb-1">Total Attendance</h3>
                            <p className="text-2xl font-bold text-green-600">{stats.totalAttendance}</p>
                        </div>
                    </div>
                </div>

                {/* Patient Movement Summary */}
                <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Patient Movement Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-yellow-800">Total Admits</h3>
                            <p className="text-2xl font-bold text-yellow-600">{stats.patientMovement?.totalAdmits || 0}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-green-800">Total Discharges</h3>
                            <p className="text-2xl font-bold text-green-600">{stats.patientMovement?.totalDischarges || 0}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800">Total Transfers</h3>
                            <p className="text-2xl font-bold text-blue-600">{stats.patientMovement?.totalTransfers || 0}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-red-800">Total Deaths</h3>
                            <p className="text-2xl font-bold text-red-600">{stats.patientMovement?.totalDeaths || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Staff Summary */}
                <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Staff Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-indigo-800">Total RN</h3>
                            <p className="text-2xl font-bold text-indigo-600">{stats.staffing?.totalRN || 0}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-purple-800">Total PN</h3>
                            <p className="text-2xl font-bold text-purple-600">{stats.staffing?.totalPN || 0}</p>
                        </div>
                        <div className="bg-pink-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-pink-800">Total NA</h3>
                            <p className="text-2xl font-bold text-pink-600">{stats.staffing?.totalNA || 0}</p>
                        </div>
                        <div className="bg-cyan-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-cyan-800">Staff:Patient Ratio</h3>
                            <p className="text-2xl font-bold text-cyan-600">{stats.staffing?.staffToPatientRatio || '0:0'}</p>
                        </div>
                    </div>
                </div>

                {/* Bed Management */}
                <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-lg font-medium text-gray-800 mb-4">Bed Management</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-emerald-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-emerald-800">Total Beds</h3>
                            <p className="text-2xl font-bold text-emerald-600">{stats.bedManagement?.totalBeds || 0}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800">Occupied Beds</h3>
                            <p className="text-2xl font-bold text-blue-600">{stats.bedManagement?.occupiedBeds || 0}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-green-800">Available Beds</h3>
                            <p className="text-2xl font-bold text-green-600">{stats.bedManagement?.availableBeds || 0}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-red-800">Unavailable Beds</h3>
                            <p className="text-2xl font-bold text-red-600">{stats.bedManagement?.unavailableBeds || 0}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-purple-800">Occupancy Rate</h3>
                            <p className="text-2xl font-bold text-purple-600">{stats.bedManagement?.occupancyRate || 0}%</p>
                        </div>
                    </div>
                </div>

                {/* OPD Summary */}
                <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-lg font-medium text-gray-800 mb-4">OPD Summary (24 Hours)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-orange-800">Total OPD</h3>
                            <p className="text-2xl font-bold text-orange-600">{stats.opd?.total24Hr || 0}</p>
                        </div>
                        <div className="bg-teal-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-teal-800">New Patients</h3>
                            <p className="text-2xl font-bold text-teal-600">{stats.opd?.newPatients || 0}</p>
                        </div>
                        <div className="bg-cyan-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-cyan-800">Existing Patients</h3>
                            <p className="text-2xl font-bold text-cyan-600">{stats.opd?.existingPatients || 0}</p>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-rose-800">Admission Rate</h3>
                            <p className="text-2xl font-bold text-rose-600">{stats.opd?.admissionRate || 0}%</p>
                        </div>
                    </div>
                </div>

                {/* Ward Census with Pastel Colors */}
                <div className="bg-white p-6 rounded-lg shadow mb-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-gray-800">Patient Census By Ward</h2>
                        {stats?.supervisorName && (
                            <div className="text-sm text-gray-600">
                                Recorder: {stats.supervisorName}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {wardOrder.map((ward) => (
                            <div
                                key={ward}
                                onClick={() => handleWardClick(ward)}
                                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${wardColors[ward]} shadow hover:shadow-lg`}
                            >
                                <h3 className="text-sm font-medium text-gray-800 mb-1">{ward}</h3>
                                <p className="text-2xl font-bold text-gray-700">{stats.byWard[ward] || 0}</p>
                                <p className="text-xs text-gray-500">Click for details...</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Charts with Updated Pastel Colors */}
                {chartData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-medium text-gray-800 mb-4">Patient Distribution (Pie)</h3>
                            <div style={{ height: '300px' }}>
                                <Pie data={chartData.pie} options={chartOptions} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-medium text-gray-800 mb-4">Patient Distribution (Bar)</h3>
                            <div style={{ height: '300px' }}>
                                <Bar data={chartData.bar} options={chartOptions} />
                            </div>
                        </div>
                    </div>
                )}
                {/* No Data Message */}
                {!loading && !stats?.totalRecords && (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                        <p className="text-black text-lg">No data found for the date... {formatThaiDate(filters.startDate)}</p>
                    </div>
                )}

                {/* Toast */}
                {showToast && (
                    <Toast
                        message={toastMessage}
                        onClose={() => setShowToast(false)}
                    />
                )}

                {/* Ward Modal */}
                {isWardModalOpen && selectedWard && (
                    <WardModal
                        ward={selectedWard}
                        onClose={() => {
                            setIsWardModalOpen(false);
                            setSelectedWard(null);
                        }}
                    />
                )}

                {notification && (
                    <Notification 
                        {...notification}
                        onClose={() => setNotification(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
