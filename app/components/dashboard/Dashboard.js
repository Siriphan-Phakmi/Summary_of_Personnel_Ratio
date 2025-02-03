'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
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

    useEffect(() => {
        const fetchDatesWithData = async () => {
            try {
                const recordsRef = collection(db, 'staffRecords');
                const querySnapshot = await getDocs(recordsRef);
                
                // Get unique dates from records and normalize them
                const dates = new Set();
                querySnapshot.docs.forEach(doc => {
                    const record = doc.data();
                    let date = record.date;
                    if (!date && record.timestamp) {
                        date = record.timestamp.toDate().toISOString().split('T')[0];
                    }
                    if (date) {
                        // Normalize the date format
                        const normalizedDate = new Date(date);
                        const isoDate = normalizedDate.toISOString().split('T')[0];
                        dates.add(isoDate);
                    }
                });
                
                setDatesWithData(Array.from(dates));
            } catch (err) {
                console.error('Error fetching dates with data:', err);
            }
        };

        fetchDatesWithData();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const recordsRef = collection(db, 'staffRecords');
                
                // ใช้ date string แทน timestamp เพื่อค้นหาข้อมูล
                const dateStr = filters.startDate.toISOString().split('T')[0];
                
                let q = query(recordsRef);
                const querySnapshot = await getDocs(q);
                
                // กรองข้อมูลหลังจากได้รับข้อมูลทั้งหมด
                const fetchedRecords = querySnapshot.docs
                    .map(doc => {
                        try {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                ...data,
                                timestamp: data.timestamp?.toDate(),
                                // Ensure date is always available
                                date: data.date || 
                                    (data.timestamp ? data.timestamp.toDate().toISOString().split('T')[0] : null)
                            };
                        } catch (err) {
                            console.error('Error processing record:', err);
                            return null;
                        }
                    })
                    .filter(record => {
                        if (!record) return false;
                        const recordDate = record.date;
                        return recordDate === dateStr && 
                            (filters.shift === 'all' || record.shift === filters.shift);
                    });

                if (fetchedRecords.length === 0) {
                    setRecords([]);
                    setStats(resetStats());
                } else {
                    setRecords(fetchedRecords);
                    const newStats = calculateStats(fetchedRecords);
                    setStats(newStats);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message);
                setStats(resetStats());
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

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
        if (!records || records.length === 0) {
            return resetStats();
        }

        try {
            const latestRecord = records[records.length - 1];
            
            // Calculate total records
            const totalRecords = records.length;

            // Calculate patients and ward data
            let totalPatients = 0;
            let totalStaff = 0;
            const byWard = {};

            if (latestRecord.wards) {
                Object.entries(latestRecord.wards).forEach(([ward, data]) => {
                    if (!data) return; // Skip if ward data is null/undefined
                    
                    // Calculate patients in each ward
                    const patients = parseNumberValue(data.numberOfPatients);
                    byWard[ward] = patients;
                    totalPatients += patients;

                    // Calculate staff in each ward
                    const rn = parseNumberValue(data.RN);
                    const pn = parseNumberValue(data.PN);
                    const na = parseNumberValue(data.NA);
                    totalStaff += (rn + pn + na);
                });
            }

            // Calculate total attendance
            const totalAttendance = parseNumberValue(latestRecord.totalAttendance);

            return {
                totalRecords,
                totalPatients,
                totalStaff,
                totalAttendance,
                byWard,
                supervisorName: latestRecord.supervisorName || ''
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
        plugins: {
            legend: {
                position: 'right',
            },
            title: {
                display: true,
                text: 'Patient Distribution',
                color: 'black',
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

    // เพิ่มฟังก์ชันใหม่สำหรับจัดการ timezone
    const adjustForTimezone = (date) => {
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - userTimezoneOffset);
    };

    const handleDateSelect = (date, shift) => {
        // เพิ่มการตรวจสอบว่าถ้าวันที่เท่าเดิมและเปลี่ยนแค่ shift ไม่ต้อง update selectedDate
        if (selectedDate.toDateString() !== date.toDateString()) {
            setSelectedDate(date);
        }
        setFilters(prev => ({ 
            ...prev, 
            startDate: date,
            shift: shift || prev.shift 
        }));
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
                    <div className="absolute left-0 top-0">
                        <Calendar 
                            selectedDate={selectedDate} 
                            onDateSelect={handleDateSelect}
                            onClickOutside={() => setShowCalendar(false)}
                            datesWithData={datesWithData}
                            selectedShift={filters.shift}
                        />
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
        </div>
    );
};

export default Dashboard;
