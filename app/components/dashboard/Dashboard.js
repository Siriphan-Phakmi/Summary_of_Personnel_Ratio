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

    const handleDateSelect = async (date, shift) => {
        setSelectedDate(date);
        setFilters(prev => ({
            ...prev,
            startDate: date,
            shift: shift || prev.shift
        }));
        setShowCalendar(false);
        
        // Fetch data immediately after setting the filters
        try {
            setLoading(true);
            const recordsRef = collection(db, 'staffRecords');
            const selectedDateStr = getUTCDateString(date);
            
            let fetchedRecords = [];
            const selectedShift = shift || filters.shift;
            
            if (selectedShift === 'all') {
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
                    where('shift', '==', selectedShift)
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
        } finally {
            setLoading(false);
        }
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

        const wardStats = {};
        const totals = {
            totalPatients: 0,
            totalStaff: 0,
            byWard: {},
            wards: {}
        };

        records.forEach(record => {
            if (record.wards) {
                Object.entries(record.wards).forEach(([wardName, wardData]) => {
                    if (!wardStats[wardName]) {
                        wardStats[wardName] = {
                            numberOfPatients: 0,
                            RN: 0,
                            PN: 0,
                            WC: 0,
                            NA: 0,
                            newAdmit: 0,
                            transferIn: 0,
                            referIn: 0,
                            transferOut: 0,
                            referOut: 0,
                            discharge: 0,
                            dead: 0,
                            overallData: 0,
                            availableBeds: 0,
                            unavailable: 0
                        };
                    }

                    // ตรวจสอบ shift ก่อนการรวมข้อมูล
                    if (filters.shift === 'all' || record.shift === filters.shift) {
                        // แปลงค่าทั้งหมดเป็นตัวเลขก่อนการคำนวณ
                        const numberOfPatients = parseInt(wardData.numberOfPatients) || 0;
                        const RN = parseInt(wardData.RN) || 0;
                        const PN = parseInt(wardData.PN) || 0;
                        const WC = parseInt(wardData.WC) || 0;
                        const NA = parseInt(wardData.NA) || 0;
                        const newAdmit = parseInt(wardData.newAdmit) || 0;
                        const transferIn = parseInt(wardData.transferIn) || 0;
                        const referIn = parseInt(wardData.referIn) || 0;
                        const transferOut = parseInt(wardData.transferOut) || 0;
                        const referOut = parseInt(wardData.referOut) || 0;
                        const discharge = parseInt(wardData.discharge) || 0;
                        const dead = parseInt(wardData.dead) || 0;
                        const availableBeds = parseInt(wardData.availableBeds) || 0;
                        const unavailable = parseInt(wardData.unavailable) || 0;

                        // รวมข้อมูล
                        wardStats[wardName].numberOfPatients += numberOfPatients;
                        wardStats[wardName].RN += RN;
                        wardStats[wardName].PN += PN;
                        wardStats[wardName].WC += WC;
                        wardStats[wardName].NA += NA;
                        wardStats[wardName].newAdmit += newAdmit;
                        wardStats[wardName].transferIn += transferIn;
                        wardStats[wardName].referIn += referIn;
                        wardStats[wardName].transferOut += transferOut;
                        wardStats[wardName].referOut += referOut;
                        wardStats[wardName].discharge += discharge;
                        wardStats[wardName].dead += dead;
                        wardStats[wardName].availableBeds += availableBeds;
                        wardStats[wardName].unavailable += unavailable;

                        // คำนวณ overallData
                        wardStats[wardName].overallData = 
                            numberOfPatients +
                            newAdmit +
                            transferIn +
                            referIn -
                            transferOut -
                            referOut -
                            discharge -
                            dead;
                    }
                });
            }
        });

        // คำนวณผลรวมทั้งหมด
        Object.entries(wardStats).forEach(([wardName, stats]) => {
            totals.totalPatients += stats.numberOfPatients;
            totals.totalStaff += stats.RN + stats.PN + stats.WC + stats.NA;
            totals.byWard[wardName] = stats.numberOfPatients;
            totals.wards[wardName] = stats;
        });

        return {
            ...totals,
            totalRecords: records.length,
            totalAttendance: records.reduce((sum, record) => {
                return sum + (parseInt(record.totalAttendance) || 0);
            }, 0),
            supervisorName: records
                .map(r => r.supervisorName)
                .filter(Boolean)
                .join(', ')
        };
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
        if (!stats?.wards || Object.keys(stats.wards).length === 0) {
            return {
                pie: null,
                bar: null
            };
        }

        const sortedWards = selectedWard 
            ? [selectedWard] 
            : wardOrder.filter(ward => stats.wards[ward]); // Only include wards that have data
            
        if (sortedWards.length === 0) {
            return {
                pie: null,
                bar: null
            };
        }

        const labels = sortedWards;
        const availableBedsData = sortedWards.map(ward => stats.wards[ward]?.availableBeds || 0);
        const overallData = sortedWards.map(ward => stats.wards[ward]?.overallData || 0);
        const totalOverall = overallData.reduce((sum, val) => sum + val, 0);

        return {
            pie: {
                labels,
                datasets: [{
                    data: availableBedsData,
                    backgroundColor: selectedWard 
                        ? [chartColors.background[wardOrder.indexOf(selectedWard)]]
                        : chartColors.background.slice(0, labels.length),
                    borderColor: selectedWard 
                        ? [chartColors.border[wardOrder.indexOf(selectedWard)]]
                        : chartColors.border.slice(0, labels.length),
                    borderWidth: 1,
                }]
            },
            bar: {
                labels: selectedWard ? [selectedWard] : [...labels, 'Total'],
                datasets: [{
                    label: 'Overall Data',
                    data: selectedWard 
                        ? overallData 
                        : [...overallData, totalOverall],
                    backgroundColor: selectedWard 
                        ? [chartColors.background[wardOrder.indexOf(selectedWard)]]
                        : [...chartColors.background.slice(0, labels.length), 'rgba(75, 192, 192, 0.8)'],
                    borderColor: selectedWard 
                        ? [chartColors.border[wardOrder.indexOf(selectedWard)]]
                        : [...chartColors.border.slice(0, labels.length), 'rgb(75, 192, 192)'],
                    borderWidth: 1,
                }]
            }
        };
    }, [stats, wardOrder, selectedWard]);

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
            },
            title: {
                display: true,
                text: 'Available Beds by Ward',
                color: 'black',
                font: {
                    size: 16
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        return `${label}: ${value} beds available`;
                    }
                }
            }
        },
        onClick: (event, elements) => {
            if (elements && elements.length > 0) {
                const clickedWard = chartData.pie.labels[elements[0].index];
                setSelectedWard(clickedWard);
            }
        },
        elements: {
            arc: {
                cursor: 'pointer'
            }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Overall Data by Ward',
                color: 'black',
                font: {
                    size: 16
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Patients'
                }
            }
        },
        onClick: (event, elements) => {
            if (elements && elements.length > 0) {
                const clickedWard = chartData.bar.labels[elements[0].index];
                if (clickedWard === 'Total') {
                    setSelectedWard(null);
                } else {
                    setSelectedWard(clickedWard);
                }
            }
        },
        elements: {
            bar: {
                cursor: 'pointer'
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

        // สร้างข้อมูลสำหรับ Pie Chart (เตียงว่าง)
        const wardPieData = {
            labels: ['Available Beds', 'Occupied Beds', 'Unavailable Beds'],
            datasets: [{
                data: [
                    ward.availableBeds || 0,
                    ward.numberOfPatients || 0,
                    ward.unavailable || 0
                ],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',  // สีเขียว - เตียงว่าง
                    'rgba(59, 130, 246, 0.8)', // สีน้ำเงิน - เตียงที่มีคนไข้
                    'rgba(239, 68, 68, 0.8)'   // สีแดง - เตียงใช้งานไม่ได้
                ],
                borderColor: [
                    'rgb(34, 197, 94)',
                    'rgb(59, 130, 246)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 1,
            }]
        };

        // สร้างข้อมูลสำหรับ Bar Chart (Overall Data)
        const wardBarData = {
            labels: ['Patient Movement'],
            datasets: [
                {
                    label: 'Admissions',
                    data: [ward.newAdmit || 0],
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                },
                {
                    label: 'Transfers In',
                    data: [ward.transferIn || 0],
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                },
                {
                    label: 'Transfers Out',
                    data: [ward.transferOut || 0],
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                },
                {
                    label: 'Discharges',
                    data: [ward.discharge || 0],
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgb(245, 158, 11)',
                    borderWidth: 1,
                }
            ]
        };

        const modalPieOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Bed Status Distribution',
                    color: 'black',
                    font: {
                        size: 16
                    }
                }
            }
        };

        const modalBarOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Patient Movement',
                    color: 'black',
                    font: {
                        size: 16
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Patients'
                    }
                }
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-black">{ward.name}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800">Patient Census</h3>
                            <p className="text-2xl font-bold text-blue-600">{ward.numberOfPatients || 0}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-green-800">Available Beds</h3>
                            <p className="text-2xl font-bold text-green-600">{ward.availableBeds || 0}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-purple-800">Overall Data</h3>
                            <p className="text-2xl font-bold text-purple-600">{ward.overallData || 0}</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div style={{ height: '300px' }}>
                                <Pie data={wardPieData} options={modalPieOptions} />
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div style={{ height: '300px' }}>
                                <Bar data={wardBarData} options={modalBarOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Staff Details */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-800 mb-2">Staff Distribution</h3>
                            <div className="space-y-2">
                                <p className="text-gray-600">Nurse Manager: {ward.nurseManager || 0}</p>
                                <p className="text-gray-600">RN: {ward.RN || 0}</p>
                                <p className="text-gray-600">PN: {ward.PN || 0}</p>
                                <p className="text-gray-600">WC: {ward.WC || 0}</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-800 mb-2">Additional Information</h3>
                            <div className="space-y-2">
                                <p className="text-gray-600">Plan D/C: {ward.plannedDischarge || 0}</p>
                                <p className="text-gray-600">Dead: {ward.dead || 0}</p>
                                <p className="text-gray-600">Comment: {ward.comment || '-'}</p>
                            </div>
                        </div>
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
                {/* Calendar and Filters Section */}
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

                    {showCalendar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="relative bg-white rounded-lg">
                            <Calendar 
                                    selectedDate={selectedDate}
                                onDateSelect={handleDateSelect}
                                onClickOutside={() => setShowCalendar(false)}
                                datesWithData={datesWithData}
                                selectedShift={filters.shift}
                                variant="dashboard"
                            />
                        </div>
                    </div>
                    )}

                    {/* Total Patients Card */}
                    <div className="bg-blue-100 rounded-xl p-6 mb-6 cursor-pointer hover:bg-blue-200 transition-colors duration-200"
                        onClick={() => {
                            setSelectedWard(null);
                            // Scroll to Detailed Ward Information
                            document.getElementById('detailed-ward-info')?.scrollIntoView({ behavior: 'smooth' });
                        }}>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-blue-800">Patient Census</h2>
                            <p className="text-4xl font-bold text-blue-600">{stats?.totalPatients || 0}</p>
                    </div>
                    </div>

                    {/* Ward Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {Object.entries(stats?.byWard || {}).map(([ward, count]) => (
                            <div
                                key={ward}
                                onClick={() => {
                                    setSelectedWard(ward);
                                    // Scroll to Detailed Ward Information
                                    document.getElementById('detailed-ward-info')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className={`${wardColors[ward]} p-3 rounded-xl shadow-md cursor-pointer transform transition-all duration-200 hover:scale-105 ${selectedWard === ward ? 'ring-2 ring-blue-500' : ''}`}
                            >
                                <h3 className="text-base font-semibold text-black text-center">{ward}</h3>
                                <p className="text-2xl font-bold text-black text-center">{count}</p>
                    </div>
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Pie Chart for Available Beds */}
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-lg font-semibold mb-4 text-black">
                                Available Beds Distribution
                                {selectedWard && (
                                    <button
                                        onClick={() => setSelectedWard(null)}
                                        className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        (Show All)
                                    </button>
                                )}
                            </h3>
                            <div style={{ height: '300px' }}>
                                {chartData?.pie && chartData.pie.labels && chartData.pie.labels.length > 0 ? (
                                    <Pie data={chartData.pie} options={pieOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">
                                        No data available
                                    </div>
                                )}
                </div>
            </div>

                        {/* Bar Chart for Overall Data */}
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-lg font-semibold mb-4 text-black">
                                Overall Data by Ward
                                {selectedWard && (
                                    <button
                                        onClick={() => setSelectedWard(null)}
                                        className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        (Show All)
                                    </button>
                                )}
                            </h3>
                            <div style={{ height: '300px' }}>
                                {chartData?.bar && chartData.bar.labels && chartData.bar.labels.length > 0 ? (
                                    <Bar data={chartData.bar} options={barOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">
                                        No data available
                        </div>
                    )}
                </div>
                        </div>
                </div>

                    {/* Section Title for Table */}
                    <div id="detailed-ward-info" className="text-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Detailed Ward Information</h2>
            </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full">
                                <div className="bg-white rounded-xl shadow-lg">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                                                <th className="sticky left-0 bg-gradient-to-r from-blue-50 to-purple-50 p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Ward</th>                                    
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Patient Census</th>                                    
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">RN</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">PN</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">WC</th>      
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">New Admit</th>                              
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Transfer In</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Refer In</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Transfer Out</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Refer Out</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Discharge</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Dead</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Overall Data</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Available</th>
                                                <th className="p-2 text-center text-xs font-semibold text-gray-800 whitespace-nowrap">Unavailable</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(stats?.byWard || {})
                                                .filter(([ward]) => !selectedWard || ward === selectedWard)
                                                .map(([ward, data], index) => {
                                                    const wardData = stats?.wards?.[ward] || {};
                                                    return (
                                                        <tr key={ward} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="sticky left-0 p-2 text-xs font-medium text-gray-900 text-center whitespace-nowrap bg-inherit">{ward}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.numberOfPatients || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.RN || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.PN || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.WC || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.newAdmit || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.transferIn || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.referIn || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.transferOut || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.referOut || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.discharge || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.dead || 0}</td>
                                                            <td className="p-2 text-xs font-medium text-gray-900 text-center whitespace-nowrap bg-gray-50">{wardData.overallData || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.availableBeds || 0}</td>
                                                            <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">{wardData.unavailable || 0}</td>
                                                        </tr>
                                                    );
                                                })}
                                            {/* Total Row - Always shown */}
                                            <tr className="bg-gray-100 font-semibold">
                                                <td className="sticky left-0 p-2 text-xs font-medium text-gray-900 text-center whitespace-nowrap bg-gray-100">Total</td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.numberOfPatients || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.RN || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.PN || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.WC || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.newAdmit || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.transferIn || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.referIn || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.transferOut || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.referOut || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.discharge || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.dead || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs font-medium text-gray-900 text-center whitespace-nowrap bg-gray-200">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.overallData || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.availableBeds || 0), 0)}
                                                </td>
                                                <td className="p-2 text-xs text-gray-800 text-center whitespace-nowrap">
                                                    {Object.values(stats?.wards || {}).reduce((sum, ward) => sum + (ward.unavailable || 0), 0)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                        </div>
                    </div>
                        </div>
                        {/* Scroll Indicator */}
                        <div className="mt-2 text-center text-xs text-gray-500 md:hidden">
                            ← เลื่อนซ้าย-ขวาเพื่อดูข้อมูลเพิ่มเติม →
                    </div>
                </div>

                    {/* Mobile Table View */}
                    <div className="md:hidden">
                        <div className="space-y-4">
                            {Object.entries(stats?.byWard || {})
                                .filter(([ward]) => !selectedWard || ward === selectedWard)
                                .map(([ward]) => {
                                    const wardData = stats?.wards?.[ward] || {};
                                    return (
                                        <div key={ward} className="bg-white p-4 rounded-lg shadow">
                                            <h3 className="text-lg font-semibold mb-2">{ward}</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Patient Census</p>
                                                    <p className="text-lg font-medium">{wardData.numberOfPatients || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Overall Data</p>
                                                    <p className="text-lg font-medium">{wardData.overallData || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Reset Selection Button - แสดงเมื่อมีการเลือกแผนก */}
                    {selectedWard && (
                        <div className="flex justify-center mb-6">
                            <button
                                onClick={() => setSelectedWard(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors duration-200"
                            >
                                แสดงข้อมูลทุกแผนก
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <Notification 
                    {...notification}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
