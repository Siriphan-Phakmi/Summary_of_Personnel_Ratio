import { useMemo } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { CHART_COLORS, COMMON_STYLES } from '../../constants/dashboard';

export function Charts({ overallData }) {
    const chartData = useMemo(() => {
        const wardEntries = Object.entries(overallData.byWard || {});
        const labels = wardEntries.map(([ward]) => ward);
        const data = wardEntries.map(([, value]) => value.totalPatients || 0);

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
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
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
            },
            title: {
                display: true,
                text: 'Patient Distribution by Ward',
            }
        }
    };

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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={COMMON_STYLES.chartContainer}>
                <h2 className={COMMON_STYLES.title}>Available</h2>
                <div style={{ height: '320px' }}>
                    <Pie data={chartData.pie} options={pieOptions} />
                </div>
            </div>

            <div className={COMMON_STYLES.chartContainer}>
                <h2 className={COMMON_STYLES.title}>Patient Census By Ward</h2>
                <div style={{ height: '320px' }}>
                    <Bar options={barOptions} data={chartData.bar} />
                </div>
            </div>
        </div>
    );
}
