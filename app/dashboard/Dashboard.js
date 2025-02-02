'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import Toast from '../components/ui/Toast';
import CustomTooltip from '../components/ui/Tooltip';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allRecords, setAllRecords] = useState([]);
    const [overallData, setOverallData] = useState({
        total: 0,
        overallData: 0,
        byWard: {},
        summaryData: {
            opdTotal24hr: 0,
            existingPatients: 0,
            newPatients: 0,
            admissions24hr: 0
        },
        calculations: {
            admissionRate: 0,
            conversionRatio: 0
        }
    });

    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        shift: 'All Shifts',
        ward: 'All Wards',
        recorder: 'All Recorders',
        viewType: 'daily'
    });

    const [selectedDate, setSelectedDate] = useState('');
    const [recordedDate, setRecordedDate] = useState('');
    const [recordedTime, setRecordedTime] = useState('');
    const [wardData, setWardData] = useState([]);
    const [totalPatients, setTotalPatients] = useState(0);
    const [availableDates, setAvailableDates] = useState([]);
    const [recorders, setRecorders] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const [selectedWard, setSelectedWard] = useState(null);
    const [isWardModalOpen, setIsWardModalOpen] = useState(false);

    const [showNoDataAlert, setShowNoDataAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const wardList = [
        'Ward6', 'Ward7', 'Ward8', 'Ward9', 'WardGI',
        'Ward10B', 'Ward11', 'Ward12', 'ICU', 'CCU',
        'LR', 'NSY'
    ];

    const shiftList = ['07:00-19:00', '19:00-07:00'];

    const colors = {
        background: [
            'rgba(255, 182, 193, 0.6)', // pink
            'rgba(255, 218, 185, 0.6)', // peach
            'rgba(152, 251, 152, 0.6)', // pale green
            'rgba(135, 206, 250, 0.6)', // light blue
            'rgba(221, 160, 221, 0.6)', // plum
            'rgba(255, 255, 153, 0.6)', // light yellow
            'rgba(176, 224, 230, 0.6)', // powder blue
            'rgba(255, 160, 122, 0.6)', // light salmon
        ],
        border: [
            'rgb(255, 182, 193)',
            'rgb(255, 218, 185)',
            'rgb(152, 251, 152)',
            'rgb(135, 206, 250)',
            'rgb(221, 160, 221)',
            'rgb(255, 255, 153)',
            'rgb(176, 224, 230)',
            'rgb(255, 160, 122)',
        ]
    };

    const calculateRates = useCallback((currentTotal, opdTotal) => {
        if (!currentTotal || !opdTotal) return { admissionRate: 0, conversionRatio: 0 };
        const admissionRate = ((currentTotal * 100) / opdTotal).toFixed(2);
        const conversionRatio = (opdTotal / currentTotal).toFixed(2);
        return { admissionRate, conversionRatio };
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const staffRef = collection(db, 'staffRecords');
            const q = query(staffRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('ไม่พบข้อมูลในระบบ');
                return;
            }

            const records = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                };
            });

            setAllRecords(records);

            // Get latest record
            const latestRecord = records[0];
            if (!latestRecord) {
                setError('ไม่พบข้อมูลล่าสุด');
                return;
            }

            // Calculate total patients from wards
            const totalPatients = Object.values(latestRecord.wards || {}).reduce((sum, ward) => {
                return sum + (parseInt(ward.numberOfPatients) || 0);
            }, 0);

            // Update overall data
            setOverallData({
                total: totalPatients,
                overallData: latestRecord.overallData || totalPatients,
                byWard: latestRecord.wards || {},
                summaryData: {
                    opdTotal24hr: parseInt(latestRecord.summaryData?.opdTotal24hr) || 0,
                    existingPatients: parseInt(latestRecord.summaryData?.existingPatients) || 0,
                    newPatients: parseInt(latestRecord.summaryData?.newPatients) || 0,
                    admissions24hr: parseInt(latestRecord.summaryData?.admissions24hr) || 0
                },
                calculations: calculateRates(
                    totalPatients,
                    parseInt(latestRecord.summaryData?.opdTotal24hr) || 0
                )
            });

            // Update recorded date and time
            setRecordedDate(latestRecord.recordedDate);
            setRecordedTime(latestRecord.recordedTime);

            // Create list of available dates
            const dates = [...new Set(records.map(record => record.date))];
            setAvailableDates(dates.sort().reverse());

            // Create list of recorders
            const uniqueRecorders = [...new Set(records.map(record => record.recorder))].filter(Boolean);
            setRecorders(uniqueRecorders.sort());

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Helper functions
    const isValidWardData = (wardData) => {
        if (!wardData) return false;
        return (
            wardData.numberOfPatients > 0 || 
            wardData.RN > 0 || 
            wardData.PN > 0 || 
            wardData.NA > 0
        );
    };

    const filterData = (records = allRecords, currentFilters = filters) => {
        let filteredRecords = [...records];

        // Date/Time based filtering
        if (currentFilters.viewType === 'daily' && currentFilters.date) {
            filteredRecords = filteredRecords.filter(record => record.date === currentFilters.date);
        } else if (currentFilters.viewType === 'monthly' && selectedMonth) {
            filteredRecords = filteredRecords.filter(record => 
                record.date.startsWith(selectedMonth)
            );
        } else if (currentFilters.viewType === 'yearly' && selectedYear) {
            filteredRecords = filteredRecords.filter(record => 
                record.date.startsWith(selectedYear)
            );
        }

        // Shift filtering
        if (currentFilters.shift !== 'All Shifts') {
            filteredRecords = filteredRecords.filter(record => 
                record.shift === currentFilters.shift
            );
        }

        // Enhanced ward filtering with validation
        if (currentFilters.ward !== 'All Wards') {
            filteredRecords = filteredRecords.filter(record => {
                if (!record.wards || !record.wards[currentFilters.ward]) {
                    return false;
                }
                return isValidWardData(record.wards[currentFilters.ward]);
            });
        }

        // Sort results by date and shift
        filteredRecords.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            if (a.shift && b.shift) {
                return a.shift.localeCompare(b.shift);
            }
            return 0;
        });

        return filteredRecords;
    };

    // Function to aggregate data from filtered records
    const aggregateData = useCallback((records) => {
        if (!records.length) return {
            total: 0,
            overallData: 0,
            byWard: {},
            summaryData: {
                opdTotal24hr: 0,
                existingPatients: 0,
                newPatients: 0,
                admissions24hr: 0
            },
            calculations: {
                admissionRate: 0,
                conversionRatio: 0
            }
        };

        // Get the latest record for the filtered set
        const latestRecord = records[0];
        
        // Calculate total patients from wards
        const totalPatients = Object.values(latestRecord.wards || {}).reduce((sum, ward) => {
            return sum + (parseInt(ward.numberOfPatients) || 0);
        }, 0);

        return {
            total: totalPatients,
            overallData: latestRecord.overallData || totalPatients,
            byWard: latestRecord.wards || {},
            summaryData: {
                opdTotal24hr: parseInt(latestRecord.summaryData?.opdTotal24hr) || 0,
                existingPatients: parseInt(latestRecord.summaryData?.existingPatients) || 0,
                newPatients: parseInt(latestRecord.summaryData?.newPatients) || 0,
                admissions24hr: parseInt(latestRecord.summaryData?.admissions24hr) || 0
            },
            calculations: calculateRates(
                totalPatients,
                parseInt(latestRecord.summaryData?.opdTotal24hr) || 0
            )
        };
    }, [calculateRates]);

    // Effect to update data when filters change
    useEffect(() => {
        const filtered = filterData();
        if (filtered.length > 0) {
            const aggregatedData = aggregateData(filtered);
            setOverallData(aggregatedData);
            
            // Update recorded date and time from the latest filtered record
            const latestFilteredRecord = filtered[0];
            setRecordedDate(latestFilteredRecord.recordedDate);
            setRecordedTime(latestFilteredRecord.recordedTime);
        } else {
            setAlertMessage('ไม่พบข้อมูลสำหรับตัวกรองที่เลือก');
            setShowNoDataAlert(true);
        }
    }, [filters, selectedMonth, selectedYear, allRecords, aggregateData]);

    // Check for today's data
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const hasTodayData = allRecords.some(record => record.date === today);
        
        if (!hasTodayData && allRecords.length > 0) {
            setAlertMessage(`ไม่พบข้อมูลสำหรับวันที่ ${today} กรุณาเลือกวันที่อื่น`);
            setShowNoDataAlert(true);
            
            // Set to latest available date
            const latestRecord = allRecords[0];
            setFilters(prev => ({
                ...prev,
                date: latestRecord.date
            }));
        }
    }, [allRecords]);

    // Alert component
    const renderAlert = () => {
        if (!showNoDataAlert) return null;
        
        return (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-amber-700">
                            {alertMessage}
                        </p>
                    </div>
                    <div className="ml-auto pl-3">
                        <div className="-mx-1.5 -my-1.5">
                            <button
                                onClick={() => setShowNoDataAlert(false)}
                                className="inline-flex rounded-md p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                            >
                                <span className="sr-only">Dismiss</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Filter summary component
    const renderFilterSummary = () => {
        const summary = [];
        if (filters.viewType === 'daily') {
            summary.push(`วันที่: ${filters.date}`);
        } else if (filters.viewType === 'monthly') {
            summary.push(`เดือน: ${selectedMonth}`);
        } else if (filters.viewType === 'yearly') {
            summary.push(`ปี: ${selectedYear}`);
        }
        if (filters.shift !== 'All Shifts') {
            summary.push(`กะ: ${filters.shift}`);
        }
        if (filters.ward !== 'All Wards') {
            summary.push(`วอร์ด: ${filters.ward}`);
        }

        if (summary.length === 0) return null;

        return (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg shadow-sm">
                <p className="text-sm text-blue-700">
                    📊 ตัวกรองปัจจุบัน: {summary.join(' | ')}
                </p>
            </div>
        );
    };

    const { pieData, barData } = useMemo(() => {
        const wardData = overallData.byWard;
        const labels = Object.keys(wardData);
        const patientData = labels.map(ward => wardData[ward]?.numberOfPatients || 0);

        return {
            pieData: {
                labels,
                datasets: [{
                    data: patientData,
                    backgroundColor: colors.background.slice(0, labels.length),
                    borderColor: colors.border.slice(0, labels.length),
                    borderWidth: 1,
                }]
            },
            barData: {
                labels,
                datasets: [{
                    label: 'Patient Census',
                    data: patientData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                }]
            }
        };
    }, [overallData.byWard]);

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Patient Census By Ward',
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
            },
            title: {
                display: true,
                text: 'Patient Distribution by Ward',
            }
        }
    };

    const [toastConfig, setToastConfig] = useState(null);

    const showToast = (message, type = 'info') => {
        setToastConfig({ message, type });
    };

    const handleExportError = (error) => {
        showToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'error');
    };

    const handleWardClick = (wardName) => {
        const wardDetails = overallData.byWard[wardName];
        if (wardDetails) {
            setSelectedWard({
                name: wardName,
                ...wardDetails
            });
            setIsWardModalOpen(true);
        }
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return (
            <ErrorState
                message={error}
                onRetry={() => {
                    fetchAllData();
                    showToast('กำลังโหลดข้อมูลใหม่...', 'info');
                }}
            />
        );
    }

    if (!allRecords || allRecords.length === 0) {
        return (
            <EmptyState
                message="ยังไม่มีข้อมูลในระบบ"
                actionLabel="เพิ่มข้อมูลใหม่"
                onAction={() => {/* handle action */}}
            />
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {renderAlert()}
            {renderFilterSummary()}
            
            {/* Filter Section */}
            <div className="bg-pastel-yellow-50 rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Filter Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-gray-700">วันที่</span>
                        </label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            className="input input-bordered w-full text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-gray-700">View Type</span>
                        </label>
                        <select
                            value={filters.viewType}
                            onChange={(e) => setFilters({ ...filters, viewType: e.target.value })}
                            className="select select-bordered w-full text-gray-700 bg-white"
                        >
                            <option value="daily">Daily</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-gray-700">Shift</span>
                        </label>
                        <select
                            value={filters.shift}
                            onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
                            className="select select-bordered w-full text-gray-700 bg-white"
                        >
                            <option value="All Shifts">All Shifts</option>
                            {shiftList.map(shift => (
                                <option key={shift} value={shift}>{shift}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-gray-700">Ward</span>
                        </label>
                        <select
                            value={filters.ward}
                            onChange={(e) => setFilters({ ...filters, ward: e.target.value })}
                            className="select select-bordered w-full text-gray-700 bg-white"
                        >
                            <option value="All Wards">All Wards</option>
                            {wardList.map(ward => (
                                <option key={ward} value={ward}>{ward}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-gray-700">Recorder</span>
                        </label>
                        <select
                            value={filters.recorder}
                            onChange={(e) => setFilters({ ...filters, recorder: e.target.value })}
                            className="select select-bordered w-full text-gray-700 bg-white"
                        >
                            <option value="All Recorders">All Recorders</option>
                            {recorders.map(recorder => (
                                <option key={recorder} value={recorder}>{recorder}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="bg-pastel-blue-50 rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Total Records</h3>
                        <p className="text-3xl font-bold text-blue-600">{filterData().length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Total Patients</h3>
                        <p className="text-3xl font-bold text-green-600">{overallData.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Total OPD</h3>
                        <p className="text-3xl font-bold text-purple-600">{overallData.summaryData.opdTotal24hr}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Total Admissions</h3>
                        <p className="text-3xl font-bold text-orange-600">{overallData.summaryData.admissions24hr}</p>
                    </div>
                </div>
            </div>

            {/* Notification for No Data */}
            {filterData().length === 0 && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-8">
                    ไม่มีข้อมูลสำหรับตัวกรองที่เลือก
                </div>
            )}

            {/* 24-hour Summary Section */}
            <div className="bg-pastel-blue-50 rounded-lg shadow p-6 mb-8">
                <h1 className="text-2xl font-bold mb-4 text-gray-800">24-hour Summary</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Summary Cards */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Current data</h3>
                        <p className="text-3xl font-bold text-blue-600">{overallData.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Overall data</h3>
                        <p className="text-3xl font-bold text-green-600">{overallData.overallData}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">OPD 24 hour</h3>
                        <p className="text-3xl font-bold text-purple-600">{overallData.summaryData.opdTotal24hr}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Admission Rate</h3>
                        <p className="text-3xl font-bold text-purple-600">{overallData.calculations.admissionRate}%</p>
                        <p className="text-sm text-gray-600">Patient Census x 100 / OPD 24 hour</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Conversion Ratio</h3>
                        <p className="text-3xl font-bold text-orange-600">{overallData.calculations.conversionRatio}</p>
                        <p className="text-sm text-gray-600">OPD 24 hour / Patient Census</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Old Patient</h3>
                        <p className="text-3xl font-bold text-gray-700">{overallData.summaryData.existingPatients}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">New Patient</h3>
                        <p className="text-3xl font-bold text-gray-700">{overallData.summaryData.newPatients}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Admit 24 hour</h3>
                        <p className="text-3xl font-bold text-gray-700">{overallData.summaryData.admissions24hr}</p>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4 text-gray-800">Charts and Patient Census</h1>
                {/* Charts and Patient Census Section */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold mb-6 text-gray-800">Patient Census By Ward</h2>
                    
                    {/* Ward Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                        {Object.entries(overallData.byWard).map(([ward, data]) => (
                            <div
                                key={ward}
                                onClick={() => handleWardClick(ward)}
                                className="bg-pastel-green-50 p-4 rounded-lg cursor-pointer hover:bg-pastel-green-100 transition-colors border border-green-200"
                            >
                                <h3 className="font-semibold text-lg text-gray-800">{ward}</h3>
                                <p className="text-2xl font-bold text-green-700">{data.numberOfPatients || 0}</p>
                                <p className="text-sm text-gray-600">คลิกเพื่อดูรายละเอียด</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        {/* Pie Chart */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4" style={{ height: '400px' }}>
                            <h3 className="text-lg font-bold mb-4 text-gray-800">Patient Distribution by Ward</h3>
                            <div style={{ height: '320px' }}>
                                <Pie data={pieData} options={pieOptions} />
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4" style={{ height: '400px' }}>
                            <h3 className="text-lg font-bold mb-4 text-gray-800">Patient Census By Ward</h3>
                            <div style={{ height: '320px' }}>
                                <Bar options={barOptions} data={barData} />
                            </div>
                        </div>
                    </div>

                    {/* Last Updated */}
                    <div className="text-sm text-gray-600 mt-4">
                        Last updated: {recordedDate} {recordedTime}
                    </div>
                </div>
                
                {/* Toast Notification */}
                {toastConfig && (
                    <Toast
                        message={toastConfig.message}
                        type={toastConfig.type}
                        onClose={() => setToastConfig(null)}
                    />
                )}
            </div>

            {/* Ward Modal */}
            {isWardModalOpen && selectedWard && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {selectedWard.name} - รายละเอียด
                            </h2>
                            <button
                                onClick={() => setIsWardModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Patient Census */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="font-semibold mb-2 text-gray-800">Patient Census</h3>
                                <p className="text-2xl font-bold text-blue-700">
                                    {selectedWard.numberOfPatients || 0}
                                </p>
                            </div>

                            {/* Staff */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h3 className="font-semibold mb-2 text-gray-800">Staff</h3>
                                <div className="space-y-1 text-gray-700">
                                    <p>Nurse Manager: <span className="font-semibold">{selectedWard.nurseManager || 0}</span></p>
                                    <p>RN: <span className="font-semibold">{selectedWard.RN || 0}</span></p>
                                    <p>PN: <span className="font-semibold">{selectedWard.PN || 0}</span></p>
                                    <p>WC: <span className="font-semibold">{selectedWard.WC || 0}</span></p>
                                </div>
                            </div>

                            {/* Patient Movement */}
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h3 className="font-semibold mb-2 text-gray-800">Patient Movement</h3>
                                <div className="space-y-1 text-gray-700">
                                    <p>New Admit: <span className="font-semibold">{selectedWard.newAdmit || 0}</span></p>
                                    <p>Transfer In: <span className="font-semibold">{selectedWard.transferIn || 0}</span></p>
                                    <p>Refer In: <span className="font-semibold">{selectedWard.referIn || 0}</span></p>
                                    <p>Transfer Out: <span className="font-semibold">{selectedWard.transferOut || 0}</span></p>
                                    <p>Refer Out: <span className="font-semibold">{selectedWard.referOut || 0}</span></p>
                                    <p>Discharge: <span className="font-semibold">{selectedWard.discharge || 0}</span></p>
                                    <p>Dead: <span className="font-semibold">{selectedWard.dead || 0}</span></p>
                                </div>
                            </div>

                            {/* Overall Data */}
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <h3 className="font-semibold mb-2 text-gray-800">Overall Data</h3>
                                <div className="space-y-1 text-gray-700">
                                    <p>Available: <span className="font-semibold">{selectedWard.available || 0}</span></p>
                                    <p>Unavailable: <span className="font-semibold">{selectedWard.unavailable || 0}</span></p>
                                    <p>Plan D/C: <span className="font-semibold">{selectedWard.planDC || 0}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Comment Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-semibold mb-2 text-gray-800">Comment</h3>
                            <p className="text-gray-700">{selectedWard.comment || 'ไม่มีบันทึกเพิ่มเติม'}</p>
                        </div>

                        {/* Last Updated */}
                        <div className="mt-4 text-sm text-gray-600">
                            Last updated: {new Date(selectedWard.timestamp).toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
