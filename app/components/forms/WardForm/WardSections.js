'use client';
import React from 'react';
import { handleInputChange } from './EventHandlers';

export const PatientCensusSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    return (
        <div className="mb-6 p-4 bg-primary-pastel rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-primary">จำนวนผู้ป่วย</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        จำนวนผู้ป่วยทั้งหมด
                    </label>
                    <input
                        type="number"
                        name="patientCensus"
                        value={formData.patientCensus}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-primary-light rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>
        </div>
    );
};

export const PatientMovementSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    return (
        <div className="mb-6 p-4 bg-info-pastel rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-primary">การเคลื่อนไหวของผู้ป่วย</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        รับใหม่
                    </label>
                    <input
                        type="number"
                        name="admissions"
                        value={formData.admissions}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-info-light rounded focus:ring-2 focus:ring-info focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        จำหน่าย
                    </label>
                    <input
                        type="number"
                        name="discharges"
                        value={formData.discharges}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-info-light rounded focus:ring-2 focus:ring-info focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ย้ายแผนก
                    </label>
                    <input
                        type="number"
                        name="transfers"
                        value={formData.transfers}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-info-light rounded focus:ring-2 focus:ring-info focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        เสียชีวิต
                    </label>
                    <input
                        type="number"
                        name="deaths"
                        value={formData.deaths}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 bg-white border border-info-light rounded focus:ring-2 focus:ring-info focus:border-transparent"
                    />
                </div>
            </div>
        </div>
    );
};

export const StaffSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    return (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-primary">จำนวนบุคลากร</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        RN
                    </label>
                    <input
                        type="number"
                        name="rns"
                        value={formData.rns}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        PN
                    </label>
                    <input
                        type="number"
                        name="pns"
                        value={formData.pns}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        NA
                    </label>
                    <input
                        type="number"
                        name="nas"
                        value={formData.nas}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ผู้ช่วย
                    </label>
                    <input
                        type="number"
                        name="aides"
                        value={formData.aides}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        นักศึกษาพยาบาล
                    </label>
                    <input
                        type="number"
                        name="studentNurses"
                        value={formData.studentNurses}
                        onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>
        </div>
    );
};

export const NotesSection = ({ formData, setFormData, setHasUnsavedChanges }) => {
    return (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-primary">บันทึกเพิ่มเติม</h2>
            <div>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange(e, formData, setFormData, setHasUnsavedChanges)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows="3"
                    placeholder="บันทึกเพิ่มเติม..."
                ></textarea>
            </div>
        </div>
    );
}; 