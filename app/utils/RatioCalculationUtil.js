'use client';

/**
 * Utility สำหรับคำนวณอัตราส่วนพยาบาลต่อผู้ป่วยและประเมินความเหมาะสม
 */
class RatioCalculationUtil {
    /**
     * คำนวณอัตราส่วนพยาบาลต่อผู้ป่วย
     * @param {number} patientCount - จำนวนผู้ป่วยทั้งหมด
     * @param {number} rnCount - จำนวนพยาบาลวิชาชีพ (RN)
     * @param {number} pnCount - จำนวนพยาบาลเทคนิค (PN)
     * @param {number} naCount - จำนวนผู้ช่วยพยาบาล (NA)
     * @returns {Object} - ผลการคำนวณอัตราส่วนต่างๆ
     */
    static calculateStaffRatios(patientCount, rnCount, pnCount, naCount) {
        // ป้องกันการหารด้วยศูนย์
        if (patientCount === 0) {
            return {
                nurseToPatientRatio: 0,
                rnToPatientRatio: 0,
                totalNursingStaffToPatientRatio: 0,
                rnPercentage: 0,
                pnPercentage: 0,
                naPercentage: 0,
                ratioStatus: 'no_patients',
                recommendedRN: 0,
                recommendedPN: 0,
                recommendedNA: 0,
                additionalRNNeeded: 0,
                additionalPNNeeded: 0,
                additionalNANeeded: 0,
            };
        }

        // การคำนวณอัตราส่วนพยาบาลต่อผู้ป่วย (เฉพาะ RN และ PN)
        const totalNurses = rnCount + pnCount;
        const nurseToPatientRatio = totalNurses > 0 ? patientCount / totalNurses : Infinity;
        
        // การคำนวณอัตราส่วน RN ต่อผู้ป่วย
        const rnToPatientRatio = rnCount > 0 ? patientCount / rnCount : Infinity;
        
        // การคำนวณอัตราส่วนบุคลากรพยาบาลทั้งหมดต่อผู้ป่วย (รวม NA)
        const totalNursingStaff = rnCount + pnCount + naCount;
        const totalNursingStaffToPatientRatio = totalNursingStaff > 0 ? patientCount / totalNursingStaff : Infinity;
        
        // คำนวณสัดส่วนของบุคลากรแต่ละประเภท
        const rnPercentage = totalNursingStaff > 0 ? (rnCount / totalNursingStaff) * 100 : 0;
        const pnPercentage = totalNursingStaff > 0 ? (pnCount / totalNursingStaff) * 100 : 0;
        const naPercentage = totalNursingStaff > 0 ? (naCount / totalNursingStaff) * 100 : 0;

        // ประเมินสถานะของอัตราส่วน
        const ratioStatus = this.evaluateRatioStatus(nurseToPatientRatio, rnToPatientRatio, rnPercentage);
        
        // คำนวณจำนวนบุคลากรที่แนะนำตามมาตรฐาน
        const recommendedRatios = this.calculateRecommendedStaff(patientCount);
        
        // คำนวณจำนวนบุคลากรที่ต้องการเพิ่ม
        const additionalRNNeeded = Math.max(0, recommendedRatios.recommendedRN - rnCount);
        const additionalPNNeeded = Math.max(0, recommendedRatios.recommendedPN - pnCount);
        const additionalNANeeded = Math.max(0, recommendedRatios.recommendedNA - naCount);

        return {
            nurseToPatientRatio,
            rnToPatientRatio,
            totalNursingStaffToPatientRatio,
            rnPercentage,
            pnPercentage,
            naPercentage,
            ratioStatus,
            ...recommendedRatios,
            additionalRNNeeded,
            additionalPNNeeded,
            additionalNANeeded,
        };
    }

