'use client';

import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Card, 
  CardContent, 
  Typography,
  Grid
} from '@mui/material';
import { calculatePatientCensus } from './DataFetchers';

// ส่วนรายละเอียดผู้ป่วย
export const PatientCensusSection = ({ formData, handleInputChange, isReadOnly }) => {
  // ใช้ useEffect ในการคำนวณ Patient Census เมื่อข้อมูลที่เกี่ยวข้องเปลี่ยนแปลง
  useEffect(() => {
    if (formData) {
      // ตรวจสอบว่ามีการกรอกข้อมูลในช่องใดช่องหนึ่งหรือไม่
      const hasInput = formData.newAdmit || formData.transferIn || formData.referIn || 
                        formData.transferOut || formData.referOut || formData.discharge || formData.dead;
      
      if (hasInput) {
        // คำนวณค่า Patient Census
        const census = calculatePatientCensus(formData);
        
        // อัพเดทค่า formData เฉพาะถ้ามีการเปลี่ยนแปลง
        if (census !== formData.patientCensus) {
          handleInputChange({ target: { name: 'patientCensus', value: census } });
        }
      }
    }
  }, [
    formData?.newAdmit, 
    formData?.transferIn, 
    formData?.referIn, 
    formData?.transferOut, 
    formData?.referOut, 
    formData?.discharge, 
    formData?.dead
  ]);

  return (
    <Card className="mb-4 shadow-sm">
      <CardContent>
        <Typography variant="h6" className="font-bold mb-4">
          รายละเอียดผู้ป่วย
        </Typography>
        
        <Grid container spacing={2}>
          {/* Patient Census */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Patient Census"
              name="patientCensus"
              value={formData?.patientCensus || ''}
              onChange={handleInputChange}
              disabled={true}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* New Admit */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="New Admit"
              name="newAdmit"
              value={formData?.newAdmit || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Transfer In */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Transfer In"
              name="transferIn"
              value={formData?.transferIn || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Refer In */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Refer In"
              name="referIn"
              value={formData?.referIn || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Transfer Out */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Transfer Out"
              name="transferOut"
              value={formData?.transferOut || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Refer Out */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Refer Out"
              name="referOut"
              value={formData?.referOut || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Discharge */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Discharge"
              name="discharge"
              value={formData?.discharge || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Dead */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Dead"
              name="dead"
              value={formData?.dead || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ส่วนรายละเอียดบุคลากร
export const StaffingSection = ({ formData, handleInputChange, isReadOnly }) => {
  return (
    <Card className="mb-4 shadow-sm">
      <CardContent>
        <Typography variant="h6" className="font-bold mb-4">
          จำนวนบุคลากร
        </Typography>
        
        <Grid container spacing={2}>
          {/* Registered Nurses */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Registered Nurses (RNs)"
              name="rns"
              value={formData?.rns || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Practical Nurses */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Practical Nurses (PNs)"
              name="pns"
              value={formData?.pns || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Nurse Assistants */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Nurse Assistants (NAs)"
              name="nas"
              value={formData?.nas || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Nurse Aides */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Nurse Aides"
              name="aides"
              value={formData?.aides || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Student Nurses */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Student Nurses"
              name="studentNurses"
              value={formData?.studentNurses || ''}
              onChange={handleInputChange}
              disabled={isReadOnly}
              size="small"
              className="mb-4"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ส่วนหมายเหตุ
export const NotesSection = ({ formData, handleInputChange, isReadOnly }) => {
  return (
    <Card className="mb-4 shadow-sm">
      <CardContent>
        <Typography variant="h6" className="font-bold mb-4">
          หมายเหตุ
        </Typography>
        
        <TextField
          fullWidth
          label="หมายเหตุ"
          name="notes"
          value={formData?.notes || ''}
          onChange={handleInputChange}
          disabled={isReadOnly}
          multiline
          rows={4}
          className="mb-4"
          InputLabelProps={{ shrink: true }}
        />
      </CardContent>
    </Card>
  );
};