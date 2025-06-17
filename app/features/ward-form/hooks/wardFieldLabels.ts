import { WardForm } from '@/app/features/ward-form/types/ward';

export const WardFieldLabels: { [key in keyof Partial<WardForm>]: string } = {
  // Census data
  patientCensus: 'Patient Census (คงพยาบาล)',
  admitted: 'Admitted (รับใหม่)',
  discharged: 'Discharged (จำหน่าย)',
  transferredIn: 'Transferred In (ย้ายเข้า)',
  transferredOut: 'Transferred Out (ย้ายออก)',
  deaths: 'Deaths (เสียชีวิต)',
  onLeave: 'On Leave (ลา)',
  absconded: 'Absconded (หนี)',
  
  // Bed data
  totalBeds: 'Total Beds (เตียงทั้งหมด)',
  availableBeds: 'Available Beds (เตียงว่าง)',
  occupiedBeds: 'Occupied Beds (เตียงครอง)',
  
  // Specific bed types
  specialCareBeds: 'Special Care Beds (เตียงดูแลพิเศษ)',
  isolationBeds: 'Isolation Beds (เตียงแยก)',
  
  // Recorder info
  recorderFirstName: 'ชื่อผู้บันทึก',
  recorderLastName: 'นามสกุลผู้บันทึก',

  // Rejection info
  rejectionReason: 'เหตุผลที่ปฏิเสธ',
  
  // Note: Not all WardForm fields need a user-facing label, 
  // but they are included here for potential use in validation messages or UI displays.
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
  dailySummaryId: "Daily Summary ID",
  approvalHistory: "Approval History",
}; 