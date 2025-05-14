'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { Timestamp, getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/app/core/firebase/firebase';
import NavBar from '@/app/core/ui/NavBar';
import { useAuth } from '@/app/features/auth';
import { getWardsByUserPermission, getAllWards } from '@/app/features/ward-form/services/wardService';
import { Ward, WardForm, ShiftType, FormStatus } from '@/app/core/types/ward';
import { UserRole } from '@/app/core/types/user';
import { COLLECTION_SUMMARIES, COLLECTION_WARDFORMS } from '@/app/features/ward-form/services/constants';
import { DashboardSummary, WardFormData } from './types';
import WardSummaryDashboard from './WardSummaryDashboard';
import PatientCensusCalculation from './PatientCensusCalculation';

const printStyles = `
  @media print {
    body { background-color: white; }
    .no-print { display: none !important; }
    /* Add other print-specific styles if needed */
  }
`;

// ดึงข้อมูลจาก dailySummaries collection
const getDailySummary = async (wardId: string, dateString: string) => {
  console.log(`[getDailySummary] Fetching summary for wardId=${wardId}, date=${dateString}`);
  
  try {
    // แปลง wardId เป็นตัวพิมพ์ใหญ่เพื่อให้ตรงกับข้อมูลในฐานข้อมูล
    const formattedWardId = wardId.toUpperCase();
    
    // ดึงข้อมูลจาก dailySummaries collection
    const summariesRef = collection(db, COLLECTION_SUMMARIES);
    
    console.log(`[getDailySummary] Query params: formattedWardId=${formattedWardId}, dateString=${dateString}`);
    
    const summaryQuery = query(
      summariesRef,
      where('wardId', '==', formattedWardId),
      where('dateString', '==', dateString)
    );
    
    const querySnapshot = await getDocs(summaryQuery);
    console.log(`[getDailySummary] Found ${querySnapshot.size} summaries`);
    
    if (querySnapshot.size > 0) {
      const summaryDoc = querySnapshot.docs[0];
      const data = summaryDoc.data();
      
      console.log(`[getDailySummary] Summary data:`, data);
      
      // สร้างข้อมูลแบบฟอร์มจาก dailySummary
      const morningForm: WardFormData | null = data.morningFormId ? {
        id: data.morningFormId,
        patientCensus: data.morningPatientCensus || 0,
        calculatedCensus: data.morningCalculatedCensus,
        nurseManager: data.morningNurseManager || 0,
        rn: data.morningRn || 0,
        pn: data.morningPn || 0,
        wc: data.morningWc || 0,
        newAdmit: data.morningNewAdmit || 0,
        transferIn: data.morningTransferIn || 0,
        referIn: data.morningReferIn || 0,
        discharge: data.morningDischarge || 0,
        transferOut: data.morningTransferOut || 0,
        referOut: data.morningReferOut || 0,
        dead: data.morningDead || 0,
        available: data.availableBeds || 0,
        unavailable: data.unavailableBeds || 0,
        plannedDischarge: data.plannedDischarge || 0,
        admitTotal: data.morningAdmitTotal || 0,
        dischargeTotal: data.morningDischargeTotal || 0
      } : null;
      
      const nightForm: WardFormData | null = data.nightFormId ? {
        id: data.nightFormId,
        patientCensus: data.nightPatientCensus || 0,
        calculatedCensus: data.nightCalculatedCensus,
        nurseManager: data.nightNurseManager || 0,
        rn: data.nightRn || 0,
        pn: data.nightPn || 0,
        wc: data.nightWc || 0,
        newAdmit: data.nightNewAdmit || 0,
        transferIn: data.nightTransferIn || 0,
        referIn: data.nightReferIn || 0,
        discharge: data.nightDischarge || 0,
        transferOut: data.nightTransferOut || 0,
        referOut: data.nightReferOut || 0,
        dead: data.nightDead || 0,
        available: data.availableBeds || 0,
        unavailable: data.unavailableBeds || 0,
        plannedDischarge: data.plannedDischarge || 0,
        admitTotal: data.nightAdmitTotal || 0,
        dischargeTotal: data.nightDischargeTotal || 0
      } : null;
      
      return { morning: morningForm, night: nightForm };
    }
    
    return { morning: null, night: null };
  } catch (error) {
    console.error('[getDailySummary] Error:', error);
    throw error;
  }
};

