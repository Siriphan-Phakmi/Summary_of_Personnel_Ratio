'use client';

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// ลงทะเบียน Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * RatioTrendChart Component
 * กราฟเส้นแสดงแนวโน้มอัตราส่วนพยาบาลต่อผู้ป่วยตามช่วงเวลา
 * 
 * @param {Object} props
 * @param {Array} props.data - ข้อมูลรายงาน
 */
const RatioTrendChart = ({ data }) => {
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
        
        // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วย
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
                
            // คำนวณอัตราส่วนพยาบาล RN ต่อผู้ป่วย
            const rnToPatientRatio = rnCount > 0 && patientCensus > 0
                ? patientCensus / rnCount
                : 0;
                
            // คำนวณอัตราส่วนบุคลากรพยาบาลทั้งหมดต่อผู้ป่วย
            const allNursingStaffToPatientRatio = (rnCount + pnCount + naCount) > 0 && patientCensus > 0
                ? patientCensus / (rnCount + pnCount + naCount)
                : 0;
                
            return {
                nurseToPatientRatio,
                rnToPatientRatio,
                allNursingStaffToPatientRatio
            };
        });
        
        // สร้างเส้นแสดงค่าอุดมคติ (optimal)
        const optimalLine = new Array(labels.length).fill(4);
        
        return {
            labels,
            datasets: [
                {
                    label: 'อัตราส่วน RN+PN ต่อผู้ป่วย',
                    data: ratioData.map(item => item.nurseToPatientRatio),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointRadius: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'อัตราส่วน RN ต่อผู้ป่วย',
                    data: ratioData.map(item => item.rnToPatientRatio),
                    borderColor: 'rgb(249, 115, 22)',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: 'rgb(249, 115, 22)',
                    pointRadius: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'อัตราส่วนบุคลากรพยาบาลทั้งหมดต่อผู้ป่วย',
                    data: ratioData.map(item => item.allNursingStaffToPatientRatio),
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointRadius: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'เกณฑ์เหมาะสม (4:1)',
                    data: optimalLine,
                    borderColor: 'rgba(34, 197, 94, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointStyle: false,
                    fill: false,
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
                max: 14,
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
                        
                        if (context.datasetIndex < 3) { // ไม่รวมเส้น optimal
                            return `${label}: ${value} คนต่อพยาบาล 1 คน`;
                        }
                        
                        return `${label}: ${value}`;
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    return (
        <div className="w-full h-full">
            {chartData.labels.length > 0 ? (
                <Line data={chartData} options={options} />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 dark:text-gray-400">ไม่มีข้อมูลสำหรับแสดงผล</p>
                </div>
            )}
        </div>
    );
};

export default RatioTrendChart; 