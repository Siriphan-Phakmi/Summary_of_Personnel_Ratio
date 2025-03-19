import React from 'react';

const FormSection = ({ title, description, children, colorClass = '', theme = 'light' }) => {
    const isDark = theme === 'dark';
    
    // กำหนดสี text และ background ตาม theme
    const titleClass = isDark ? 'text-white' : 'text-gray-800';
    const descriptionClass = isDark ? 'text-gray-300' : 'text-gray-600';
    const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
    const shadowClass = isDark ? 'shadow-md' : 'shadow';
    
    return (
        <div className={`p-4 rounded-lg ${colorClass} border ${borderClass} ${shadowClass}`}>
            <div className="mb-4">
                <h3 className={`text-lg font-semibold ${titleClass}`}>{title}</h3>
                {description && (
                    <p className={`text-sm mt-1 ${descriptionClass}`}>{description}</p>
                )}
            </div>
            <div className="mt-4">
                {children}
            </div>
        </div>
    );
};

export default FormSection; 