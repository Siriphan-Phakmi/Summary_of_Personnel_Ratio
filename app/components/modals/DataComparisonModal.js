'use client';

const DataComparisonModal = ({ 
  showDataComparison, 
  existingData, 
  formData,
  summaryData, 
  onClose, 
  onOverwrite,
  WARD_ORDER 
}) => {
  if (!showDataComparison || !existingData) return null;

  const ComparisonRow = ({ label, oldValue, newValue }) => {
    const hasChanged = oldValue !== newValue;
    return (
      <div className={`grid grid-cols-3 gap-4 py-2 ${hasChanged ? 'bg-yellow-50' : ''}`}>
        <div className="text-sm font-medium text-gray-600">{label}</div>
        <div className="text-sm text-purple-600">{oldValue || '0'}</div>
        <div className="text-sm text-pink-600">{newValue || '0'}</div>
      </div>
    );
  };

  // ...existing modal code...
};

export default DataComparisonModal;
