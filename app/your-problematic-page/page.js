'use client';

import LoadingResetButton from '../components/LoadingResetButton';

export default function ProblemPage() {
  // ...existing code...
  
  return (
    <div>
      {/* ...existing code... */}
      
      {/* เพิ่มปุ่มบังคับปิด loading ในกรณีฉุกเฉิน */}
      <LoadingResetButton />
    </div>
  );
}