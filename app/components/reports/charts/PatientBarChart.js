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
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// ลงทะเบียน Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

/**
 * PatientBarChart Component
 * กราฟแท่งแสดงจำนวนผู้ป่วยและการเปลี่ยนแปลง
 * 
 * @param {Object} props
 * @param {Array} props.data - ข้อมูลรายงาน
 */
const PatientBarChart = ({ data }) => {
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
        const totalPatients = [];
        const newAdmit = [];
        const discharge = [];
        const transferIn = [];
        const transferOut = [];
        const dead = [];
        
        sortedData.forEach(item => {
            const censusData = item.patientCensus || {};
            
            totalPatients.push(censusData.totalPatients || 0);
            newAdmit.push(censusData.newAdmit || 0);
            discharge.push(censusData.discharge || 0);
            transferIn.push((censusData.transferIn || 0) + (censusData.referIn || 0));
            transferOut.push((censusData.transferOut || 0) + (censusData.referOut || 0));
            dead.push(censusData.dead || 0);
        });
        
        return {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: 'จำนวนผู้ป่วยทั้งหมด',
                    data: totalPatients,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgb(37, 99, 235)',
                    yAxisID: 'y',
                    fill: false,
                    tension: 0.1
                },
                {
                    type: 'bar',
                    label: 'รับใหม่',
                    data: newAdmit,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgb(5, 150, 105)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                },
                {
                    type: 'bar',
                    label: 'จำหน่าย',
                    data: discharge,
                    backgroundColor: 'rgba(236, 72, 153, 0.7)',
                    borderColor: 'rgb(219, 39, 119)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                },
                {
                    type: 'bar',
                    label: 'รับเข้า/ส่งต่อ',
                    data: transferIn,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: 'rgb(124, 58, 237)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                },
                {
                    type: 'bar',
                    label: 'ย้ายออก/ส่งต่อ',
                    data: transferOut,
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: 'rgb(217, 119, 6)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                },
                {
                    type: 'bar',
                    label: 'เสียชีวิต',
                    data: dead,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgb(220, 38, 38)',
                    borderWidth: 1,
                    yAxisID: 'y1'
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
                }
            },
            y: {
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'จำนวนผู้ป่วยทั้งหมด (คน)'
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.2)'
                }
            },
            y1: {
                type: 'linear',
                position: 'right',
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'การเปลี่ยนแปลง (คน)'
                },
                grid: {
                    drawOnChartArea: false
                },
                ticks: {
                    stepSize: 1
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

export default PatientBarChart; 