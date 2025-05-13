'use client';

import React, { useState, useEffect } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Timestamp, collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import { COLLECTION_SUMMARIES, COLLECTION_WARDS } from '@/app/features/ward-form/services/constants';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission, getAllWards } from '@/app/features/ward-form/services/wardService';
import { Ward, ShiftType, FormStatus } from '@/app/core/types/ward';
import { UserRole } from '@/app/core/types/user';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
         BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

// CSS สำหรับการพิมพ์
const printStyles = `
  @media print {
    body { background-color: white; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    .print-container { width: 100% !important; padding: 0 !important; margin: 0 !important; }
    .print-break-after { page-break-after: always; }
    .print-full-width { width: 100% !important; }
    nav, button, select, input, .bg-gray-100 { background-color: white !important; }
  }
`;

// Types
interface DailySummary {
  id?: string;
  wardId: string;
  wardName: string;
  date: Date | Timestamp;
  dateString: string;
  allFormsApproved: boolean;
  
  // กะเช้า
  morningFormId?: string;
  morningPatientCensus?: number;
  morningNurseManager?: number;
  morningRn?: number;
  morningPn?: number;
  morningWc?: number;
  morningNurseTotal?: number;
  morningNurseRatio?: number;
  morningNewAdmit?: number;
  morningTransferIn?: number;
  morningReferIn?: number;
  morningAdmitTotal?: number;
  morningDischarge?: number;
  morningTransferOut?: number;
  morningReferOut?: number;
  morningDead?: number;
  morningDischargeTotal?: number;
  
  // กะดึก
  nightFormId?: string;
  nightPatientCensus?: number;
  nightNurseManager?: number;
  nightRn?: number;
  nightPn?: number;
  nightWc?: number;
  nightNurseTotal?: number;
  nightNurseRatio?: number;
  nightNewAdmit?: number;
  nightTransferIn?: number;
  nightReferIn?: number;
  nightAdmitTotal?: number;
  nightDischarge?: number;
  nightTransferOut?: number;
  nightReferOut?: number;
  nightDead?: number;
  nightDischargeTotal?: number;
  
  // รวม 24 ชั่วโมง
  dailyPatientCensus?: number;
  dailyNurseTotal?: number;
  dailyNurseRatio?: number;
  dailyAdmitTotal?: number;
  dailyDischargeAllTotal?: number;
  availableBeds?: number;
  unavailableBeds?: number;
  plannedDischarge?: number;
  opd24hr?: number;
  dailyNewAdmitTotal?: number;
  dailyReferInTotal?: number;
  dailyReferOutTotal?: number;
  dailyDeadTotal?: number;
  dailyNurseManagerTotal?: number;
  dailyRnTotal?: number;
  dailyPnTotal?: number;
  dailyWcTotal?: number;
}

// สีที่ใช้ในแอพพลิเคชัน
const COLORS = {
  blue: '#3498DB',
  green: '#2ECC71',
  purple: '#9B59B6',
  yellow: '#F1C40F',
  orange: '#E67E22',
  red: '#E74C3C',
  teal: '#1ABC9C',
  gray: '#95A5A6'
};

