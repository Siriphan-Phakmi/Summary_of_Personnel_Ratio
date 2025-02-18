'use client';

const AdditionalInformation = ({ ward, data, onChange }) => {
  const infoTypes = [
    { id: 'ICU', label: 'ICU' }, 
    { id: 'CCU', label: 'CCU' }, 
    { id: 'LR', label: 'LR' }, 
    { id: 'NSY', label: 'NSY' },
  ];

  return (
    <div className="flex flex-col gap-1">
      {infoTypes.map(({ id, label }) => (
        <div key={id} className="flex items-center justify-between bg-gradient-to-r from-pink-400/20 to-pink-500/10 rounded-md p-1">
          <span className="text-sm font-semibold text-[#0ab4ab] font-THSarabun ml-2">{label}</span>
          <input
            type="number"
            value={data[id] || ''}
            onChange={(e) => onChange('info', ward, { [id]: e.target.value })}
            className="w-16 text-center text-sm font-bold bg-white border rounded mx-1"
            placeholder="0"
            min="0"
          />
        </div>
      ))}
    </div>
  );
};

export default AdditionalInformation;
