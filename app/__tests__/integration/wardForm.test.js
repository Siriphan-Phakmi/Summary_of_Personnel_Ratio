import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import Home from '../../page';
import { db } from '../../lib/firebase';
import { Analytics } from '../../utils/analytics';
import { PAGES } from '../../config/constants';

// Mock dependencies
jest.mock('../../lib/firebase');
jest.mock('../../utils/analytics');

describe('Ward Form Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful DB response
    db.collection.mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'test-id' })
    }));
  });

  it('navigates to ward form and submits data successfully', async () => {
    render(<Home />);

    // Navigate to Ward Form
    fireEvent.click(screen.getByText('Ward Form'));
    expect(Analytics.pageView).toHaveBeenCalledWith('ward');

    // Fill form data
    await act(async () => {
      // Select ward
      fireEvent.change(screen.getByLabelText('Select Ward *'), {
        target: { value: 'Ward 6' }
      });

      // Fill staff information
      fireEvent.change(screen.getByLabelText('Nurse Manager *'), {
        target: { value: '3' }
      });
      fireEvent.change(screen.getByLabelText('RN *'), {
        target: { value: '5' }
      });
      fireEvent.change(screen.getByLabelText('PN *'), {
        target: { value: '2' }
      });
      fireEvent.change(screen.getByLabelText('WC *'), {
        target: { value: '1' }
      });

      // Fill patient movement
      fireEvent.change(screen.getByLabelText('New Admit'), {
        target: { value: '2' }
      });
      fireEvent.change(screen.getByLabelText('Transfer In'), {
        target: { value: '1' }
      });

      // Fill bed information
      fireEvent.change(screen.getByLabelText('Available Beds *'), {
        target: { value: '10' }
      });
    });

    // Submit form
    fireEvent.click(screen.getByText('Submit'));

    // Verify submission
    await waitFor(() => {
      expect(db.collection).toHaveBeenCalledWith('wards');
      expect(Analytics.trackFormSubmission).toHaveBeenCalledWith(
        'WardForm',
        true,
        expect.any(Object)
      );
    });
  });

  it('shows error messages for invalid data', async () => {
    render(<Home />);

    // Navigate to Ward Form
    fireEvent.click(screen.getByText('Ward Form'));

    // Submit without filling required fields
    fireEvent.click(screen.getByText('Submit'));

    // Check for validation messages
    await waitFor(() => {
      expect(screen.getByText('กรุณาเลือก Ward')).toBeInTheDocument();
      expect(screen.getByText('กรุณากรอกข้อมูล Nurse Manager')).toBeInTheDocument();
      expect(screen.getByText('กรุณากรอกข้อมูล RN')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    // Mock network error
    db.collection.mockImplementation(() => ({
      add: jest.fn().mockRejectedValue(new Error('Network Error'))
    }));

    render(<Home />);
    fireEvent.click(screen.getByText('Ward Form'));

    // Fill minimum required data
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Select Ward *'), {
        target: { value: 'Ward 6' }
      });
      // ... fill other required fields
    });

    // Submit form
    fireEvent.click(screen.getByText('Submit'));

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')).toBeInTheDocument();
    });
  });
}); 