import { useMemo } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { CHART_COLORS, COMMON_STYLES } from '../../constants/dashboard';

export function Charts({ overallData }) {
    const chartData = useMemo(() => {
        const wardEntries = Object.entries(overallData.byWard || {});
        if (wardEntries.length === 0) {
            return {
                pie: { labels: [], datasets: [{ data: [] }] },
                bar: { labels: [], datasets: [{ data: [] }] }
            };
        }
        const labels = wardEntries.map(([ward]) => ward);
        const data = wardEntries.map(([, value]) => value.numberOfPatients || 0);

        return {
            pie: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: CHART_COLORS.background.slice(0, labels.length),
                    borderColor: CHART_COLORS.border.slice(0, labels.length),
                    borderWidth: 1,
                }]
            },
            bar: {
                labels,
                datasets: [{
                    label: 'Patient Census',
                    data,
                    backgroundColor: CHART_COLORS.background.slice(0, labels.length),
                    borderColor: CHART_COLORS.border.slice(0, labels.length),
                    borderWidth: 1,
                }]
            }
        };
    }, [overallData.byWard]);

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: {
                        size: 14,  // เพิ่มขนาดตัวอักษร
                        family: "'Kanit', sans-serif"  // เพิ่มฟอนต์ไทย
                    }
                }
            },
            title: {
                display: true,
                text: 'Patient Distribution by Ward',
                font: {
                    size: 16,
                    weight: 'bold'
                }
            },
            tooltip: {
                titleFont: {
                    size: 14,
                    family: "'Kanit', sans-serif"
                },
                bodyFont: {
                    size: 13,
                    family: "'Kanit', sans-serif"
                },
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
                        return `จำนวนผู้ป่วย: ${value} คน (${percentage}%)`;
                    }
                }
            }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 14,
                        family: "'Kanit', sans-serif"
                    }
                }
            },
            title: {
                display: true,
                text: 'Patient Census by Ward',
                font: {
                    size: 16,
                    weight: 'bold'
                }
            },
            tooltip: {
                titleFont: {
                    size: 14,
                    family: "'Kanit', sans-serif"
                },
                bodyFont: {
                    size: 13,
                    family: "'Kanit', sans-serif"
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'จำนวนผู้ป่วย (คน)',
                    font: {
                        size: 14,
                        family: "'Kanit', sans-serif"
                    }
                },
                ticks: {
                    font: {
                        size: 12,
                        family: "'Kanit', sans-serif"
                    }
                }
            },
            x: {
                ticks: {
                    font: {
                        size: 12,
                        family: "'Kanit', sans-serif"
                    }
                }
            }
        },
        onHover: (event, chartElement) => {
            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: '400px' }}>
                <Pie data={chartData.pie} options={pieOptions} />
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: '400px' }}>
                <Bar data={chartData.bar} options={barOptions} />
            </div>
        </div>
    );
}