// ดึงข้อมูลแบบฟอร์มโดยตรงจาก wardForms collection
const getWardFormsByDateAndWard = async (
  wardId: string, 
  dateString: string
): Promise<{ morning: WardFormData | null, night: WardFormData | null }> => {
  console.log(`[getWardFormsByDateAndWard] Fetching forms for wardId=${wardId}, date=${dateString}`);
  
  try {
    // แปลง wardId เป็นตัวพิมพ์ใหญ่เพื่อให้ตรงกับข้อมูลในฐานข้อมูล
    const formattedWardId = wardId.toUpperCase();
    
    // ดึงข้อมูลจาก wardForms collection โดยตรง
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    
    // เพิ่ม debug logs
    console.log(`[getWardFormsByDateAndWard] Query params: originalWardId=${wardId}, formattedWardId=${formattedWardId}, dateString=${dateString}, status=[${FormStatus.FINAL}, ${FormStatus.APPROVED}]`);
    
    const formsQuery = query(
      formsRef,
      where('wardId', '==', formattedWardId),
      where('dateString', '==', dateString),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED]),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(formsQuery);
    console.log(`[getWardFormsByDateAndWard] Found ${querySnapshot.size} forms`);
    
    // Debug: แสดงข้อมูลของ documents ที่พบ
    if (querySnapshot.size > 0) {
      querySnapshot.forEach((doc) => {
        const data = doc.data() as WardForm;
        console.log(`[getWardFormsByDateAndWard] Form: id=${doc.id}, shift=${data.shift}, status=${data.status}, patientCensus=${data.patientCensus}`);
      });
    } else {
      // ถ้าไม่พบข้อมูล ให้ลองใช้ query เงื่อนไขน้อยลง เพื่อดูว่ามีข้อมูลหรือไม่
      console.log(`[getWardFormsByDateAndWard] No forms found with original query. Trying alternative query...`);
      
      const alternativeQuery = query(
        formsRef,
        where('wardId', '==', formattedWardId),
        where('dateString', '==', dateString)
      );
      
      const altSnapshot = await getDocs(alternativeQuery);
      console.log(`[getWardFormsByDateAndWard] Alternative query found ${altSnapshot.size} forms`);
      
      if (altSnapshot.size > 0) {
        altSnapshot.forEach((doc) => {
          const data = doc.data() as WardForm;
          console.log(`[getWardFormsByDateAndWard] Alt Form: id=${doc.id}, shift=${data.shift}, status=${data.status}, patientCensus=${data.patientCensus}`);
        });
      }
    }
    
    let morningForm: WardFormData | null = null;
    let nightForm: WardFormData | null = null;
    
    querySnapshot.forEach(doc => {
      const data = doc.data() as WardForm;
      
      // คำนวณผลรวมของรับเข้าและจำหน่าย
      const admitTotal = (data.newAdmit || 0) + (data.transferIn || 0) + (data.referIn || 0);
      const dischargeTotal = (data.discharge || 0) + (data.transferOut || 0) + (data.referOut || 0) + (data.dead || 0);
      
      const formData: WardFormData = {
        id: doc.id,
        patientCensus: data.patientCensus || 0,
        calculatedCensus: data.calculatedCensus,
        initialPatientCensus: data.initialPatientCensus,
        nurseManager: data.nurseManager || 0,
        rn: data.rn || 0,
        pn: data.pn || 0,
        wc: data.wc || 0,
        newAdmit: data.newAdmit || 0,
        transferIn: data.transferIn || 0,
        referIn: data.referIn || 0,
        discharge: data.discharge || 0,
        transferOut: data.transferOut || 0,
        referOut: data.referOut || 0,
        dead: data.dead || 0,
        available: data.available || 0,
        unavailable: data.unavailable || 0,
        plannedDischarge: data.plannedDischarge || 0,
        admitTotal: admitTotal,
        dischargeTotal: dischargeTotal
      };
      
      if (data.shift === ShiftType.MORNING && !morningForm) {
        morningForm = formData;
      } else if (data.shift === ShiftType.NIGHT && !nightForm) {
        nightForm = formData;
      }
    });
    
    console.log(`[getWardFormsByDateAndWard] Morning form found: ${!!morningForm}, Night form found: ${!!nightForm}`);
    if (morningForm) {
      console.log('[getWardFormsByDateAndWard] Morning form details:', morningForm);
    }
    if (nightForm) {
      console.log('[getWardFormsByDateAndWard] Night form details:', nightForm);
    }
    
    return { morning: morningForm, night: nightForm };
  } catch (error) {
    console.error('[getWardFormsByDateAndWard] Error:', error);
    throw error;
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยทั้งหมดของทุก Ward
const fetchAllWardCensus = async (dateString: string) => {
  console.log(`[fetchAllWardCensus] Fetching census for all wards for date ${dateString}`);
  
  try {
    // แปลงวันที่เป็นรูปแบบที่ต้องการ
    const date = dateString;
    
    // ดึงข้อมูลจาก wardForms collection
    const formsRef = collection(db, COLLECTION_WARDFORMS);
    
    // สร้าง query ที่ดึงข้อมูลของวันที่ที่เลือกและมีสถานะเป็น FINAL หรือ APPROVED
    const formsQuery = query(
      formsRef,
      where('dateString', '==', date),
      where('status', 'in', [FormStatus.FINAL, FormStatus.APPROVED])
    );
    
    console.log(`[fetchAllWardCensus] Executing query for date ${date}`);
    const querySnapshot = await getDocs(formsQuery);
    console.log(`[fetchAllWardCensus] Found ${querySnapshot.size} forms`);
    
    // สร้าง Map เพื่อเก็บข้อมูล Patient Census ของแต่ละ Ward
    const wardCensusMap = new Map<string, number>();
    
    // วนลูปผ่านผลลัพธ์ที่ได้จาก query
    querySnapshot.forEach(doc => {
      const data = doc.data() as WardForm;
      const wardId = data.wardId;
      const patientCensus = data.patientCensus || 0;
      
      // ถ้ายังไม่มีข้อมูลของ Ward นี้ หรือข้อมูลที่มีอยู่น้อยกว่าข้อมูลใหม่ ให้เก็บข้อมูลใหม่
      if (!wardCensusMap.has(wardId) || wardCensusMap.get(wardId)! < patientCensus) {
        wardCensusMap.set(wardId, patientCensus);
      }
    });
    
    console.log(`[fetchAllWardCensus] Ward census data:`, Object.fromEntries(wardCensusMap));
    return wardCensusMap;
  } catch (error) {
    console.error('[fetchAllWardCensus] Error:', error);
    return new Map<string, number>();
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDailySummaries, setUseDailySummaries] = useState(true);
  const [wardCensusMap, setWardCensusMap] = useState<Map<string, number>>(new Map());

  // Load Wards
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
        const hasAdminAccess = user.role === UserRole.ADMIN || 
                               user.role === UserRole.SUPER_ADMIN || 
                             user.role === UserRole.DEVELOPER;
        const userWards = hasAdminAccess ? await getAllWards() : await getWardsByUserPermission(user);
        setWards(userWards);
        if (userWards.length > 0) {
          setSelectedWardId(userWards[0].id);
        }
      } catch (err) {
        console.error('[DashboardPage] Error loading wards:', err);
        setError('ไม่สามารถโหลดข้อมูลแผนกได้');
        setWards([]);
      } finally {
        // Defer setting loading to false to allow summary to load
      }
    };
    if (user) loadWards();
    else setLoading(false);
  }, [user]);
  
  // ฟังก์ชันสำหรับดึงข้อมูลแบบฟอร์ม แยกออกมาจาก useEffect เพื่อให้เรียกใช้ได้จากภายนอก
  const fetchWardForms = useCallback(async (wardId: string | null, date: string) => {
    if (!wardId || !date || !user) {
      setSummary(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSummary(null); // Clear previous summary

    try {
      console.log(`[fetchWardForms] Selected Ward ID:`, wardId);
      console.log(`[fetchWardForms] Selected Date:`, date);
      console.log(`[fetchWardForms] Using dailySummaries:`, useDailySummaries);
      
      let morning = null;
      let night = null;
      
      if (useDailySummaries) {
        // ลองดึงข้อมูลจาก dailySummaries ก่อน
        const summaryResult = await getDailySummary(wardId, date);
        morning = summaryResult.morning;
        night = summaryResult.night;
        
        // ถ้าไม่พบข้อมูลใน dailySummaries ให้ลองดึงจาก wardForms
        if (!morning && !night) {
          console.log('[fetchWardForms] No data found in dailySummaries. Falling back to wardForms...');
          const formsResult = await getWardFormsByDateAndWard(wardId, date);
          morning = formsResult.morning;
          night = formsResult.night;
        }
      } else {
        // ดึงข้อมูลจากแบบฟอร์มโดยตรง
        const { morning: morningForm, night: nightForm } = await getWardFormsByDateAndWard(wardId, date);
        morning = morningForm;
        night = nightForm;
      }
      
      if (morning || night) {
        const selectedWard = wards.find(w => w.id === wardId);
        
        // สร้างข้อมูลสรุปสำหรับแสดงผล
        const dashboardSummary: DashboardSummary = {
          wardId: wardId,
          wardName: selectedWard?.wardName || '',
          date: new Date(date),
          dateString: date,
          morningForm: morning || undefined,
          nightForm: night || undefined,
          dailyPatientCensus: night?.patientCensus || morning?.patientCensus || 0
        };
        
        setSummary(dashboardSummary);
        console.log('[fetchWardForms] Summary created:', dashboardSummary);
      } else {
        setSummary(null);
        console.log('[fetchWardForms] No data found for selected criteria.');
      }
    } catch (err) {
      console.error('[fetchWardForms] Error fetching data:', err);
      setError('ไม่สามารถโหลดข้อมูลได้');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user, wards, useDailySummaries]);

  // Fetch Ward Forms Data
  useEffect(() => {
    if (!selectedWardId || !selectedDate || !user) {
      setSummary(null);
      if(user && wards.length > 0 && !selectedWardId) {
         // If user and wards are loaded but no ward selected yet, don't set loading false
      } else if (user && wards.length === 0 && !loading){
        // If user loaded, no wards, and not already loading from ward fetch
      }
      else if (!user) {
        setLoading(false);
      }
      return;
    }

    fetchWardForms(selectedWardId, selectedDate);
  }, [selectedWardId, selectedDate, user, wards, fetchWardForms]);

  const selectedWard = useMemo(() => wards.find(w => w.id === selectedWardId), [wards, selectedWardId]);
  
  // แสดง console.log เพื่อดูว่า summary มีค่าหรือไม่
  useEffect(() => {
    console.log('[DashboardPage] Current summary state:', summary);
  }, [summary]);

  const refreshData = useCallback(() => {
    // เรียกโหลดข้อมูลใหม่โดยตรง ไม่ต้องผ่าน useEffect
    console.log("[refreshData] Refreshing data...");
    
    if (selectedWardId && selectedDate) {
      fetchWardForms(selectedWardId, selectedDate);
    }
  }, [selectedWardId, selectedDate, fetchWardForms]);

  // เพิ่มส่วนสลับระหว่าง dailySummaries และ wardForms
  const toggleDataSource = () => {
    setUseDailySummaries(!useDailySummaries);
    // หลังจากสลับแหล่งข้อมูล ให้รีเฟรชข้อมูลใหม่
    if (selectedWardId && selectedDate) {
      setTimeout(() => fetchWardForms(selectedWardId, selectedDate), 100);
    }
  };

  // ดึงข้อมูล Patient Census ของทุก Ward
  useEffect(() => {
    if (!selectedDate || !user || wards.length === 0) {
      return;
    }
    
    const fetchCensusData = async () => {
      try {
        const censusMap = await fetchAllWardCensus(selectedDate);
        setWardCensusMap(censusMap);
      } catch (err) {
        console.error('[DashboardPage] Error fetching ward census data:', err);
      }
    };
    
    fetchCensusData();
  }, [selectedDate, user, wards]);
  
  // แปลงข้อมูล wards ให้อยู่ในรูปแบบที่ใช้กับ WardSummaryDashboard
  const wardSummaryData = useMemo(() => {
    return wards.map(ward => ({
      id: ward.id,
      wardName: ward.wardName,
      patientCount: wardCensusMap.get(ward.id?.toUpperCase() || '') || 0
    }));
  }, [wards, wardCensusMap]);

  return (
    <>
      <style>{printStyles}</style>
      <NavBar />
      <div className="container mx-auto p-4 pt-[80px] min-h-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
        <h1 className="text-2xl font-bold mb-6 text-center page-title">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print">
          <div>
            <label htmlFor="date-select" className="block text-sm font-medium mb-1">เลือกวันที่:</label>
            <div className="flex gap-2">
              <input
                type="date"
                id="date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input w-full"
                disabled={loading}
              />
              <button
                onClick={refreshData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                disabled={loading || !selectedWardId || !selectedDate}
                title="รีเฟรชข้อมูล"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <button
              onClick={toggleDataSource}
              className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ใช้ข้อมูลจาก: {useDailySummaries ? 'Daily Summaries' : 'Ward Forms'}
            </button>
            
            <button
              onClick={() => window.print()}
              className="text-sm px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
            >
              พิมพ์รายงาน
            </button>
          </div>
        </div>
        
        {/* แสดง WardSummaryDashboard */}
        <WardSummaryDashboard
          date={selectedDate}
          wards={wardSummaryData}
          selectedWardId={selectedWardId}
          onSelectWard={setSelectedWardId}
          summary={summary}
          loading={loading}
        />
        
        {/* แสดงข้อความแสดงข้อผิดพลาด */}
        {!loading && error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}
        
        {/* แสดงข้อมูลดิบทั้งหมด (สำหรับการทดสอบ) */}
        {summary && (
          <div className="mt-6 text-sm overflow-x-auto">
            <details>
              <summary className="cursor-pointer text-blue-500 hover:text-blue-700">แสดงข้อมูลดิบทั้งหมด (สำหรับการแก้ไขข้อบกพร่อง)</summary>
              <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(summary, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </>
  );
} 