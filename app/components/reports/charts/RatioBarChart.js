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
 * RatioBarChart Component
 * กราฟแท่งแสดงอัตราส่วนพยาบาลต่อผู้ป่วย
 * 
 * @param {Object} props
 * @param {Array} props.data - ข้อมูลรายงาน
 */
const RatioBarChart = ({ data }) => {
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
        
        // สร้างข้อมูลอัตราส่วนพยาบาลต่อผู้ป่วย
        const ratioData = sortedData.map(item => {
            const staffData = item.staff || {};
            const patientCensus = item.patientCensus?.totalPatients || 0;
            
            // รวมจำนวนพยาบาล RN และ PN
            const rnCount = 
                (parseInt(staffData.headNurseMorning || 0) || 0) +
                (parseInt(staffData.headNurseAfternoon || 0) || 0) +
                (parseInt(staffData.headNurseNight || 0) || 0) +
                (parseInt(staffData.rnMorning || 0) || 0) +
                (parseInt(staffData.rnAfternoon || 0) || 0) +
                (parseInt(staffData.rnNight || 0) || 0);
                
            const pnCount = 
                (parseInt(staffData.pnMorning || 0) || 0) +
                (parseInt(staffData.pnAfternoon || 0) || 0) +
                (parseInt(staffData.pnNight || 0) || 0);
                
            const naCount = 
                (parseInt(staffData.naMorning || 0) || 0) +
                (parseInt(staffData.naAfternoon || 0) || 0) +
                (parseInt(staffData.naNight || 0) || 0);
            
            // คำนวณอัตราส่วน (ถ้าไม่มีพยาบาลหรือไม่มีผู้ป่วย ให้ค่าเป็น 0)
            const nurseToPatientRatio = (rnCount + pnCount) > 0 && patientCensus > 0
                ? patientCensus / (rnCount + pnCount)
                : 0;
                
            return nurseToPatientRatio;
        });
        
        // สร้างข้อมูลจำนวนผู้ป่วย
        const patientData = sortedData.map(item => item.patientCensus?.totalPatients || 0);
        
        // สร้างเส้นแสดงค่าอุดมคติ (optimal)
        const optimalLine = new Array(labels.length).fill(4);
        
        // สร้างเส้นแสดงค่าที่ยอมรับได้ (acceptable)
        const acceptableLine = new Array(labels.length).fill(6);
        
        // สร้างเส้นแสดงค่าวิกฤติ (critical)
        const criticalLine = new Array(labels.length).fill(8);
        
        return {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'อัตราส่วนพยาบาลต่อผู้ป่วย',
                    data: ratioData,
                    backgroundColor: ratioData.map(ratio => {
                        if (ratio > 8) return 'rgba(239, 68, 68, 0.7)'; // สีแดง (วิกฤติ)
                        if (ratio > 6) return 'rgba(249, 115, 22, 0.7)'; // สีส้ม (เตือน)
                        if (ratio > 4) return 'rgba(234, 179, 8, 0.7)'; // สีเหลือง (ยอมรับได้)
                        return 'rgba(34, 197, 94, 0.7)'; // สีเขียว (ดี)
                    }),
                    borderColor: ratioData.map(ratio => {
                        if (ratio > 8) return 'rgb(220, 38, 38)';
                        if (ratio > 6) return 'rgb(234, 88, 12)';
                        if (ratio > 4) return 'rgb(202, 138, 4)';
                        return 'rgb(22, 163, 74)';
                    }),
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'เกณฑ์เหมาะสม (4:1)',
                    data: optimalLine,
                    borderColor: 'rgba(34, 197, 94, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointStyle: false,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'เกณฑ์ยอมรับได้ (6:1)',
                    data: acceptableLine,
                    borderColor: 'rgba(234, 179, 8, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointStyle: false,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'เกณฑ์วิกฤติ (8:1)',
                    data: criticalLine,
                    borderColor: 'rgba(239, 68, 68, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointStyle: false,
                    yAxisID: 'y'
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
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'อัตราส่วนผู้ป่วยต่อพยาบาล (คน)'
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.2)'
                },
                min: 0,
                max: 12,
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
                        const value = context.raw !== null ? context.raw.toFixed(2) : 'N/A';
                        
                        if (context.dataset.type === 'bar') {
                            return `${label}: ${value} คนต่อพยาบาล 1 คน`;
                        }
                        
                        return `${label}: ${value}`;
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

export default RatioBarChart; 