'use client';
import { VERSION_INFO } from '../../config/version';

const VersionBadge = () => {
  return (
    <div 
      className="fixed bottom-4 right-4 text-xs md:text-sm bg-[#0ab4ab] text-white px-2 py-1 rounded-lg shadow-md z-50 group cursor-help"
      title={`Release Date: ${VERSION_INFO.releaseDate}\nEnvironment: ${VERSION_INFO.environment}`}
    >
      {VERSION_INFO.version}
    </div>
  );
};

export default VersionBadge; 