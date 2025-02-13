'use client';

const AdditionalInformation = ({ ward, data, onChange }) => {
  const infoTypes = ['Available', 'Unavailable', 'Planned Discharge'];

  return (
    <div className="flex flex-col gap-1">
      {infoTypes.map(type => (
        <div key={type} className="bg-gradient-to-r from-pink-400/20 to-pink-500/10 rounded-md p-1">
          <input
            type="number"
            value={data[type]}
            onChange={(e) => onChange('info', ward, { [type]: e.target.value })}
            className="w-16 text-center text-sm font-bold bg-transparent border-b"
            placeholder="0"
            min="0"
          />
        </div>
      ))}
    </div>
  );
};

export default AdditionalInformation;
