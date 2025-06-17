import { toast, Toast } from 'react-hot-toast';
import { SuccessToast, ErrorToast } from '@/app/features/auth/components/ui/AuthToasts';

const TOAST_DURATION = 4000;

export const showSuccessToast = (message: string) => {
  toast.custom((t) => SuccessToast({ message, t }), {
    duration: TOAST_DURATION,
  });
};

export const showErrorToast = (message: string) => {
  toast.custom((t) => ErrorToast({ message, t }), {
    duration: TOAST_DURATION + 1000, // Error messages stay longer
    id: 'error-toast', // Prevent duplicate error toasts
  });
};

export const showInfoToast = (message: string) => {
  toast(message, {
    duration: TOAST_DURATION,
  });
};

export const dismissAllToasts = () => {
  toast.dismiss();
}; 