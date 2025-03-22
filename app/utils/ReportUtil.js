'use client';

import { firestore } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Utility สำหรับสร้างรายงานสรุปและวิเคราะห์แนวโน้มจากข้อมูล
 */
class ReportUtil {
    /**
     * ดึงข้อมูลรายงานตามช่วงเวลา
     * @param {Date} startDate - วันที่เริ่มต้น
     * @param {Date} endDate - วันที่สิ้นสุด
     * @param {string} wardId - ID ของวอร์ด (ถ้าระบุ)
     * @returns {Promise<Array>} - รายการข้อมูลที่พบ
     */
    static async getReportData(startDate, endDate, wardId = null) {
        try {
            const startTimestamp = Timestamp.fromDate(startDate);
            const endTimestamp = Timestamp.fromDate(endDate);
            
            let q = query(
                collection(firestore, 'wardReports'),
                where('date', '>=', startTimestamp),
                where('date', '<=', endTimestamp),
                orderBy('date', 'asc')
            );
            
            // ถ้ามีการระบุ wardId
            if (wardId) {
                q = query(
                    collection(firestore, 'wardReports'),
                    where('wardId', '==', wardId),
                    where('date', '>=', startTimestamp),
                    where('date', '<=', endTimestamp),
                    orderBy('date', 'asc')
                );
            }

            const querySnapshot = await getDocs(q);
            const reports = [];
            
            querySnapshot.forEach((doc) => {
                reports.push({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate() || new Date(),
                });
            });
            
            return reports;
        } catch (error) {
            console.error('Error fetching report data:', error);
            return [];
        }
    }

    /**
     * สร้างรายงานสรุปรายวัน
     * @param {Date} date - วันที่ต้องการสร้างรายงาน
     * @param {string} wardId - ID ของวอร์ด (ถ้าระบุ)
     * @returns {Promise<Object>} - รายงานสรุป
     */
    static async generateDailyReport(date, wardId = null) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            const reports = await this.getReportData(startOfDay, endOfDay, wardId);
            
            if (reports.length === 0) {
                return {
                    date: date,
                    status: 'empty',
                    message: 'No data available for this date',
                };
            }
            
            // ประมวลผลข้อมูลสำหรับรายงานรายวัน
            const summary = this.processReportSummary(reports);
            summary.date = date;
            summary.period = 'daily';
            