    /**
     * ประเมินสถานะของอัตราส่วนพยาบาลต่อผู้ป่วย
     * @param {number} nurseToPatientRatio - อัตราส่วนพยาบาลต่อผู้ป่วย
     * @param {number} rnToPatientRatio - อัตราส่วน RN ต่อผู้ป่วย
     * @param {number} rnPercentage - เปอร์เซ็นต์ของ RN ในบุคลากรทั้งหมด
     * @returns {string} - สถานะของอัตราส่วน (optimal, acceptable, warning, critical)
     */
    static evaluateRatioStatus(nurseToPatientRatio, rnToPatientRatio, rnPercentage) {
        // ค่า Infinity หมายถึงไม่มีพยาบาล
        if (nurseToPatientRatio === Infinity) {
            return 'critical';
        }
        
        // เกณฑ์การประเมิน
        if (nurseToPatientRatio <= 4 && rnToPatientRatio <= 6 && rnPercentage >= 60) {
            return 'optimal';
        } else if (nurseToPatientRatio <= 6 && rnToPatientRatio <= 8 && rnPercentage >= 50) {
            return 'acceptable';
        } else if (nurseToPatientRatio <= 8 && rnToPatientRatio <= 10) {
            return 'warning';
        } else {
            return 'critical';
        }
    }

    /**
     * คำนวณจำนวนบุคลากรที่แนะนำตามมาตรฐาน
     * @param {number} patientCount - จำนวนผู้ป่วยทั้งหมด
     * @returns {Object} - จำนวนบุคลากรที่แนะนำ
     */
    static calculateRecommendedStaff(patientCount) {
        // มาตรฐานสัดส่วนบุคลากรตามประเภทวอร์ด (ตัวอย่าง)
        // อาจปรับเปลี่ยนตามนโยบายหรือมาตรฐานของโรงพยาบาล
        
        // คำนวณจำนวน RN ที่ควรมี (1:6 คือมาตรฐานทั่วไป)
        const recommendedRN = Math.ceil(patientCount / 6);
        
        // คำนวณจำนวน PN ที่ควรมี (1:10 คือมาตรฐานทั่วไป)
        const recommendedPN = Math.ceil(patientCount / 10);
        
        // คำนวณจำนวน NA ที่ควรมี (1:12 คือมาตรฐานทั่วไป)
        const recommendedNA = Math.ceil(patientCount / 12);
        
        return {
            recommendedRN,
            recommendedPN,
            recommendedNA,
            recommendedTotal: recommendedRN + recommendedPN + recommendedNA,
        };
    }

