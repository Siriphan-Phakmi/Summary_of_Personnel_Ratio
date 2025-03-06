import { logEvent } from '../../utils/sessionRecording';

// ในฟังก์ชัน handleApprove
const handleApprove = async (recordId) => {
  try {
    const result = await approveRecord(recordId);
    if (result.success) {
      logEvent('record_approval_success', {
        recordId,
        approverId: currentUser.uid,
        timestamp: new Date().toISOString()
      });
    }
    // ... rest of the code
  } catch (error) {
    console.error('Approval error:', error);
  }
};