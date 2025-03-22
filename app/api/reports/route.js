'use client';

import { NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestore } from '../../../lib/firebase';
import AuditLogUtil from '../../../utils/AuditLogUtil';

/**
 * GET - ดึงข้อมูลรายงานตามช่วงเวลาและ/หรือวอร์ด
 * @param {Request} request - คำขอ HTTP
 * @returns {Promise<Response>} - ผลลัพธ์ HTTP
 */
export async function GET(request) {
    try {
        // ตรวจสอบและยืนยันตัวตนของผู้ใช้
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized access' },
                { status: 401 }
            );
        }

        // รับและแปลงค่าพารามิเตอร์จาก URL
        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const wardId = searchParams.get('wardId');
        const reportType = searchParams.get('type') || 'daily'; // daily, weekly, monthly
        const limitCount = parseInt(searchParams.get('limit') || '100');

        // ตรวจสอบความถูกต้องของวันที่
        if (!startDateStr) {
            return NextResponse.json(
                { error: 'Start date is required' },
                { status: 400 }
            );
        }

        // แปลงสตริงวันที่เป็น Date object
        const startDate = new Date(startDateStr);
        let endDate = endDateStr ? new Date(endDateStr) : new Date();
        
        // ปรับ endDate ให้เป็นสิ้นสุดของวัน
        endDate.setHours(23, 59, 59, 999);

        // สร้าง Firestore query
        let q = query(
            collection(firestore, 'wardReports'),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate)),
            orderBy('date', 'desc')
        );

        // เพิ่มเงื่อนไขสำหรับวอร์ดเฉพาะถ้ามีการระบุ
        if (wardId) {
            q = query(
                collection(firestore, 'wardReports'),
                where('wardId', '==', wardId),
                where('date', '>=', Timestamp.fromDate(startDate)),
                where('date', '<=', Timestamp.fromDate(endDate)),
                orderBy('date', 'desc')
            );
        }

        // จำกัดจำนวนรายการ
        q = query(q, limit(limitCount));

        // ดึงข้อมูลจาก Firestore
        const querySnapshot = await getDocs(q);
        
        // แปลงข้อมูลเป็นอาร์เรย์
        const reports = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            reports.push({
                id: doc.id,
                ...data,
                date: data.date?.toDate().toISOString() || new Date().toISOString(),
                createdAt: data.createdAt?.toDate().toISOString() || null,
                updatedAt: data.updatedAt?.toDate().toISOString() || null
            });
        });

        // บันทึกการเข้าถึงข้อมูล
        await AuditLogUtil.logAccess('view', 'reports', 'multiple', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            wardId,
            reportType,
            count: reports.length
        });

        // สร้างผลลัพธ์การวิเคราะห์
        const analysis = await analyzeReports(reports, reportType);

        // ส่งคืนผลลัพธ์
        return NextResponse.json({
            success: true,
            count: reports.length,
            reports,
            analysis
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * วิเคราะห์ข้อมูลรายงาน
 * @param {Array} reports - รายการข้อมูลรายงาน
 * @param {string} reportType - ประเภทของรายงาน (daily, weekly, monthly)
 * @returns {Object} - ผลการวิเคราะห์
 */
async function analyzeReports(reports, reportType) {
    // ถ้าไม่มีรายงาน
    if (!reports || reports.length === 0) {
        return {
            status: 'empty',
            message: 'No data available for analysis'
        };
    }

    // สรุปข้อมูลผู้ป่วย
    const patientSummary = {
        averageCensus: 0,
        maxCensus: 0,
        minCensus: Infinity,
        totalNewAdmits: 0,
        totalDischarges: 0,
        totalTransferIn: 0,
        totalTransferOut: 0,
        totalDeaths: 0,
    };

    // สรุปข้อมูลบุคลากร
    const staffSummary = {
        averageRN: 0,
        averagePN: 0,
        averageNA: 0,
        minRN: Infinity,
        minPN: Infinity,
        minNA: Infinity,
    };

    // สรุปข้อมูลอัตราส่วน
    const ratioSummary = {
        averageNurseToPatientRatio: 0,
        minNurseToPatientRatio: Infinity,
        maxNurseToPatientRatio: 0,
        daysWithCriticalRatio: 0,
        daysWithWarningRatio: 0,
        daysWithAcceptableRatio: 0,
        daysWithOptimalRatio: 0,
    };

    // ประมวลผลข้อมูลจากรายงานทั้งหมด
    let totalPatientCensus = 0;
    let totalRN = 0;
    let totalPN = 0;
    let totalNA = 0;
    let totalNurseToPatientRatio = 0;
    let validRatioReports = 0;

    reports.forEach(report => {
        // ประมวลผลข้อมูลผู้ป่วย
        const patientCensus = report.patientCensus?.totalPatients || 0;
        totalPatientCensus += patientCensus;
        
        patientSummary.maxCensus = Math.max(patientSummary.maxCensus, patientCensus);
        patientSummary.minCensus = Math.min(patientSummary.minCensus, patientCensus);
        
        patientSummary.totalNewAdmits += report.patientCensus?.newAdmit || 0;
        patientSummary.totalDischarges += report.patientCensus?.discharge || 0;
        patientSummary.totalTransferIn += (report.patientCensus?.transferIn || 0) + (report.patientCensus?.referIn || 0);
        patientSummary.totalTransferOut += (report.patientCensus?.transferOut || 0) + (report.patientCensus?.referOut || 0);
        patientSummary.totalDeaths += report.patientCensus?.dead || 0;

        // รวมจำนวนพยาบาล RN, PN, NA
        const staffData = report.staff || {};
        
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
        
        totalRN += rnCount;
        totalPN += pnCount;
        totalNA += naCount;
        
        staffSummary.minRN = Math.min(staffSummary.minRN, rnCount);
        staffSummary.minPN = Math.min(staffSummary.minPN, pnCount);
        staffSummary.minNA = Math.min(staffSummary.minNA, naCount);

        // คำนวณอัตราส่วนพยาบาลต่อผู้ป่วย
        if (patientCensus > 0 && (rnCount + pnCount) > 0) {
            const nurseToPatientRatio = patientCensus / (rnCount + pnCount);
            totalNurseToPatientRatio += nurseToPatientRatio;
            validRatioReports++;
            
            ratioSummary.minNurseToPatientRatio = Math.min(ratioSummary.minNurseToPatientRatio, nurseToPatientRatio);
            ratioSummary.maxNurseToPatientRatio = Math.max(ratioSummary.maxNurseToPatientRatio, nurseToPatientRatio);
            
            // ประเมินสถานะของอัตราส่วน
            if (nurseToPatientRatio > 8) {
                ratioSummary.daysWithCriticalRatio++;
            } else if (nurseToPatientRatio > 6) {
                ratioSummary.daysWithWarningRatio++;
            } else if (nurseToPatientRatio > 4) {
                ratioSummary.daysWithAcceptableRatio++;
            } else {
                ratioSummary.daysWithOptimalRatio++;
            }
        }
    });

    // คำนวณค่าเฉลี่ย
    const totalReports = reports.length;
    patientSummary.averageCensus = totalPatientCensus / totalReports;
    staffSummary.averageRN = totalRN / totalReports;
    staffSummary.averagePN = totalPN / totalReports;
    staffSummary.averageNA = totalNA / totalReports;
    
    if (validRatioReports > 0) {
        ratioSummary.averageNurseToPatientRatio = totalNurseToPatientRatio / validRatioReports;
    }

    // ปรับค่าที่ไม่มีข้อมูล
    if (patientSummary.minCensus === Infinity) patientSummary.minCensus = 0;
    if (staffSummary.minRN === Infinity) staffSummary.minRN = 0;
    if (staffSummary.minPN === Infinity) staffSummary.minPN = 0;
    if (staffSummary.minNA === Infinity) staffSummary.minNA = 0;
    if (ratioSummary.minNurseToPatientRatio === Infinity) ratioSummary.minNurseToPatientRatio = 0;

    // สร้างข้อเสนอแนะ
    const recommendations = generateRecommendations(patientSummary, staffSummary, ratioSummary, totalReports);

    // สร้างแนวโน้ม
    const trends = calculateTrends(reports);

    return {
        status: 'success',
        reportType,
        totalReports,
        timeframe: {
            start: reports[reports.length - 1]?.date,
            end: reports[0]?.date
        },
        patientSummary,
        staffSummary,
        ratioSummary,
        recommendations,
        trends
    };
}

/**
 * สร้างข้อเสนอแนะสำหรับการจัดการบุคลากร
 * @param {Object} patientSummary - สรุปข้อมูลผู้ป่วย
 * @param {Object} staffSummary - สรุปข้อมูลบุคลากร
 * @param {Object} ratioSummary - สรุปข้อมูลอัตราส่วน
 * @param {number} totalReports - จำนวนรายงานทั้งหมด
 * @returns {Array} - รายการข้อเสนอแนะ
 */
function generateRecommendations(patientSummary, staffSummary, ratioSummary, totalReports) {
    const recommendations = [];
    
    // ตรวจสอบอัตราส่วนพยาบาลต่อผู้ป่วย
    if (ratioSummary.averageNurseToPatientRatio > 8) {
        recommendations.push({
            severity: 'critical',
            message: 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับวิกฤติ ควรเพิ่มจำนวนพยาบาลโดยเร่งด่วน',
            action: 'เพิ่มจำนวนพยาบาลหรือลดจำนวนผู้ป่วยในวอร์ด',
        });
    } else if (ratioSummary.averageNurseToPatientRatio > 6) {
        recommendations.push({
            severity: 'warning',
            message: 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับเตือน ควรพิจารณาเพิ่มจำนวนพยาบาล',
            action: 'เพิ่มจำนวนพยาบาลในกะที่มีปัญหา',
        });
    }
    
    // ตรวจสอบจำนวนวันที่มีอัตราส่วนวิกฤติ
    if (ratioSummary.daysWithCriticalRatio > 0) {
        const percentage = (ratioSummary.daysWithCriticalRatio / totalReports) * 100;
        
        if (percentage > 30) {
            recommendations.push({
                severity: 'critical',
                message: `${percentage.toFixed(0)}% ของวันทั้งหมดมีอัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับวิกฤติ`,
                action: 'พิจารณาทบทวนนโยบายการจัดการกำลังคนโดยเร่งด่วน',
            });
        } else {
            recommendations.push({
                severity: 'warning',
                message: `${percentage.toFixed(0)}% ของวันทั้งหมดมีอัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับวิกฤติ`,
                action: 'ตรวจสอบปัจจัยที่ส่งผลต่ออัตราส่วนในวันที่เกิดปัญหา',
            });
        }
    }
    
    // ถ้าไม่มีข้อเสนอแนะที่น่ากังวล
    if (recommendations.length === 0) {
        recommendations.push({
            severity: 'info',
            message: 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับที่ยอมรับได้',
            action: 'ตรวจสอบอัตราส่วนอย่างสม่ำเสมอเพื่อรักษาระดับคุณภาพการดูแล',
        });
    }
    
    return recommendations;
}

/**
 * คำนวณแนวโน้มจากข้อมูล
 * @param {Array} reports - รายการข้อมูลรายงาน
 * @returns {Object} - ข้อมูลแนวโน้ม
 */
function calculateTrends(reports) {
    if (reports.length < 2) {
        return {
            patientCensus: 'stable',
            nurseStaffing: 'stable',
            nurseToPatientRatio: 'stable',
            message: 'ไม่สามารถวิเคราะห์แนวโน้มได้เนื่องจากมีข้อมูลไม่เพียงพอ'
        };
    }
    
    // จัดเรียงรายงานตามวันที่
    const sortedReports = [...reports].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // แบ่งข้อมูลเป็นส่วนแรกและส่วนที่สอง
    const midPoint = Math.floor(sortedReports.length / 2);
    const firstHalf = sortedReports.slice(0, midPoint);
    const secondHalf = sortedReports.slice(midPoint);
    
    // คำนวณค่าเฉลี่ยของแต่ละส่วน
    const getAverages = (reports) => {
        const total = {
            patientCensus: 0,
            nurses: 0,
            ratio: 0,
            validRatio: 0
        };
        
        reports.forEach(report => {
            total.patientCensus += report.patientCensus?.totalPatients || 0;
            
            const staffData = report.staff || {};
            const nurses = 
                (parseInt(staffData.headNurseMorning || 0) || 0) +
                (parseInt(staffData.headNurseAfternoon || 0) || 0) +
                (parseInt(staffData.headNurseNight || 0) || 0) +
                (parseInt(staffData.rnMorning || 0) || 0) +
                (parseInt(staffData.rnAfternoon || 0) || 0) +
                (parseInt(staffData.rnNight || 0) || 0) +
                (parseInt(staffData.pnMorning || 0) || 0) +
                (parseInt(staffData.pnAfternoon || 0) || 0) +
                (parseInt(staffData.pnNight || 0) || 0);
            
            total.nurses += nurses;
            
            const patientCensus = report.patientCensus?.totalPatients || 0;
            if (patientCensus > 0 && nurses > 0) {
                total.ratio += patientCensus / nurses;
                total.validRatio++;
            }
        });
        
        return {
            patientCensus: total.patientCensus / reports.length,
            nurses: total.nurses / reports.length,
            ratio: total.validRatio > 0 ? total.ratio / total.validRatio : null
        };
    };
    
    const firstHalfAvg = getAverages(firstHalf);
    const secondHalfAvg = getAverages(secondHalf);
    
    // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
    const calculateChange = (first, second) => {
        if (!first || !second) return 0;
        return ((second - first) / first) * 100;
    };
    
    const patientCensusChange = calculateChange(firstHalfAvg.patientCensus, secondHalfAvg.patientCensus);
    const nurseStaffingChange = calculateChange(firstHalfAvg.nurses, secondHalfAvg.nurses);
    const ratioChange = calculateChange(firstHalfAvg.ratio, secondHalfAvg.ratio);
    
    // กำหนดแนวโน้ม
    const determineTrend = (change) => {
        if (Math.abs(change) < 5) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    };
    
    const patientCensusTrend = determineTrend(patientCensusChange);
    const nurseStaffingTrend = determineTrend(nurseStaffingChange);
    const ratioTrend = determineTrend(ratioChange);
    
    // สร้างข้อความสรุปแนวโน้ม
    let message = 'แนวโน้มทั่วไป: ';
    
    if (patientCensusTrend === 'increasing') {
        message += 'จำนวนผู้ป่วยเพิ่มขึ้น';
        if (nurseStaffingTrend === 'stable' || nurseStaffingTrend === 'decreasing') {
            message += ' แต่จำนวนพยาบาลไม่ได้เพิ่มตาม';
        }
    } else if (patientCensusTrend === 'decreasing') {
        message += 'จำนวนผู้ป่วยลดลง';
        if (nurseStaffingTrend === 'stable' || nurseStaffingTrend === 'increasing') {
            message += ' ซึ่งช่วยให้อัตราส่วนดีขึ้น';
        }
    } else {
        message += 'จำนวนผู้ป่วยคงที่';
    }
    
    if (ratioTrend === 'increasing') {
        message += ' อัตราส่วนพยาบาลต่อผู้ป่วยมีแนวโน้มแย่ลง';
    } else if (ratioTrend === 'decreasing') {
        message += ' อัตราส่วนพยาบาลต่อผู้ป่วยมีแนวโน้มดีขึ้น';
    } else {
        message += ' อัตราส่วนพยาบาลต่อผู้ป่วยค่อนข้างคงที่';
    }
    
    return {
        patientCensus: patientCensusTrend,
        nurseStaffing: nurseStaffingTrend,
        nurseToPatientRatio: ratioTrend,
        patientCensusChange: patientCensusChange.toFixed(1) + '%',
        nurseStaffingChange: nurseStaffingChange.toFixed(1) + '%',
        ratioChange: ratioChange.toFixed(1) + '%',
        message
    };
}

/**
 * POST - บันทึกข้อมูลรายงานใหม่
 * @param {Request} request - คำขอ HTTP
 * @returns {Promise<Response>} - ผลลัพธ์ HTTP
 */
export async function POST(request) {
    try {
        // จะเพิ่มการบันทึกข้อมูลในอนาคต
        return NextResponse.json(
            { error: 'Not implemented yet' },
            { status: 501 }
        );
    } catch (error) {
        console.error('Error saving report:', error);
        return NextResponse.json(
            { error: 'Failed to save report', details: error.message },
            { status: 500 }
        );
    }
} 