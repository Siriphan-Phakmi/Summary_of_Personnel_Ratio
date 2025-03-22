'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addDays, subDays, startOfWeek, endOfWeek, subWeeks, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
    FaChartLine, 
    FaUsers, 
    FaUserNurse, 
    FaExclamationTriangle, 
    FaCalendarAlt, 
    FaHospital, 
    FaFilePdf,
    FaArrowUp,
    FaArrowDown,
    FaMinus
} from 'react-icons/fa';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import DateRangePicker from '../common/DateRangePicker';
import Select from '../common/Select';
import DashboardContainer from '../containers/DashboardContainer';
import RatioBarChart from './charts/RatioBarChart';
import RatioTrendChart from './charts/RatioTrendChart';
import StaffTrendChart from './charts/StaffTrendChart';
import PatientBarChart from './charts/PatientBarChart';

/**
 * ReportPage Component
 * หน้าแสดงรายงานและการวิเคราะห์ข้อมูลอัตราส่วนบุคลากร
 */
export default function ReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // ดึงค่าพารามิเตอร์จาก URL
    const wardId = searchParams.get('wardId');
    const reportType = searchParams.get('type') || 'daily';
    
    // สถานะข้อมูล
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reports, setReports] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [wards, setWards] = useState([]);
    const [selectedWard, setSelectedWard] = useState(wardId || 'all');
    const [selectedReportType, setSelectedReportType] = useState(reportType);
    const [dateRange, setDateRange] = useState(() => {
        // กำหนดช่วงวันที่ตาม report type
        const today = new Date();
        
        if (reportType === 'weekly') {
            return {
                start: format(subWeeks(startOfWeek(today), 1), 'yyyy-MM-dd'),
                end: format(endOfWeek(today), 'yyyy-MM-dd')
            };
        } else if (reportType === 'monthly') {
            return {
                start: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
                end: format(endOfMonth(today), 'yyyy-MM-dd')
            };
        } else {
            // Default: daily - last 7 days
            return {
                start: format(subDays(today, 6), 'yyyy-MM-dd'),
                end: format(today, 'yyyy-MM-dd')
            };
        }
    });
    
    // ตัวเลือกสำหรับประเภทรายงาน
    const reportTypeOptions = [
        { value: 'daily', label: 'รายวัน' },
        { value: 'weekly', label: 'รายสัปดาห์' },
        { value: 'monthly', label: 'รายเดือน' }
    ];
    
    // โหลดข้อมูลวอร์ด
    useEffect(() => {
        async function fetchWards() {
            try {
                const response = await axios.get('/api/wards');
                
                if (response.data && response.data.wards) {
                    // เพิ่มตัวเลือก "ทุกวอร์ด"
                    const wardOptions = [
                        { id: 'all', name: 'ทุกวอร์ด' },
                        ...response.data.wards
                    ];
                    
                    setWards(wardOptions);
                }
            } catch (err) {
                console.error('Error fetching wards:', err);
                setError('ไม่สามารถโหลดข้อมูลวอร์ดได้');
            }
        }
        
        fetchWards();
    }, []);
    
    // โหลดข้อมูลรายงาน
    useEffect(() => {
        async function fetchReports() {
            setLoading(true);
            setError(null);
            
            try {
                // สร้าง URL สำหรับ API
                let url = `/api/reports?startDate=${dateRange.start}&endDate=${dateRange.end}&type=${selectedReportType}`;
                
                if (selectedWard !== 'all') {
                    url += `&wardId=${selectedWard}`;
                }
                
                const response = await axios.get(url);
                
                if (response.data) {
                    setReports(response.data.reports || []);
                    setAnalysis(response.data.analysis || null);
                } else {
                    setError('ไม่พบข้อมูลรายงาน');
                }
            } catch (err) {
                console.error('Error fetching reports:', err);
                setError('ไม่สามารถโหลดข้อมูลรายงานได้');
            } finally {
                setLoading(false);
            }
        }
        
        // เรียกใช้ฟังก์ชันโหลดข้อมูล
        fetchReports();
        
        // อัปเดต URL
        const params = new URLSearchParams();
        if (selectedWard !== 'all') params.set('wardId', selectedWard);
        params.set('type', selectedReportType);
        
        router.push(`/reports?${params.toString()}`, { 
            scroll: false 
        });
    }, [dateRange, selectedWard, selectedReportType, router]);
    
    // จัดรูปแบบชื่อวอร์ดที่เลือก
    const selectedWardName = useMemo(() => {
        if (selectedWard === 'all') return 'ทุกวอร์ด';
        const ward = wards.find(w => w.id === selectedWard);
        return ward ? ward.name : 'N/A';
    }, [selectedWard, wards]);
    
    // สร้างฟังก์ชันสำหรับการส่งออกเป็น PDF
    const exportReport = () => {
        // จะเพิ่มฟังก์ชันการส่งออกเป็น PDF ในอนาคต
        alert('ฟังก์ชันการส่งออกเป็น PDF จะเพิ่มในอนาคต');
    };
    
    // สร้าง icon สำหรับแสดงแนวโน้ม
    const getTrendIcon = (trend) => {
        if (trend === 'increasing') return <FaArrowUp className="text-red-500" />;
        if (trend === 'decreasing') return <FaArrowDown className="text-green-500" />;
        return <FaMinus className="text-gray-500" />;
    };
    
    // สร้าง class สำหรับแสดงสีตามความรุนแรง
    const getSeverityClass = (severity) => {
        switch (severity) {
            case 'critical':
                return 'text-red-500 border-red-500';
            case 'warning':
                return 'text-orange-500 border-orange-500';
            case 'info':
                return 'text-blue-500 border-blue-500';
            default:
                return 'text-gray-500 border-gray-500';
        }
    };
    
    // แสดงข้อมูลช่วงเวลา
    const timeframeLabel = useMemo(() => {
        if (!dateRange) return '';
        
        const formatDate = (dateStr) => {
            return format(new Date(dateStr), 'dd MMM yyyy', { locale: th });
        };
        
        return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
    }, [dateRange]);
    
    return (
        <DashboardContainer>
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaChartLine className="mr-2" /> รายงานและวิเคราะห์อัตราส่วนบุคลากร
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    วิเคราะห์ข้อมูลอัตราส่วนบุคลากรต่อผู้ป่วยเพื่อการวางแผนและจัดการกำลังคน
                </p>
            </div>
            
            {/* Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-1">วอร์ด</label>
                    <Select
                        id="ward-select"
                        options={wards.map(ward => ({ value: ward.id, label: ward.name }))}
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1">ประเภทรายงาน</label>
                    <Select
                        id="report-type-select"
                        options={reportTypeOptions}
                        value={selectedReportType}
                        onChange={(e) => setSelectedReportType(e.target.value)}
                    />
                </div>
                
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium mb-1">ช่วงเวลา</label>
                    <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onDatesChange={setDateRange}
                    />
                </div>
            </div>
            
            {/* Report Content */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
                    <p className="font-medium">{error}</p>
                </div>
            ) : reports.length === 0 ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 rounded-lg">
                    <p className="font-medium">ไม่พบข้อมูลรายงานในช่วงเวลาที่เลือก</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Report Header */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <div className="flex flex-wrap justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold flex items-center">
                                    <FaHospital className="mr-2" /> {selectedWardName}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                                    <FaCalendarAlt className="mr-2" /> {timeframeLabel}
                                </p>
                            </div>
                            <button
                                onClick={exportReport}
                                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center"
                            >
                                <FaFilePdf className="mr-2" /> ส่งออกเป็น PDF
                            </button>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">จำนวนผู้ป่วยเฉลี่ย</p>
                                        <p className="text-2xl font-bold">{analysis?.patientSummary?.averageCensus.toFixed(1) || '0'}</p>
                                    </div>
                                    <div className="flex items-center">
                                        {getTrendIcon(analysis?.trends?.patientCensus)}
                                        <span className="text-sm ml-1">{analysis?.trends?.patientCensusChange}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">จำนวนพยาบาลเฉลี่ย (RN+PN)</p>
                                        <p className="text-2xl font-bold">
                                            {(analysis?.staffSummary?.averageRN + analysis?.staffSummary?.averagePN).toFixed(1) || '0'}
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        {getTrendIcon(analysis?.trends?.nurseStaffing)}
                                        <span className="text-sm ml-1">{analysis?.trends?.nurseStaffingChange}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">อัตราส่วนพยาบาลต่อผู้ป่วยเฉลี่ย</p>
                                        <p className="text-2xl font-bold">{analysis?.ratioSummary?.averageNurseToPatientRatio.toFixed(2) || '0'}</p>
                                    </div>
                                    <div className="flex items-center">
                                        {getTrendIcon(analysis?.trends?.nurseToPatientRatio)}
                                        <span className="text-sm ml-1">{analysis?.trends?.ratioChange}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">สัดส่วนวันตามระดับความเสี่ยง</p>
                                <div className="grid grid-cols-4 gap-1 mt-2">
                                    <div className="text-center">
                                        <div className="h-8 bg-red-500 rounded-sm" style={{ 
                                            width: '100%',
                                            opacity: (analysis?.ratioSummary?.daysWithCriticalRatio / analysis?.totalReports) || 0
                                        }}></div>
                                        <p className="text-xs mt-1">{analysis?.ratioSummary?.daysWithCriticalRatio || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="h-8 bg-orange-500 rounded-sm" style={{ 
                                            width: '100%',
                                            opacity: (analysis?.ratioSummary?.daysWithWarningRatio / analysis?.totalReports) || 0
                                        }}></div>
                                        <p className="text-xs mt-1">{analysis?.ratioSummary?.daysWithWarningRatio || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="h-8 bg-yellow-500 rounded-sm" style={{ 
                                            width: '100%',
                                            opacity: (analysis?.ratioSummary?.daysWithAcceptableRatio / analysis?.totalReports) || 0
                                        }}></div>
                                        <p className="text-xs mt-1">{analysis?.ratioSummary?.daysWithAcceptableRatio || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="h-8 bg-green-500 rounded-sm" style={{ 
                                            width: '100%',
                                            opacity: (analysis?.ratioSummary?.daysWithOptimalRatio / analysis?.totalReports) || 0
                                        }}></div>
                                        <p className="text-xs mt-1">{analysis?.ratioSummary?.daysWithOptimalRatio || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Recommendations Section */}
                    {analysis?.recommendations && analysis.recommendations.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-bold mb-3 flex items-center">
                                <FaExclamationTriangle className="mr-2" /> ข้อเสนอแนะ
                            </h3>
                            <div className="space-y-4">
                                {analysis.recommendations.map((recommendation, index) => (
                                    <div 
                                        key={index} 
                                        className={`border-l-4 p-3 ${getSeverityClass(recommendation.severity)} bg-opacity-10 rounded`}
                                    >
                                        <p className="font-medium">{recommendation.message}</p>
                                        <p className="mt-1 text-sm">{recommendation.action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Nurse-to-Patient Ratio Chart */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-bold mb-4">อัตราส่วนพยาบาลต่อผู้ป่วย</h3>
                            <div className="h-80">
                                <RatioBarChart data={reports} />
                            </div>
                        </div>
                        
                        {/* Staff Trend Chart */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-bold mb-4">แนวโน้มจำนวนบุคลากร</h3>
                            <div className="h-80">
                                <StaffTrendChart data={reports} />
                            </div>
                        </div>
                        
                        {/* Ratio Trend Chart */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-bold mb-4">แนวโน้มอัตราส่วนตามช่วงเวลา</h3>
                            <div className="h-80">
                                <RatioTrendChart data={reports} />
                            </div>
                        </div>
                        
                        {/* Patient Census Chart */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-bold mb-4">จำนวนผู้ป่วยและการเปลี่ยนแปลง</h3>
                            <div className="h-80">
                                <PatientBarChart data={reports} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Summary Trend */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-bold mb-3">สรุปแนวโน้ม</h3>
                        <p className="text-gray-700 dark:text-gray-300">{analysis?.trends?.message || 'ไม่มีข้อมูลแนวโน้ม'}</p>
                    </div>
                </div>
            )}
        </DashboardContainer>
    );
} 