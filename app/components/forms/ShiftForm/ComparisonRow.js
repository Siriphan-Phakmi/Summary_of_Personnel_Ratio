export const ComparisonRow = ({ label, oldValue, newValue }) => {
    return (
        <div className="grid grid-cols-3 gap-4 py-1">
            <div className="text-sm text-gray-600">{label}</div>
            <div className="text-sm text-purple-600">{oldValue || '-'}</div>
            <div className="text-sm text-pink-600">{newValue || '-'}</div>
        </div>
    );
};