'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, query, getDocs, Timestamp, where } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';
import Toast from '@/app/components/ui/Toast';
import Calendar from '@/app/components/ui/Calendar';

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
            const newStats = calculateStats(fetchedRecords);
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

    const handleDateSelect = (date, shift) => {
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

    // สีสำหรับกราฟ
    const chartColors = {
        background: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)',
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)'
        ],
        border: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
        ]
    };

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
                        วันที่: {formatThaiDate(selectedDate)}
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

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-black mb-1">Total Records</h3>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalRecords}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-black mb-1">Total Patients</h3>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalPatients}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-black mb-1">Total Staff</h3>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalStaff}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-black mb-1">Total Attendance</h3>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalAttendance}</p>
                    </div>
                </div>
            </div>

            {/* Ward Census */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-black">Patient Census By Ward</h2>
                    {stats?.supervisorName && (
                        <div className="text-sm text-gray-600">
                            Recorder: {stats.supervisorName}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.byWard).map(([ward, count]) => (
                        <div
                            key={ward}
                            onClick={() => handleWardClick(ward)}
                            className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            <h3 className="text-sm font-medium text-black mb-1">{ward}</h3>
                            <p className="text-2xl font-bold text-blue-600">{count}</p>
                            <p className="text-xs text-gray-500">Details...</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts */}
            {chartData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-medium text-black mb-4">Patient Distribution (Pie)</h3>
                        <div style={{ height: '300px' }}>
                            <Pie data={chartData.pie} options={chartOptions} />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-medium text-black mb-4">Patient Distribution (Bar)</h3>
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
    );
};

export default Dashboard;
