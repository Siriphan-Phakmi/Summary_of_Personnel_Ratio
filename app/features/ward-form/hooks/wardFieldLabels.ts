import { WardForm } from '@/app/features/ward-form/types/ward';

// 📊 **HOSPITAL FIELD CATEGORIZATION - BB's Standards** 
// จัดหมวดหมู่ตามมาตรฐานโรงพยาบาล เพื่อความเป็นระบบและง่ายต่อการใช้งาน

export const WardFieldLabels: { [key in keyof Partial<WardForm>]: string } = {
  // 🏥 **Patient Census (การนับจำนวนผู้ป่วยในโรงพยาบาล ณ เวลาใดเวลาหนึ่ง)**
  patientCensus: 'Patient Census',

  // 👥 **Personnel/Positions (บุคลากร/ตำแหน่งงาน)**
  nurseManager: 'Nurse Manager', // ผู้จัดการแผนก
  rn: 'RN',                     // พยาบาลเทคนิค Registered Nurse
  pn: 'PN',                     // พยาบาลวิชาชีพ Practical Nurse
  wc: 'WC',                     // หัวหน้าเวรในแต่ละกะ

  // 🚶‍♂️ **Patient Flow/Movement (การเคลื่อนไหวผู้ป่วย)**
  admitted: 'New Admit',          // ผู้ป่วยที่เพิ่งเข้ารับการรักษาใหม่
  transferredIn: 'Transfer In',   // ผู้ป่วยที่ย้ายมาจากแผนกอื่น ในโรงพยาบาลเดียวกัน
  referIn: 'Refer In',           // รับผู้ป่วยที่ส่งต่อมาปรึกษาจากแพทย์/รพ.อื่น
  transferredOut: 'Transfer Out', // การย้ายผู้ป่วยออกจากแผนกปัจจุบันไปยังแผนกอื่น ในโรงพยาบาลเดียวกัน
  referOut: 'Refer Out',         // ส่งต่อเพื่อปรึกษา หรือรักษาเฉพาะทาง
  discharged: 'Discharge',       // การจำหน่ายผู้ป่วยออกจากโรงพยาบาล
  deaths: 'Dead',                // สถานะที่เสียชีวิตแล้ว

  // 🛏️ **Bed/Room Status (สถานะเตียง/ห้อง)**
  availableBeds: 'Available',     // เตียงว่าง
  unavailableBeds: 'Unavailable', // เตียงไม่ว่าง
  plannedDischarge: 'Planned Discharge', // แผนการจำหน่าย (ย้ายมาจาก Planning section)

  // 📝 **Additional Information (ข้อมูลเพิ่มเติม)**
  comment: 'Comment',             // หมายเหตุเพิ่มเติม

  // 👤 **Recorder (เจ้าหน้าที่ผู้บันทึก)**
  recorderFirstName: 'First Name',  // ชื่อผู้บันทึก
  recorderLastName: 'Last Name',    // นามสกุลผู้บันทึก

  // 🔧 **System Fields (ระบบภายใน - ไม่แสดงใน UI หลัก)**
  id: "ID",
  wardId: "Ward ID", 
  wardName: "Ward Name",
  date: "Date",
  dateString: "Date String",
  shift: "Shift",
  status: "Status",
  isDraft: "Is Draft",
  createdAt: "Created At",
  createdBy: "Created By", 
  updatedAt: "Updated At",
  updatedBy: "Updated By",
  approvedAt: "Approved At",
  approvedBy: "Approved By",
  approverRole: "Approver Role",
  approverFirstName: "Approver First Name",
  approverLastName: "Approver Last Name",
  rejectedAt: "Rejected At",
  rejectedBy: "Rejected By",
  rejectionReason: "Rejection Reason",
  dailySummaryId: "Daily Summary ID",
  approvalHistory: "Approval History",

  // 🗑️ **Legacy Fields (เก่า - จะลบในอนาคต)**
  onLeave: 'On Leave (ลา)',
  absconded: 'Absconded (หนี)',
  totalBeds: 'Total Beds (เตียงทั้งหมด)',
  occupiedBeds: 'Occupied Beds (เตียงครอง)',
  specialCareBeds: 'Special Care Beds (เตียงดูแลพิเศษ)',
  isolationBeds: 'Isolation Beds (เตียงแยก)',
};

// 🏷️ **Field Categories for UI Organization**
export const FieldCategories = {
  PATIENT_CENSUS: {
    title: 'Patient Census (การนับจำนวนผู้ป่วย)',
    fields: ['patientCensus'] as const,
    description: 'การนับจำนวนผู้ป่วยในโรงพยาบาล ณ เวลาใดเวลาหนึ่ง'
  },
  
  PERSONNEL: {
    title: 'Personnel/Positions (บุคลากร/ตำแหน่งงาน)',
    fields: ['nurseManager', 'rn', 'pn', 'wc'] as const,
    description: 'จำนวนบุคลากรทางการแพทย์ในแต่ละตำแหน่ง'
  },
  
  PATIENT_FLOW: {
    title: 'Patient Flow/Movement (การเคลื่อนไหวผู้ป่วย)',
    fields: ['admitted', 'transferredIn', 'referIn', 'transferredOut', 'referOut', 'discharged', 'deaths'] as const,
    description: 'การเคลื่อนไหวเข้า-ออกของผู้ป่วย'
  },
  
  BED_STATUS: {
    title: 'Bed/Room Status (สถานะเตียง/ห้อง)',
    fields: ['availableBeds', 'unavailableBeds', 'plannedDischarge'] as const,
    description: 'สถานะความพร้อมใช้งานของเตียงผู้ป่วย และแผนการจำหน่าย'
  },
  
  RECORDER: {
    title: 'Recorder (เจ้าหน้าที่ผู้บันทึก)',
    fields: ['recorderFirstName', 'recorderLastName'] as const,
    description: 'ข้อมูลเจ้าหน้าที่ที่ทำการบันทึก'
  }
} as const; 