            return summary;
        } catch (error) {
            console.error('Error generating daily report:', error);
            return {
                date: date,
                status: 'error',
                message: error.message,
            };
        }
    }

    /**
     * สร้างรายงานสรุปรายสัปดาห์
     * @param {Date} startDate - วันแรกของสัปดาห์
     * @param {string} wardId - ID ของวอร์ด (ถ้าระบุ)
     * @returns {Promise<Object>} - รายงานสรุป
     */
    static async generateWeeklyReport(startDate, wardId = null) {
        try {
            const startOfWeek = new Date(startDate);
            startOfWeek.setHours(0, 0, 0, 0);
            
            const endOfWeek = new Date(startDate);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            
            const reports = await this.getReportData(startOfWeek, endOfWeek, wardId);
            
            if (reports.length === 0) {
                return {
                    startDate: startOfWeek,
                    endDate: endOfWeek,
                    status: 'empty',
                    message: 'No data available for this week',
                };
            }
            
            // ประมวลผลข้อมูลสำหรับรายงานรายสัปดาห์
            const summary = this.processReportSummary(reports);
            summary.startDate = startOfWeek;
            summary.endDate = endOfWeek;
            summary.period = 'weekly';
            
            // เพิ่มการวิเคราะห์แนวโน้มรายวัน
            summary.dailyTrends = this.analyzeDailyTrends(reports);
            
            return summary;
        } catch (error) {
            console.error('Error generating weekly report:', error);
            return {
                startDate: startDate,
                endDate: new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000),
                status: 'error',
                message: error.message,
            };
        }
    }

    /**
     * สร้างรายงานสรุปรายเดือน
     * @param {number} year - ปี
     * @param {number} month - เดือน (1-12)
     * @param {string} wardId - ID ของวอร์ด (ถ้าระบุ)
     * @returns {Promise<Object>} - รายงานสรุป
     */
    static async generateMonthlyReport(year, month, wardId = null) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const endOfMonth = new Date(year, month, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            
            const reports = await this.getReportData(startOfMonth, endOfMonth, wardId);
            
            if (reports.length === 0) {
                return {
                    year,
                    month,
                    status: 'empty',
                    message: 'No data available for this month',
                };
            }
            
            // ประมวลผลข้อมูลสำหรับรายงานรายเดือน
            const summary = this.processReportSummary(reports);
            summary.year = year;
            summary.month = month;
            summary.period = 'monthly';
            
            // เพิ่มการวิเคราะห์แนวโน้มรายสัปดาห์
            summary.weeklyTrends = this.analyzeWeeklyTrends(reports);
            
            return summary;
        } catch (error) {
            console.error('Error generating monthly report:', error);
            return {
                year,
                month,
                status: 'error',
                message: error.message,
            };
        }
    }

    /**
     * ประมวลผลข้อมูลสำหรับรายงานสรุป
     * @param {Array} reports - รายการข้อมูลรายงาน
     * @returns {Object} - ข้อมูลที่ประมวลผลแล้ว
     */
    static processReportSummary(reports) {
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

        // จำนวนรายงานทั้งหมด
        const totalReports = reports.length;
        
        if (totalReports === 0) {
            return {
                patientSummary,
                staffSummary,
                ratioSummary,
                status: 'empty',
                message: 'No data available',
            };
        }

        // ประมวลผลข้อมูลจากรายงานทั้งหมด
        let totalPatientCensus = 0;
        let totalRN = 0;
        let totalPN = 0;
        let totalNA = 0;
        let totalNurseToPatientRatio = 0;

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

            // ประมวลผลข้อมูลบุคลากร
            const rnCount = report.staffing?.totalRN || 0;
            const pnCount = report.staffing?.totalPN || 0;
            const naCount = report.staffing?.totalNA || 0;
            
            totalRN += rnCount;
            totalPN += pnCount;
            totalNA += naCount;
            
            staffSummary.minRN = Math.min(staffSummary.minRN, rnCount);
            staffSummary.minPN = Math.min(staffSummary.minPN, pnCount);
            staffSummary.minNA = Math.min(staffSummary.minNA, naCount);

            // ประมวลผลข้อมูลอัตราส่วน
            if (patientCensus > 0 && (rnCount + pnCount) > 0) {
                const nurseToPatientRatio = patientCensus / (rnCount + pnCount);
                totalNurseToPatientRatio += nurseToPatientRatio;
                
                ratioSummary.minNurseToPatientRatio = Math.min(ratioSummary.minNurseToPatientRatio, nurseToPatientRatio);
                ratioSummary.maxNurseToPatientRatio = Math.max(ratioSummary.maxNurseToPatientRatio, nurseToPatientRatio);
                
                // ตรวจสอบสถานะของอัตราส่วน
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
        patientSummary.averageCensus = totalPatientCensus / totalReports;
        staffSummary.averageRN = totalRN / totalReports;
        staffSummary.averagePN = totalPN / totalReports;
        staffSummary.averageNA = totalNA / totalReports;
        ratioSummary.averageNurseToPatientRatio = totalNurseToPatientRatio / totalReports;

        // ปรับค่าที่ไม่มีข้อมูล
        if (patientSummary.minCensus === Infinity) patientSummary.minCensus = 0;
        if (staffSummary.minRN === Infinity) staffSummary.minRN = 0;
        if (staffSummary.minPN === Infinity) staffSummary.minPN = 0;
        if (staffSummary.minNA === Infinity) staffSummary.minNA = 0;
        if (ratioSummary.minNurseToPatientRatio === Infinity) ratioSummary.minNurseToPatientRatio = 0;

        return {
            patientSummary,
            staffSummary,
            ratioSummary,
            totalDays: totalReports,
            status: 'success',
        };
    }

    /**
     * วิเคราะห์แนวโน้มรายวัน
     * @param {Array} reports - รายการข้อมูลรายงาน
     * @returns {Object} - ข้อมูลแนวโน้มรายวัน
     */
    static analyzeDailyTrends(reports) {
        // จัดกลุ่มข้อมูลตามวัน
        const dailyData = {};
        
        reports.forEach(report => {
            const dateStr = report.date.toISOString().split('T')[0];
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: report.date,
                    patientCensus: report.patientCensus?.totalPatients || 0,
                    totalRN: report.staffing?.totalRN || 0,
                    totalPN: report.staffing?.totalPN || 0,
                    totalNA: report.staffing?.totalNA || 0,
                    nurseToPatientRatio: 0,
                };
                
                // คำนวณอัตราส่วน
                const nurses = dailyData[dateStr].totalRN + dailyData[dateStr].totalPN;
                if (nurses > 0 && dailyData[dateStr].patientCensus > 0) {
                    dailyData[dateStr].nurseToPatientRatio = dailyData[dateStr].patientCensus / nurses;
                }
            }
        });

        // แปลงเป็นอาร์เรย์และเรียงตามวัน
        const trends = Object.values(dailyData).sort((a, b) => a.date - b.date);
        
        return {
            data: trends,
            trend: this.calculateTrendDirection(trends, 'nurseToPatientRatio'),
            patientTrend: this.calculateTrendDirection(trends, 'patientCensus'),
            staffTrend: this.calculateTrendDirection(trends, 'totalRN'),
        };
    }

    /**
     * วิเคราะห์แนวโน้มรายสัปดาห์
     * @param {Array} reports - รายการข้อมูลรายงาน
     * @returns {Object} - ข้อมูลแนวโน้มรายสัปดาห์
     */
    static analyzeWeeklyTrends(reports) {
        // จัดกลุ่มข้อมูลตามสัปดาห์
        const weeklyData = {};
        
        reports.forEach(report => {
            const date = new Date(report.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay()); // วันแรกของสัปดาห์ (อาทิตย์)
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    weekStart: new Date(weekStart),
                    reports: [],
                    patientCensus: 0,
                    totalRN: 0,
                    totalPN: 0,
                    totalNA: 0,
                    nurseToPatientRatio: 0,
                    daysCount: 0,
                };
            }
            
            weeklyData[weekKey].reports.push(report);
            weeklyData[weekKey].patientCensus += report.patientCensus?.totalPatients || 0;
            weeklyData[weekKey].totalRN += report.staffing?.totalRN || 0;
            weeklyData[weekKey].totalPN += report.staffing?.totalPN || 0;
            weeklyData[weekKey].totalNA += report.staffing?.totalNA || 0;
            weeklyData[weekKey].daysCount++;
        });

        // คำนวณค่าเฉลี่ยสำหรับแต่ละสัปดาห์
        Object.values(weeklyData).forEach(week => {
            if (week.daysCount > 0) {
                week.patientCensus = week.patientCensus / week.daysCount;
                week.totalRN = week.totalRN / week.daysCount;
                week.totalPN = week.totalPN / week.daysCount;
                week.totalNA = week.totalNA / week.daysCount;
                
                const nurses = week.totalRN + week.totalPN;
                if (nurses > 0 && week.patientCensus > 0) {
                    week.nurseToPatientRatio = week.patientCensus / nurses;
                }
            }
            
            // ลบข้อมูลที่ไม่จำเป็น
            delete week.reports;
        });

        // แปลงเป็นอาร์เรย์และเรียงตามสัปดาห์
        const trends = Object.values(weeklyData).sort((a, b) => a.weekStart - b.weekStart);
        
        return {
            data: trends,
            trend: this.calculateTrendDirection(trends, 'nurseToPatientRatio'),
            patientTrend: this.calculateTrendDirection(trends, 'patientCensus'),
            staffTrend: this.calculateTrendDirection(trends, 'totalRN'),
        };
    }

    /**
     * คำนวณทิศทางของแนวโน้ม
     * @param {Array} data - ข้อมูลสำหรับการวิเคราะห์
     * @param {string} property - คุณสมบัติที่ต้องการวิเคราะห์
     * @returns {string} - ทิศทางของแนวโน้ม ('increasing', 'decreasing', 'stable')
     */
    static calculateTrendDirection(data, property) {
        if (data.length < 2) {
            return 'stable';
        }
        
        // คำนวณการเปลี่ยนแปลงเฉลี่ย
        let totalChange = 0;
        for (let i = 1; i < data.length; i++) {
            totalChange += data[i][property] - data[i-1][property];
        }
        
        const averageChange = totalChange / (data.length - 1);
        
        // กำหนดทิศทางของแนวโน้ม
        if (averageChange > 0.1) {
            return 'increasing';
        } else if (averageChange < -0.1) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }

    /**
     * สร้างข้อเสนอแนะตามผลการวิเคราะห์
     * @param {Object} summary - ข้อมูลสรุป
     * @returns {Array} - รายการข้อเสนอแนะ
     */
    static generateRecommendations(summary) {
        const recommendations = [];
        
        // ตรวจสอบอัตราส่วนพยาบาลต่อผู้ป่วย
        if (summary.ratioSummary.averageNurseToPatientRatio > 8) {
            recommendations.push({
                severity: 'critical',
                message: 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับวิกฤติ ควรเพิ่มจำนวนพยาบาลโดยเร่งด่วน',
                action: 'เพิ่มจำนวนพยาบาลหรือลดจำนวนผู้ป่วยในวอร์ด',
            });
        } else if (summary.ratioSummary.averageNurseToPatientRatio > 6) {
            recommendations.push({
                severity: 'warning',
                message: 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับเตือน ควรพิจารณาเพิ่มจำนวนพยาบาล',
                action: 'เพิ่มจำนวนพยาบาลในกะที่มีปัญหา',
            });
        }
        
        // ตรวจสอบจำนวนวันที่มีอัตราส่วนวิกฤติ
        if (summary.ratioSummary.daysWithCriticalRatio > 0) {
            const percentage = (summary.ratioSummary.daysWithCriticalRatio / summary.totalDays) * 100;
            
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
        
        // ตรวจสอบแนวโน้มของอัตราส่วน
        if (summary.period !== 'daily' && summary.weeklyTrends) {
            if (summary.weeklyTrends.trend === 'increasing') {
                recommendations.push({
                    severity: 'warning',
                    message: 'อัตราส่วนพยาบาลต่อผู้ป่วยมีแนวโน้มเพิ่มขึ้น',
                    action: 'วางแผนเพิ่มจำนวนพยาบาลในอนาคต',
                });
            } else if (summary.weeklyTrends.patientTrend === 'increasing' && summary.weeklyTrends.staffTrend !== 'increasing') {
                recommendations.push({
                    severity: 'warning',
                    message: 'จำนวนผู้ป่วยเพิ่มขึ้นแต่จำนวนพยาบาลไม่ได้เพิ่มตาม',
                    action: 'วางแผนเพิ่มจำนวนพยาบาลให้สอดคล้องกับจำนวนผู้ป่วยที่เพิ่มขึ้น',
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
}

export default ReportUtil; 