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
    const fetchData = async () => {
        try {
            setLoading(true);
            const staffRef = collection(db, 'staffRecords');
            const q = query(staffRef, orderBy('timestamp', 'desc'), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const data = doc.data();
                
                // จัดการข้อมูลสำหรับแสดงผล
                const wards = Object.entries(data.wards).map(([name, ward]) => ({
                    name,
                    patients: parseInt(ward.numberOfPatients) || 0,
                    RN: parseInt(ward.RN) || 0,
                    PN: parseInt(ward.PN) || 0,
                    NA: parseInt(ward.NA) || 0,
                }));

                setWardData(wards);
                setTotalPatients(wards.reduce((sum, ward) => sum + ward.patients, 0));
                setSelectedDate(data.date);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
            label: 'จำนวนผู้ป่วย',
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
                text: 'จำนวนผู้ป่วยตามหอผู้ป่วย'
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">กำลังโหลดข้อมูล...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="bg-gradient-to-b from-pink-200 to-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800">
                        รายงานยอดผู้ป่วยประจำวัน
                    </h1>
                    <div className="text-lg">
                        <span className="font-medium">วันที่: </span>
                        <span>{selectedDate}</span>
                    </div>
                </div>

                {/* แสดงจำนวนผู้ป่วยทั้งหมด */}
                <div className="bg-blue-100 rounded-xl p-4 mb-6">
                    <div className="text-center">
                        <span className="text-xl font-semibold">Total</span>
                        <div className="text-4xl font-bold text-blue-600">
                            {totalPatients}
                        </div>
                        <span className="text-gray-600">ไม่มีข้อมูล</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">จำนวนเตียงว่าง</h2>
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
                                    จำนวนผู้ป่วย
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
                        <tbody className="bg-white divide-y divide-gray-200">
                            {wardData.map((ward, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.patients}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.RN}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.PN}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{ward.NA}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