    /**
     * รับข้อความแนะนำตามสถานะของอัตราส่วน
     * @param {string} ratioStatus - สถานะของอัตราส่วน
     * @param {Object} ratioData - ข้อมูลอัตราส่วนที่คำนวณแล้ว
     * @returns {Object} - ข้อความแนะนำและการแจ้งเตือน
     */
    static getRatioRecommendations(ratioStatus, ratioData) {
        const recommendations = {
            message: '',
            severity: 'info',
            actions: [],
        };
        
        switch (ratioStatus) {
            case 'optimal':
                recommendations.message = 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับที่เหมาะสม';
                recommendations.severity = 'success';
                recommendations.actions.push('รักษาระดับอัตราส่วนนี้ต่อไป');
                break;
                
            case 'acceptable':
                recommendations.message = 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับที่ยอมรับได้';
                recommendations.severity = 'info';
                recommendations.actions.push('ตรวจสอบสัดส่วนบุคลากรอย่างสม่ำเสมอ');
                
                if (ratioData.rnPercentage < 60) {
                    recommendations.actions.push('พิจารณาเพิ่มสัดส่วนของพยาบาลวิชาชีพ (RN)');
                }
                break;
                
            case 'warning':
                recommendations.message = 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับที่ต้องเฝ้าระวัง';
                recommendations.severity = 'warning';
                
                if (ratioData.additionalRNNeeded > 0) {
                    recommendations.actions.push(`ควรเพิ่มพยาบาลวิชาชีพ (RN) อย่างน้อย ${ratioData.additionalRNNeeded} คน`);
                }
                
                if (ratioData.additionalPNNeeded > 0) {
                    recommendations.actions.push(`ควรเพิ่มพยาบาลเทคนิค (PN) อย่างน้อย ${ratioData.additionalPNNeeded} คน`);
                }
                
                if (ratioData.rnPercentage < 50) {
                    recommendations.actions.push('สัดส่วนของพยาบาลวิชาชีพ (RN) ต่ำเกินไป ควรปรับโครงสร้างบุคลากร');
                }
                break;
                
            case 'critical':
                recommendations.message = 'อัตราส่วนพยาบาลต่อผู้ป่วยอยู่ในระดับวิกฤติ';
                recommendations.severity = 'error';
                
                if (ratioData.nurseToPatientRatio === Infinity) {
                    recommendations.actions.push('ไม่มีพยาบาลในการดูแลผู้ป่วย โปรดจัดสรรบุคลากรโดยเร่งด่วน');
                } else {
                    recommendations.actions.push('ควรจัดสรรบุคลากรเพิ่มเติมหรือลดจำนวนผู้ป่วยโดยเร่งด่วน');
                    
                    if (ratioData.additionalRNNeeded > 0) {
                        recommendations.actions.push(`ต้องเพิ่มพยาบาลวิชาชีพ (RN) อย่างน้อย ${ratioData.additionalRNNeeded} คน`);
                    }
                    
                    if (ratioData.additionalPNNeeded > 0) {
                        recommendations.actions.push(`ต้องเพิ่มพยาบาลเทคนิค (PN) อย่างน้อย ${ratioData.additionalPNNeeded} คน`);
                    }
                }
                break;
                
            case 'no_patients':
                recommendations.message = 'ไม่มีผู้ป่วยในวอร์ด';
                recommendations.severity = 'info';
                recommendations.actions.push('ไม่จำเป็นต้องดำเนินการใดๆ');
                break;
                
            default:
                recommendations.message = 'ไม่สามารถประเมินอัตราส่วนได้';
                recommendations.severity = 'warning';
                recommendations.actions.push('ตรวจสอบข้อมูลก่อนทำการประเมิน');
        }
        
        return recommendations;
    }

    /**
     * คำนวณข้อมูลเปรียบเทียบกับมาตรฐาน
     * @param {Object} ratioData - ข้อมูลอัตราส่วนที่คำนวณแล้ว
     * @returns {Object} - ข้อมูลการเปรียบเทียบ
     */
    static compareWithStandards(ratioData) {
        // มาตรฐานที่ใช้เปรียบเทียบ (ตัวอย่าง)
        const standards = {
            nurseToPatient: 6, // อัตราส่วนมาตรฐาน 1:6
            rnToPatient: 8,    // อัตราส่วน RN มาตรฐาน 1:8
            minRnPercentage: 60, // สัดส่วน RN ขั้นต่ำ 60%
        };
        
        // คำนวณเปอร์เซ็นต์เทียบกับมาตรฐาน
        // ค่ามากกว่า 100% หมายถึงแย่กว่ามาตรฐาน (คนดูแลน้อยกว่ามาตรฐาน)
        // ค่าน้อยกว่า 100% หมายถึงดีกว่ามาตรฐาน (คนดูแลมากกว่ามาตรฐาน)
        const nurseToPatientPercentage = (ratioData.nurseToPatientRatio / standards.nurseToPatient) * 100;
        const rnToPatientPercentage = (ratioData.rnToPatientRatio / standards.rnToPatient) * 100;
        
        // เปอร์เซ็นต์ของสัดส่วน RN เทียบกับมาตรฐาน
        // ค่ามากกว่า 100% หมายถึงดีกว่ามาตรฐาน
        // ค่าน้อยกว่า 100% หมายถึงแย่กว่ามาตรฐาน
        const rnPercentageCompare = (ratioData.rnPercentage / standards.minRnPercentage) * 100;
        
        return {
            nurseToPatientPercentage,
            rnToPatientPercentage,
            rnPercentageCompare,
            isBetterThanStandard: {
                nurseToPatient: nurseToPatientPercentage < 100,
                rnToPatient: rnToPatientPercentage < 100,
                rnPercentage: rnPercentageCompare >= 100,
            },
            standards,
        };
    }
}

export default RatioCalculationUtil;