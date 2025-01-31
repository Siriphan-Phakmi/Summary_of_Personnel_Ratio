'use client';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [totalPatients, setTotalPatients] = useState(0);
    const [wardData, setWardData] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [recordedDate, setRecordedDate] = useState('');
    const [recordedTime, setRecordedTime] = useState('');
    const [currentPatients, setCurrentPatients] = useState({
        total: 0,
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
        date: '',
        shift: '',
        startTime: '',
        endTime: '',
        ward: '' // เพิ่มตัวกรองแผนก
    });

    // รายชื่อแผนกเรียงตามที่ต้องการ
    const wardList = [
        'Ward6', 'Ward7', 'Ward8', 'Ward9', 'WardGI',
        'Ward10B', 'Ward11', 'Ward12', 'ICU', 'CCU',
        'LR', 'NSY'
    ];

    // เพิ่ม state สำหรับเก็บข้อมูลทั้งหมด
    const [allRecords, setAllRecords] = useState([]);
    const [availableDates, setAvailableDates] = useState([]);

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

    // โหลดข้อมูลจาก Firebase
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const staffRef = collection(db, 'staffRecords');
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
                    summaryData: data.summaryData || {
                        opdTotal24hr: 0,
                        existingPatients: 0,
                        newPatients: 0,
                        admissions24hr: 0
                    }
                };
            });

            console.log('Fetched records:', records); // เพิ่ม log เพื่อดูข้อมูล

            setAllRecords(records);

            // สร้างรายการวันที่ที่มีข้อมูล
            const dates = [...new Set(records.map(record => record.date))];
            setAvailableDates(dates.sort().reverse());

            if (records.length > 0) {
                const latestRecord = records[0];
                setFilters(prev => ({
                    ...prev,
                    date: latestRecord.date,
                    shift: latestRecord.shift || ''
                }));
                filterData(records, {
                    ...filters,
                    date: latestRecord.date,
                    shift: latestRecord.shift || ''
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // กรองและอัพเดทข้อมูล
    const filterData = (records = allRecords, currentFilters = filters) => {
        let filteredRecords = [...records];

        if (currentFilters.date) {
            filteredRecords = filteredRecords.filter(record => record.date === currentFilters.date);
        }

        if (currentFilters.shift) {
            filteredRecords = filteredRecords.filter(record => record.shift === currentFilters.shift);
        }

        if (currentFilters.startTime && currentFilters.endTime) {
            filteredRecords = filteredRecords.filter(record => {
                const recordTime = record.recordedTime;
                return recordTime >= currentFilters.startTime && recordTime <= currentFilters.endTime;
            });
        }

        console.log('Filtered records:', filteredRecords); // เพิ่ม log เพื่อดูข้อมูลที่กรอง

        if (filteredRecords.length > 0) {
            const data = filteredRecords[0];
            let wardsToShow = {};

            if (currentFilters.ward) {
                if (data.wards[currentFilters.ward]) {
                    wardsToShow[currentFilters.ward] = data.wards[currentFilters.ward];
                }
            } else {
                wardList.forEach(wardName => {
                    if (data.wards[wardName]) {
                        wardsToShow[wardName] = data.wards[wardName];
                    }
                });
            }

            console.log('Wards to show:', wardsToShow); // เพิ่ม log เพื่อดูข้อมูล ward

            // Calculate current patients
            calculateCurrentPatients(wardsToShow, data.summaryData || {});

            const wards = Object.entries(wardsToShow).map(([name, ward]) => ({
                name,
                patients: parseInt(ward.numberOfPatients) || 0,
                RN: parseInt(ward.RN) || 0,
                PN: parseInt(ward.PN) || 0,
                NA: parseInt(ward.NA) || 0,
                ICU: parseInt(ward.referIn) || 0, // ใช้ referIn แทน ICU
                planCount: parseInt(ward.plannedDischarge) || 0, // ใช้ plannedDischarge แทน planCount
                bedCount: parseInt(ward.availableBeds) || 0, // ใช้ availableBeds แทน bedCount
                levels: {
                    level2: parseInt(ward.currentPatients) || 0, // ใช้ฟิลด์อื่นๆ แทนชั่วคราว
                    level3: parseInt(ward.newAdmissions) || 0,
                    level4: parseInt(ward.transfers) || 0,
                    level5: parseInt(ward.discharge) || 0
                }
            }));

            console.log('Processed wards:', wards); // เพิ่ม log เพื่อดูข้อมูลที่ประมวลผลแล้ว

            setWardData(wards);
            setTotalPatients(wards.reduce((sum, ward) => sum + ward.patients, 0));
            setSelectedDate(data.date);
            setRecordedDate(data.recordedDate || '');
            setRecordedTime(data.recordedTime || '');
        } else {
            setWardData([]);
            setTotalPatients(0);
            setSelectedDate('');
            setRecordedDate('');
            setRecordedTime('');
            setCurrentPatients({
                total: 0,
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

        setCurrentPatients({
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

    // โหลดข้อมูลเมื่อเริ่มต้น
    useEffect(() => {
        fetchAllData();
    }, []);

    // เมื่อตัวกรองเปลี่ยน
    useEffect(() => {
        if (allRecords.length > 0) {
            filterData();
        }
    }, [filters]);

    // ข้อมูลสำหรับ Pie Chart
    const pieData = {
        labels: wardData.map(ward => ward.name),
        datasets: [{
            data: wardData.map(ward => ward.patients),
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
        }]
    };

    // ข้อมูลสำหรับ Bar Chart
    const barData = {
        labels: wardData.map(ward => ward.name),
        datasets: [{
            label: 'คงพยาบาล',
            data: wardData.map(ward => ward.patients),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }]
    };

    const barOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'คงพยาบาล ตามวอร์ด'
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">กำลังโหลดข้อมูล...</div>;
    }

    return (
        <div className="p-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4 text-gray-800">Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Summary Cards */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">คงพยาบาล (จำนวนผู้ป่วย)</h3>
                        <p className="text-3xl font-bold text-blue-600">{currentPatients.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">OPD 24 ชั่วโมง</h3>
                        <p className="text-3xl font-bold text-green-600">{currentPatients.summaryData.opdTotal24hr}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Admission Rate</h3>
                        <p className="text-3xl font-bold text-purple-600">{currentPatients.calculations.admissionRate}%</p>
                        <p className="text-sm text-gray-600">คงพยาบาล x 100 / OPD 24hr</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Conversion Ratio</h3>
                        <p className="text-3xl font-bold text-orange-600">{currentPatients.calculations.conversionRatio}</p>
                        <p className="text-sm text-gray-600">OPD 24hr / คงพยาบาล</p>
                    </div>
                </div>

                {/* Additional Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">คนไข้เก่า</h3>
                        <p className="text-2xl font-bold text-gray-700">{currentPatients.summaryData.existingPatients}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">คนไข้ใหม่</h3>
                        <p className="text-2xl font-bold text-gray-700">{currentPatients.summaryData.newPatients}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Admit 24 ชั่วโมง</h3>
                        <p className="text-2xl font-bold text-gray-700">{currentPatients.summaryData.admissions24hr}</p>
                    </div>
                </div>

                {/* Ward-wise Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">คงพยาบาล (จำนวนผู้ป่วย) แยกตาม Ward</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(currentPatients.byWard).map(([ward, count]) => (
                            <button
                                key={ward}
                                onClick={() => setFilters(prev => ({ ...prev, ward }))}
                                className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <h3 className="font-semibold text-lg text-gray-800">{ward}</h3>
                                <p className="text-2xl font-bold text-blue-600">{count}</p>
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
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">ห้องว่าง</h2>
                        <Pie data={pieData} />
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">สถิติแยกตาม Ward</h2>
                        <Bar options={barOptions} data={barData} />
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
                                    คงพยาบาล
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
