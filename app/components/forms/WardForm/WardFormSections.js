import React from 'react';
import FormSection from '../FormSection/FormSection';

const WardFormSections = ({ formData, handleInputChange, isReadOnly, theme }) => {
    const isDark = theme === 'dark';
    
    // กำหนดสีพื้นหลังและข้อความตาม theme
    const inputBgClass = isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-700';
    const cardBgClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const sectionBgClass = isDark ? 'bg-gray-700' : 'bg-gray-50';
    const labelClass = isDark ? 'text-gray-300' : 'text-gray-600';

    // สีสำหรับหมวดหมู่ต่างๆ ทั้งในโหมดปกติและ dark mode
    const categoryColors = {
        staffing: isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-100/50 border-blue-200',
        patientCensus: isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-100/50 border-green-200',
        equipment: isDark ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-100/50 border-purple-200',
        incidents: isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-100/50 border-red-200',
        communication: isDark ? 'bg-yellow-900/30 border-yellow-800' : 'bg-yellow-100/50 border-yellow-200'
    };

    // คำอธิบายสำหรับแต่ละหมวดหมู่
    const categoryDescriptions = {
        staffing: 'บันทึกข้อมูลเกี่ยวกับบุคลากรในเวร',
        patientCensus: 'บันทึกข้อมูลผู้ป่วยและการเคลื่อนย้าย',
        equipment: 'บันทึกสถานะของอุปกรณ์การแพทย์',
        incidents: 'บันทึกเหตุการณ์ไม่พึงประสงค์',
        communication: 'บันทึกการสื่อสารและข้อมูลสำคัญ'
    };

    // กำหนดฟิลด์สำหรับแต่ละหมวดหมู่
    const staffingFields = [
        { id: 'nurseManager', label: 'พยาบาลหัวหน้าเวร', type: 'text' },
        { id: 'rn', label: 'RN', type: 'number' },
        { id: 'pn', label: 'PN', type: 'number' },
        { id: 'na', label: 'NA', type: 'number' },
        { id: 'wardClerk', label: 'Ward Clerk', type: 'text' },
        { id: 'total', label: 'รวม', type: 'number', readOnly: true },
        { id: 'note', label: 'หมายเหตุ', type: 'textarea' }
    ];

    const patientCensusFields = [
        { id: 'previous', label: 'ยอดยกมา', type: 'number' },
        { id: 'admit', label: 'Admit', type: 'number' },
        { id: 'discharge', label: 'D/C', type: 'number' },
        { id: 'transfer', label: 'Transfer', type: 'number' },
        { id: 'referIn', label: 'Refer IN', type: 'number' },
        { id: 'referOut', label: 'Refer OUT', type: 'number' },
        { id: 'dead', label: 'Dead', type: 'number' },
        { id: 'current', label: 'ยอดปัจจุบัน', type: 'number', readOnly: true },
        { id: 'note', label: 'หมายเหตุ', type: 'textarea' }
    ];

    const equipmentFields = [
        { id: 'ventilator', label: 'Ventilator', type: 'number' },
        { id: 'monitor', label: 'Monitor', type: 'number' },
        { id: 'infusionPump', label: 'Infusion Pump', type: 'number' },
        { id: 'syringePump', label: 'Syringe Pump', type: 'number' },
        { id: 'note', label: 'หมายเหตุ', type: 'textarea' }
    ];

    const incidentsFields = [
        { id: 'patientFall', label: 'Patient Fall', type: 'checkbox' },
        { id: 'medicationError', label: 'Medication Error', type: 'checkbox' },
        { id: 'infectionControl', label: 'Infection Control', type: 'checkbox' },
        { id: 'other', label: 'อื่นๆ', type: 'text' },
        { id: 'note', label: 'รายละเอียด', type: 'textarea' }
    ];

    const communicationFields = [
        { id: 'handover', label: 'การส่งเวร', type: 'textarea' },
        { id: 'importantInfo', label: 'ข้อมูลสำคัญ', type: 'textarea' },
        { id: 'pendingTasks', label: 'งานค้าง', type: 'textarea' }
    ];

    // สร้างฟังก์ชันสำหรับการแสดงผลฟิลด์ตามประเภท
    const renderField = (category, field) => {
        const value = formData?.[category]?.[field.id] ?? '';
        const isFieldReadOnly = isReadOnly || field.readOnly;
        
        switch (field.type) {
            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleInputChange(category, field.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab] ${inputBgClass} ${isFieldReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isFieldReadOnly}
                        min="0"
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleInputChange(category, field.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab] ${inputBgClass} ${isFieldReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isFieldReadOnly}
                        rows={3}
                    />
                );
            case 'checkbox':
                return (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleInputChange(category, field.id, e.target.checked)}
                            className={`w-5 h-5 rounded focus:ring-[#0ab4ab] ${isDark ? 'text-blue-500' : 'text-[#0ab4ab]'} ${isFieldReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={isFieldReadOnly}
                        />
                        <span className={`ml-2 ${textClass}`}>{field.label === 'other' ? 'อื่นๆ' : field.label}</span>
                    </div>
                );
            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleInputChange(category, field.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#0ab4ab] focus:border-[#0ab4ab] ${inputBgClass} ${isFieldReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isFieldReadOnly}
                    />
                );
        }
    };

    // สร้างคอมโพเนนต์สำหรับแต่ละหมวดหมู่
    return (
        <div className="space-y-6">
            <FormSection
                title="Staffing"
                description={categoryDescriptions.staffing}
                colorClass={categoryColors.staffing}
                theme={theme}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffingFields.map((field) => (
                        field.id === 'note' ? (
                            <div className="col-span-full" key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('staffing', field)}
                            </div>
                        ) : (
                            <div key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('staffing', field)}
                            </div>
                        )
                    ))}
                </div>
            </FormSection>

            <FormSection
                title="Patient Census"
                description={categoryDescriptions.patientCensus}
                colorClass={categoryColors.patientCensus}
                theme={theme}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patientCensusFields.map((field) => (
                        field.id === 'note' ? (
                            <div className="col-span-full" key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('patientCensus', field)}
                            </div>
                        ) : (
                            <div key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('patientCensus', field)}
                            </div>
                        )
                    ))}
                </div>
            </FormSection>

            <FormSection
                title="Equipment"
                description={categoryDescriptions.equipment}
                colorClass={categoryColors.equipment}
                theme={theme}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipmentFields.map((field) => (
                        field.id === 'note' ? (
                            <div className="col-span-full" key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('equipment', field)}
                            </div>
                        ) : (
                            <div key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('equipment', field)}
                            </div>
                        )
                    ))}
                </div>
            </FormSection>

            <FormSection
                title="Incidents"
                description={categoryDescriptions.incidents}
                colorClass={categoryColors.incidents}
                theme={theme}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incidentsFields.map((field) => (
                        field.type === 'checkbox' ? (
                            <div key={field.id} className="flex items-center">
                                {renderField('incidents', field)}
                            </div>
                        ) : field.id === 'note' ? (
                            <div className="col-span-full" key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('incidents', field)}
                            </div>
                        ) : (
                            <div key={field.id}>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                                {renderField('incidents', field)}
                            </div>
                        )
                    ))}
                </div>
            </FormSection>

            <FormSection
                title="Communication"
                description={categoryDescriptions.communication}
                colorClass={categoryColors.communication}
                theme={theme}
            >
                <div className="space-y-4">
                    {communicationFields.map((field) => (
                        <div key={field.id}>
                            <label className={`block text-sm font-medium mb-1 ${labelClass}`}>{field.label}</label>
                            {renderField('communication', field)}
                        </div>
                    ))}
                </div>
            </FormSection>
        </div>
    );
};

export default WardFormSections; 