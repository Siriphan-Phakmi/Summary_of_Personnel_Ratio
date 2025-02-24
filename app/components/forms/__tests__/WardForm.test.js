import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WardForm from '../WardForm';
import { db } from '../../../lib/firebase';
import { ErrorLogger } from '../../../utils/errorLogging';
import { Analytics } from '../../../utils/analytics';

// Mock dependencies
jest.mock('../../../lib/firebase');
jest.mock('../../../utils/errorLogging');
jest.mock('../../../utils/analytics');

describe('WardForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form sections', () => {
    render(<WardForm />);

    // Check for main sections
    expect(screen.getByText('General Information')).toBeInTheDocument();
    expect(screen.getByText('Staff Information')).toBeInTheDocument();
    expect(screen.getByText('Patient Movement')).toBeInTheDocument();
    expect(screen.getByText('Bed Information')).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    render(<WardForm />);
    
    // Try to submit empty form
    fireEvent.click(screen.getByText('Submit'));

    // Check for error messages
    await waitFor(() => {
      expect(screen.getByText('กรุณาเลือก Ward')).toBeInTheDocument();
      expect(screen.getByText('กรุณากรอกข้อมูล Nurse Manager')).toBeInTheDocument();
    });
  });

  it('submits form successfully with valid data', async () => {
    render(<WardForm />);

    // Fill form data
    fireEvent.change(screen.getByLabelText('Ward'), {
      target: { value: 'Ward 6' }
    });
    fireEvent.change(screen.getByLabelText('Nurse Manager'), {
      target: { value: '3' }
    });
    // ... fill other required fields

    // Submit form
    fireEvent.click(screen.getByText('Submit'));

    // Verify API call
    await waitFor(() => {
      expect(db.collection).toHaveBeenCalledWith('wards');
      expect(Analytics.trackFormSubmission).toHaveBeenCalledWith(
        'WardForm',
        true,
        expect.any(Object)
      );
    });
  });

  it('handles API errors gracefully', async () => {
    const error = new Error('API Error');
    db.collection.mockImplementationOnce(() => {
      throw error;
    });

    render(<WardForm />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Ward'), {
      target: { value: 'Ward 6' }
    });
    fireEvent.click(screen.getByText('Submit'));

    // Verify error handling
    await waitFor(() => {
      expect(ErrorLogger.logApiError).toHaveBeenCalledWith(
        'submitWardForm',
        error
      );
      expect(screen.getByText('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')).toBeInTheDocument();
    });
  });
}); 