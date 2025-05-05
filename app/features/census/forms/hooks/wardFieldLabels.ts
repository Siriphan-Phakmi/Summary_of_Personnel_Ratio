import { WardForm } from '@/app/core/types/ward';

export const WardFieldLabels: { [key in keyof Partial<WardForm>]: string } = {
  patientCensus: 'Patient Census (คงพยาบาล)',
  nurseManager: 'Nurse Manager',
  rn: 'RN (พยาบาลวิชาชีพ)',
  pn: 'PN (พยาบาลเทคนิค)',
  wc: 'WC (ผู้ช่วยเหลือคนไข้)',
  newAdmit: 'New Admit (รับใหม่)',
  transferIn: 'Transfer In (ย้ายเข้า)',
  referIn: 'Refer In (รับส่งต่อ)',
  transferOut: 'Transfer Out (ย้ายออก)',
  referOut: 'Refer Out (ส่งต่อ)',
  discharge: 'Discharge (จำหน่าย)',
  dead: 'Dead (เสียชีวิต)',
  available: 'Available Beds (เตียงว่าง)',
  unavailable: 'Unavailable Beds (เตียงไม่ว่าง)',
  plannedDischarge: 'Planned Discharge (วางแผนจำหน่าย)',
  comment: 'Comment (หมายเหตุ)',
  recorderFirstName: 'ชื่อผู้บันทึก',
  recorderLastName: 'นามสกุลผู้บันทึก',
  // Add other fields if needed, ensuring keys match WardForm exactly
}; 