'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { WardSummaryDashboardProps } from './types';
import ShiftSummary from './ShiftSummary';
import PatientCensusCalculation from './PatientCensusCalculation';

const WardSummaryDashboard: React.FC<WardSummaryDashboardProps> = ({
  date,
  wards,
  selectedWardId,
  onSelectWard,
  summary,
  loading
}) => {
  const selectedWard = wards.find(ward => ward.id === selectedWardId);
  
  return (
    <div className="space-y-6">
      {loading && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <div className="animate-pulse flex justify-center">
            <div className="h-8 w-8 bg-blue-400 rounded-full"></div>
          </div>
          <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      )}
      
      {!loading && selectedWard && summary && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-center">
            {selectedWard.wardName} - วันที่ {date ? format(parseISO(date), 'dd/MM/yyyy') : ''}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
            <div>
              <p className="text-lg font-medium">รวม (ทั้งวัน):</p>
              <p className="text-3xl font-bold">
                {summary.nightForm?.patientCensus ?? summary.morningForm?.patientCensus ?? 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-lg font-medium">กะเช้า:</p>
              <p className="text-3xl font-bold">
                {summary.morningForm?.calculatedCensus ?? summary.morningForm?.patientCensus ?? 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-lg font-medium">กะดึก:</p>
              <p className="text-3xl font-bold">
                {summary.nightForm?.calculatedCensus ?? summary.nightForm?.patientCensus ?? 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* กะเช้า */}
            {summary.morningForm && (
              <ShiftSummary
                title="กะเช้า"
                patientCensus={summary.morningForm.calculatedCensus || summary.morningForm.patientCensus}
                nurseManager={summary.morningForm.nurseManager}
                rn={summary.morningForm.rn}
                pn={summary.morningForm.pn}
                wc={summary.morningForm.wc}
                newAdmit={summary.morningForm.newAdmit}
                transferIn={summary.morningForm.transferIn}
                referIn={summary.morningForm.referIn}
                discharge={summary.morningForm.discharge}
                transferOut={summary.morningForm.transferOut}
                referOut={summary.morningForm.referOut}
                dead={summary.morningForm.dead}
                admitTotal={summary.morningForm.admitTotal}
                dischargeTotal={summary.morningForm.dischargeTotal}
              />
            )}
            
            {/* กะดึก */}
            {summary.nightForm && (
              <ShiftSummary
                title="กะดึก"
                patientCensus={summary.nightForm.calculatedCensus || summary.nightForm.patientCensus}
                nurseManager={summary.nightForm.nurseManager}
                rn={summary.nightForm.rn}
                pn={summary.nightForm.pn}
                wc={summary.nightForm.wc}
                newAdmit={summary.nightForm.newAdmit}
                transferIn={summary.nightForm.transferIn}
                referIn={summary.nightForm.referIn}
                discharge={summary.nightForm.discharge}
                transferOut={summary.nightForm.transferOut}
                referOut={summary.nightForm.referOut}
                dead={summary.nightForm.dead}
                admitTotal={summary.nightForm.admitTotal}
                dischargeTotal={summary.nightForm.dischargeTotal}
              />
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {summary.morningForm && (
              <PatientCensusCalculation 
                formData={{
                  initialCensus: summary.morningForm.initialPatientCensus || summary.morningForm.patientCensus,
                  admitTotal: summary.morningForm.admitTotal || 0,
                  dischargeTotal: summary.morningForm.dischargeTotal || 0,
                  calculatedCensus: summary.morningForm.calculatedCensus || summary.morningForm.patientCensus
                }}
                shiftTitle="กะเช้า"
              />
            )}
            
            {summary.nightForm && (
              <PatientCensusCalculation 
                formData={{
                  initialCensus: summary.nightForm.initialPatientCensus || summary.nightForm.patientCensus,
                  admitTotal: summary.nightForm.admitTotal || 0,
                  dischargeTotal: summary.nightForm.dischargeTotal || 0,
                  calculatedCensus: summary.nightForm.calculatedCensus || summary.nightForm.patientCensus
                }}
                shiftTitle="กะดึก"
              />
            )}
            
            {(summary.morningForm || summary.nightForm) && (
              <PatientCensusCalculation 
                formData={{
                  initialCensus: summary.morningForm?.patientCensus || 0,
                  admitTotal: (summary.morningForm?.admitTotal || 0) + (summary.nightForm?.admitTotal || 0),
                  dischargeTotal: (summary.morningForm?.dischargeTotal || 0) + (summary.nightForm?.dischargeTotal || 0),
                  calculatedCensus: summary.nightForm?.patientCensus || summary.morningForm?.patientCensus || 0
                }}
                shiftTitle="ทั้งวัน"
              />
            )}
          </div>
        </div>
      )}
      
      {!loading && selectedWard && !summary && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">ไม่พบข้อมูลสำหรับ {selectedWard.wardName} ในวันที่เลือก</p>
        </div>
      )}
    </div>
  );
};

export default WardSummaryDashboard; 