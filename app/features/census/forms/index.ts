// Export all form-related components
export { default as DailyCensusForm } from './DailyCensusForm';

// Export components
export { default as ShiftSelection } from './components/ShiftSelection';
export { default as ShiftButton } from './components/ShiftButton';
export { default as ShiftStatusBadge } from './components/ShiftStatusBadge';
export { default as StatusTag } from './components/StatusTag';
export { default as CensusInputFields } from './components/CensusInputFields';
export { default as ConfirmSaveModal } from './components/ConfirmSaveModal';
export { default as ConfirmZeroValuesModal } from './components/ConfirmZeroValuesModal';
export { default as DraftNotification } from './components/DraftNotification';
export { default as RecorderInfo } from './components/RecorderInfo';

// Export hooks
export { useWardFormData } from './hooks/useWardFormData';
export { useFormPersistence } from './hooks/useFormPersistence';
export { useShiftManagement } from './hooks/useShiftManagement';
export { default as useStatusStyles } from './hooks/useStatusStyles';
export { WardFieldLabels } from './hooks/wardFieldLabels';

// Export services
export * from './services/wardFormService';
export * from './services/wardService';
export * from './services/approvalService';

// Export styles (for manual imports if needed)
import './styles/index.css';
import './styles/shiftStatus.css'; 