// ข้อมูลการ์ดแสดงผล Ward
const WardCard = ({ title, count, onClick, isSelected }: { title: string; count: number; onClick?: () => void; isSelected?: boolean }) => {
  return (
    <div 
      className={`${isSelected ? 'bg-blue-800 border-blue-500 border-2' : 'bg-gray-800'} p-4 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={onClick}
    >
      <h3 className="font-bold text-lg text-white">{title}</h3>
      <p className="text-3xl font-bold mt-2 text-white">{count}</p>
      <p className="text-xs mt-1 text-gray-400">คลิกเพื่อดูรายละเอียด...</p>
    </div>
  );
};

// ข้อมูลแถว (Row) ในตาราง
const DataRow = ({ label, data }: { label: string; data: number[] }) => {
  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800">
      <td className="py-2 px-3 font-medium text-white">{label}</td>
      {data.map((value, index) => (
        <td key={index} className="py-2 px-3 text-center text-white">{value}</td>
      ))}
    </tr>
  );
};

// Component หลัก
export default function DashboardPage() {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAdmin, setIsAdmin] = useState(false);

  // โหลดรายการ Ward
  useEffect(() => {
    const loadWards = async () => {
      if (!user) {
        setWards([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        let userWards = [];
        
        // ตรวจสอบสิทธิ์การเข้าถึง
        const hasAdminAccess = user.role === UserRole.ADMIN || 
                               user.role === UserRole.SUPER_ADMIN || 
                               user.role === UserRole.DEVELOPER ||
                               user.role === UserRole.HEAD_NURSE ||
                               user.role === UserRole.APPROVER;
        
        setIsAdmin(hasAdminAccess);
        
        if (hasAdminAccess) {
          // สำหรับ admin ดึงข้อมูลทุกแผนก
          userWards = await getAllWards();
        } else {
          // สำหรับผู้ใช้ทั่วไป ดึงเฉพาะแผนกที่มีสิทธิ์
          userWards = await getWardsByUserPermission(user);
          
          // ถ้าไม่ได้รับข้อมูลแผนก แต่ผู้ใช้มี floor กำหนดไว้ ให้พยายามดึงข้อมูลจาก floor
          if ((!userWards || userWards.length === 0) && user.floor) {
            try {
              const wardSnapshot = await getDoc(doc(db, COLLECTION_WARDS, user.floor));
              if (wardSnapshot.exists()) {
                const wardData = wardSnapshot.data() as Ward;
                userWards = [{
                  ...wardData,
                  id: wardSnapshot.id
                }];
              }
            } catch (err) {
              console.error('[DashboardPage] Error fetching ward by floor:', err);
            }
          }
        }
        
        setWards(userWards);
        
        // ถ้ามีแผนก ให้เลือกแผนกแรก
        if (userWards.length > 0) {
          setSelectedWardId(userWards[0].id);
        }
      } catch (err) {
        console.error('[DashboardPage] Error loading wards:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
        setWards([]);
      } finally {
        setLoading(false);
      }
    };
    
    if(user) loadWards();
    else {
      setLoading(false);
      setWards([]);
      setSelectedWardId(null);
    }
  }, [user]);
  
  // โหลดข้อมูลสรุปเมื่อเลือก Ward
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!selectedWardId || !user) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
          
        // แปลงวันที่เป็น Date objects
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);

        // สร้าง query สำหรับ Firebase - เฉพาะฟอร์มที่อนุมัติแล้วเท่านั้น
        const summaryQuery = query(
          collection(db, COLLECTION_SUMMARIES),
          where('date', '>=', startDateObj),
          where('date', '<=', endDateObj),
          where('allFormsApproved', '==', true),
          orderBy('date', 'desc')
        );

        const summariesSnapshot = await getDocs(summaryQuery);
        
        const fetchedSummaries: DailySummary[] = [];
        
        summariesSnapshot.forEach(doc => {
          const data = doc.data() as DailySummary;
          fetchedSummaries.push({
            ...data,
            id: doc.id,
            date: data.date instanceof Timestamp ? data.date.toDate() : data.date
          });
        });
        
        setSummaries(fetchedSummaries);
        
        if (fetchedSummaries.length === 0) {
          setError('ไม่พบข้อมูลสรุปในช่วงเวลาที่เลือก (เฉพาะรายการที่อนุมัติแล้วเท่านั้น)');
        }
      } catch (err) {
        console.error('[DashboardPage] Error fetching summaries:', err);
        setError('เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง');
        setSummaries([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaries();
  }, [selectedWardId, startDate, endDate, user]);

  // เตรียมข้อมูลแสดงจำนวนผู้ป่วยแต่ละ Ward
  const wardStats = wards.map(ward => {
    // หาข้อมูลล่าสุดของแต่ละ ward
    const wardSummary = summaries.find(s => s.wardId === ward.id);
    return {
      id: ward.id,
      name: ward.wardName,
      count: wardSummary?.dailyPatientCensus || 0
    };
  });
  
  // กรองเฉพาะ wards ที่อนุมัติแล้วและมีในระบบ
  const approvedWards = wards.filter(ward => {
    const wardSummary = summaries.find(s => s.wardId === ward.id);
    return wardSummary?.allFormsApproved === true;
  });
  
  // เตรียมข้อมูลสำหรับกราฟวงกลม (สัดส่วนผู้ป่วย)
  const preparePieChartData = () => {
    if (summaries.length === 0) return [];
    
    return approvedWards.map(ward => {
      const wardSummary = summaries.find(s => s.wardId === ward.id);
      return {
        name: ward.wardName,
        value: wardSummary?.dailyPatientCensus || 0,
      };
    }).filter(item => item.value > 0);
  };
  
  // เตรียมข้อมูลสำหรับกราฟแท่ง (การกระจายผู้ป่วย)
  const prepareBarChartData = () => {
    if (summaries.length === 0) return [];
    
    return approvedWards.map(ward => {
      const wardSummary = summaries.find(s => s.wardId === ward.id);
      return {
        name: ward.wardName,
        patients: wardSummary?.dailyPatientCensus || 0,
      };
    }).filter(item => item.patients > 0);
  };

  // สีสำหรับกราฟวงกลม
  const CHART_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];
  
  // ถ้ามีข้อมูลล่าสุดของ Ward ที่เลือก
  const selectedWardSummary = selectedWardId 
    ? summaries.find(s => s.wardId === selectedWardId)
    : null;

  return (
    <div className="min-h-screen bg-gray-900 print-container">
      <style>{printStyles}</style>
      <NavBar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-white">จำนวนผู้ป่วยแยกตามแผนก</h1>
            
            <div className="flex space-x-2 no-print">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                onClick={() => window.print()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                </svg>
                พิมพ์รายงาน
              </button>
              
              <button 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
                onClick={() => {
                  alert('ฟังก์ชันส่งออกเป็น Excel จะถูกพัฒนาในอนาคต');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                ส่งออก Excel
              </button>
            </div>
          </div>
          
          {/* ตัวกรองและเลือก Ward */}
          <div className="flex flex-wrap gap-4 mb-6 no-print">
            <select 
              className="border border-gray-700 bg-gray-800 text-white rounded px-3 py-2"
              value={selectedWardId || ''}
              onChange={(e) => setSelectedWardId(e.target.value)}
            >
              <option value="">เลือกแผนก</option>
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>{ward.wardName}</option>
              ))}
            </select>
            
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">วันที่เริ่มต้น</label>
              <input
                type="date"
                className="border border-gray-700 bg-gray-800 text-white rounded px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-400">วันที่สิ้นสุด</label>
              <input
                type="date"
                className="border border-gray-700 bg-gray-800 text-white rounded px-3 py-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          {/* แสดงวันที่ข้อมูลล่าสุด */}
          {summaries.length > 0 && (
            <div className="bg-blue-900 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-blue-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-300">
                  แสดงข้อมูลล่าสุด ณ วันที่ {format(summaries[0].date instanceof Date ? summaries[0].date : new Date(), 'dd MMMM yyyy', { locale: th })}
                </p>
              </div>
            </div>
          )}
          
          {/* แสดงผลจำนวนผู้ป่วยแยกตาม Ward */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-10 text-white">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                <span className="ml-3">กำลังโหลดข้อมูล...</span>
              </div>
            ) : error ? (
              <div className="col-span-full bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded">
                <p>{error}</p>
              </div>
            ) : (
              wardStats.map(ward => (
                <WardCard 
                  key={ward.id}
                  title={ward.name}
                  count={ward.count}
                  onClick={() => setSelectedWardId(ward.id)}
                  isSelected={ward.id === selectedWardId}
                />
              ))
            )}
          </div>
          
          {/* ตาราง Patient Census By Nurse Manager */}
          <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="py-2 px-3 text-left text-white">หัวข้อ</th>
                    {wards.map(ward => (
                      <th key={ward.id} className="py-2 px-3 text-center text-white">{ward.wardName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={wards.length + 1} className="py-4 text-center text-white">กำลังโหลดข้อมูล...</td>
                    </tr>
                  ) : (
                    <>
                      <DataRow 
                        label="Patient Census" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyPatientCensus || 0;
                        })} 
                      />
                      <DataRow 
                        label="Nurse Manager" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyNurseManagerTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="RN" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyRnTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="PN" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyPnTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="WC" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyWcTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="New Admit" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyNewAdmitTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="Transfer In" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningTransfer = wardSummary?.morningTransferIn || 0;
                          const nightTransfer = wardSummary?.nightTransferIn || 0;
                          return morningTransfer + nightTransfer;
                        })} 
                      />
                      <DataRow 
                        label="Refer In" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyReferInTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="Transfer Out" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningTransfer = wardSummary?.morningTransferOut || 0;
                          const nightTransfer = wardSummary?.nightTransferOut || 0;
                          return morningTransfer + nightTransfer;
                        })} 
                      />
                      <DataRow 
                        label="Refer Out" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyReferOutTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="Discharge" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          const morningDischarge = wardSummary?.morningDischarge || 0;
                          const nightDischarge = wardSummary?.nightDischarge || 0;
                          return morningDischarge + nightDischarge;
                        })} 
                      />
                      <DataRow 
                        label="Dead" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.dailyDeadTotal || 0;
                        })} 
                      />
                      <DataRow 
                        label="Available" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.availableBeds || 0;
                        })} 
                      />
                      <DataRow 
                        label="Unavailable" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.unavailableBeds || 0;
                        })} 
                      />
                      <DataRow 
                        label="Planned Discharge" 
                        data={wards.map(ward => {
                          const wardSummary = summaries.find(s => s.wardId === ward.id);
                          return wardSummary?.plannedDischarge || 0;
                        })} 
                      />
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* กราฟวงกลมและกราฟแท่ง */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4 text-white">การกระจายผู้ป่วย (แผนภูมิวงกลม)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {preparePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: 'white' }} />
                    <Legend formatter={(value) => <span style={{ color: 'white' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4 text-white">การกระจายผู้ป่วย (แผนภูมิแท่ง)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareBarChartData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#E5E7EB" />
                    <YAxis stroke="#E5E7EB" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: 'white' }} />
                    <Legend formatter={(value) => <span style={{ color: 'white' }}>{value}</span>} />
                    <Bar dataKey="patients" name="จำนวนผู้ป่วย" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* กราฟเส้นแสดงสถิติย้อนหลัง */}
          <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">จำนวนผู้ป่วยรายวัน</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={summaries.map(s => ({
                    date: format(s.date instanceof Date ? s.date : new Date(), 'dd/MM'),
                    morning: s.morningPatientCensus || 0,
                    night: s.nightPatientCensus || 0,
                    total: s.dailyPatientCensus || 0
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#E5E7EB" />
                  <YAxis stroke="#E5E7EB" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: 'white' }} />
                  <Legend formatter={(value) => <span style={{ color: 'white' }}>{value}</span>} />
                  <Line type="monotone" dataKey="morning" name="กะเช้า" stroke="#8884d8" />
                  <Line type="monotone" dataKey="night" name="กะดึก" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="total" name="รวม" stroke="#ffc658" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* รายละเอียดเพิ่มเติมของ Ward ที่เลือก */}
          {selectedWardSummary && (
            <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">รายละเอียดแผนก {selectedWardSummary.wardName}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-900 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-white">ข้อมูลกะเช้า</h3>
                  <div className="space-y-1 text-gray-200">
                    <div className="flex justify-between">
                      <span>จำนวนผู้ป่วย:</span>
                      <span className="font-bold">{selectedWardSummary.morningPatientCensus || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำนวนพยาบาล:</span>
                      <span className="font-bold">{selectedWardSummary.morningNurseTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>อัตราส่วน:</span>
                      <span className="font-bold">{selectedWardSummary.morningNurseRatio || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>รับใหม่:</span>
                      <span className="font-bold">{selectedWardSummary.morningNewAdmit || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำหน่าย:</span>
                      <span className="font-bold">{selectedWardSummary.morningDischarge || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-900 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-white">ข้อมูลกะดึก</h3>
                  <div className="space-y-1 text-gray-200">
                    <div className="flex justify-between">
                      <span>จำนวนผู้ป่วย:</span>
                      <span className="font-bold">{selectedWardSummary.nightPatientCensus || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำนวนพยาบาล:</span>
                      <span className="font-bold">{selectedWardSummary.nightNurseTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>อัตราส่วน:</span>
                      <span className="font-bold">{selectedWardSummary.nightNurseRatio || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>รับใหม่:</span>
                      <span className="font-bold">{selectedWardSummary.nightNewAdmit || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำหน่าย:</span>
                      <span className="font-bold">{selectedWardSummary.nightDischarge || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-900 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-white">สรุปรวม 24 ชั่วโมง</h3>
                  <div className="space-y-1 text-gray-200">
                    <div className="flex justify-between">
                      <span>จำนวนผู้ป่วยรวม:</span>
                      <span className="font-bold">{selectedWardSummary.dailyPatientCensus || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำนวนพยาบาล:</span>
                      <span className="font-bold">{selectedWardSummary.dailyNurseTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>อัตราส่วนเฉลี่ย:</span>
                      <span className="font-bold">{selectedWardSummary.dailyNurseRatio || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>รับใหม่ทั้งหมด:</span>
                      <span className="font-bold">{selectedWardSummary.dailyNewAdmitTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>จำหน่าย/เสียชีวิต:</span>
                      <span className="font-bold">{selectedWardSummary.dailyDischargeAllTotal || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 text-white">สัดส่วนบุคลากรพยาบาล</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Nurse Manager', value: selectedWardSummary.dailyNurseManagerTotal || 0 },
                            { name: 'RN', value: selectedWardSummary.dailyRnTotal || 0 },
                            { name: 'PN', value: selectedWardSummary.dailyPnTotal || 0 },
                            { name: 'WC', value: selectedWardSummary.dailyWcTotal || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label
                        >
                          <Cell fill="#F1C40F" />
                          <Cell fill="#3498DB" />
                          <Cell fill="#2ECC71" />
                          <Cell fill="#9B59B6" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: 'white' }} />
                        <Legend formatter={(value) => <span style={{ color: 'white' }}>{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 text-white">เปรียบเทียบกะเช้า/กะดึก</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'ผู้ป่วย', morning: selectedWardSummary.morningPatientCensus || 0, night: selectedWardSummary.nightPatientCensus || 0 },
                          { name: 'พยาบาล', morning: selectedWardSummary.morningNurseTotal || 0, night: selectedWardSummary.nightNurseTotal || 0 },
                          { name: 'รับใหม่', morning: selectedWardSummary.morningNewAdmit || 0, night: selectedWardSummary.nightNewAdmit || 0 },
                          { name: 'จำหน่าย', morning: selectedWardSummary.morningDischarge || 0, night: selectedWardSummary.nightDischarge || 0 }
                        ]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#E5E7EB" />
                        <YAxis stroke="#E5E7EB" />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: 'white' }} />
                        <Legend formatter={(value) => <span style={{ color: 'white' }}>{value}</span>} />
                        <Bar dataKey="morning" name="กะเช้า" fill="#8884d8" />
                        <Bar dataKey="night" name="กะดึก" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 