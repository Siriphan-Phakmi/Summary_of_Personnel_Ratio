'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [totalPatients, setTotalPatients] = useState(0);
    const [wardData, setWardData] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [recordedDate, setRecordedDate] = useState('');
    const [recordedTime, setRecordedTime] = useState('');
    const [overallData, setOverallData] = useState({
        total: 0,
        overallData: 0, // เพิ่ม overallData
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

    // เพิ่ม state สำหรับตัวกรอง
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0], // Set default to today
        shift: '',
        ward: '',
        recorder: '', // เพิ่มตัวกรองผู้บันทึก
        viewType: 'daily' // เพิ่ม viewType: 'daily', 'monthly', 'yearly', 'all'
    });

    // เพิ่ม state สำหรับเดือนและปี
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // รายชื่อแผนกเรียงตามที่ต้องการ
    const wardList = [
        'Ward6', 'Ward7', 'Ward8', 'Ward9', 'WardGI',
        'Ward10B', 'Ward11', 'Ward12', 'ICU', 'CCU',
        'LR', 'NSY'
    ];

    const shiftList = ['07:00-19:00', '19:00-07:00'];

    // เพิ่ม state สำหรับเก็บข้อมูลทั้งหมด
    const [allRecords, setAllRecords] = useState([]);
    const [availableDates, setAvailableDates] = useState([]);
    const [recorders, setRecorders] = useState([]); // เพิ่ม state สำหรับรายชื่อผู้บันทึก

    // สีสำหรับกราฟ
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

    // Calculate rates and ratios
    const calculateRates = (currentTotal, summaryData) => {
        const { opdTotal24hr } = summaryData;

        // Prevent division by zero
        const admissionRate = opdTotal24hr ? ((currentTotal * 100) / opdTotal24hr).toFixed(2) : 0;
        const conversionRatio = currentTotal ? (opdTotal24hr / currentTotal).toFixed(2) : 0;

        return {
            admissionRate,
            conversionRatio
        };
    };

    // ฟังก์ชันสำหรับคำนวณข้อมูลรวม
    const calculateSummaryData = (records) => {
        return records.reduce((summary, record) => {
            // รวมข้อมูลผู้ป่วยและเจ้าหน้าที่
            Object.entries(record.wards).forEach(([wardName, wardData]) => {
                if (!summary.wards[wardName]) {
                    summary.wards[wardName] = {
                        totalPatients: 0,
                        totalRN: 0,
                        totalPN: 0,
                        totalAdmin: 0,
                        admissions: 0,
                        discharges: 0
                    };
                }
                summary.wards[wardName].totalPatients += parseInt(wardData.numberOfPatients) || 0;
                summary.wards[wardName].totalRN += parseInt(wardData.RN) || 0;
                summary.wards[wardName].totalPN += parseInt(wardData.PN) || 0;
                summary.wards[wardName].totalAdmin += parseInt(wardData.admin) || 0;
                summary.wards[wardName].admissions += parseInt(wardData.newAdmissions) || 0;
                summary.wards[wardName].discharges += parseInt(wardData.discharge) || 0;
            });

            // รวมข้อมูล OPD และอื่นๆ
            summary.totalOPD += parseInt(record.summaryData.opdTotal24hr) || 0;
            summary.totalExisting += parseInt(record.summaryData.existingPatients) || 0;
            summary.totalNew += parseInt(record.summaryData.newPatients) || 0;
            summary.totalAdmissions += parseInt(record.summaryData.admissions24hr) || 0;
            summary.recordCount++;

            return summary;
        }, {
            wards: {},
            totalOPD: 0,
            totalExisting: 0,
            totalNew: 0,
            totalAdmissions: 0,
            recordCount: 0
        });
    };

    // โหลดข้อมูลจาก Firebase
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const staffRef = collection(db, 'staffRecords');

            // ดึงข้อมูลทั้งหมดเรียงตามเวลา
            const q = query(staffRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            const records = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: data.date || '',
                    shift: data.shift || '',
                    timestamp: data.timestamp?.toDate() || new Date(),
                    recordedDate: data.recordedDate || '',
                    recordedTime: data.recordedTime || '',
                    wards: data.wards || {},
                    summaryData: data.summaryData || {},
                    recorder: data.supervisorName || '',
                    overallData: data.overallData || 0,
                    wardTotals: data.wardTotals || {}
                };
            });

            // เก็บข้อมูลทั้งหมด
            setAllRecords(records);

            // อัพเดท overallData state
            if (records.length > 0) {
                const latestRecord = records[0]; // เนื่องจากเรียงตาม timestamp desc แล้ว
                const totalPatients = calculateTotalPatients(latestRecord.wards || {});
                
                setOverallData({
                    total: totalPatients, // เปลี่ยนเป็นใช้ค่า total จาก numberOfPatients
                    overallData: latestRecord.overallData || 0, // เพิ่ม overallData
                    byWard: latestRecord.wardTotals,
                    summaryData: latestRecord.summaryData,
                    calculations: calculateRates(latestRecord.overallData, latestRecord.summaryData)
                });
            }

            // สร้างรายการวันที่ที่มีข้อมูล
            const dates = [...new Set(records.map(record => record.date))];
            setAvailableDates(dates.sort().reverse());

            // สร้างรายการผู้บันทึก
            const uniqueRecorders = [...new Set(records.map(record => record.recorder))].filter(Boolean);
            setRecorders(uniqueRecorders.sort());

            // กรองข้อมูลตาม filters ปัจจุบัน
            filterData(records, filters);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // เพิ่มฟังก์ชันคำนวณ total numberOfPatients
    const calculateTotalPatients = (wards) => {
        return Object.values(wards).reduce((total, ward) => {
            return total + (parseInt(ward.numberOfPatients) || 0);
        }, 0);
    };

    // กรองและอัพเดทข้อมูล
    const filterData = (records = allRecords, currentFilters = filters) => {
        let filteredRecords = [...records];

        // กรองตามประเภทการดูข้อมูล
        switch (currentFilters.viewType) {
            case 'daily':
                if (currentFilters.date) {
                    filteredRecords = filteredRecords.filter(record => record.date === currentFilters.date);
                }
                break;
            case 'monthly':
                filteredRecords = filteredRecords.filter(record =>
                    record.date.startsWith(selectedMonth)
                );
                break;
            case 'yearly':
                filteredRecords = filteredRecords.filter(record =>
                    record.date.startsWith(selectedYear)
                );
                break;
        }

        // กรองตาม shift ถ้ามีการระบุ
        if (currentFilters.shift) {
            filteredRecords = filteredRecords.filter(record => record.shift === currentFilters.shift);
        }

        // กรองตาม ward ถ้ามีการระบุ
        if (currentFilters.ward) {
            filteredRecords = filteredRecords.filter(record => record.wards[currentFilters.ward]);
        }

        // กรองตามผู้บันทึก
        if (currentFilters.recorder) {
            filteredRecords = filteredRecords.filter(record => record.recorder === currentFilters.recorder);
        }

        // อัพเดทข้อมูลที่แสดงผล
        if (filteredRecords.length > 0) {
            const latestRecord = filteredRecords[0];
            
            // คำนวณ total จาก numberOfPatients ของทุก ward
            const totalPatients = Object.values(latestRecord.wards || {}).reduce((sum, ward) => {
                return sum + (parseInt(ward.numberOfPatients) || 0);
            }, 0);

            setOverallData({
                total: totalPatients, // ใช้ผลรวมของ numberOfPatients
                overallData: latestRecord.overallData || 0, // ใช้ค่า overallData จาก Firebase
                byWard: latestRecord.wardTotals || {},
                summaryData: latestRecord.summaryData,
                calculations: calculateRates(totalPatients, latestRecord.summaryData)
            });
        } else if (currentFilters.viewType === 'daily') {
            // รีเซ็ตค่าเป็น 0 เมื่อไม่พบข้อมูลในวันที่เลือก (เฉพาะ daily view)
            setOverallData({
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
        }

        return filteredRecords;
    };

    // Export to Excel function
    const exportToExcel = () => {
        // Filter data based on current filters
        const dataToExport = allRecords.filter(record => {
            const dateMatch = !filters.date || record.date === filters.date;
            const shiftMatch = !filters.shift || record.shift === filters.shift;
            const wardMatch = !filters.ward || record.wards[filters.ward];
            const recorderMatch = !filters.recorder || record.recorder === filters.recorder;
            return dateMatch && shiftMatch && wardMatch && recorderMatch;
        });

        // Transform data for Excel
        const excelData = dataToExport.map(record => {
            const wardData = filters.ward ?
                { [filters.ward]: record.wards[filters.ward] } :
                record.wards;

            return {
                Date: record.date,
                Shift: record.shift,
                'Recorded Date': record.recordedDate,
                'Recorded Time': record.recordedTime,
                'Recorder': record.recorder,
                ...Object.entries(wardData).reduce((acc, [ward, data]) => ({
                    ...acc,
                    [`${ward} Patients`]: data.numberOfPatients,
                    [`${ward} RN`]: data.RN,
                    [`${ward} PN`]: data.PN,
                    [`${ward} Admin`]: data.admin,
                }), {}),
                'OPD Total 24hr': record.summaryData.opdTotal24hr,
                'Existing Patients': record.summaryData.existingPatients,
                'New Patients': record.summaryData.newPatients,
                'Admissions 24hr': record.summaryData.admissions24hr,
            };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Staff Records');

        // Generate filename with current date
        const fileName = `staff_records_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Save file
        XLSX.writeFile(wb, fileName);
    };

    // Calculate current patients when filtered data changes
    const calculateCurrentPatients = (wards, summaryData = {}) => {
        const byWard = {};
        let total = 0;

        Object.entries(wards).forEach(([wardName, data]) => {
            const numberOfPatients = parseInt(data.numberOfPatients) || 0;
            const newAdmissions = parseInt(data.newAdmissions) || 0;
            const referIn = parseInt(data.referIn) || 0;
            const transfers = parseInt(data.transfers) || 0;
            const referOut = parseInt(data.referOut) || 0;
            const discharge = parseInt(data.discharge) || 0;
            const deaths = parseInt(data.deaths) || 0;

            const current = numberOfPatients + newAdmissions + referIn + transfers - referOut - discharge - deaths;
            byWard[wardName] = current;
            total += current;
        });

        // Calculate rates
        const rates = calculateRates(total, summaryData);

        setOverallData({
            total,
            byWard,
            summaryData,
            calculations: rates
        });
    };

    // คำนวณผลรวมของข้อมูล
    const calculateTotals = (wards) => {
        return wards.reduce((totals, ward) => {
            return {
                patients: (totals.patients || 0) + (ward.patients || 0),
                RN: (totals.RN || 0) + (ward.RN || 0),
                PN: (totals.PN || 0) + (ward.PN || 0),
                NA: (totals.NA || 0) + (ward.NA || 0)
            };
        }, {});
    };

    // เพิ่มฟังก์ชันคำนวณ overall
    const calculateOverall = (wardData) => {
        console.log('Ward Data:', wardData);
        return Object.values(wardData).reduce((total, ward) => {
            const sum = (
                Number(ward.numberOfPatients || 0) +
                Number(ward.newAdmit || 0) +        // เปลี่ยนจาก newAdmissions เป็น newAdmit
                Number(ward.transferIn || 0) +      // เปลี่ยนจาก transfers เป็น transferIn
                Number(ward.referIn || 0) -
                Number(ward.transferOut || 0) -
                Number(ward.referOut || 0) -
                Number(ward.discharge || 0) -
                Number(ward.dead || 0)             // เปลี่ยนจาก deaths เป็น dead
            );
            console.log('Ward:', ward, 'Sum:', sum);
            return total + sum;
        }, 0);
    };

    // โหลดข้อมูลเมื่อเริ่มต้น
    useEffect(() => {
        fetchAllData();
    }, []);

    // อัพเดทข้อมูลเมื่อ filters หรือ selectedMonth หรือ selectedYear เปลี่ยน
    useEffect(() => {
        if (allRecords.length > 0) {
            filterData(allRecords, filters);
        }
    }, [filters, selectedMonth, selectedYear]);

    // ข้อมูลสำหรับ Pie Chart และ Bar Chart
    const chartData = useMemo(() => {
        console.log('overallData.byWard:', overallData.byWard);
        
        // แปลงข้อมูลจาก byWard เป็น array
        const wardEntries = Object.entries(overallData.byWard || {});
        console.log('wardEntries:', wardEntries);

        // สร้าง labels และ data
        const labels = wardEntries.map(([ward]) => ward);
        const data = wardEntries.map(([, value]) => value.totalPatients || 0);
        
        console.log('Chart labels:', labels);
        console.log('Chart data:', data);

        return {
            pie: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.background.slice(0, labels.length),
                    borderColor: colors.border.slice(0, labels.length),
                    borderWidth: 1,
                }]
            },
            bar: {
                labels,
                datasets: [{
                    label: 'Patient Census',
                    data,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                }]
            }
        };
    }, [overallData.byWard]);

    const pieData = chartData.pie;
    const barData = chartData.bar;

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

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading Data...</div>;
    }

    return (
        <div className="p-4">
            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-lg text-black font-semibold mb-4">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* View Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">View Type</label>
                        <select
                            value={filters.viewType}
                            onChange={(e) => {
                                const newViewType = e.target.value;
                                setFilters(prev => ({ ...prev, viewType: newViewType }));
                                // รีเซ็ตค่าวันที่เมื่อเปลี่ยน view type
                                if (newViewType === 'daily') {
                                    setFilters(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
                                }
                            }}
                            className="w-full text-black rounded-md border border-gray-300 p-2"
                        >
                            <option value="daily">Daily</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    {/* Date Filter - แสดงเฉพาะเมื่อเลือก Daily */}
                    {filters.viewType === 'daily' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={filters.date}
                                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                className="w-full text-black rounded-md border border-gray-300 p-2"
                            />
                        </div>
                    )}

                    {/* Month Filter - แสดงเฉพาะเมื่อเลือก Monthly */}
                    {filters.viewType === 'monthly' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => {
                                    setSelectedMonth(e.target.value);
                                }}
                                className="w-full text-black rounded-md border border-gray-300 p-2"
                            />
                        </div>
                    )}

                    {/* Year Filter - แสดงเฉพาะเมื่อเลือก Yearly */}
                    {filters.viewType === 'yearly' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    setSelectedYear(e.target.value);
                                }}
                                className="w-full text-black rounded-md border border-gray-300 p-2"
                            >
                                {Array.from(
                                    { length: 10 },
                                    (_, i) => new Date().getFullYear() - i
                                ).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Shift Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                        <select
                            value={filters.shift}
                            onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
                            className="w-full text-black rounded-md border border-gray-300 p-2"
                        >
                            <option value="">All Shifts</option>
                            {shiftList.map(shift => (
                                <option key={shift} value={shift}>{shift}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ward Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                        <select
                            value={filters.ward}
                            onChange={(e) => setFilters({ ...filters, ward: e.target.value })}
                            className="w-full text-black rounded-md border border-gray-300 p-2"
                        >
                            <option value="">All Wards</option>
                            {wardList.map(ward => (
                                <option key={ward} value={ward}>{ward}</option>
                            ))}
                        </select>
                    </div>

                    {/* Recorder Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recorder</label>
                        <select
                            value={filters.recorder}
                            onChange={(e) => setFilters({ ...filters, recorder: e.target.value })}
                            className="w-full text-black rounded-md border border-gray-300 p-2"
                        >
                            <option value="">All Recorders</option>
                            {recorders.map(recorder => (
                                <option key={recorder} value={recorder}>{recorder}</option>
                            ))}
                        </select>
                    </div>

                    {/* Export Button */}
                    <div className="flex items-end">
                        <button
                            onClick={exportToExcel}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Export to Excel
                        </button>
                    </div>
                </div>

                {/* Summary Info */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <span className="text-gray-900 text-sm font-medium">Total Records:</span>
                            <span className="ml-2 font-semibold text-gray-900">{wardData.length}</span>
                        </div>
                        <div>
                            <span className="text-gray-900 text-sm font-medium">Total Patients:</span>
                            <span className="ml-2 font-semibold text-gray-900">{totalPatients}</span>
                        </div>
                        <div>
                            <span className="text-gray-900 text-sm font-medium">Total OPD:</span>
                            <span className="ml-2 font-semibold text-gray-900">{overallData.summaryData.opdTotal24hr}</span>
                        </div>
                        <div>
                            <span className="text-gray-900 text-sm font-medium">Total Admissions:</span>
                            <span className="ml-2 font-semibold text-gray-900">{overallData.summaryData.admissions24hr}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4 text-gray-800">Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Summary Cards */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Current data</h3>
                        <p className="text-3xl font-bold text-blue-600">{overallData?.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Overall data</h3>
                        <p className="text-3xl font-bold text-green-600">
                            {overallData?.overallData || 0}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">OPD 24 hour</h3>
                        <p className="text-3xl font-bold text-green-600">{overallData.summaryData.opdTotal24hr}</p>
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
                </div>

                {/* Additional Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Old Patient</h3>
                        <p className="text-2xl font-bold text-gray-700">{overallData.summaryData.existingPatients}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">New Patient</h3>
                        <p className="text-2xl font-bold text-gray-700">{overallData.summaryData.newPatients}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Admit 24 hour</h3>
                        <p className="text-2xl font-bold text-gray-700">{overallData.summaryData.admissions24hr}</p>
                    </div>
                </div>

                {/* Ward-wise Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Patient Census By Ward</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(overallData.byWard).map(([ward, data]) => (
                            <button
                                key={ward}
                                onClick={() => setFilters(prev => ({ ...prev, ward }))}
                                className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <h3 className="font-semibold text-lg text-gray-800">{ward}</h3>
                                <p className="text-2xl font-bold text-blue-600">{data.totalPatients}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Last Update Time */}
                <div className="text-sm text-gray-600 mb-4">
                    Last updated: {recordedDate} {recordedTime}
                </div>

                {/* Charts and Graphs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: '400px' }}>
                        <h2 className="text-lg font-bold mb-4 text-gray-800">Available</h2>
                        <div style={{ height: '320px' }}>
                            <Pie data={pieData} options={pieOptions} />
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: '400px' }}>
                        <h2 className="text-lg font-bold mb-4 text-gray-800">Patient Census By Ward</h2>
                        <div style={{ height: '320px' }}>
                            <Bar options={barOptions} data={barData} />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Ward
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Patient Census
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    RN
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    PN
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    NA
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {wardData.map((ward, index) => (
                                <tr key={index} className="text-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.patients}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.RN}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.PN}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.NA}</td>
                                </tr>
                            ))}
                            {wardData.length > 0 && (
                                <tr className="bg-gray-50 font-semibold text-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap">Total</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{calculateTotals(wardData).patients}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{calculateTotals(wardData).RN}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{calculateTotals(wardData).PN}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{calculateTotals(wardData).NA}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
