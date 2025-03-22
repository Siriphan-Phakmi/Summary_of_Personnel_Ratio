'use client';

import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// ลงทะเบียน Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

/**
 * StaffTrendChart Component
 * กราฟแท่งแสดงแนวโน้มจำนวนบุคลากรตามช่วงเวลา
 * 
 * @param {Object} props
 * @param {Array} props.data - ข้อมูลรายงาน
 */
const StaffTrendChart = ({ data }) => {
    // ประมวลผลข้อมูลสำหรับกราฟ
    const chartData = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        // จัดเรียงตามวันที่
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // สร้างป้ายชื่อสำหรับแกน x (วันที่)
        const labels = sortedData.map(item => {
            const date = new Date(item.date);
            return format(date, 'dd MMM', { locale: th });
        });
        
        // ข้อมูลสำหรับกราฟ
        const rnData = [];
        const pnData = [];
        const naData = [];
        const otherData = [];
        
        sortedData.forEach(item => {
            const staffData = item.staff || {};
            
            // รวมจำนวนพยาบาล RN
            const rnCount = 
                (parseInt(staffData.headNurseMorning || 0) || 0) +
                (parseInt(staffData.headNurseAfternoon || 0) || 0) +
                (parseInt(staffData.headNurseNight || 0) || 0) +
                (parseInt(staffData.rnMorning || 0) || 0) +
                (parseInt(staffData.rnAfternoon || 0) || 0) +
                (parseInt(staffData.rnNight || 0) || 0);
                
            // รวมจำนวนพยาบาล PN
            const pnCount = 
                (parseInt(staffData.pnMorning || 0) || 0) +
                (parseInt(staffData.pnAfternoon || 0) || 0) +
                (parseInt(staffData.pnNight || 0) || 0);
                
            // รวมจำนวนผู้ช่วยพยาบาล
            const naCount = 
                (parseInt(staffData.naMorning || 0) || 0) +
                (parseInt(staffData.naAfternoon || 0) || 0) +
                (parseInt(staffData.naNight || 0) || 0);
                
            // รวมจำนวนบุคลากรอื่นๆ
            const otherCount = 
                (parseInt(staffData.clerkMorning || 0) || 0) +
                (parseInt(staffData.clerkAfternoon || 0) || 0) +
                (parseInt(staffData.clerkNight || 0) || 0) +
                (parseInt(staffData.othersMorning || 0) || 0) +
                (parseInt(staffData.othersAfternoon || 0) || 0) +
                (parseInt(staffData.othersNight || 0) || 0);
            
            rnData.push(rnCount);
            pnData.push(pnCount);
            naData.push(naCount);
            otherData.push(otherCount);
        });
        
        return {
            labels,
            datasets: [
                {
                    label: 'พยาบาลวิชาชีพ (RN)',
                    data: rnData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 1
                },
                {
                    label: 'พยาบาลเทคนิค (PN)',
                    data: pnData,
                    backgroundColor: 'rgba(249, 115, 22, 0.7)',
                    borderColor: 'rgb(234, 88, 12)',
                    borderWidth: 1
                },
                {
                    label: 'ผู้ช่วยพยาบาล (NA)',
                    data: naData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgb(5, 150, 105)',
                    borderWidth: 1
                },
                {
                    label: 'บุคลากรอื่นๆ',
                    data: otherData,
                    backgroundColor: 'rgba(156, 163, 175, 0.7)',
                    borderColor: 'rgb(107, 114, 128)',
                    borderWidth: 1
                }
            ]
        };
    }, [data]);

    // กำหนดค่าตัวเลือกสำหรับกราฟ
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: {
                    display: false
                },
                stacked: true
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'จำนวนบุคลากร (คน)'
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.2)'
                },
                stacked: true,
                ticks: {
                    stepSize: 2
                }
            }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.raw !== null ? context.raw : 'N/A';
                        return `${label}: ${value} คน`;
                    }
                }
            }
        }
    };

    return (
        <div className="w-full h-full">
            {chartData.labels.length > 0 ? (
                <Bar data={chartData} options={options} />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 dark:text-gray-400">ไม่มีข้อมูลสำหรับแสดงผล</p>
                </div>
            )}
        </div>
    );
};

export default StaffTrendChart;