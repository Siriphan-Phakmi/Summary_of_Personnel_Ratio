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
        byWard: {}
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
                    wards: data.wards || {}
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
            calculateCurrentPatients(wardsToShow);

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
            setCurrentPatients({ total: 0, byWard: {} });
        }
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

    // Calculate current patients when filtered data changes
    const calculateCurrentPatients = (wards) => {
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

        setCurrentPatients({ total, byWard });
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
        <div className="space-y-6">
            {/* Current Patients Summary Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Total Current Patients */}
                    <div className="bg-gradient-to-br from-[#0ab4ab]/10 to-white rounded-lg p-6 shadow-md">
                        <h3 className="text-xl font-semibold text-[#0ab4ab] mb-2">จำนวนผู้ป่วยทั้งหมด</h3>
                        <div className="text-4xl font-bold text-gray-800">{currentPatients.total}</div>
                        <div className="text-sm text-gray-600 mt-2">
                            {recordedDate && recordedTime ? `อัพเดทล่าสุด: ${recordedDate} ${recordedTime}` : 'ไม่มีข้อมูล'}
                        </div>
                    </div>

                    {/* Ward-wise Current Patients */}
                    <div className="bg-white rounded-lg p-6 shadow-md">
                        <h3 className="text-xl font-semibold text-[#0ab4ab] mb-4">จำนวนผู้ป่วยแยกตามวอร์ด</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {Object.entries(currentPatients.byWard).map(([ward, count]) => (
                                <div key={ward} className="text-center p-2 bg-gray-50 rounded">
                                    <div className="font-semibold text-gray-700">{ward}</div>
                                    <div className="text-2xl font-bold text-[#0ab4ab]">{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Existing filter controls */}
            <div className="max-w-7xl mx-auto p-4">
                <div className="bg-gradient-to-b from-pink-200 to-white rounded-lg shadow-lg p-6 mb-6">
                    {/* ส่วนตัวกรอง */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                            <select
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 text-black focus:ring-blue-500"
                                value={filters.date}
                                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                            >
                                <option value="">ทั้งหมด</option>
                                {availableDates.map(date => (
                                    <option key={date} value={date}>{date}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">กะ</label>
                            <select
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 text-black focus:ring-blue-500"
                                value={filters.shift}
                                onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                            >
                                <option value="">ทั้งหมด</option>
                                <option value="07:00-19:00">เช้า (07:00-19:00)</option>
                                <option value="19:00-07:00">ดึก (19:00-07:00)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">แผนก</label>
                            <select
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 text-black focus:ring-blue-500"
                                value={filters.ward}
                                onChange={(e) => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                            >
                                <option value="">ทั้งหมด</option>
                                {wardList.map(ward => (
                                    <option key={ward} value={ward}>{ward}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่มต้น</label>
                            <input
                                type="time"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 text-black focus:ring-blue-500"
                                value={filters.startTime}
                                onChange={(e) => setFilters(prev => ({ ...prev, startTime: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                            <input
                                type="time"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 text-black focus:ring-blue-500"
                                value={filters.endTime}
                                onChange={(e) => setFilters(prev => ({ ...prev, endTime: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-gray-800">
                            รายงานยอดผู้ป่วยประจำวัน
                        </h1>
                        <div className="text-lg space-y-1">
                            <div>
                                <span className="font-medium text-black">วันที่: </span>
                                <span className="text-black">{selectedDate}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                <span className="font-medium">บันทึกเมื่อ: </span>
                                <span>{recordedDate} {recordedTime}</span>
                            </div>
                        </div>
                    </div>

                    {/* แสดงจำนวนผู้ป่วยทั้งหมด */}
                    <div className="bg-blue-100 rounded-xl p-4 mb-6">
                        <div className="text-center">
                            <span className="text-xl font-semibold text-black">Total</span>
                            <div className="text-4xl font-bold text-blue-600">
                                {totalPatients}
                            </div>
                            <span className="text-gray-600">ไม่มีข้อมูล</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h2 className="text-lg text-black font-semibold mb-4">ห้องว่าง</h2>
                            <Pie data={pieData} />
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <Bar options={barOptions} data={barData} />
                        </div>
                    </div>

                    {/* ตารางแสดงข้อมูล */}
                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ward
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        คงพยาบาล
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        RN
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        PN
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        NA
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 text-black">
                                {wardData.map((ward, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap">{ward.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{ward.patients}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{ward.RN}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{ward.PN}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{ward.NA}</td>
                                    </tr>
                                ))}
                                {/* แถวผลรวม */}
                                {wardData.length > 0 && (
                                    <tr className="bg-gray-50 font-semibold">
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
        </div>
    );
};

export default Dashboard;
