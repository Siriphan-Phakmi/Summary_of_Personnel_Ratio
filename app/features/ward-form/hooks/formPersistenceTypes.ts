import { WardForm, ShiftType, FormStatus, Ward } from '../types/ward';
import { User } from '../../auth/types/user';

export interface UseFormPersistenceProps {
  formData: Partial<WardForm>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<WardForm>>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedWard: string;
  selectedDate: string;
  selectedShift: ShiftType;
  user: User | null;
  wards: Ward[];
  existingDraftData: WardForm | null;
  setExistingDraftData: React.Dispatch<React.SetStateAction<WardForm | null>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  isFormDirty: boolean;
  onSaveSuccess: (isFinal: boolean) => void;
}

export interface UseFormPersistenceReturn {
  handleSave: (saveType: 'draft' | 'final') => Promise<void>;
  isSaving: boolean;
  isConfirmModalOpen: boolean;
  setIsConfirmModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleConfirmSaveDraft: () => void;
  handleCloseConfirmModal: () => void;
  isSaveButtonDisabled: boolean;
  isFinalizeButtonDisabled: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

export interface ButtonStates {
  isSaveButtonDisabled: boolean;
  isFinalizeButtonDisabled: boolean;
}

export interface FormPersistenceActions {
  handleSaveDraft: () => Promise<void>;
  handleFinalize: () => Promise<void>;
  validateFormAndNotify: (dataToValidate: Partial<WardForm>) => boolean;
  handleConfirmSaveDraft: () => void;
  handleCloseConfirmModal: () => void;
}

export interface FormPersistenceState {
  isConfirmModalOpen: boolean;
  isSaveButtonDisabled: boolean;
  isFinalizeButtonDisabled: boolean;
}

export const BUTTON_COOLDOWN_TIME = 2500; // milliseconds

export const FIELD_LABELS: Record<string, string> = {
  patientCensus: 'Patient Census (คงพยาบาล)',
  admitted: 'Admitted (รับใหม่)',
  discharged: 'Discharged (จำหน่าย)',
  transferredIn: 'Transferred In (ย้ายเข้า)',
  transferredOut: 'Transferred Out (ย้ายออก)',
  deaths: 'Deaths (เสียชีวิต)',
  onLeave: 'On Leave (ลา)',
  absconded: 'Absconded (หนี)',
  totalBeds: 'Total Beds (เตียงทั้งหมด)',
  availableBeds: 'Available Beds (เตียงว่าง)',
  occupiedBeds: 'Occupied Beds (เตียงครอง)',
  specialCareBeds: 'Special Care Beds (เตียงดูแลพิเศษ)',
  isolationBeds: 'Isolation Beds (เตียงแยก)',
  recorderFirstName: 'ชื่อผู้บันทึก',
  recorderLastName: 'นามสกุลผู้บันทึก',
  rejectionReason: 'เหตุผลที่ปฏิเสธ',
};